(function initServiceDetailPage() {
  const TELEGRAM_URL = 'https://t.me/Stivanovv';

  function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = String(options.text);
    if (options.attrs) {
      for (const [name, value] of Object.entries(options.attrs)) {
        if (value !== undefined && value !== null && value !== '') {
          element.setAttribute(name, String(value));
        }
      }
    }
    return element;
  }

  function appendChildren(parent, children) {
    for (const child of children.filter(Boolean)) {
      parent.appendChild(child);
    }
    return parent;
  }

  function isSafeAssetUrl(value) {
    if (!value || typeof value !== 'string') return false;
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function createIcon(className) {
    const icon = createElement('i');
    String(className || 'fab fa-telegram')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => /^[a-z0-9_-]+$/i.test(part))
      .forEach((part) => icon.classList.add(part));
    return icon;
  }

  function createServiceButton(service) {
    const button = createElement('a', {
      className: 'service-btn',
      attrs: {
        href: TELEGRAM_URL,
        'data-contact-link': 'telegram',
      },
    });
    appendChildren(button, [
      createIcon(service.buttonIcon),
      document.createTextNode(service.buttonText || 'Заказать'),
    ]);
    return button;
  }

  function ensureMeta(selector, create) {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = create();
      document.head.appendChild(element);
    }
    return element;
  }

  function setMeta(name, content) {
    const meta = ensureMeta(`meta[name="${name}"]`, () => {
      const element = document.createElement('meta');
      element.setAttribute('name', name);
      return element;
    });
    meta.setAttribute('content', content);
  }

  function setProperty(property, content) {
    const meta = ensureMeta(`meta[property="${property}"]`, () => {
      const element = document.createElement('meta');
      element.setAttribute('property', property);
      return element;
    });
    meta.setAttribute('content', content);
  }

  function setCanonical(href) {
    const link = ensureMeta('link[rel="canonical"]', () => {
      const element = document.createElement('link');
      element.setAttribute('rel', 'canonical');
      return element;
    });
    link.setAttribute('href', href);
  }

  function createImage(src, alt, className) {
    if (!isSafeAssetUrl(src)) return null;
    return createElement('img', {
      className,
      attrs: {
        src,
        alt: alt || '',
        loading: 'lazy',
        decoding: 'async',
      },
    });
  }

  function createHeroVideo(src) {
    const video = createElement('video', {
      className: 'hero-reel-video',
      attrs: {
        'data-managed-video': '',
        preload: 'metadata',
        'data-desktop-src': src,
      },
    });
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    return video;
  }

  function createDefaultHeroVideo() {
    const video = createElement('video', {
      className: 'hero-reel-video',
      attrs: {
        'data-managed-video': '',
        preload: 'metadata',
        'data-desktop-webm-src': 'public/works/hero-reel-desktop.webm',
        'data-desktop-src': 'public/works/hero-reel-desktop.mp4',
        'data-mobile-src': 'public/works/hero-reel-mobile.mp4',
      },
    });
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    const mobileSource = createElement('source', {
      attrs: { src: 'public/works/hero-reel-mobile.mp4', type: 'video/mp4', media: '(max-width: 900px)' },
    });
    const webmSource = createElement('source', {
      attrs: { src: 'public/works/hero-reel-desktop.webm', type: 'video/webm' },
    });
    const mp4Source = createElement('source', {
      attrs: { src: 'public/works/hero-reel-desktop.mp4', type: 'video/mp4' },
    });
    return appendChildren(video, [mobileSource, webmSource, mp4Source]);
  }

  function renderHero(service) {
    const heroReel = document.getElementById('service-hero-reel');
    if (!heroReel) return;

    const bgImage = service.backgroundImage || '';
    const lowerBg = bgImage.toLowerCase();
    const hasVideo = isSafeAssetUrl(bgImage) && (lowerBg.includes('.mp4') || lowerBg.includes('video') || lowerBg.includes('.mov'));
    const hasImage = isSafeAssetUrl(bgImage) && !hasVideo && /\.(jpe?g|png|webp)(\?|$)/i.test(bgImage);

    const media = hasVideo
      ? createHeroVideo(bgImage)
      : hasImage
        ? createImage(bgImage, service.title || service.detailTitle || 'Service', 'hero-reel-video')
        : createDefaultHeroVideo();

    heroReel.replaceChildren(
      media,
      createElement('div', { className: 'hero-reel-overlay' }),
      createElement('div', { className: 'hero-reel-content' }),
    );
    window.videoOptimizer?.refresh?.();
  }

  function createIconBlock(service) {
    const icon = createElement('div', { className: 'service-icon service-icon-image' });
    const image = createImage(service.avatarImage, service.title, 'service-icon-img');
    if (image) icon.appendChild(image);
    return icon;
  }

  function createTextBlock(tagName, className, text) {
    if (!text) return null;
    return createElement(tagName, { className, text });
  }

  function createList(items, className = 'service-detail-list', withCheckIcon = false) {
    if (!Array.isArray(items) || items.length === 0) return null;
    const list = createElement('ul', { className });
    for (const item of items) {
      const li = createElement('li');
      if (withCheckIcon) li.appendChild(createIcon('fas fa-check'));
      li.appendChild(document.createTextNode(String(item)));
      list.appendChild(li);
    }
    return list;
  }

  function createContentSection(title, children) {
    const validChildren = children.filter(Boolean);
    if (validChildren.length === 0) return null;

    const section = createElement('div', { className: 'service-detail-content-section' });
    appendChildren(section, [
      createTextBlock('h2', 'service-detail-section-title', title),
      ...validChildren,
    ]);
    return section;
  }

  function createDetailItems(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items.map((item) => {
      const wrapper = createElement('div', { className: 'service-detail-item' });
      appendChildren(wrapper, [
        createTextBlock('h3', 'service-detail-item-title', item.title),
        createTextBlock('p', 'service-detail-item-description', item.description),
      ]);
      return wrapper;
    });
  }

  function compactText(value, fallback = '') {
    const text = String(value || fallback).replace(/\s+/g, ' ').trim();
    if (text.length <= 170) return text;
    return `${text.slice(0, 167).trim()}...`;
  }

  function firstDetailText(items, fallback = '') {
    if (!Array.isArray(items) || items.length === 0) return fallback;
    const item = items.find((entry) => entry?.description || entry?.title);
    if (!item) return fallback;
    return compactText(item.description || item.title, fallback);
  }

  function createSummaryCard(kicker, text) {
    const card = createElement('article', { className: 'service-decision-card' });
    appendChildren(card, [
      createElement('span', { className: 'service-decision-kicker', text: kicker }),
      createElement('p', { text }),
    ]);
    return card;
  }

  function createDecisionSummary(service) {
    const fitText = firstDetailText(service.useCases, service.description || service.lead);
    const resultText = compactText(
      Array.isArray(service.whatYouGet) ? service.whatYouGet[0] : service.description,
      'Готовый результат, который можно сразу использовать в рекламе, контенте или работе команды.',
    );
    const startText = firstDetailText(
      service.whatWeDo,
      'Начинаем с короткого брифа: цель, материалы, сроки, площадки и желаемый результат.',
    );

    const wrapper = createElement('div', {
      className: 'service-decision-summary',
      attrs: { 'aria-label': 'Коротко об услуге' },
    });
    return appendChildren(wrapper, [
      createSummaryCard('Кому подходит', fitText),
      createSummaryCard('Что получите', resultText),
      createSummaryCard('Как стартуем', startText),
    ]);
  }

  function createPrice(service) {
    const price = createElement('div', { className: 'service-price' });
    appendChildren(price, [
      createElement('span', { className: 'price-label', text: 'Стоимость' }),
      createElement('span', { className: 'price-value', text: service.price || 'Уточняется' }),
    ]);
    return price;
  }

  function createStartSteps() {
    return createContentSection('Как стартуем', [
      createList([
        'Вы пишете в Telegram и коротко описываете задачу.',
        'Мы уточняем формат, сроки, материалы и желаемый результат.',
        'После согласования запускаем работу и показываем первые промежуточные результаты.',
      ], 'service-detail-list', true),
    ]);
  }

  function updateCtaCopy(service) {
    const left = document.querySelector('.service-detail-cta-text .cta-text-left');
    const right = document.querySelector('.service-detail-cta-text .cta-text-right');
    if (!left || !right) return;

    const title = service.detailTitle || service.title || 'AI-решение под задачу';
    const description = service.description || service.lead || 'Обсудим формат, сроки и результат до старта.';
    const price = service.price || 'Стоимость уточняется';

    left.replaceChildren(
      createElement('p', { className: 'cta-text-line', text: title.replace(/^[^\p{L}\p{N}]+/u, '') }),
      createElement('p', { className: 'cta-text-line cta-text-line-muted', text: price }),
    );
    right.replaceChildren(
      createElement('p', { className: 'cta-text-line', text: description }),
      createElement('p', { className: 'cta-text-line', text: 'Первый шаг — написать в Telegram и прислать вводные.' }),
    );
  }

  function updateSeo(service, serviceId) {
    const title = `${service.title} | Реальный Vайб AI Studio`;
    const description = (service.description || service.lead || 'AI-услуга Real Vibe Studio под задачу бизнеса.').slice(0, 180);
    const canonical = `${window.location.origin}/service-detail.html?id=${encodeURIComponent(serviceId)}`;
    const image = new URL(service.backgroundImage || 'public/works/hero-poster.jpg', window.location.href).href;

    document.title = title;
    setMeta('description', description);
    setCanonical(canonical);
    setProperty('og:title', title);
    setProperty('og:description', description);
    setProperty('og:type', 'website');
    setProperty('og:url', canonical);
    setProperty('og:image', image);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);
  }

  function createServiceMicrodata(service, serviceId) {
    const wrapper = createElement('div', {
      className: 'seo-structured-data',
      attrs: {
        itemscope: 'itemscope',
        itemtype: 'https://schema.org/Service',
      },
    });
    appendChildren(wrapper, [
      createElement('meta', { attrs: { itemprop: 'name', content: service.detailTitle || service.title } }),
      createElement('meta', { attrs: { itemprop: 'description', content: service.description || service.lead || '' } }),
      createElement('meta', { attrs: { itemprop: 'serviceType', content: service.title } }),
      createElement('link', { attrs: { itemprop: 'url', href: `${window.location.origin}/service-detail.html?id=${encodeURIComponent(serviceId)}` } }),
    ]);
    return wrapper;
  }

  function renderDetailedCard(service, content) {
    appendChildren(content, [
      createIconBlock(service),
      createTextBlock('h1', 'service-detail-title', service.detailTitle || service.title),
      createTextBlock('p', 'service-detail-lead', service.lead),
      createDecisionSummary(service),
      createContentSection(service.aboutPersonTitle || 'Кто за это отвечает', [
        service.aboutPerson ? appendChildren(createElement('div', { className: 'service-detail-about-person' }), [
          createTextBlock('h3', 'service-detail-person-name', service.aboutPerson.name),
          createList(service.aboutPerson.points),
        ]) : null,
      ]),
      createContentSection(service.useCasesTitle || 'Для чего подойдут наши боты', createDetailItems(service.useCases)),
      createContentSection(service.whatWeDoTitle || 'Что мы делаем в рамках услуги', createDetailItems(service.whatWeDo)),
      createContentSection(service.formatsTitle || 'Какие форматы бот-решений мы делаем', [
        createList(service.formats),
      ]),
      createContentSection('Что вы получаете', [
        createList(service.whatYouGet),
      ]),
      createStartSteps(),
      createPrice(service),
      createServiceButton(service),
    ]);
  }

  function renderSimpleCard(service, content) {
    const features = createElement('div', { className: 'service-detail-features' });
    appendChildren(features, [
      createTextBlock('h3', '', 'Возможности:'),
      createList(service.features, 'service-features', true),
    ]);

    appendChildren(content, [
      createIconBlock(service),
      createTextBlock('h1', 'service-detail-title', service.title),
      createTextBlock('p', 'service-detail-description', service.description),
      createDecisionSummary(service),
      features,
      createStartSteps(),
      createPrice(service),
      createServiceButton(service),
    ]);
  }

  function renderServiceDetail(service) {
    renderHero(service);

    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundColor = '#050505';

    const section = document.querySelector('.service-detail-section');
    if (section) {
      section.style.backgroundImage = 'none';
      section.style.backgroundColor = 'transparent';
    }

    const card = document.getElementById('service-detail-card');
    if (!card) return;

    const content = createElement('div', { className: 'service-detail-content' });
    const hasDetailedContent = service.detailTitle || service.lead || service.useCases || service.whatWeDo || service.formats || service.whatYouGet;
    if (hasDetailedContent) {
      renderDetailedCard(service, content);
    } else {
      renderSimpleCard(service, content);
    }
    content.appendChild(createServiceMicrodata(service, service.id));
    card.replaceChildren(content);
    card.hidden = false;
  }

  function showError() {
    const card = document.getElementById('service-detail-card');
    const error = document.getElementById('service-error');
    if (card) card.hidden = true;
    if (error) error.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const serviceId = new URLSearchParams(window.location.search).get('id');
    const service = serviceId ? window.getServiceById?.(serviceId) : null;
    if (!service) {
      showError();
      return;
    }

    renderServiceDetail(service);
    updateCtaCopy(service);
    updateSeo(service, serviceId);

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = `${service.title} | Реальный Vайб AI Studio`;
    }
  });
})();
