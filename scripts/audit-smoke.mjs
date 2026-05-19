import fs from 'node:fs';
import { chromium } from '@playwright/test';

const baseUrl = (process.env.AUDIT_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const channel = process.env.AUDIT_SMOKE_CHANNEL || 'msedge';
const perfStamp = '20260519-performance-pass';

function fail(message, detail) {
  console.error(message);
  if (detail !== undefined) {
    console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  }
  process.exitCode = 1;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel, headless: true });
  } catch (error) {
    if (channel === 'chromium') throw error;
    console.warn(`[audit-smoke] ${channel} unavailable, falling back to bundled chromium`);
    return chromium.launch({ headless: true });
  }
}

function isRelevantConsole(message) {
  return ['warning', 'error'].includes(message.type()) &&
    !/content security policy/i.test(message.text());
}

function visibleFloatingCount() {
  return [...document.querySelectorAll('.glass-ui-floating-button, .glass-ui-widget')]
    .filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0.01 &&
        rect.width > 0 &&
        rect.height > 0;
    }).length;
}

const swText = fs.readFileSync('sw.js', 'utf8');
const staticAssetsBlock = swText.match(/const STATIC_ASSETS = \[[\s\S]*?\];/)?.[0] || '';
if (/\.(mp4|webm|mp3|wav|m4a)(?:[?'")]|$)/i.test(staticAssetsBlock)) {
  fail('STATIC_ASSETS must not precache video or audio files.');
}

const browser = await launchBrowser();

try {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    serviceWorkers: 'block',
  });
  await desktopContext.addInitScript(() => {
    localStorage.setItem('rv-cookie-consent', 'true');
  });
  const desktop = await desktopContext.newPage();
  const desktopConsole = [];
  const desktopMedia = [];
  desktop.on('console', (message) => {
    if (isRelevantConsole(message)) desktopConsole.push(`${message.type()}: ${message.text()}`);
  });
  desktop.on('request', (request) => {
    if (request.url().includes('polstan-hero-concert')) desktopMedia.push(request.url());
  });

  await desktop.goto(`${baseUrl}/index.html?v=${perfStamp}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await desktop.waitForTimeout(2500);
  const earlyMediaRequests = desktopMedia.length;
  if (earlyMediaRequests !== 0) {
    fail('PolStan music video loaded before the music card entered the viewport.', desktopMedia);
  }

  await desktop.locator('.service-card-music').scrollIntoViewIfNeeded();
  await desktop.waitForFunction(() => {
    const video = document.querySelector('.service-card-music video');
    return video && video.currentSrc.includes('polstan-hero-concert-desktop-20260519.mp4') &&
      video.readyState >= 2 &&
      !video.paused;
  }, null, { timeout: 15_000 });
  const musicState = await desktop.evaluate(() => {
    const video = document.querySelector('.service-card-music video');
    return {
      currentSrc: video?.currentSrc || '',
      paused: video?.paused ?? null,
      readyState: video?.readyState ?? null,
      hasInlineSource: Boolean(video?.querySelector('source[src="public/works/services/music/polstan-hero-concert-20260519.mp4"], source[src$="polstan-hero-concert-20260519.mp4"]')),
    };
  });
  if (!musicState.currentSrc.includes('polstan-hero-concert-desktop-20260519.mp4')) {
    fail('Music card did not use the compressed desktop PolStan video.', musicState);
  }
  if (musicState.paused || musicState.readyState < 2 || musicState.hasInlineSource) {
    fail('Music card video is not playing cleanly after lazy load.', musicState);
  }
  if (desktopConsole.length) fail('Desktop console has warnings/errors.', desktopConsole);
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 599, height: 694 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const mobile = await mobileContext.newPage();
  const mobileConsole = [];
  mobile.on('console', (message) => {
    if (isRelevantConsole(message)) mobileConsole.push(`${message.type()}: ${message.text()}`);
  });

  await mobile.goto(`${baseUrl}/index.html?v=${perfStamp}#services`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await mobile.waitForTimeout(1800);
  const cookieState = await mobile.evaluate((visibleFloatingCountSource) => {
    const banner = document.getElementById('cookie-banner');
    const rect = banner?.getBoundingClientRect();
    return {
      visible: banner?.classList.contains('visible') || false,
      width: Math.round(rect?.width || 0),
      height: Math.round(rect?.height || 0),
      top: Math.round(rect?.top || 0),
      bodyClass: document.body.classList.contains('rv-cookie-banner-visible'),
      visibleFloatingWidgets: eval(`(${visibleFloatingCountSource})`)(),
    };
  }, visibleFloatingCount.toString());
  if (!cookieState.visible || !cookieState.bodyClass || cookieState.height > 112 || cookieState.visibleFloatingWidgets !== 0) {
    fail('Mobile cookie banner still blocks too much UI or leaves floating widgets visible.', cookieState);
  }

  await mobile.locator('#cookie-accept').click();
  await mobile.waitForTimeout(300);
  await mobile.locator('.service-card-music').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(() => {
    const video = document.querySelector('.service-card-music video');
    return video && video.currentSrc.includes('polstan-hero-concert-mobile-20260519.mp4') &&
      video.readyState >= 2 &&
      !video.paused;
  }, null, { timeout: 15_000 });
  const mobileMusicState = await mobile.evaluate(() => {
    const video = document.querySelector('.service-card-music video');
    return {
      currentSrc: video?.currentSrc || '',
      paused: video?.paused ?? null,
      readyState: video?.readyState ?? null,
    };
  });
  if (!mobileMusicState.currentSrc.includes('polstan-hero-concert-mobile-20260519.mp4')) {
    fail('Music card did not use the compressed mobile PolStan video.', mobileMusicState);
  }

  await mobile.goto(`${baseUrl}/service-detail.html?id=4&v=${perfStamp}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await mobile.waitForSelector('#service-hero-reel video', { timeout: 30_000 });
  await mobile.waitForFunction(() => {
    const video = document.querySelector('#service-hero-reel video');
    return video && video.currentSrc.includes('polstan-hero-concert-mobile-20260519.mp4') &&
      video.readyState >= 2 &&
      !video.paused;
  }, null, { timeout: 15_000 });
  const detailState = await mobile.evaluate(() => {
    const hero = document.querySelector('#service-hero-reel');
    const video = hero?.querySelector('video');
    return {
      hasCopy: Boolean(hero?.querySelector('.service-polstan-hero-copy--detail')),
      currentSrc: video?.currentSrc || '',
      paused: video?.paused ?? null,
      readyState: video?.readyState ?? null,
    };
  });
  if (!detailState.hasCopy || !detailState.currentSrc.includes('polstan-hero-concert-mobile-20260519.mp4') || detailState.paused || detailState.readyState < 2) {
    fail('Music detail hero did not render the stable mobile PolStan video state.', detailState);
  }
  if (mobileConsole.length) fail('Mobile console has warnings/errors.', mobileConsole);
  await mobileContext.close();
} finally {
  await browser.close();
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('audit smoke passed');
