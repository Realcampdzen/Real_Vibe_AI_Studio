const offers = {
  business: {
    label: 'Стартовый продукт',
    title: 'MAX Business Setup',
    coverTitle: 'Подключу MAX Business для бизнеса',
    tag: 'ИП / ООО',
    price: '7 000₽',
    coverPrice: 'от 7 000₽',
    duration: '2 дня',
    upsell: 'канал + бот',
    bg: 'url("../public/works/services/apps/cover-business-apps-2026.png")',
    summary: 'Помогу подключить и подготовить MAX Business для вашего ИП или ООО: профиль организации, поля, сайт, контакты, канал, первый бот и понятная схема дальнейшего запуска.',
    tabs: {
      scope: ['Аудит готовности ИП/ООО к запуску в MAX Business.', 'Структура профиля: название, описание, сайт, контакты, ссылки.', 'Карта запуска: канал, первый бот, mini app, заявки, AI-апселл.', 'Инструкция по безопасной работе с токенами и доступами после старта заказа.'],
      requirements: ['Тип организации, ИНН, сайт или описание бизнеса.', 'Название, логотип, контактный телефон и желаемая ссылка.', 'Понимание первой задачи: заявки, канал, поддержка, продажи или mini app.'],
      limits: ['Подтверждение организации выполняет владелец через доступные способы MAX Business.', 'Не просим PIN, закрытые ключи, пароли или токены в открытый чат.', 'Не гарантируем модерацию, но готовим профиль и материалы корректно.'],
      cover: ['Business-first визуал: официальный темный кабинет, чистые белые плашки, понятные слова “ИП/ООО”, “канал”, “до 5 ботов”.', 'Не использовать фейковый официальный логотип MAX. Использовать текстовый wordmark MAX.']
    }
  },
  bot: {
    label: 'Канал заявок',
    title: 'MAX Bot Pack',
    coverTitle: 'Создам MAX-бота для заявок и FAQ',
    tag: 'BOT PACK',
    price: '12 000₽',
    coverPrice: 'от 12 000₽',
    duration: '3 дня',
    upsell: 'CRM / доп. боты',
    bg: 'url("../public/works/services/bots/cover-bot-workflow-clean-2026.png")',
    summary: 'Создам MAX-бота на вашем Business-аккаунте: сценарий заявок, FAQ, кнопки, сбор контактов и уведомления менеджеру. При необходимости разложу структуру до 5 ботов под разные роли.',
    tabs: {
      scope: ['Сценарий диалога и дерево кнопок.', 'Прием заявки: имя, контакт, задача, комментарий.', 'Webhook/API-обработка и уведомления менеджеру.', 'Базовый лог событий и инструкция по эксплуатации.', 'План масштабирования до 5 ролей: продажи, поддержка, запись, контент, внутренний агент.'],
      requirements: ['Доступ к созданному MAX-боту или токен после начала заказа.', 'Список вопросов/ответов, тексты кнопок и куда отправлять заявки.', 'Логотип, описание бизнеса и ограничения по ответам.'],
      limits: ['Сложная CRM, платежи, личные кабинеты и персональные данные проектируются отдельно.', 'Бот действует в согласованном сценарии и не выполняет необратимые действия без отдельного approval-процесса.'],
      cover: ['Кнопки, карточки сообщений, стрелка “MAX → заявка → менеджер”.', 'Визуал бизнес-процесса, а не дешевый “bot script”.']
    }
  },
  miniapp: {
    label: 'Mobile interface',
    title: 'MAX Mini App',
    coverTitle: 'Соберу mini app: каталог, квиз, заявка',
    tag: 'MINI APP',
    price: '24 000₽',
    coverPrice: 'от 24 000₽',
    duration: '5 дней',
    upsell: 'доп. экраны / аналитика',
    bg: 'url("../public/works/services/apps/cover-ai-app-product-2026.jpg")',
    summary: 'Соберу mini app для MAX: мобильный каталог услуг, квиз подбора, форма заявки, запись или MVP-витрина. Клиент не уходит в длинную переписку, а сразу видит понятный интерфейс внутри MAX.',
    tabs: {
      scope: ['Структура mini app до 3 экранов.', 'Mobile-first UI под каталог, квиз, форму или запись.', 'Передача данных в таблицу, CRM, email или уведомление.', 'Кнопки перехода из бота/канала и базовая аналитика событий.'],
      requirements: ['Список услуг/товаров, цены, фото или портфолио.', 'Какие поля нужны в заявке и куда отправлять результат.', 'MAX-бот после модерации и настройки mini app.'],
      limits: ['Сложный личный кабинет, платежи, статусы заказов и авторизация считаются отдельным MVP.', 'Видимые юридические/персональные данные требуют отдельного проектирования.'],
      cover: ['Телефонный интерфейс, карточки услуг, квиз и крупная кнопка заявки.', 'Акцент на продуктовый экран, не на абстрактную нейросетку.']
    }
  },
  agent: {
    label: 'Premium moat',
    title: 'MAX AI Agent on VPS',
    coverTitle: 'Подключу AI-агента в MAX на VPS',
    tag: 'AI / VPS',
    price: '15 000₽ старт',
    coverPrice: 'от 15 000₽',
    duration: '5-7 дней',
    upsell: 'база знаний / Hermes',
    bg: 'url("../public/works/services/agentic-ai-dev/cover-hermes-office-2026.jpg")',
    summary: 'Подключу AI-агента к MAX-боту: сообщения из MAX идут через webhook на VPS, агент отвечает, разбирает задачи, готовит планы, проверяет статусы и может создавать черновики заявок или карточек.',
    tabs: {
      scope: ['VPS-адаптер и webhook MAX → agent gateway.', 'Безопасные env-секреты, allowlist и health-check.', 'Подключение к модели, базе знаний или Hermes-профилю.', 'Smoke-тест, лог событий и инструкция по эксплуатации.'],
      requirements: ['MAX-бот, токен в безопасном канале после старта заказа.', 'Описание роли агента и границы действий.', 'Материалы базы знаний: сайт, FAQ, документы, таблицы или регламенты.'],
      limits: ['AI-агент не должен подтверждать юридически значимые, платежные или необратимые действия без отдельного owner approval.', 'Стоимость API-моделей, VPS и сторонних сервисов не входит в базовую цену.'],
      cover: ['Схема “MAX → webhook → VPS → Hermes/AI”.', 'Премиальный техно-визуал, отличающий нас от обычных исполнителей чат-ботов.']
    }
  },
  migration: {
    label: 'Migration',
    title: 'Telegram → MAX Migration',
    coverTitle: 'Перенесу Telegram-бота или канал в MAX',
    tag: 'MIGRATION',
    price: '15 000₽',
    coverPrice: 'от 15 000₽',
    duration: '4 дня',
    upsell: 'синхронизация каналов',
    bg: 'url("../public/works/portfolio/hermes-agent-os-20260521.jpg")',
    summary: 'Разберу текущий Telegram-бот, канал, mini app или форму заявок и перенесу ключевую логику в MAX: тексты, кнопки, сценарии, прием заявок и связь с сайтом или CRM.',
    tabs: {
      scope: ['Аудит текущего Telegram-сценария.', 'Карта переноса функций в MAX.', 'Адаптация текстов, кнопок, заявок и уведомлений.', 'Тестовые заявки и рекомендации, что оставить в Telegram.'],
      requirements: ['Ссылка на Telegram-бота/канал, скриншоты и описание сценариев.', 'Куда сейчас приходят заявки и что нужно повторить в MAX.', 'Приоритет: скорость запуска или максимальное совпадение с текущей логикой.'],
      limits: ['Не все функции Telegram имеют прямой аналог в MAX.', 'Полная синхронизация Telegram ↔ MAX считается отдельно.'],
      cover: ['Две дорожки “Telegram” и “MAX”, стрелка переноса, бизнес-структура.', 'Не обещать полный feature parity без аудита.']
    }
  },
  funnel: {
    label: 'Premium package',
    title: 'MAX Funnel Under Key',
    coverTitle: 'Запущу MAX-воронку: канал, боты, mini app, CRM',
    tag: 'ПОД КЛЮЧ',
    price: '45 000₽ MVP',
    coverPrice: 'от 45 000₽',
    duration: '7-12 дней',
    upsell: 'AI / CRM / контент',
    bg: 'url("../public/works/services/agentic-ai-dev/hero-command-center.jpg")',
    summary: 'Запущу MAX-экосистему под ключ: Business-профиль, канал, первый бот, mini app, заявки, уведомления и интеграция с таблицей, CRM или Hermes/Kanban.',
    tabs: {
      scope: ['Стратегия воронки и карта touchpoints.', 'MAX Business setup, канал, стартовый бот и mini app.', 'Маршрут заявок в CRM, таблицу, уведомления или Hermes.', 'Smoke-тест, handoff для команды и roadmap следующих ботов/AI-агента.'],
      requirements: ['Данные ИП/ООО, бренд, услуги, сценарии заявок.', 'Куда должны попадать лиды и кто их обрабатывает.', 'Готовность владельца подтверждать действия в MAX Business.'],
      limits: ['Точный объем фиксируется после карты воронки.', 'Платежи, личный кабинет, сложная CRM и персональные данные считаются отдельным этапом.'],
      cover: ['Командный центр: MAX как вход, Hermes/VPS как обработчик, CRM как результат.', 'Самая дорогая карточка, визуально должна выглядеть как система, не как одиночный бот.']
    }
  }
};

