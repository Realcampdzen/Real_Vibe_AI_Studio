import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const htmlEntrypoints = ['index.html', 'service-detail.html', 'ai-photo-detail.html'];
const criticalDomFiles = [
  'index.html',
  'service-detail.html',
  'ai-photo-detail.html',
  'js/service-detail-page.js',
  'chat-components/GlassUIWidget.js',
];
const mediaBudgetBytes = 80 * 1024 * 1024;

function toPosix(path) {
  return path.split('\\').join('/');
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function checkHtmlEntrypoints() {
  for (const file of htmlEntrypoints) {
    const text = readText(file);
    if (/\son[a-z]+\s*=/i.test(text)) {
      fail(`${file}: inline event handler attribute found`);
    }
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(text)) {
      fail(`${file}: inline script tag found`);
    }
    if (/\sstyle\s*=/i.test(text)) {
      fail(`${file}: inline style attribute found`);
    }
  }
}

function checkCriticalDomSinks() {
  for (const file of criticalDomFiles) {
    const text = readText(file);
    if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/.test(text)) {
      fail(`${file}: dangerous HTML sink found`);
    }
  }
}

function collectFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
    } else {
      files.push({ fullPath, stat });
    }
  }
  return files;
}

function dockerIgnoredPaths() {
  if (!existsSync(join(root, '.dockerignore'))) return new Set();
  return new Set(
    readText('.dockerignore')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('!'))
      .map(toPosix),
  );
}

function checkMediaBudget() {
  const ignored = dockerIgnoredPaths();
  for (const file of collectFiles(join(root, 'public'))) {
    if (file.stat.size <= mediaBudgetBytes) continue;
    const rel = toPosix(relative(root, file.fullPath));
    if (!ignored.has(rel)) {
      fail(`${rel}: public media exceeds 80 MB and is not excluded from Docker runtime`);
    }
  }
}

checkHtmlEntrypoints();
checkCriticalDomSinks();
checkMediaBudget();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('static safety checks passed');
