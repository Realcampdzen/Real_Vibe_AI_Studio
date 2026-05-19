import fs from 'node:fs';
import { chromium } from '@playwright/test';

const baseUrl = (process.env.AUDIT_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const channel = process.env.AUDIT_SMOKE_CHANNEL || 'msedge';
const perfStamp = '20260519-mobile-premium-recovery';

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
  const text = message.text();
  return ['warning', 'error'].includes(message.type()) &&
    !/content security policy/i.test(text) &&
    !/Failed to load resource: net::ERR_(?:CONNECTION_RESET|NAME_NOT_RESOLVED|TIMED_OUT|ABORTED)/i.test(text);
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

async function collectMobileStability(page, label) {
  const anchors = ['services', 'polstan-portal', 'benefits', 'process', 'assistants'];

  for (const anchor of anchors) {
    await page.goto(`${baseUrl}/index.html?v=${perfStamp}#${anchor}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(900);
    const state = await page.evaluate((currentAnchor) => {
      const hasBox = (element) => {
        if (element.closest('.rv-modal-shell:not(.is-open), .mobile-nav[aria-hidden="true"], [hidden]')) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 1 &&
          rect.height > 1;
      };
      const isVisible = (element) => hasBox(element) && Number(getComputedStyle(element).opacity) > 0.01;
      const describe = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: element.id ? `#${element.id}` : element.className?.toString?.().trim().replace(/\s+/g, '.') || element.tagName.toLowerCase(),
          tag: element.tagName.toLowerCase(),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };
      const overlaps = (a, b) => (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
      );
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const overflowSelectors = [
        '.process-step',
        '.service-simple-card',
        '.rv-auth-panel',
        '.rv-cart-panel',
        '.rv-account-panel',
        '.polstan-portal-section',
        '.benefit-card',
        '.rv-mobile-commerce',
        '.mobile-nav',
        '.assistants-section',
        '.service-detail-hero',
        '.service-detail-card',
        '.service-detail-card-matte',
        '.service-detail-content-section',
        '.service-detail-cta-section',
        '.service-detail-media-card'
      ].join(',');
      const overflow = [...document.querySelectorAll(overflowSelectors)]
        .filter(isVisible)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -2 || rect.right > viewportWidth + 2;
        })
        .slice(0, 8)
        .map(describe);
      const hiddenReveal = [...document.querySelectorAll('.reveal-base:not(.is-visible), .process-step:not(.is-visible)')]
        .filter(hasBox)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top < viewportHeight * 0.82 && rect.bottom > viewportHeight * 0.02;
        })
        .slice(0, 8)
        .map(describe);
      const brokenMedia = [
        ...[...document.images]
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src || image.alt || 'image'),
        ...[...document.querySelectorAll('video')]
          .filter((video) => video.error)
          .map((video) => video.currentSrc || video.poster || 'video')
      ].slice(0, 8);
      const widgets = [...document.querySelectorAll('.glass-ui-floating-button, .back-to-top')]
        .filter(isVisible);
      const targets = [...document.querySelectorAll('.service-simple-kicker, .service-simple-title, .service-simple-footer, .service-detail-actions, .service-detail-cta-btn, .service-detail-card .price-value, .service-detail-card .service-price, .hero-cta-submit, .rv-mobile-commerce, .mobile-nav-link, .btn-primary, .btn-secondary')]
        .filter(isVisible);
      const widgetOverlap = widgets.flatMap((widget) => {
        const widgetRect = widget.getBoundingClientRect();
        return targets
          .filter((target) => overlaps(widgetRect, target.getBoundingClientRect()))
          .slice(0, 3)
          .map((target) => ({ widget: describe(widget), target: describe(target) }));
      }).slice(0, 8);

      return {
        anchor: currentAnchor,
        overflow,
        hiddenReveal,
        brokenMedia,
        widgetOverlap,
      };
    }, anchor);

    if (state.overflow.length || state.hiddenReveal.length || state.brokenMedia.length || state.widgetOverlap.length) {
      fail(`Mobile stability check failed at ${label} #${anchor}.`, state);
    }
  }
}

