(function initAdminPrices() {
  const GROUP_ORDER = ['Production', 'Development', 'AI Automation', 'Visuals'];

  const MARKET = {
    services: {
      'ai-video': { group: 'Production', price: 'от 9 000₽', source: 'Real Vibe AI-video ladder', reason: 'Входной товарный ролик/Reels от 9К; 15К за более длинный ролик из нескольких нейросетей; 30К за сложный ролик 15-25 сек с монтажом.' },
      'smm-content': { group: 'Production', price: 'от 40 000₽', source: 'SMM retainer рынок', reason: 'Нижний порог для регулярной контент-системы, редакторики и AI-процессов.' },
      'creative-production': { group: 'Production', price: 'от 150 000₽', source: 'Creative production scope', reason: 'Creative direction, visual world, промо, сайт и roadmap запуска не должны стоить как одиночный ассет.' },
      music: { group: 'Production', price: 'от 20 000₽', source: 'Музыка / джинглы', reason: 'Минимальная авторская тема, джингл или трек под ролик с правками.' },
      'sound-design': { group: 'Production', price: 'от 15 000₽', source: 'Озвучка / sound design', reason: 'Озвучка, SFX, чистка и сведение требуют отдельного production-времени.' },
      apps: { group: 'Development', price: 'от 50 000₽ за MVP-модуль', source: 'AppStar MVP / SaaS', reason: 'Первый production-ready модуль с архитектурой, API/БД или дашбордом.' },
      websites: { group: 'Development', price: 'от 70 000₽', source: 'ii-site: business site tier', reason: 'Публичный сайт с AI-функциями, формами и контентом должен фильтровать микробюджеты.' },
      'agentic-ai-dev': { group: 'Development', price: 'разработка от 30 000₽', source: 'Agentic full-stack floor', reason: 'Общий якорь разработки; маленький аудит вынесен в отдельный rescue-оффер.' },
      bots: { group: 'AI Automation', price: 'от 10 000₽', source: 'Kwork + custom bot floor', reason: 'Минимальный бот с AI/БД/admin не продается за 4К; сложная логика считается отдельно.' },
      'ai-agents': { group: 'AI Automation', price: 'от 25 000₽', source: 'Custom GPT / workflow agent', reason: 'База знаний, сценарии, безопасность и тестирование требуют отдельного бюджета.' },
      'ai-photo': { group: 'Visuals', price: 'от 20 000₽ за сет', source: 'AI content / product visual', reason: 'Сет визуалов для карточек, баннеров или key visual с отбором и доводкой.' },
      'ecom-animation': { group: 'Visuals', price: 'от 35 000₽', source: 'Product motion scope', reason: 'Product loop или e-commerce инфографика сложнее одиночной картинки.' },
    },
    offers: {
      'agentic-ai-dev': {
        'vps-launchpad': { group: 'Development', price: 'от 30 000₽', source: 'VPS setup + deploy floor', reason: 'Сервер, домен, SSL и deploy-контур продаются как площадка развития, а не как разовая настройка хостинга.' },
        'telegram-mini-app': { group: 'Development', price: 'от 30 000₽', source: 'webprod / Abilene TMA', reason: 'TMA с Telegram auth/initData, API и мобильным UX лучше держать выше 20К.' },
        'ai-bot-db-admin': { group: 'AI Automation', price: 'от 10 000₽', source: 'Custom bot floor', reason: 'AI-бот с БД и admin-панелью не должен выглядеть как микрофикс.' },
        'ai-code-rescue': { group: 'Development', price: 'от 7 000₽', source: 'AI-code rescue floor', reason: 'Небольшой аудит или один фикс можно оставить доступным, но не за 4К.' },
        'mvp-saas-module': { group: 'Development', price: 'от 50 000₽', source: 'MVP module floor', reason: 'Авторизация, дашборд, база, роли и API — полноценный этап разработки.' },
      },
    },
  };

  const state = {
    apiOrigin: '',
    canWrite: false,
    filter: 'all',
    search: '',
    adminToken: window.sessionStorage.getItem('rv-price-admin-token') || '',
    selectedKey: '',
    priceBook: window.SERVICE_PRICE_OVERRIDES || { version: 1, services: {}, offers: {} },
    entries: [],
    dirtyKeys: new Set(),
  };

  const refs = {};

  function $(selector) {
    return document.querySelector(selector);
  }

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.attrs) {
      for (const [name, value] of Object.entries(options.attrs)) {
        element.setAttribute(name, value);
      }
    }
    return element;
  }

  function appendChildren(parent, children) {
    children.filter(Boolean).forEach((child) => parent.appendChild(child));
    return parent;
  }

  function cleanTitle(value) {
    return String(value || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  }

  function isOpenPrice(value) {
    const price = String(value || '').trim().toLowerCase();
    return !price || price.includes('уточ') || price.includes('обсуж') || price.includes('по оцен');
  }

  function firstNumber(value) {
    const match = String(value || '').replace(/\s+/g, '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function isBelowMarket(entry) {
    const current = firstNumber(entry.price);
    const recommended = firstNumber(entry.recommendedPrice);
    if (!recommended) return false;
    return isOpenPrice(entry.price) || current < recommended;
  }

  function uniqueOrigins() {
    const staticPreviewPorts = new Set(['3001', '4300', '4301']);
    const origins = [];
    if (!staticPreviewPorts.has(window.location.port)) {
      origins.push(window.location.origin);
    }
    if (!origins.includes('http://127.0.0.1:3000')) origins.push('http://127.0.0.1:3000');
    if (!origins.includes('http://localhost:3000')) origins.push('http://localhost:3000');
    return origins;
  }

  async function fetchApi(path, options = {}) {
    const origins = state.apiOrigin ? [state.apiOrigin] : uniqueOrigins();
    let lastError = null;

    for (const origin of origins) {
      try {
        const response = await fetch(`${origin}${path}`, {
          ...options,
          headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(state.adminToken ? { 'X-RV-Admin-Token': state.adminToken } : {}),
            ...(options.headers || {}),
          },
        });
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          lastError = new Error(`API ${origin} вернул не JSON`);
          continue;
        }
        const payload = await response.json();
        if (!response.ok) {
          lastError = new Error(payload.error || `API ${origin}: ${response.status}`);
          continue;
        }
        state.apiOrigin = origin;
        return payload;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('API прайса недоступен');
  }

  function serviceBook(slug) {
    state.priceBook.services = state.priceBook.services || {};
    state.priceBook.services[slug] = state.priceBook.services[slug] || {};
    return state.priceBook.services[slug];
  }

  function offerBook(serviceSlug) {
    state.priceBook.offers = state.priceBook.offers || {};
    state.priceBook.offers[serviceSlug] = state.priceBook.offers[serviceSlug] || {};
    return state.priceBook.offers[serviceSlug];
  }

  function offerRecommendation(serviceSlug, offerId) {
    return MARKET.offers?.[serviceSlug]?.[offerId] || {};
  }

  function buildEntries() {
    const services = window.getAllServices?.() || [];
    const entries = [];

    services.forEach((service) => {
      const book = serviceBook(service.slug);
      const market = MARKET.services[service.slug] || {};
      const price = book.price || service.price || '';
      entries.push({
        key: `service:${service.slug}`,
        type: 'service',
        id: String(service.id),
        slug: service.slug,
        title: cleanTitle(service.title),
        parentTitle: '',
        description: service.description || service.lead || '',
        price,
        originalPrice: price,
        note: book.note || '',
        originalNote: book.note || '',
        recommendedPrice: market.price || price,
        recommendationReason: market.reason || 'Рекомендация не задана.',
        marketSource: market.source || 'Внутренний ориентир',
        group: market.group || 'Production',
        url: `service-detail.html?id=${service.id}`,
      });

      if (!Array.isArray(service.offers)) return;
      service.offers.forEach((offer) => {
        const offerId = offer.id || offer.slug || offer.title;
        const bookEntry = offerBook(service.slug)[offerId] || {};
        const market = offerRecommendation(service.slug, offerId);
        const price = bookEntry.price || offer.price || '';
        entries.push({
          key: `offer:${service.slug}:${offerId}`,
          type: 'offer',
          id: offerId,
          slug: service.slug,
          title: offer.title || offerId,
          parentTitle: cleanTitle(service.title),
          description: offer.description || '',
          price,
          originalPrice: price,
          note: bookEntry.note || '',
          originalNote: bookEntry.note || '',
          recommendedPrice: market.price || price,
          recommendationReason: market.reason || 'Рекомендация не задана.',
          marketSource: market.source || 'Внутренний ориентир',
          group: market.group || 'Development',
          url: `service-detail.html?id=${service.id}`,
        });
      });
    });

    state.entries = entries;
    if (!state.entries.some((entry) => entry.key === state.selectedKey)) {
      state.selectedKey = entries[0]?.key || '';
    }
  }

  function entryMatches(entry) {
    const haystack = [
      entry.id,
      entry.slug,
      entry.title,
      entry.parentTitle,
      entry.price,
      entry.recommendedPrice,
      entry.marketSource,
      entry.note,
    ].join(' ').toLowerCase();

    if (state.search && !haystack.includes(state.search.toLowerCase())) return false;
    if (state.filter === 'needs-price') return isOpenPrice(entry.price);
    if (state.filter === 'below-market') return isBelowMarket(entry);
    if (state.filter === 'agentic') return entry.slug === 'agentic-ai-dev' || entry.slug === 'bots';
    if (state.filter === 'changed') return state.dirtyKeys.has(entry.key);
    return true;
  }

  function statusFor(entry) {
    if (state.dirtyKeys.has(entry.key)) return { className: 'is-dirty', text: 'Изменено' };
    if (isOpenPrice(entry.price)) return { className: 'is-open', text: 'Нет цены' };
    if (isBelowMarket(entry)) return { className: 'is-below', text: 'Ниже рынка' };
    return { className: 'is-good', text: 'Ок' };
  }

  function statusBadge(entry) {
    const status = statusFor(entry);
    return createElement('span', {
      className: `status-badge ${status.className}`,
      text: status.text,
    });
  }

  function createPriceInput(entry) {
    const input = createElement('input', {
      className: 'price-input',
      attrs: {
        type: 'text',
        value: entry.price,
        'data-price-input': entry.key,
        'aria-label': `Публичная цена: ${entry.title}`,
      },
    });
    input.value = entry.price;
    return input;
  }

  function createPriceRow(entry) {
    const row = createElement('article', {
      className: [
        'price-row',
        entry.key === state.selectedKey ? 'is-selected' : '',
        state.dirtyKeys.has(entry.key) ? 'is-dirty' : '',
      ].filter(Boolean).join(' '),
      attrs: { 'data-entry-key': entry.key },
    });

    const serviceCell = appendChildren(createElement('div', { className: 'service-cell' }), [
      createElement('span', { className: 'row-meta', text: entry.type === 'service' ? `ID ${entry.id} / ${entry.slug}` : `Оффер / ${entry.parentTitle}` }),
      createElement('strong', { text: entry.title }),
      createElement('p', { text: entry.description || 'Описание не задано.' }),
    ]);

    const currentCell = appendChildren(createElement('div', { className: 'current-cell' }), [
      createElement('span', { className: 'current-label', text: 'Сейчас' }),
      createElement('strong', { text: entry.originalPrice || '—' }),
    ]);

    const marketCell = appendChildren(createElement('div', { className: 'market-cell' }), [
      createElement('strong', { text: entry.recommendedPrice || '—' }),
      createElement('p', { text: `${entry.marketSource}: ${entry.recommendationReason}` }),
    ]);

    const statusCell = appendChildren(createElement('div', { className: 'status-cell' }), [
      statusBadge(entry),
      createElement('a', {
        className: 'row-link',
        text: 'Открыть',
        attrs: { href: entry.url, target: '_blank', rel: 'noopener' },
      }),
    ]);

    appendChildren(row, [
      serviceCell,
      currentCell,
      marketCell,
      createPriceInput(entry),
      statusCell,
    ]);
    return row;
  }

  function visibleEntries() {
    return state.entries.filter(entryMatches);
  }

  function groupEntries(entries) {
    const byGroup = new Map();
    entries.forEach((entry) => {
      byGroup.set(entry.group, [...(byGroup.get(entry.group) || []), entry]);
    });
    return GROUP_ORDER
      .filter((group) => byGroup.has(group))
      .map((group) => ({ group, entries: byGroup.get(group) }));
  }

  function renderList() {
    const entries = visibleEntries();
    const children = [];

    groupEntries(entries).forEach(({ group, entries: groupItems }) => {
      children.push(createElement('div', { className: 'group-row', text: `${group} · ${groupItems.length}` }));
      groupItems.forEach((entry) => children.push(createPriceRow(entry)));
    });

    if (children.length === 0) {
      children.push(createElement('p', { className: 'empty-state muted', text: 'Нет позиций под выбранный фильтр.' }));
    }

    refs.table.replaceChildren(...children);
    refs.visibleCount.textContent = `${entries.length} позиций`;
  }

  function metricOpenCount() {
    return state.entries.filter((entry) => isOpenPrice(entry.price)).length;
  }

  function metricBelowCount() {
    return state.entries.filter((entry) => isBelowMarket(entry)).length;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function renderMetrics() {
    refs.metricOpen.textContent = String(metricOpenCount());
    refs.metricBelow.textContent = String(metricBelowCount());
    refs.dirtyCount.textContent = `${state.dirtyKeys.size} изменений`;
    refs.saveStatus.textContent = state.dirtyKeys.size ? `${state.dirtyKeys.size} не сохранено` : 'Нет изменений';
    refs.updatedAt.textContent = formatDate(state.priceBook.updatedAt);
    refs.saveButton.disabled = !state.canWrite || state.dirtyKeys.size === 0;
  }

  function quickButton(label, price, tone = '') {
    const attrs = { type: 'button', 'data-quick-price': price };
    if (tone) attrs['data-tone'] = tone;
    return createElement('button', {
      className: 'quick-action',
      text: label,
      attrs,
    });
  }

  function renderInspector() {
    const entry = state.entries.find((item) => item.key === state.selectedKey);
    refs.inspector.replaceChildren();
    if (!entry) {
      refs.inspector.appendChild(createElement('p', { className: 'muted', text: 'Нет выбранной позиции.' }));
      return;
    }

    const title = appendChildren(createElement('div', { className: 'inspector-title' }), [
      createElement('span', { className: 'row-meta', text: entry.type === 'service' ? `Услуга / ${entry.slug}` : `Оффер / ${entry.parentTitle}` }),
      createElement('h3', { text: entry.title }),
      createElement('p', { className: 'muted', text: entry.description || 'Описание не задано.' }),
    ]);

    const summary = appendChildren(createElement('div', { className: 'inspector-summary' }), [
      appendChildren(createElement('div', { className: 'summary-item' }), [
        createElement('span', { text: 'Сейчас' }),
        createElement('strong', { text: entry.originalPrice || '—' }),
      ]),
      appendChildren(createElement('div', { className: 'summary-item' }), [
        createElement('span', { text: 'Рекомендация' }),
        createElement('strong', { text: entry.recommendedPrice || '—' }),
      ]),
    ]);

    const reason = appendChildren(createElement('div', { className: 'summary-item' }), [
      createElement('span', { text: entry.marketSource }),
      createElement('strong', { text: entry.recommendationReason }),
    ]);

    const note = createElement('textarea', {
      className: 'note-input',
      attrs: {
        'data-note-input': entry.key,
        rows: '5',
        placeholder: 'Комментарий для себя и будущих агентов',
      },
    });
    note.value = entry.note || '';

    const fields = appendChildren(createElement('div', { className: 'inspector-grid' }), [
      appendChildren(createElement('label', { className: 'field-label' }), [
        createElement('span', { text: 'Публичная цена' }),
        createPriceInput(entry),
      ]),
      appendChildren(createElement('label', { className: 'field-label' }), [
        createElement('span', { text: 'Внутренняя заметка' }),
        note,
      ]),
    ]);

    const quickActions = appendChildren(createElement('div', { className: 'quick-actions' }), [
      quickButton('от 9К', 'от 9 000₽'),
      quickButton('от 10К', 'от 10 000₽'),
      quickButton('15К', '15 000₽'),
      quickButton('от 20К', 'от 20 000₽'),
      quickButton('от 30К', 'от 30 000₽'),
      quickButton('от 50К', 'от 50 000₽'),
      quickButton('от 80К', 'от 80 000₽'),
      quickButton('от 150К', 'от 150 000₽', 'strong'),
      quickButton('Рекомендация', entry.recommendedPrice, 'strong'),
    ]);

    const link = createElement('a', {
      className: 'link-action',
      text: 'Открыть на сайте',
      attrs: { href: entry.url, target: '_blank', rel: 'noopener' },
    });

    appendChildren(refs.inspector, [title, summary, reason, fields, quickActions, link]);
  }

  function render() {
    renderList();
    renderMetrics();
    renderInspector();
  }

  function markDirty(entry) {
    if (entry.price === entry.originalPrice && entry.note === entry.originalNote) {
      state.dirtyKeys.delete(entry.key);
    } else {
      state.dirtyKeys.add(entry.key);
    }
  }

  function syncInputs(key, value, source) {
    document.querySelectorAll('[data-price-input]').forEach((input) => {
      if (input === source) return;
      if (input.getAttribute('data-price-input') === key) {
        input.value = value;
      }
    });
  }

  function setEntryPrice(key, price, options = {}) {
    const entry = state.entries.find((item) => item.key === key);
    if (!entry) return;
    entry.price = price;
    markDirty(entry);
    syncInputs(key, price, options.source || null);
    if (options.render) {
      render();
    } else {
      renderMetrics();
    }
  }

  function setEntryNote(key, note) {
    const entry = state.entries.find((item) => item.key === key);
    if (!entry) return;
    entry.note = note;
    markDirty(entry);
    renderMetrics();
  }

  function updatePriceBookFromEntries() {
    state.entries.forEach((entry) => {
      if (entry.type === 'service') {
        const item = serviceBook(entry.slug);
        item.title = entry.title;
        item.price = entry.price;
        item.note = entry.note || '';
        return;
      }

      const item = offerBook(entry.slug)[entry.id] || {};
      item.title = entry.title;
      item.price = entry.price;
      item.note = entry.note || '';
      offerBook(entry.slug)[entry.id] = item;
    });
  }

  function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    existing?.remove();
    const toast = createElement('div', {
      className: `toast ${isError ? 'is-error' : ''}`,
      text: message,
      attrs: { role: 'status' },
    });
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function applyRecommendations() {
    const targets = state.entries.filter((entry) => isOpenPrice(entry.price));
    if (targets.length === 0) {
      showToast('Открытых цен нет. Все позиции уже имеют публичный порог.');
      return;
    }

    targets.forEach((entry) => {
      entry.price = entry.recommendedPrice;
      markDirty(entry);
    });
    render();
    showToast(`Рекомендации проставлены: ${targets.length}`);
  }

  async function loadPriceBook() {
    try {
      const payload = await fetchApi('/api/admin/prices');
      state.priceBook = payload.priceBook || state.priceBook;
      state.canWrite = Boolean(payload.canWrite);
      refs.apiStatus.textContent = state.canWrite ? 'Запись доступна' : 'Только просмотр';
    } catch (error) {
      state.canWrite = false;
      refs.apiStatus.textContent = 'Локальный просмотр';
      showToast(`${error.message}. Запусти npm run dev для сохранения.`, true);
    }

    buildEntries();
    render();
  }

  async function savePrices() {
    updatePriceBookFromEntries();
    refs.saveButton.disabled = true;
    refs.saveStatus.textContent = 'Сохранение...';

    try {
      const payload = await fetchApi('/api/admin/prices', {
        method: 'PUT',
        body: JSON.stringify(state.priceBook),
      });
      state.priceBook = payload.priceBook || state.priceBook;
      window.SERVICE_PRICE_OVERRIDES = state.priceBook;
      state.dirtyKeys.clear();
      buildEntries();
      render();
      showToast('Цены сохранены в data/service-prices.json и js/service-prices.js');
    } catch (error) {
      showToast(error.message, true);
      renderMetrics();
    }
  }

  function bindEvents() {
    refs.search.addEventListener('input', (event) => {
      state.search = event.target.value.trim();
      renderList();
    });

    refs.tokenInput.addEventListener('input', (event) => {
      state.adminToken = event.target.value.trim();
      window.sessionStorage.setItem('rv-price-admin-token', state.adminToken);
    });

    refs.tokenInput.addEventListener('change', loadPriceBook);
    refs.saveButton.addEventListener('click', savePrices);
    refs.applyRecommendations.addEventListener('click', applyRecommendations);

    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.getAttribute('data-filter') || 'all';
        document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
        renderList();
      });
    });

    document.addEventListener('input', (event) => {
      const priceInput = event.target.closest('[data-price-input]');
      if (priceInput) {
        setEntryPrice(priceInput.getAttribute('data-price-input'), priceInput.value, { source: priceInput });
        return;
      }

      const noteInput = event.target.closest('[data-note-input]');
      if (noteInput) {
        setEntryNote(noteInput.getAttribute('data-note-input'), noteInput.value);
      }
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('a, button, input, textarea, summary')) return;

      const row = event.target.closest('[data-entry-key]');
      if (row) {
        state.selectedKey = row.getAttribute('data-entry-key');
        render();
      }
    });

    document.addEventListener('click', (event) => {
      const quick = event.target.closest('[data-quick-price]');
      if (quick && state.selectedKey) {
        setEntryPrice(state.selectedKey, quick.getAttribute('data-quick-price'), { render: true });
      }
    });
  }

  function cacheRefs() {
    refs.table = $('[data-price-table]');
    refs.inspector = $('[data-inspector]');
    refs.search = $('[data-price-search]');
    refs.tokenInput = $('[data-admin-token]');
    refs.saveButton = $('[data-save-prices]');
    refs.applyRecommendations = $('[data-apply-recommendations]');
    refs.apiStatus = $('[data-api-status]');
    refs.saveStatus = $('[data-save-status]');
    refs.updatedAt = $('[data-updated-at]');
    refs.metricOpen = $('[data-metric-open]');
    refs.metricBelow = $('[data-metric-below]');
    refs.visibleCount = $('[data-visible-count]');
    refs.dirtyCount = $('[data-dirty-count]');
  }

  function init() {
    cacheRefs();
    refs.tokenInput.value = state.adminToken;
    bindEvents();
    loadPriceBook();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
