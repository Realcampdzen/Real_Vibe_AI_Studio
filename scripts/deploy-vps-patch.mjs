import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const env = process.env;
const vpsHost = env.VPS_HOST || 'root@89.223.126.190';
const vpsBase = env.VPS_BASE || '/srv/real-vibe-studio';
const vpsKey = env.VPS_KEY || join(env.USERPROFILE || env.HOME || '', '.ssh', 'realcampguide_timeweb_ed25519');
const label = (env.RELEASE_LABEL || 'patch').replace(/[^a-zA-Z0-9._-]/g, '-');
const healthUrl = env.VPS_HEALTH_URL || 'http://127.0.0.1:4300/health';
const releaseRetention = Math.max(1, Number.parseInt(env.VPS_RELEASE_RETENTION || '1', 10) || 1);
const dryRun = env.DRY_RUN === 'true';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.buffer ? undefined : 'utf8',
    maxBuffer: options.maxBuffer || 64 * 1024 * 1024,
    stdio: options.capture ? ['pipe', 'pipe', 'pipe'] : (options.input ? ['pipe', 'inherit', 'inherit'] : 'inherit'),
    input: options.input,
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.toString()}` : '';
    throw new Error(`${command} ${args.join(' ')} failed${stderr}`);
  }

  if (options.buffer) return result.stdout || Buffer.alloc(0);
  return (result.stdout || '').trim();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function gitLines(args) {
  const output = run('git', args, { capture: true });
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function resolveRepoPath(repoRoot, gitPath) {
  return isAbsolute(gitPath) ? gitPath : join(repoRoot, gitPath);
}

function parseLfsPointer(blob) {
  const text = blob.toString('utf8');
  if (!text.startsWith('version https://git-lfs.github.com/spec/v1')) return null;

  const oid = text.match(/^oid sha256:([0-9a-f]{64})$/m)?.[1];
  const size = Number(text.match(/^size ([0-9]+)$/m)?.[1] || 0);
  if (!oid || !size) return null;
  return { oid, size };
}

function materializeHeadFiles(files, outputDir) {
  const repoRoot = run('git', ['rev-parse', '--show-toplevel'], { capture: true });
  const gitCommonDir = resolveRepoPath(repoRoot, run('git', ['rev-parse', '--git-common-dir'], { capture: true }));

  for (const rel of files) {
    if (rel.startsWith('/') || rel.includes('..') || rel.includes('\\')) {
      throw new Error(`unsafe archive path: ${rel}`);
    }

    const outPath = join(outputDir, ...rel.split('/'));
    mkdirSync(dirname(outPath), { recursive: true });

    const blob = run('git', ['show', `HEAD:${rel}`], { capture: true, buffer: true });
    const pointer = parseLfsPointer(blob);

    if (!pointer) {
      writeFileSync(outPath, blob);
      continue;
    }

    const objectPath = join(gitCommonDir, 'lfs', 'objects', pointer.oid.slice(0, 2), pointer.oid.slice(2, 4), pointer.oid);
    if (!existsSync(objectPath)) {
      throw new Error(`Missing Git LFS object for ${rel}: ${pointer.oid}`);
    }

    copyFileSync(objectPath, outPath);
  }
}

const commit = run('git', ['rev-parse', '--short', 'HEAD'], { capture: true });
const changedFiles = gitLines(['diff-tree', '--no-commit-id', '--name-only', '--diff-filter=ACMRT', '-r', 'HEAD']);
const deletedFiles = gitLines(['diff-tree', '--no-commit-id', '--name-only', '--diff-filter=D', '-r', 'HEAD']);

if (!changedFiles.length && !deletedFiles.length) {
  throw new Error('Current commit has no file changes to deploy as a patch.');
}

const tempDir = mkdtempSync(join(tmpdir(), 'real-vibe-deploy-'));
const patchDir = join(tempDir, 'patch');
const archiveName = `real-vibe-${commit}-${label}.tar.gz`;
const deleteName = `real-vibe-${commit}-${label}.deleted.txt`;
const archivePath = join(tempDir, archiveName);
const deletePath = join(tempDir, deleteName);

writeFileSync(deletePath, `${deletedFiles.join('\n')}${deletedFiles.length ? '\n' : ''}`);

try {
  if (changedFiles.length) {
    // Materialize HEAD blobs into a patch directory so Git LFS media is
    // packaged as real binary content instead of pointer text.
    mkdirSync(patchDir, { recursive: true });
    materializeHeadFiles(changedFiles, patchDir);
    run('tar', ['-czf', archivePath, '-C', patchDir, '.']);
  } else {
    writeFileSync(archivePath, '');
  }

  console.log(JSON.stringify({
    vpsHost,
    vpsBase,
    commit,
    label,
    releaseRetention,
    changedFiles,
    deletedFiles,
  }, null, 2));

  if (dryRun) {
    console.log('DRY_RUN=true: patch archive created locally only.');
  } else {
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
RELEASE_RETENTION="$RELEASE_RETENTION"

prune_old_releases() {
  local active="$1"
  local retention="$2"
  local kept=1
  local deleted=0
  local dir resolved

  if ! [[ "$retention" =~ ^[0-9]+$ ]] || [ "$retention" -lt 1 ]; then
    retention=1
  fi

  active="$(readlink -f "$active")"

  mapfile -t release_dirs < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
  for dir in "\${release_dirs[@]}"; do
    resolved="$(readlink -f "$dir")"
    case "$resolved" in
      "$RELEASES"/*) ;;
      *) echo "refusing to prune outside releases: $resolved" >&2; exit 1 ;;
    esac

    if [ "$resolved" = "$active" ]; then
      continue
    fi

    if [ "$kept" -lt "$retention" ]; then
      kept=$((kept + 1))
      continue
    fi

    rm -rf -- "$resolved"
    deleted=$((deleted + 1))
  done

  echo "release retention kept=$kept deleted=$deleted"
}

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
    prune_old_releases "$RELEASE" "$RELEASE_RETENTION"
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
      `RELEASE_RETENTION=${shellQuote(releaseRetention)}`,
      'bash -s',
    ].join(' ');

    run('ssh', [...sshArgs, vpsHost, remoteCommand], { input: remoteScript });
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