let activeOffer = 'business';
let activeTab = 'scope';

function renderOffer() {
  const offer = offers[activeOffer];
  const cover = document.getElementById('offer-cover-preview');
  cover.style.setProperty('--offer-bg', offer.bg);
  document.getElementById('offer-cover-tag').textContent = offer.tag;
  document.getElementById('offer-cover-title').textContent = offer.coverTitle;
  document.getElementById('offer-cover-price').textContent = offer.coverPrice;
  document.getElementById('offer-label').textContent = offer.label;
  document.getElementById('offer-title').textContent = offer.title;
  document.getElementById('offer-summary').textContent = offer.summary;
  document.getElementById('offer-duration').textContent = offer.duration;
  document.getElementById('offer-price').textContent = offer.price;
  document.getElementById('offer-upsell').textContent = offer.upsell;
  const tabItems = offer.tabs[activeTab] || [];
  document.getElementById('offer-tab-panel').innerHTML = `<ul>${tabItems.map((item) => `<li>${item}</li>`).join('')}</ul>`;

  document.querySelectorAll('.max-offer-tile').forEach((tile) => {
    tile.classList.toggle('active', tile.dataset.offer === activeOffer);
  });
  document.querySelectorAll('.max-tabs button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === activeTab);
  });
}

function renderBrief() {
  const payload = buildLeadPayload();
  const title = payload.title;
  const copy = payload.brief;
  const briefText = formatLeadText(payload);

  document.getElementById('brief-title').textContent = title;
  document.getElementById('brief-copy').textContent = copy;

  const email = document.getElementById('brief-email');
  if (email) {
    const subject = encodeURIComponent(`MAX-воронка: ${title}`);
    const body = encodeURIComponent(briefText);
    email.href = `mailto:polstan1986@gmail.com?subject=${subject}&body=${body}`;
  }

  return briefText;
}

