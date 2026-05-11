import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const env = process.env;
const vpsHost = env.VPS_HOST || 'root@89.223.126.190';
const vpsBase = env.VPS_BASE || '/srv/real-vibe-studio';
const vpsKey = env.VPS_KEY || join(env.USERPROFILE || env.HOME || '', '.ssh', 'realcampguide_timeweb_ed25519');
const label = (env.RELEASE_LABEL || 'patch').replace(/[^a-zA-Z0-9._-]/g, '-');
const healthUrl = env.VPS_HEALTH_URL || 'http://127.0.0.1:4300/health';
const dryRun = env.DRY_RUN === 'true';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['pipe', 'pipe', 'pipe'] : (options.input ? ['pipe', 'inherit', 'inherit'] : 'inherit'),
    input: options.input,
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : '';
    throw new Error(`${command} ${args.join(' ')} failed${stderr}`);
  }

  return (result.stdout || '').trim();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function gitLines(args) {
  const output = run('git', args, { capture: true });
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

const commit = run('git', ['rev-parse', '--short', 'HEAD'], { capture: true });
const changedFiles = gitLines(['diff-tree', '--no-commit-id', '--name-only', '--diff-filter=ACMRT', '-r', 'HEAD']);
const deletedFiles = gitLines(['diff-tree', '--no-commit-id', '--name-only', '--diff-filter=D', '-r', 'HEAD']);

if (!changedFiles.length && !deletedFiles.length) {
  throw new Error('Current commit has no file changes to deploy as a patch.');
}

const tempDir = mkdtempSync(join(tmpdir(), 'real-vibe-deploy-'));
const archiveName = `real-vibe-${commit}-${label}.tar.gz`;
const deleteName = `real-vibe-${commit}-${label}.deleted.txt`;
const archivePath = join(tempDir, archiveName);
const deletePath = join(tempDir, deleteName);

writeFileSync(deletePath, `${deletedFiles.join('\n')}${deletedFiles.length ? '\n' : ''}`);

try {
  if (changedFiles.length) {
    run('git', ['archive', '--format=tar.gz', '-o', archivePath, 'HEAD', '--', ...changedFiles]);
  } else {
    writeFileSync(archivePath, '');
  }

  console.log(JSON.stringify({
    vpsHost,
    vpsBase,
    commit,
    label,
    changedFiles,
    deletedFiles,
  }, null, 2));

  if (dryRun) {
    console.log('DRY_RUN=true: patch archive created locally only.');
    process.exit(0);
  }

  const sshArgs = ['-i', vpsKey, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new'];
  run('scp', [...sshArgs, archivePath, `${vpsHost}:/tmp/${archiveName}`]);
  run('scp', [...sshArgs, deletePath, `${vpsHost}:/tmp/${deleteName}`]);

  const remoteScript = String.raw`
set -euo pipefail

BASE="$VPS_BASE"
CURRENT="$BASE/current"
RELEASES="$BASE/releases"
ARCHIVE="/tmp/$ARCHIVE_NAME"
DELETE_LIST="/tmp/$DELETE_NAME"
COMMIT="$COMMIT"
LABEL="$LABEL"
HEALTH_URL="$HEALTH_URL"

if [ ! -L "$CURRENT" ] && [ ! -d "$CURRENT" ]; then
  echo "current release not found: $CURRENT" >&2
  exit 1
fi

PREVIOUS="$(readlink -f "$CURRENT")"
STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE="$RELEASES/$STAMP-$COMMIT-$LABEL"

mkdir -p "$RELEASES" "$RELEASE" "$BASE/data"
cp -aL "$PREVIOUS/." "$RELEASE/"

if [ -s "$DELETE_LIST" ]; then
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    case "$rel" in
      /*|*..*) echo "unsafe delete path: $rel" >&2; exit 1 ;;
    esac
    rm -rf -- "$RELEASE/$rel"
  done < "$DELETE_LIST"
fi

if [ -s "$ARCHIVE" ]; then
  tar -xzf "$ARCHIVE" -C "$RELEASE"
fi

rm -f "$RELEASE/.env"
ln -sfn "$BASE/.env" "$RELEASE/.env"
rm -rf "$RELEASE/data"
ln -sfn "$BASE/data" "$RELEASE/data"

cd "$RELEASE"
docker compose -p current build
ln -sfn "$RELEASE" "$CURRENT"
docker compose -p current up -d

for attempt in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/tmp/real-vibe-health-$COMMIT.json; then
    docker compose -p current ps
    rm -f "$ARCHIVE" "$DELETE_LIST"
    echo "$RELEASE"
    exit 0
  fi
  sleep 2
done

echo "health check failed; rolling back to $PREVIOUS" >&2
ln -sfn "$PREVIOUS" "$CURRENT"
cd "$PREVIOUS"
docker compose -p current up -d
rm -f "$ARCHIVE" "$DELETE_LIST"
exit 1
`;

  const remoteCommand = [
    `VPS_BASE=${shellQuote(vpsBase)}`,
    `ARCHIVE_NAME=${shellQuote(archiveName)}`,
    `DELETE_NAME=${shellQuote(deleteName)}`,
    `COMMIT=${shellQuote(commit)}`,
    `LABEL=${shellQuote(label)}`,
    `HEALTH_URL=${shellQuote(healthUrl)}`,
    'bash -s',
  ].join(' ');

  run('ssh', [...sshArgs, vpsHost, remoteCommand], { input: remoteScript });
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
