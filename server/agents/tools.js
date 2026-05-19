/**
 * Данные студии — услуги, портфолио, цены.
 * Function calling берёт актуальный каталог из server/services/catalog.js.
 */
import {
  getCatalogService,
  listCatalogOffers,
  listCatalogServices,
  searchCatalogServices,
} from '../services/catalog.js';

const LEGACY_SERVICE_ALIASES = {
  'ai-bots': 'bots',
  'custom-gpts': 'ai-agents',
  'ai-animation': 'ecom-animation',
  'ai-voice': 'sound-design',
  smm: 'smm-content',
};

const SERVICE_ID_HINT = [
  'ai-video',
  'agentic-ai-dev',
  'smm-content',
  'creative-production',
  'music',
  'sound-design',
  'apps',
  'bots',
  'websites',
  'ai-agents',
  'ai-photo',
  'ecom-animation',
].join(', ');

export const PORTFOLIO_ITEMS = [
  {
    category: 'bots',
    title: 'Кот Бро',
    description: 'Маскот и персона-бот для VK-группы: комментирует посты, поддерживает вайб сообщества и демонстрирует брендовый AI-персонаж.',
    link: '#assistants',
  },
  {
    category: 'ai-agents',
    title: 'Wellness Bro',
    description: 'Публичный health-ассистент: анализы, дневники, питание, напоминания и поддержка без диагнозов, назначений и хранения текста чатов.',
    link: '#assistants',
  },
  {
    category: 'bots',
    title: 'НейроВалюша',
    description: 'Педагогический AI-бот для лагеря: общается с детьми, объясняет систему значков и оживляет соцсети.',
    link: '#assistants',
  },
  {
    category: 'ai-video',
    title: 'AI-видео и рекламные рилсы',
    description: 'Премиальные AI-ролики для рекламы, Reels, промо и запусков продукта.',
    link: '/service-detail.html?id=0',
  },
  {
    category: 'agentic-ai-dev',
    title: 'Hermes / Agent OS',
    description: 'Мультиагентная рабочая среда с задачами, ролями, workflow, библиотекой знаний и approval-gated процессами.',
    link: '/service-detail.html?id=11',
  },
  {
    category: 'websites',
    title: 'Real Vibe Studio',
    description: 'Этот сайт как витрина: сервисный каталог, AI-ассистенты, заявки, корзина и серверный API.',
    link: '/',
  },
];

function normalizeServiceId(value) {
  const key = String(value || '').trim().toLowerCase();
  return LEGACY_SERVICE_ALIASES[key] || key;
}

function resolveCatalogService(serviceId) {
  const normalized = normalizeServiceId(serviceId);
  if (!normalized) return null;
  return getCatalogService(normalized) || searchCatalogServices(normalized, { limit: 1 })[0] || null;
}

/**
 * Tool: получить список услуг студии.
 */
export function getServices({ category } = {}) {
  const normalizedCategory = normalizeServiceId(category);
  const services = normalizedCategory
    ? searchCatalogServices(normalizedCategory)
    : listCatalogServices();

  return services.map((service) => ({
    id: service.id,
    slug: service.slug,
    title: service.title,
    description: service.summary,
    price: service.priceLabel,
    priceNote: service.priceNote,
    url: service.url,
  }));
}

/**
 * Tool: получить портфолио по категории.
 */
export function getPortfolio({ category } = {}) {
  const normalizedCategory = normalizeServiceId(category);
  let items = PORTFOLIO_ITEMS;

  if (normalizedCategory) {
    const query = normalizedCategory.toLowerCase();
    items = items.filter((item) => (
      item.category === query
      || item.title.toLowerCase().includes(query)
      || item.description.toLowerCase().includes(query)
    ));
  }

  if (items.length === 0) {
    return { message: 'Портфолио по этой категории пока нет в публичной витрине. Но можно обсудить проект под вашу задачу с @Stivanovv.' };
  }
  return items;
}

/**
 * Tool: получить ценообразование по конкретной услуге.
 */
export function getPricing({ serviceId }) {
  const service = resolveCatalogService(serviceId);
  if (!service) {
    return {
      error: 'Услуга не найдена',
      available: listCatalogServices().map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        price: item.priceLabel,
      })),
    };
  }

  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    description: service.summary,
    price: service.priceLabel,
    priceNote: service.priceNote,
    url: service.url,
    offers: listCatalogOffers(service.slug),
    cta: 'Для точной оценки напишите @Stivanovv в Telegram: финальная смета зависит от задачи, объёма, материалов, интеграций и сроков.',
  };
}

/**
 * Tool: собрать заявку.
 */
export function submitLead({ name, task, contact }) {
  // Сейчас только подтверждаем: контактные данные не пишем в runtime-логи.
  return {
    status: 'success',
    message: 'Заявка принята! Степан (@Stivanovv) свяжется с вами в ближайшее время.',
    data: { name, task, contact },
  };
}

/**
 * OpenAI function definitions для tool calling.
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_services',
      description: 'Получить актуальный список услуг, товаров и публичных цен Real Vibe AI Studio. Используй, когда пользователь спрашивает, что делает студия, какие есть продукты, направления или услуги.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: `Необязательный фильтр по направлению, slug, номеру или обычной фразе пользователя. Актуальные slug: ${SERVICE_ID_HINT}.`,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_portfolio',
      description: 'Показать примеры работ / портфолио студии. Используй, когда пользователь просит кейсы, примеры, работы или демонстрации.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: `Необязательный фильтр по направлению. Актуальные slug: ${SERVICE_ID_HINT}.`,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pricing',
      description: 'Получить актуальную цену по конкретной услуге Real Vibe AI Studio. Используй, когда пользователь спрашивает стоимость, прайс, бюджет или сколько стоит.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: {
            type: 'string',
            description: `Slug, номер услуги или фраза пользователя. Актуальные slug: ${SERVICE_ID_HINT}. Поддерживаются старые алиасы: ai-bots, custom-gpts, ai-animation, ai-voice, smm.`,
          },
        },
        required: ['serviceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_lead',
      description: 'Оформить заявку на услугу. Используй ТОЛЬКО когда пользователь явно хочет заказать / оставить заявку И предоставил имя и контакт.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Имя клиента' },
          task: { type: 'string', description: 'Описание задачи / что хочет заказать' },
          contact: { type: 'string', description: 'Контакт: Telegram, телефон или email' },
        },
        required: ['name', 'task', 'contact'],
      },
    },
  },
];

/** Map function name → handler */
export const TOOL_HANDLERS = {
  get_services: getServices,
  get_portfolio: getPortfolio,
  get_pricing: getPricing,
  submit_lead: submitLead,
};
