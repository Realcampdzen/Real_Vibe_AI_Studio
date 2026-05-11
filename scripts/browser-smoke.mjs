import { chromium } from '@playwright/test';

const baseUrl = (process.env.BROWSER_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const channel = process.env.BROWSER_SMOKE_CHANNEL || 'msedge';
const heroWaitMs = Number(process.env.BROWSER_SMOKE_HERO_WAIT_MS || 60_000);
const ignoreReportOnlyCsp = process.env.BROWSER_SMOKE_IGNORE_REPORT_ONLY_CSP !== 'false';

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
    console.warn(`[browser-smoke] ${channel} unavailable, falling back to bundled chromium`);
    return chromium.launch({ headless: true });
  }
}

function isReportOnlyCspMessage(message) {
  return /content security policy/i.test(message) && /report-only/i.test(message);
}

async function collectHeroState(page) {
  return page.evaluate(() => {
    const video = document.querySelector('.hero-video video, video[data-managed-video], video');
    return video ? {
      src: video.currentSrc || video.src,
      paused: video.paused,
      readyState: video.readyState,
      currentTime: Number(video.currentTime.toFixed(2)),
    } : null;
  });
}

async function hasInlineScript(page) {
  return page.evaluate(() => [...document.scripts].some((script) => !script.src && script.textContent.trim()));
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleIssues = [];
const cspReportOnlyWarnings = [];
const oldVideoRequests = [];
let mockedChatRequests = 0;

await page.route(/\/(?:chat|api\/[^/]+\/chat)(?:\?.*)?$/, async (route) => {
  if (route.request().method() !== 'POST') {
    await route.continue();
    return;
  }

  mockedChatRequests += 1;
  await route.fulfill({
    status: 429,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 'chat_daily_limit',
      error: 'Smoke test: лимит ответов проверен без вызова AI.'
    }),
  });
});

page.on('console', (message) => {
  if (!['warning', 'error'].includes(message.type())) return;
  const text = `${message.type()}: ${message.text()}`;
  if (mockedChatRequests > 0 && /429 \(Too Many Requests\)/.test(text)) {
    return;
  }
  if (ignoreReportOnlyCsp && isReportOnlyCspMessage(text)) {
    cspReportOnlyWarnings.push(text);
    return;
  }
  consoleIssues.push(text);
});

page.on('request', (request) => {
  if (decodeURIComponent(request.url()).includes('опенинг новый.mp4')) {
    oldVideoRequests.push(request.url());
  }
});

