import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const htmlEntrypoints = ['index.html', 'service-detail.html', 'ai-photo-detail.html'];
const criticalDomFiles = [
  'index.html',
  'service-detail.html',
  'ai-photo-detail.html',
  'js/chat.js',
  'js/glass-ui-bro-cat.js',
  'js/glass-ui-hipych.js',
  'js/glass-ui-valyusha.js',
  'js/mobile-enhancements.js',
  'js/page-common.js',
  'js/performance-loader.js',
  'js/pull-to-refresh.js',
  'js/script.js',
  'js/service-detail-page.js',
  'js/services-carousel.js',
  'js/skeleton-loader.js',
  'js/video-optimizer.js',
  'chat-components/GlassUIWidget.js',
];
const strictStyleRuntimeFiles = [
  'js/chat.js',
  'js/glass-ui-bro-cat.js',
  'js/glass-ui-hipych.js',
  'js/glass-ui-valyusha.js',
  'js/mobile-enhancements.js',
  'js/page-common.js',
  'js/performance-loader.js',
  'js/script.js',
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
    if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write|document\.writeln|eval|Function)\b/.test(text)) {
      fail(`${file}: dangerous HTML sink found`);
    }
    if (/setAttribute\(\s*['"]on[a-z]+['"]/i.test(text)) {
      fail(`${file}: dynamic event handler attribute found`);
    }
  }
}

function checkStaticWidgetStyles() {
  for (const file of strictStyleRuntimeFiles) {
    const text = readText(file);
    if (/\.style\.cssText\b/.test(text)) {
      fail(`${file}: static style cssText found; use CSS classes and keep only computed .style values`);
    }
    if (/createElement\(\s*['"]style['"]\s*\)/.test(text)) {
      fail(`${file}: runtime <style> injection found; move static widget CSS to stylesheet`);
    }
    if (/setAttribute\(\s*['"]style['"]/.test(text)) {
      fail(`${file}: dynamic style attribute found; use classes or computed CSSOM properties`);
    }
  }
}

function checkCspPolicy() {
  const text = readText('server/middleware/security.js');
  const unsafeScriptPatterns = [
    /scriptSrc\s*:\s*\[[^\]]*['"]unsafe-inline['"]/s,
    /['"]script-src['"]\s*:\s*\[[^\]]*['"]unsafe-inline['"]/s,
    /scriptSrc\s*:\s*\[[^\]]*['"]unsafe-eval['"]/s,
    /['"]script-src['"]\s*:\s*\[[^\]]*['"]unsafe-eval['"]/s,
  ];

  for (const pattern of unsafeScriptPatterns) {
    if (pattern.test(text)) {
      fail('server/middleware/security.js: script CSP must not allow unsafe-inline or unsafe-eval');
    }
  }

  if (!/['"]style-src-attr['"]\s*:\s*\[[^\]]*['"]none['"]/s.test(text)) {
    fail("server/middleware/security.js: report-only CSP must include style-src-attr 'none'");
  }

  if (!/styleSrcAttr\s*:\s*\[[^\]]*['"]none['"]/s.test(text)) {
    fail("server/middleware/security.js: enforced CSP must include styleSrcAttr 'none'");
  }

  const unsafeStylePatterns = [
    /allowedStyleSources\s*=\s*\[[^\]]*['"]unsafe-inline['"]/s,
    /styleSrc\s*:\s*\[[^\]]*['"]unsafe-inline['"]/s,
    /styleSrcElem\s*:\s*\[[^\]]*['"]unsafe-inline['"]/s,
    /['"]style-src['"]\s*:\s*\[[^\]]*['"]unsafe-inline['"]/s,
    /['"]style-src-elem['"]\s*:\s*\[[^\]]*['"]unsafe-inline['"]/s,
  ];

  for (const pattern of unsafeStylePatterns) {
    if (pattern.test(text)) {
      fail('server/middleware/security.js: enforced/report-only style CSP must not allow unsafe-inline');
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
checkStaticWidgetStyles();
checkCspPolicy();
checkMediaBudget();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('static safety checks passed');