function buildLeadPayload() {
  const form = document.getElementById('max-quiz');
  const assets = [...form.querySelectorAll('input[name="assets"]:checked')].map((input) => input.value);
  const destinations = [...form.querySelectorAll('input[name="destination"]:checked')].map((input) => input.value);
  const goal = form.querySelector('input[name="goal"]:checked')?.value || 'Business setup';
  const contact = document.getElementById('lead-contact')?.value.trim() || '';

  const titleByGoal = {
    'Business setup': 'MAX Business старт',
    Bot: 'MAX-бот для заявок',
    'Mini app': 'MAX mini app',
    'AI agent': 'AI-агент в MAX',
  };

  const assetsText = assets.length ? `Уже есть: ${assets.join(', ')}.` : 'Нужно начать с нуля.';
  const destinationText = destinations.length ? `Заявки отправлять в: ${destinations.join(', ')}.` : 'Маршрут заявок нужно спроектировать.';
  const recommendation = goal === 'AI agent'
    ? 'Рекомендация: сначала проверить MAX Business/бота, затем подключать VPS-адаптер и безопасные границы агента.'
    : goal === 'Mini app'
      ? 'Рекомендация: собрать mobile-first каталог/квиз и связать его с ботом и заявками.'
      : goal === 'Bot'
        ? 'Рекомендация: запустить первый бот заявок, затем развести роли до 5 ботов.'
        : 'Рекомендация: начать с профиля организации, канала и карты ботов/mini app.';

  const title = titleByGoal[goal] || titleByGoal['Business setup'];
  const brief = `${assetsText} Цель: ${goal}. ${destinationText} ${recommendation}`;

  return {
    source: 'max-funnel-localhost',
    contact,
    goal,
    assets,
    destinations,
    title,
    brief,
  };
}