try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const ctaLinks = await page.evaluate(() => [...document.querySelectorAll('a[data-contact-link]')]
    .map((link) => ({
      key: link.getAttribute('data-contact-link'),
      href: link.getAttribute('href') || '',
      text: link.textContent.trim(),
    }))
    .filter((link) => link.key));
  await page.waitForTimeout(heroWaitMs);

  const hero = await collectHeroState(page);
  const chatButton = page.locator('.glass-ui-hipych-button').first();
  await chatButton.waitFor({ state: 'visible', timeout: 20_000 });
  await chatButton.click();
  const chatWidget = page.locator('.glass-ui-widget.is-visible').first();
  await chatWidget.waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('.glass-ui-widget.is-visible .glass-message-input').fill('Проверка smoke');
  await page.locator('.glass-ui-widget.is-visible .glass-send-button').click();
  await page.locator('.glass-ui-widget.is-visible .glass-message-bubble', {
    hasText: 'Smoke test: лимит ответов проверен без вызова AI.'
  }).waitFor({ state: 'visible', timeout: 10_000 });
  const chatUi = await page.evaluate(() => {
    const widget = document.querySelector('.glass-ui-widget.is-visible');
    return {
      visible: Boolean(widget),
      messageCount: widget ? widget.querySelectorAll('.glass-message').length : 0,
      inputDisabled: widget ? widget.querySelector('.glass-message-input')?.disabled || false : null,
      buttonDisabled: widget ? widget.querySelector('.glass-send-button')?.disabled || false : null,
    };
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(3000);
  const heroAfterScroll = await collectHeroState(page);

  const firstServiceCard = page.locator('.service-simple-card[data-service-id]').first();
  await firstServiceCard.click({ timeout: 15_000 });
  await page.waitForURL(/service-detail\.html\?id=\d+/, { timeout: 15_000 });
  const serviceCardNavigationUrl = page.url();

  const detail = [];
  for (let id = 0; id < 8; id += 1) {
    await page.goto(`${baseUrl}/service-detail.html?id=${id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(500);
    detail.push(await page.evaluate(() => ({
      title: document.querySelector('#service-title')?.textContent?.trim() || document.title,
      errorHidden: document.querySelector('#service-error')?.hidden ?? null,
      heroChildren: document.querySelector('#service-hero-reel')?.children.length ?? 0,
      hasInlineScript: [...document.scripts].some((script) => !script.src && script.textContent.trim()),
    })));
  }

  await page.goto(`${baseUrl}/ai-photo-detail.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(500);
  const aiPhoto = {
    title: await page.title(),
    bodyTextLength: await page.evaluate(() => document.body.textContent.trim().length),
    hasInlineScript: await hasInlineScript(page),
  };

  const freshDetailPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await freshDetailPage.goto(`${baseUrl}/service-detail.html?id=0`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await freshDetailPage.waitForTimeout(900);
  const freshDetailRuntime = await freshDetailPage.evaluate(() => {
    const chatScripts = [...document.scripts]
      .map((script) => script.getAttribute('src') || '')
      .filter((src) => /GlassUIWidget|glass-ui-(?:hipych|bro-cat|valyusha)|chat\.js/.test(src));
    const eagerOffscreenVideos = [...document.querySelectorAll('video')]
      .filter((video) => video.getBoundingClientRect().top > window.innerHeight * 1.25)
      .filter((video) => video.currentSrc || video.readyState > 0)
      .length;

    return {
      chatScripts,
      glassWidgetLoaded: Boolean(window.GlassUIWidget),
      eagerOffscreenVideos,
    };
  });
  await freshDetailPage.close();

  const result = {
    baseUrl,
    consoleIssues,
    cspReportOnlyWarnings: cspReportOnlyWarnings.length,
    oldVideoRequests,
    ctaLinks,
    hero,
    chatUi,
    heroAfterScroll,
    serviceCardNavigationUrl,
    detail,
    aiPhoto,
    freshDetailRuntime,
  };
  console.log(JSON.stringify(result, null, 2));

  if (consoleIssues.length) fail('browser smoke console errors/warnings found', consoleIssues);
  if (oldVideoRequests.length) fail('browser smoke requested old hero master video', oldVideoRequests);
  if (!ctaLinks.length || ctaLinks.some((link) => !link.href || link.href === '#')) {
    fail('browser smoke CTA/contact links are not wired', ctaLinks);
  }
  if (!hero || !String(hero.src).includes('hero-reel-desktop.webm') || hero.paused) {
    fail('browser smoke hero did not stay playing on optimized WebM', hero);
  }
  if (!chatUi.visible || chatUi.messageCount < 3 || chatUi.inputDisabled || chatUi.buttonDisabled) {
    fail('browser smoke chat widget interaction failed', chatUi);
  }
  if (!heroAfterScroll || heroAfterScroll.paused) {
    fail('browser smoke hero did not resume after scroll back', heroAfterScroll);
  }
  if (!/service-detail\.html\?id=\d+/.test(serviceCardNavigationUrl)) {
    fail('browser smoke service card navigation failed', serviceCardNavigationUrl);
  }
  for (const entry of detail) {
    if (!entry.errorHidden || entry.heroChildren < 1 || entry.hasInlineScript) {
      fail('browser smoke service detail failed', entry);
    }
  }
  if (aiPhoto.hasInlineScript || aiPhoto.bodyTextLength < 100) {
    fail('browser smoke AI photo detail failed', aiPhoto);
  }
  if (
    freshDetailRuntime.chatScripts.length ||
    freshDetailRuntime.glassWidgetLoaded ||
    freshDetailRuntime.eagerOffscreenVideos
  ) {
    fail('browser smoke detail page eagerly loaded chat/media runtime', freshDetailRuntime);
  }
} finally {
  await browser.close();
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('browser smoke checks passed');
