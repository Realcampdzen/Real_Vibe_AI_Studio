import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const includeRoots = ['server', 'js', 'chat-components', 'scripts', 'openai-proxy'];
const includeFiles = ['sw.js'];
const ignoredPathParts = new Set([
  'node_modules',
  'deploy-ready',
  'output',
  'cf-api',
  'vk-autocomment-module',
]);
const ignoredFiles = new Set();

function toPosix(path) {
  return path.split('\\').join('/');
}

function collectJsFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const rel = toPosix(relative(root, fullPath));
    if (rel.split('/').some((part) => ignoredPathParts.has(part))) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectJsFiles(fullPath, files);
    } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
      files.push(rel);
    }
  }
  return files;
}

const files = [
  ...includeRoots.flatMap((dir) => collectJsFiles(join(root, dir))),
  ...includeFiles,
]
  .map(toPosix)
  .filter((file, index, all) => all.indexOf(file) === index)
  .filter((file) => !ignoredFiles.has(file))
  .sort();

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`node --check failed: ${file}\n`);
    process.stderr.write(result.stderr || result.stdout || '');
  }
}

if (failed) {
  process.exit(1);
}

console.log(`node --check passed (${files.length} files)`);