async function exerciseMobileOverlays(page, label) {
  await page.goto(`${baseUrl}/index.html?v=${perfStamp}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, Math.min(900, document.documentElement.scrollHeight - window.innerHeight)));
  await page.waitForTimeout(200);
  const beforeMenuScroll = await page.evaluate(() => window.scrollY);

  await page.locator('#mobile-menu-btn').click({ timeout: 8_000 });
  await page.waitForTimeout(250);
  await page.locator('.mobile-nav-close').click({ timeout: 8_000 });
  await page.waitForTimeout(520);
  const menuState = await page.evaluate((expectedScroll) => ({
    menuOpen: document.body.classList.contains('mobile-nav-open') || document.querySelector('#mobile-nav')?.classList.contains('active') || false,
    scrollDelta: Math.round(Math.abs(window.scrollY - expectedScroll)),
  }), beforeMenuScroll);
  if (menuState.menuOpen || menuState.scrollDelta > 2) {
    fail(`Mobile menu did not close cleanly at ${label}.`, menuState);
  }

  for (const selector of ['.rv-mobile-cart-btn', '.rv-mobile-account-btn']) {
    const trigger = page.locator(`${selector}:visible`).first();
    if (!(await trigger.count())) continue;
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 8_000 });
    await page.waitForTimeout(350);
    const panelState = await page.evaluate(() => {
      const panel = document.querySelector('.rv-modal-shell.is-open .rv-auth-panel, .rv-modal-shell.is-open .rv-cart-panel, .rv-modal-shell.is-open .rv-account-panel');
      const rect = panel?.getBoundingClientRect();
      return {
        hasPanel: Boolean(panel),
        bodyOverlay: document.body.classList.contains('rv-overlay-open'),
        left: Math.round(rect?.left || 0),
        right: Math.round(rect?.right || 0),
        width: Math.round(rect?.width || 0),
        viewportWidth: window.innerWidth,
      };
    });
    if (!panelState.hasPanel || !panelState.bodyOverlay || panelState.left < -2 || panelState.right > panelState.viewportWidth + 2) {
      fail(`Mobile overlay panel overflow at ${label} ${selector}.`, panelState);
    }
    await page.locator('.rv-modal-shell.is-open .rv-icon-close').first().click({ timeout: 8_000 });
    await page.waitForTimeout(350);
    const closed = await page.evaluate(() => !document.body.classList.contains('rv-overlay-open') && !document.querySelector('.rv-modal-shell.is-open'));
    if (!closed) fail(`Mobile overlay did not close at ${label} ${selector}.`);
  }
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
  await mobileContext.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern) => {
        window.__vibrateCalls = window.__vibrateCalls || [];
        window.__vibrateCalls.push({ pattern, at: Math.round(performance.now()) });
        return true;
      },
    });
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
  await mobile.waitForTimeout(800);
  const musicLoadingState = await mobile.evaluate(() => {
    const card = document.querySelector('.service-card-music');
    const video = card?.querySelector('video');
    return {
      loadingIndicators: card?.querySelectorAll('.video-loading').length || 0,
      videoState: card?.dataset.videoState || '',
      hasPoster: Boolean(video?.poster),
      currentSrc: video?.currentSrc || '',
    };
  });
  if (musicLoadingState.loadingIndicators !== 0 || !musicLoadingState.hasPoster) {
    fail('Music card shows a blocking loader instead of poster/copy while video warms up.', musicLoadingState);
  }
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
      currentTime: Number((video?.currentTime || 0).toFixed(2)),
      videoState: video?.closest('.service-card-music')?.dataset.videoState || '',
    };
  });
  if (!mobileMusicState.currentSrc.includes('polstan-hero-concert-mobile-20260519.mp4')) {
    fail('Music card did not use the compressed mobile PolStan video.', mobileMusicState);
  }
  if (mobileMusicState.readyState < 2 || mobileMusicState.currentTime <= 0 || mobileMusicState.videoState !== 'ready') {
    fail('Music card video did not become ready and alive on mobile.', mobileMusicState);
  }

  await mobile.evaluate(() => {
    window.__vibrateCalls = [];
    window.scrollTo(0, 0);
  });
  await mobile.waitForTimeout(300);
  await mobile.evaluate(() => {
    const event = new Event('touchstart', { bubbles: true });
    Object.defineProperty(event, 'touches', {
      value: [{ clientX: 24, clientY: 520 }],
      configurable: true,
    });
    document.dispatchEvent(event);
    window.scrollBy(0, 1600);
  });
  await mobile.waitForTimeout(1400);
  const hapticState = await mobile.evaluate(() => ({
    loaded: Boolean(window.RealVibeHaptics),
    calls: window.__vibrateCalls || [],
  }));
  if (!hapticState.loaded || !hapticState.calls.length || hapticState.calls.length > 5) {
    fail('Mobile haptic section/card ticks did not fire cleanly during touch scroll.', hapticState);
  }

  await mobile.evaluate(() => {
    document.documentElement.classList.add('mobile-nav-open');
    document.body.classList.add('mobile-nav-open');
    window.__vibrateCalls = [];
  });
  await mobile.evaluate(() => {
    const event = new Event('touchstart', { bubbles: true });
    Object.defineProperty(event, 'touches', {
      value: [{ clientX: 24, clientY: 520 }],
      configurable: true,
    });
    document.dispatchEvent(event);
    window.scrollBy(0, 1200);
  });
  await mobile.waitForTimeout(900);
  const blockedHapticState = await mobile.evaluate(() => ({
    menuOpen: document.body.classList.contains('mobile-nav-open'),
    calls: window.__vibrateCalls || [],
  }));
  if (!blockedHapticState.menuOpen || blockedHapticState.calls.length) {
    fail('Mobile haptics fired while menu overlay was open.', blockedHapticState);
  }
  await mobile.evaluate(() => {
    document.documentElement.classList.remove('mobile-nav-open');
    document.body.classList.remove('mobile-nav-open');
  });
  await mobile.waitForTimeout(400);

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

  for (const viewport of [
    { width: 599, height: 694 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    const label = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    await context.addInitScript(() => {
      localStorage.setItem('rv-cookie-consent', 'true');
    });
    const page = await context.newPage();
    const consoleIssues = [];
    page.on('console', (message) => {
      if (isRelevantConsole(message)) consoleIssues.push(`${message.type()}: ${message.text()}`);
    });
    await collectMobileStability(page, label);
    await exerciseMobileOverlays(page, label);
    if (consoleIssues.length) fail(`Mobile stability console issues at ${label}.`, consoleIssues);
    await context.close();
  }
} finally {
  await browser.close();
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('audit smoke passed');