function formatLeadText(payload) {
  return [
    `Запрос: ${payload.title}`,
    payload.contact ? `Контакт: ${payload.contact}` : 'Контакт: не указан',
    payload.brief,
    'Хочу обсудить MAX Business / ботов / mini app / AI-агента для бизнеса.',
  ].join('\n\n');
}

async function copyBrief() {
  const status = document.getElementById('brief-status');
  const briefText = renderBrief();
  try {
    await navigator.clipboard.writeText(briefText);
    if (status) status.textContent = 'Бриф скопирован. Можно отправить его в Telegram, MAX или email.';
  } catch {
    if (status) status.textContent = 'Не удалось скопировать автоматически. Выделите текст брифа вручную.';
  }
}

function saveLeadFallback(payload) {
  const storageKey = 'real-vibe-max-leads';
  const leads = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const lead = {
    id: `local-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    ...payload,
  };
  leads.unshift(lead);
  localStorage.setItem(storageKey, JSON.stringify(leads.slice(0, 20)));
  return lead;
}

function getLocalLeads() {
  return JSON.parse(localStorage.getItem('real-vibe-max-leads') || '[]');
}

function shouldUseLeadApi() {
  if (!['http:', 'https:'].includes(window.location.protocol)) return false;
  const host = window.location.hostname;
  const port = window.location.port;
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  if (!isLocal) return true;
  return port === '3000';
}

async function submitBrief() {
  const status = document.getElementById('brief-status');
  const button = document.getElementById('submit-brief');
  const payload = buildLeadPayload();
  if (!payload.contact) {
    if (status) status.textContent = 'Добавьте контакт: Telegram, телефон или email.';
    document.getElementById('lead-contact')?.focus();
    return;
  }

  if (button) button.disabled = true;
  if (status) status.textContent = 'Сохраняю MAX-лид...';

  try {
    if (!shouldUseLeadApi()) {
      const lead = saveLeadFallback(payload);
      if (status) status.textContent = `Статический preview: черновик сохранен в браузере ${lead.id}.`;
      return;
    }

    const response = await fetch('/api/max-funnel/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'API недоступен');
    }

    const result = await response.json();
    if (status) status.textContent = `Лид сохранен в локальном API: ${result.lead?.shortId || result.lead?.id || 'OK'}.`;
    loadLeadInbox();
  } catch (error) {
    const lead = saveLeadFallback(payload);
    if (status) status.textContent = `API недоступен, черновик сохранен в браузере: ${lead.id}.`;
    loadLeadInbox();
  } finally {
    if (button) button.disabled = false;
  }
}

function createLeadTag(text) {
  const tag = document.createElement('span');
  tag.textContent = text;
  return tag;
}

function renderLeadCard(lead) {
  const card = document.createElement('article');
  card.className = 'max-lead-card';

  const header = document.createElement('header');
  const id = document.createElement('span');
  id.className = 'max-lead-id';
  id.textContent = lead.shortId || lead.id || 'MAX local lead';
  const title = document.createElement('h3');
  title.textContent = lead.title || lead.goal || 'MAX-заявка';
  const contact = document.createElement('span');
  contact.className = 'max-lead-contact';
  contact.textContent = lead.contact || 'контакт не указан';
  const time = document.createElement('time');
  time.dateTime = lead.createdAt || '';
  time.textContent = lead.createdAt ? new Date(lead.createdAt).toLocaleString('ru-RU') : 'без даты';
  header.append(id, title, contact, time);

  const body = document.createElement('div');
  const brief = document.createElement('p');
  brief.textContent = lead.brief || 'Бриф пока пустой.';
  const tags = document.createElement('div');
  tags.className = 'max-lead-tags';
  [
    lead.goal ? `goal: ${lead.goal}` : '',
    ...(Array.isArray(lead.assets) ? lead.assets.map((item) => `есть: ${item}`) : []),
    ...(Array.isArray(lead.destinations) ? lead.destinations.map((item) => `куда: ${item}`) : []),
    lead.source ? `source: ${lead.source}` : '',
  ].filter(Boolean).forEach((item) => tags.appendChild(createLeadTag(item)));
  body.append(brief, tags);

  card.append(header, body);
  return card;
}

function renderLeadInbox(leads, mode) {
  const list = document.getElementById('lead-list');
  const status = document.getElementById('lead-inbox-status');
  if (!list) return;

  list.replaceChildren();
  if (!leads.length) {
    const empty = document.createElement('p');
    empty.className = 'max-brief-status';
    empty.textContent = mode === 'api'
      ? 'В локальном API пока нет MAX-заявок.'
      : 'В этом браузере пока нет сохраненных черновиков.';
    list.appendChild(empty);
  } else {
    leads.forEach((lead) => list.appendChild(renderLeadCard(lead)));
  }

  if (status) {
    status.textContent = mode === 'api'
      ? `API inbox: ${leads.length} последних лидов`
      : `Static/browser inbox: ${leads.length} черновиков`;
  }
}

async function loadLeadInbox() {
  const status = document.getElementById('lead-inbox-status');
  if (status) status.textContent = 'Загрузка лидов...';

  if (!shouldUseLeadApi()) {
    renderLeadInbox(getLocalLeads(), 'local');
    return;
  }

  try {
    const response = await fetch('/api/max-funnel/leads?limit=12');
    if (!response.ok) throw new Error('lead inbox unavailable');
    const payload = await response.json();
    renderLeadInbox(Array.isArray(payload.leads) ? payload.leads : [], 'api');
  } catch {
    renderLeadInbox(getLocalLeads(), 'local');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.max-offer-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      activeOffer = tile.dataset.offer;
      activeTab = 'scope';
      renderOffer();
    });
  });

  document.querySelectorAll('.max-tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      renderOffer();
    });
  });

  document.getElementById('max-quiz')?.addEventListener('change', renderBrief);
  document.getElementById('lead-contact')?.addEventListener('input', renderBrief);
  document.getElementById('copy-brief')?.addEventListener('click', copyBrief);
  document.getElementById('submit-brief')?.addEventListener('click', submitBrief);
  document.getElementById('refresh-leads')?.addEventListener('click', loadLeadInbox);
  renderOffer();
  renderBrief();
  loadLeadInbox();
});
