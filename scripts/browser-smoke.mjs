import { chromium } from '@playwright/test';

const baseUrl = (process.env.BROWSER_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const channel = process.env.BROWSER_SMOKE_CHANNEL || 'msedge';
const heroWaitMs = Number(process.env.BROWSER_SMOKE_HERO_WAIT_MS || 60_000);
const ignoreReportOnlyCsp = process.env.BROWSER_SMOKE_IGNORE_REPORT_ONLY_CSP !== 'false';
const mockAnalytics = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(baseUrl);

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
      muted: video.muted,
      volume: video.volume,
      readyState: video.readyState,
      currentTime: Number(video.currentTime.toFixed(2)),
    } : null;
  });
}

async function hasInlineScript(page) {
  return page.evaluate(() => [...document.scripts].some((script) => !script.src && script.textContent.trim()));
}

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: 'block',
});
await context.addInitScript(() => {
  window.localStorage?.setItem('rv-cookie-consent', 'true');
});
const page = await context.newPage();
const consoleIssues = [];
const cspReportOnlyWarnings = [];
const oldVideoRequests = [];
let analyticsRequests = 0;
let mockedChatRequests = 0;
let chatRouteMode = 'rate-limit';

if (mockAnalytics) {
  await page.route(/\/api\/analytics\/event(?:\?.*)?$/, async (route) => {
    analyticsRequests += 1;
    await route.fulfill({ status: 204, body: '' });
  });
}

await page.route(/\/(?:chat|api\/[^/]+\/chat)(?:\?.*)?$/, async (route) => {
  if (route.request().method() !== 'POST') {
    await route.continue();
    return;
  }

  mockedChatRequests += 1;
  if (chatRouteMode === 'network-error') {
    await route.abort('failed');
    return;
  }

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
  if (mockedChatRequests > 0 && /net::ERR_FAILED/.test(text)) {
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
  if (request.url().includes('/api/analytics/event')) {
    analyticsRequests += 1;
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
  const legacyChatOverlayPresent = await page.evaluate(() => Boolean(document.getElementById('chat-overlay')));
  const homepageSeo = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
    organizationSchema: Boolean(document.querySelector('[itemtype="https://schema.org/Organization"]')),
    faqSchema: Boolean(document.querySelector('[itemtype="https://schema.org/FAQPage"]')),
  }));
  const serviceCards = await page.evaluate(() => [...document.querySelectorAll('#services .service-simple-card')]
    .map((card) => ({
      href: card.getAttribute('data-card-href') || card.getAttribute('data-detail-href') || card.dataset.serviceId || '',
      tabIndex: card.getAttribute('tabindex'),
      role: card.getAttribute('role'),
      label: card.getAttribute('aria-label') || '',
      affordance: window.getComputedStyle(card, '::after').content,
      benefit: card.querySelector('.service-simple-benefit')?.textContent?.trim() || '',
    })));
  const projectCases = await page.evaluate(() => [...document.querySelectorAll('#projects-showreel .projects-reel-card')]
    .map((card) => ({
      title: card.querySelector('.projects-reel-title')?.textContent?.trim() || '',
      notes: [...card.querySelectorAll('.projects-reel-note')].map((note) => note.textContent.trim()),
    })));
  const heroTitleStyle = await page.evaluate(() => {
    const title = document.querySelector('.hero-title-reel') || document.querySelector('.hero-title');
    if (!title) return null;
    const style = window.getComputedStyle(title);
    return {
      text: title.textContent.trim().replace(/\s+/g, ' '),
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
    };
  });
  await page.waitForTimeout(heroWaitMs);

  const hero = await collectHeroState(page);
  await page.locator('#hero-reel-container').click({ position: { x: 32, y: 32 }, timeout: 10_000 });
  await page.waitForTimeout(500);
  const heroSoundAfterSurfaceOn = await collectHeroState(page);
  await page.locator('#hero-reel-container').click({ position: { x: 32, y: 32 }, timeout: 10_000 });
  await page.waitForTimeout(500);
  const heroSoundAfterSurfaceOff = await collectHeroState(page);
  await page.locator('#hero-reel-container').hover({ timeout: 10_000 });
  await page.waitForTimeout(300);
  await page.locator('#hero-control-volume').click({ timeout: 10_000 });
  await page.waitForTimeout(500);
  const heroSoundAfterVolumeOn = await collectHeroState(page);
  await page.locator('#hero-control-volume').click({ timeout: 10_000 });
  await page.waitForTimeout(500);
  const heroSoundAfterVolumeOff = await collectHeroState(page);
  await page.locator('#hero-reel-container').hover({ timeout: 10_000 });
  await page.locator('#hero-control-play').click({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.locator('#hero-reel-container').hover({ timeout: 10_000 });
  await page.locator('#hero-control-play').click({ timeout: 10_000 });
  await page.waitForTimeout(800);
  const heroAfterPlayResume = await collectHeroState(page);

  const lowerImageSections = {};
  for (const [key, selector] of [
    ['projects', '#projects-showreel'],
    ['process', '#process'],
    ['assistants', '#assistants'],
  ]) {
    await page.locator(selector).scrollIntoViewIfNeeded({ timeout: 10_000 });
    await page.waitForTimeout(900);
    lowerImageSections[key] = await page.evaluate((sectionSelector) => {
      const images = [...document.querySelectorAll(`${sectionSelector} img`)]
        .filter((img) => img.matches('.projects-reel-image, .step-image, .assistant-bg-image'))
        .map((img) => {
          const rect = img.getBoundingClientRect();
          const parent = img.parentElement?.getBoundingClientRect();
          return {
            src: img.getAttribute('src') || '',
            loading: img.getAttribute('loading') || '',
            fetchPriority: img.getAttribute('fetchpriority') || img.fetchPriority || '',
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            visible: rect.width > 0 && rect.height > 0,
            parentArea: parent ? Math.round(parent.width * parent.height) : 0,
          };
        });
      return { selector: sectionSelector, images };
    }, selector);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  const chatButton = page.locator('.glass-ui-hipych-button').first();
  await chatButton.waitFor({ state: 'visible', timeout: 20_000 });
  await chatButton.click();
  const chatWidget = page.locator('.glass-ui-widget.is-visible').first();
  await chatWidget.waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('.glass-ui-widget.is-visible .glass-quick-question', { hasText: 'Сколько стоит?' }).click();
  await page.locator('.glass-ui-widget.is-visible .glass-message-bubble', {
    hasText: 'На сегодня лимит сообщений исчерпан'
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
  await page.locator('.glass-ui-widget.is-visible .glass-chat-close').click({ timeout: 10_000 });
  await page.locator('.glass-ui-widget.is-visible').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});

  chatRouteMode = 'network-error';
  await page.locator('.glass-ui-valyusha-button').first().click();
  await page.locator('.glass-ui-widget.is-visible .glass-quick-question', { hasText: 'Что вы делаете?' }).click();
  await page.locator('.glass-ui-widget.is-visible .glass-message-bubble', {
    hasText: 'не могу подключиться'
  }).waitFor({ state: 'visible', timeout: 10_000 });
  const chatNetworkUi = await page.evaluate(() => {
    const widget = document.querySelector('.glass-ui-widget.is-visible');
    return {
      visible: Boolean(widget),
      messageCount: widget ? widget.querySelectorAll('.glass-message').length : 0,
      inputDisabled: widget ? widget.querySelector('.glass-message-input')?.disabled || false : null,
      buttonDisabled: widget ? widget.querySelector('.glass-send-button')?.disabled || false : null,
    };
  });
  await page.locator('.glass-ui-widget.is-visible .glass-chat-close').click({ timeout: 10_000 });
  await page.locator('.glass-ui-widget.is-visible').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  chatRouteMode = 'rate-limit';

  const widgetOpenClose = [];
  for (const selector of ['.glass-ui-hipych-button', '.glass-ui-bro-cat-button', '.glass-ui-valyusha-button']) {
    const button = page.locator(selector).first();
    await button.waitFor({ state: 'visible', timeout: 10_000 });
    await button.click();
    const visibleWidget = page.locator('.glass-ui-widget.is-visible').first();
    await visibleWidget.waitFor({ state: 'visible', timeout: 10_000 });
    widgetOpenClose.push({
      selector,
      visible: await visibleWidget.isVisible(),
    });
    await page.locator('.glass-ui-widget.is-visible .glass-chat-close').first().click({ timeout: 10_000 });
    await page.locator('.glass-ui-widget.is-visible').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(3000);
  const heroAfterScroll = await collectHeroState(page);

  const firstServiceCard = page.locator('.service-simple-card[data-service-id]').first();
  await firstServiceCard.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/service-detail\.html\?id=\d+/, { timeout: 15_000 });
  const serviceCardNavigationUrl = page.url();

  const detail = [];
  for (let id = 0; id < 8; id += 1) {
    await page.goto(`${baseUrl}/service-detail.html?id=${id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(500);
    detail.push(await page.evaluate(() => ({
      title: document.querySelector('#service-title')?.textContent?.trim() || document.title,
      errorHidden: document.querySelector('#service-error')?.hidden ?? null,
      cardVisible: !(document.querySelector('#service-detail-card')?.hidden ?? true),
      heroChildren: document.querySelector('#service-hero-reel')?.children.length ?? 0,
      hasInlineScript: [...document.scripts].some((script) => !script.src && script.textContent.trim()),
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
      serviceSchema: Boolean(document.querySelector('[itemtype="https://schema.org/Service"]')),
      decisionCards: document.querySelectorAll('.service-decision-card').length,
      conversionCards: document.querySelectorAll('.detail-conversion-card').length,
      homeLink: (() => {
        const link = document.querySelector('.detail-home-link');
        if (!link) return { href: '', text: '', visible: false };
        const rect = link.getBoundingClientRect();
        return {
          href: link.getAttribute('href') || '',
          text: link.textContent.trim(),
          visible: rect.width > 0 && rect.height > 0,
        };
      })(),
      ctaHrefs: [...document.querySelectorAll('.service-detail-cta-section a[href]')]
        .map((link) => link.getAttribute('href') || ''),
    })));
  }

  await page.goto(`${baseUrl}/service-detail.html?id=0`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('.detail-home-link').click({ timeout: 10_000 });
  await page.waitForURL(/\/(?:index\.html)?$/, { timeout: 15_000 });
  const detailHomeClickUrl = page.url();

  await page.goto(`${baseUrl}/ai-photo-detail.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(500);
  const aiPhoto = {
    title: await page.title(),
    bodyTextLength: await page.evaluate(() => document.body.textContent.trim().length),
    hasInlineScript: await hasInlineScript(page),
    description: await page.evaluate(() => document.querySelector('meta[name="description"]')?.getAttribute('content') || ''),
    canonical: await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''),
    ogTitle: await page.evaluate(() => document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''),
    serviceSchema: await page.evaluate(() => Boolean(document.querySelector('[itemtype="https://schema.org/Service"]'))),
    conversionCards: await page.evaluate(() => document.querySelectorAll('.detail-conversion-card').length),
    conversionKickers: await page.evaluate(() => [...document.querySelectorAll('.detail-conversion-kicker')]
      .map((item) => item.textContent.trim())),
    homeLink: await page.evaluate(() => {
      const link = document.querySelector('.detail-home-link');
      if (!link) return { href: '', text: '', visible: false };
      const rect = link.getBoundingClientRect();
      return {
        href: link.getAttribute('href') || '',
        text: link.textContent.trim(),
        visible: rect.width > 0 && rect.height > 0,
      };
    }),
    ctaHrefs: await page.evaluate(() => [...document.querySelectorAll('.service-detail-cta-section a[href]')]
      .map((link) => link.getAttribute('href') || '')),
  };

  await page.locator('.detail-home-link').focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/(?:index\.html)?$/, { timeout: 15_000 });
  const aiPhotoHomeKeyboardUrl = page.url();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    serviceWorkers: 'block',
  });
  await mobileContext.addInitScript(() => {
    window.localStorage?.setItem('rv-cookie-consent', 'true');
  });
  const mobileDetailPage = await mobileContext.newPage();
  await mobileDetailPage.goto(`${baseUrl}/service-detail.html?id=0`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await mobileDetailPage.waitForTimeout(700);
  const mobileDetail = await mobileDetailPage.evaluate(() => {
    const links = [...document.querySelectorAll('.service-detail-cta-section a[href]')]
      .map((link) => {
        const rect = link.getBoundingClientRect();
        return {
          href: link.getAttribute('href') || '',
          text: link.textContent.trim(),
          visible: rect.width > 0 && rect.height > 0,
          rect: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
          },
        };
      })
      .filter((link) => link.visible);

    const overlaps = [];
    for (let i = 0; i < links.length; i += 1) {
      for (let j = i + 1; j < links.length; j += 1) {
        const a = links[i].rect;
        const b = links[j].rect;
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (x * y > 64) {
          overlaps.push([links[i].text, links[j].text]);
        }
      }
    }

    return {
      ctaHrefs: links.map((link) => link.href),
      overlaps,
      homeLink: (() => {
        const link = document.querySelector('.detail-home-link');
        if (!link) return { href: '', visible: false };
        const rect = link.getBoundingClientRect();
        return {
          href: link.getAttribute('href') || '',
          visible: rect.width > 0 && rect.height > 0,
        };
      })(),
    };
  });
  await mobileDetailPage.close();
  await mobileContext.close();

  const freshDetailPage = await context.newPage();
  await freshDetailPage.goto(`${baseUrl}/service-detail.html?id=0`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await freshDetailPage.waitForTimeout(900);
  const freshDetailRuntime = await freshDetailPage.evaluate(() => {
    const chatScripts = [...document.scripts]
      .map((script) => script.getAttribute('src') || '')
      .filter((src) => /GlassUIWidget|glass-ui-(?:hipych|bro-cat|valyusha)|chat(?:-client)?\.js/.test(src));
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
    analyticsRequests,
    ctaLinks,
    legacyChatOverlayPresent,
    homepageSeo,
    serviceCards,
    projectCases,
    heroTitleStyle,
    hero,
    heroSoundAfterSurfaceOn,
    heroSoundAfterSurfaceOff,
    heroSoundAfterVolumeOn,
    heroSoundAfterVolumeOff,
    heroAfterPlayResume,
    lowerImageSections,
    chatUi,
    chatNetworkUi,
    widgetOpenClose,
    heroAfterScroll,
    serviceCardNavigationUrl,
    detail,
    detailHomeClickUrl,
    aiPhoto,
    aiPhotoHomeKeyboardUrl,
    mobileDetail,
    freshDetailRuntime,
  };
  console.log(JSON.stringify(result, null, 2));

  if (consoleIssues.length) fail('browser smoke console errors/warnings found', consoleIssues);
  if (oldVideoRequests.length) fail('browser smoke requested old hero master video', oldVideoRequests);
  if (!ctaLinks.length || ctaLinks.some((link) => !link.href || link.href === '#')) {
    fail('browser smoke CTA/contact links are not wired', ctaLinks);
  }
  if (legacyChatOverlayPresent) {
    fail('browser smoke legacy chat overlay is still present');
  }
  if (
    !homepageSeo.description ||
    !homepageSeo.canonical ||
    !homepageSeo.ogTitle ||
    !homepageSeo.ogImage ||
    !homepageSeo.organizationSchema ||
    !homepageSeo.faqSchema
  ) {
    fail('browser smoke homepage SEO metadata failed', homepageSeo);
  }
  if (
    serviceCards.length < 8 ||
    serviceCards.some((card) => !card.href || card.tabIndex !== '0' || card.role !== 'link' || !card.label || !/Подробнее/.test(card.affordance))
  ) {
    fail('browser smoke service card affordance failed', serviceCards);
  }
  if (serviceCards.some((card) => card.benefit.length < 16)) {
    fail('browser smoke service card benefit copy missing', serviceCards);
  }
  if (projectCases.length < 6 || projectCases.some((entry) => !entry.title || entry.notes.length < 2)) {
    fail('browser smoke project case context missing', projectCases);
  }
  const normalizedHeroTitle = heroTitleStyle?.text?.replace(/\s+/g, '');
  if (
    !heroTitleStyle ||
    normalizedHeroTitle !== 'РЕАЛЬНЫЙVАЙБAISTUDIO' ||
    !/Unbounded/i.test(heroTitleStyle.fontFamily) ||
    heroTitleStyle.fontWeight !== '600'
  ) {
    fail('browser smoke hero title typography changed unexpectedly', heroTitleStyle);
  }
  if (!hero || !String(hero.src).includes('hero-reel-desktop.webm') || hero.paused) {
    fail('browser smoke hero did not stay playing on optimized WebM', hero);
  }
  if (!hero.muted) {
    fail('browser smoke hero did not start muted for autoplay policy', hero);
  }
  if (!heroSoundAfterSurfaceOn || heroSoundAfterSurfaceOn.muted || heroSoundAfterSurfaceOn.volume <= 0 || heroSoundAfterSurfaceOn.paused) {
    fail('browser smoke hero surface first click did not enable sound playback', heroSoundAfterSurfaceOn);
  }
  if (!heroSoundAfterSurfaceOff || !heroSoundAfterSurfaceOff.muted || heroSoundAfterSurfaceOff.paused) {
    fail('browser smoke hero surface second click did not mute without pausing', heroSoundAfterSurfaceOff);
  }
  if (!heroSoundAfterVolumeOn || heroSoundAfterVolumeOn.muted || heroSoundAfterVolumeOn.volume <= 0 || heroSoundAfterVolumeOn.paused) {
    fail('browser smoke hero volume click did not enable sound playback', heroSoundAfterVolumeOn);
  }
  if (!heroSoundAfterVolumeOff || !heroSoundAfterVolumeOff.muted || heroSoundAfterVolumeOff.paused) {
    fail('browser smoke hero volume second click did not mute without pausing', heroSoundAfterVolumeOff);
  }
  if (!heroAfterPlayResume || heroAfterPlayResume.muted || heroAfterPlayResume.volume <= 0 || heroAfterPlayResume.paused) {
    fail('browser smoke hero play resume did not keep sound enabled', heroAfterPlayResume);
  }
  for (const entry of Object.values(lowerImageSections)) {
    if (
      !entry.images.length ||
      entry.images.some((image) => image.loading !== 'eager' || image.fetchPriority !== 'low') ||
      entry.images.some((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || !image.visible)
    ) {
      fail('browser smoke lower section images were not ready when visible', lowerImageSections);
    }
  }
  if (!chatUi.visible || chatUi.messageCount < 3 || chatUi.inputDisabled || chatUi.buttonDisabled) {
    fail('browser smoke chat widget interaction failed', chatUi);
  }
  if (!chatNetworkUi.visible || chatNetworkUi.messageCount < 3 || chatNetworkUi.inputDisabled || chatNetworkUi.buttonDisabled) {
    fail('browser smoke chat network fallback failed', chatNetworkUi);
  }
  if (widgetOpenClose.length !== 3 || widgetOpenClose.some((entry) => !entry.visible)) {
    fail('browser smoke chat widgets did not open/close cleanly', widgetOpenClose);
  }
  if (!heroAfterScroll || heroAfterScroll.paused) {
    fail('browser smoke hero did not resume after scroll back', heroAfterScroll);
  }
  if (!/service-detail\.html\?id=\d+/.test(serviceCardNavigationUrl)) {
    fail('browser smoke service card navigation failed', serviceCardNavigationUrl);
  }
  for (const entry of detail) {
    const requiredCtas = ['https://t.me/Stivanovv', 'tel:+79319671483', 'mailto:polstan1986@gmail.com'];
    const hasRequiredCtas = requiredCtas.every((href) => entry.ctaHrefs.includes(href));
    if (
      !entry.errorHidden ||
      !entry.cardVisible ||
      entry.heroChildren < 1 ||
      entry.hasInlineScript ||
      !entry.description ||
      !entry.canonical ||
      !entry.ogTitle ||
      !entry.serviceSchema ||
      entry.decisionCards < 3 ||
      entry.conversionCards < 3 ||
      entry.homeLink.href !== 'index.html' ||
      !/На главную/.test(entry.homeLink.text) ||
      !entry.homeLink.visible ||
      !hasRequiredCtas
    ) {
      fail('browser smoke service detail failed', entry);
    }
  }
  if (!/\/(?:index\.html)?$/.test(detailHomeClickUrl)) {
    fail('browser smoke detail home click navigation failed', detailHomeClickUrl);
  }
  if (
    aiPhoto.hasInlineScript ||
    aiPhoto.bodyTextLength < 100 ||
    !aiPhoto.description ||
    !aiPhoto.canonical ||
    !aiPhoto.ogTitle ||
    !aiPhoto.serviceSchema ||
    aiPhoto.conversionCards < 3 ||
    !['Кому подходит', 'Что получите', 'Как стартуем'].every((label) => aiPhoto.conversionKickers.includes(label)) ||
    aiPhoto.homeLink.href !== 'index.html' ||
    !/На главную/.test(aiPhoto.homeLink.text) ||
    !aiPhoto.homeLink.visible ||
    !['https://t.me/Stivanovv', 'tel:+79319671483', 'mailto:polstan1986@gmail.com']
      .every((href) => aiPhoto.ctaHrefs.includes(href))
  ) {
    fail('browser smoke AI photo detail failed', aiPhoto);
  }
  if (!/\/(?:index\.html)?$/.test(aiPhotoHomeKeyboardUrl)) {
    fail('browser smoke AI photo home keyboard navigation failed', aiPhotoHomeKeyboardUrl);
  }
  if (
    mobileDetail.overlaps.length ||
    mobileDetail.homeLink.href !== 'index.html' ||
    !mobileDetail.homeLink.visible ||
    !['https://t.me/Stivanovv', 'tel:+79319671483', 'mailto:polstan1986@gmail.com']
      .every((href) => mobileDetail.ctaHrefs.includes(href))
  ) {
    fail('browser smoke mobile detail CTA layout failed', mobileDetail);
  }
  if (
    freshDetailRuntime.chatScripts.length ||
    freshDetailRuntime.glassWidgetLoaded ||
    freshDetailRuntime.eagerOffscreenVideos
  ) {
    fail('browser smoke detail page eagerly loaded chat/media runtime', freshDetailRuntime);
  }
  if (analyticsRequests < 4) {
    fail('browser smoke analytics events were not emitted', { analyticsRequests });
  }
} finally {
  await browser.close();
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('browser smoke checks passed');
