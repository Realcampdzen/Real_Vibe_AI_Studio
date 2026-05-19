import { readPriceBookSync } from './price-book.js';

export const SERVICE_CATALOG = [
  {
    id: '0',
    slug: 'ai-video',
    title: 'AI-видео и рекламные рилсы',
    summary: 'Рекламные ролики, Reels, Shorts, клипы, промо и объясняющие видео: идея, сценарий, AI-генерация сцен, монтаж, музыка и звук.',
    keywords: ['ролик', 'реклама', 'reels', 'shorts', 'видео', 'клип', 'промо', 'шоурил'],
    priceLabel: 'от 80 000₽',
    url: '/service-detail.html?id=0',
  },
  {
    id: '1',
    slug: 'ai-photo',
    title: 'AI-фото для e-commerce и key visual',
    summary: 'AI-визуалы для карточек товаров, маркетплейсов, баннеров, key visual, рекламы и соцсетей.',
    keywords: ['фото', 'визуал', 'key visual', 'ecommerce', 'e-commerce', 'маркетплейс', 'баннер', 'карточка'],
    priceLabel: 'от 20 000₽ за сет',
    url: '/service-detail.html?id=1',
  },
  {
    id: '2',
    slug: 'ecom-animation',
    title: 'ИИ-анимация и инфографика для e-commerce',
    summary: 'Product loops, товарная анимация, инфографика и короткие движения для карточек, рекламы и витрин.',
    keywords: ['анимация', 'инфографика', 'product loop', 'товар', 'ecom', 'e-commerce', 'маркетплейс'],
    priceLabel: 'от 35 000₽',
    url: '/service-detail.html?id=2',
  },
  {
    id: '3',
    slug: 'smm-content',
    title: 'SMM и контент',
    summary: 'Контент-стратегия, рубрикатор, тексты, сценарии, регулярные публикации и AI-шаблоны для команды.',
    keywords: ['smm', 'смм', 'контент', 'посты', 'соцсети', 'тексты', 'сценарии', 'рубрик'],
    priceLabel: 'от 40 000₽',
    url: '/service-detail.html?id=3',
  },
  {
    id: '4',
    slug: 'music',
    title: 'Создание музыки',
    summary: 'Авторские треки, саундтреки, джинглы, музыкальная айдентика и версии под видео, рекламу, игры и приложения.',
    keywords: ['музыка', 'трек', 'саундтрек', 'джингл', 'аудио', 'песня', 'айдентика'],
    priceLabel: 'от 20 000₽',
    url: '/service-detail.html?id=4',
  },
  {
    id: '5',
    slug: 'sound-design',
    title: 'Озвучка и саунд-дизайн',
    summary: 'Озвучка, voice-over, SFX, обработка, чистка, сведение и звуковое оформление для видео, игр, курсов и приложений.',
    keywords: ['озвучка', 'голос', 'voice', 'sound', 'саунд', 'sfx', 'звук', 'подкаст'],
    priceLabel: 'от 15 000₽',
    url: '/service-detail.html?id=5',
  },
  {
    id: '6',
    slug: 'apps',
    title: 'MVP, SaaS и приложения с AI-функциями',
    summary: 'MVP, SaaS, CRM, дашборды, личные кабинеты и приложения с AI-логикой, ролями, базой данных, API и деплоем.',
    keywords: ['mvp', 'saas', 'приложение', 'crm', 'дашборд', 'кабинет', 'база', 'api', 'платформа'],
    priceLabel: 'от 50 000₽ за MVP-модуль',
    url: '/service-detail.html?id=6',
  },
  {
    id: '7',
    slug: 'bots',
    title: 'Telegram-боты с AI, базой и admin-панелью',
    summary: 'Telegram-боты и AI-боты с OpenAI API, базой данных, заявками, сценариями, платежами, CRM и админ-панелью.',
    keywords: ['бот', 'telegram', 'телеграм', 'admin', 'админ', 'openai', 'заявки', 'crm'],
    priceLabel: 'от 10 000₽',
    url: '/service-detail.html?id=7',
  },
  {
    id: '8',
    slug: 'websites',
    title: 'Сайты и веб-сервисы с AI-функциями',
    summary: 'Лендинги, сайты компаний, веб-сервисы, личные кабинеты, AI-чаты, формы, аналитика и интеграции.',
    keywords: ['сайт', 'лендинг', 'web', 'веб', 'страница', 'формы', 'интеграции', 'frontend'],
    priceLabel: 'от 70 000₽',
    url: '/service-detail.html?id=8',
  },
  {
    id: '9',
    slug: 'ai-agents',
    title: 'AI-агенты для бизнеса и GPT-ассистенты',
    summary: 'GPT-ассистенты и AI-агенты под бизнес-процессы: база знаний, инструкции, workflow, проверки, автоматизация и безопасность.',
    keywords: ['агент', 'ассистент', 'gpt', 'база знаний', 'workflow', 'автоматизация', 'персона-бот'],
    priceLabel: 'от 25 000₽',
    url: '/service-detail.html?id=9',
  },
  {
    id: '10',
    slug: 'creative-production',
    title: 'Creative Direction + AI Production',
    summary: 'Creative direction и AI production для творческих проектов: visual world, key visual, сайт, релиз, тур, мерч, контент и запуск.',
    keywords: ['creative', 'production', 'креатив', 'продакшн', 'релиз', 'визуальная система', 'мерч', 'проект'],
    priceLabel: 'от 150 000₽',
    url: '/service-detail.html?id=10',
  },
  {
    id: '11',
    slug: 'agentic-ai-dev',
    title: 'Вайбкодинг и agentic AI dev',
    summary: 'Agentic full-stack разработка: MVP, SaaS, Telegram Mini Apps, AI-боты, сайты, custom GPTs и стабилизация AI-generated кода.',
    keywords: ['вайбкодинг', 'vibe coding', 'agentic', 'разработка', 'код', 'mini app', 'tma', 'lovable', 'cursor', 'bolt', 'v0'],
    priceLabel: 'разработка от 30 000₽',
    url: '/service-detail.html?id=11',
  },
];

const catalogById = new Map(SERVICE_CATALOG.map((service) => [service.id, service]));
const catalogBySlug = new Map(SERVICE_CATALOG.map((service) => [service.slug, service]));

function withCurrentPrice(service, priceBook) {
  const priceEntry = priceBook.services?.[service.slug];
  return {
    ...service,
    priceLabel: priceEntry?.price || service.priceLabel,
    priceNote: priceEntry?.note || '',
  };
}

export function getCatalogService(serviceId) {
  if (serviceId === undefined || serviceId === null) return null;
  const key = String(serviceId).trim();
  const service = catalogById.get(key) || catalogBySlug.get(key);
  return service ? withCurrentPrice(service, readPriceBookSync()) : null;
}

export function listCatalogServices() {
  const priceBook = readPriceBookSync();
  return SERVICE_CATALOG.map((service) => withCurrentPrice(service, priceBook));
}

export function listCatalogOffers(serviceSlug) {
  const key = String(serviceSlug || '').trim();
  if (!key) return [];
  const priceBook = readPriceBookSync();
  const offers = priceBook.offers?.[key] || {};
  return Object.entries(offers).map(([id, offer]) => ({
    id,
    title: offer.title,
    priceLabel: offer.price,
    note: offer.note || '',
  }));
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}+\- ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchCatalogServices(query, { limit = 12 } = {}) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return listCatalogServices().slice(0, limit);

  const words = normalizedQuery.split(' ').filter((word) => word.length > 2);
  const scored = listCatalogServices()
    .map((service) => {
      const haystack = normalizeSearchText([
        service.id,
        service.slug,
        service.title,
        service.summary,
        ...(service.keywords || []),
      ].join(' '));

      let score = 0;
      if (service.id === normalizedQuery || service.slug === normalizedQuery) score += 20;
      if (normalizeSearchText(service.title).includes(normalizedQuery)) score += 12;
      if (haystack.includes(normalizedQuery)) score += 8;
      for (const word of words) {
        if (haystack.includes(word)) score += 2;
      }
      return { service, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.service.id) - Number(b.service.id));

  return scored.slice(0, limit).map((item) => item.service);
}

export function formatCatalogForAgentPrompt() {
  const services = listCatalogServices();
  const lines = [
    'АКТУАЛЬНЫЙ КАТАЛОГ И ЦЕНЫ REAL VIBE AI STUDIO:',
    ...services.map((service) => {
      const note = service.priceNote ? ` Примечание к цене: ${service.priceNote}` : '';
      return `${service.id}. ${service.title} (${service.slug}) — ${service.priceLabel}. ${service.summary} Подробнее: ${service.url}.${note}`;
    }),
  ];

  const offers = listCatalogOffers('agentic-ai-dev');
  if (offers.length > 0) {
    lines.push('БЫСТРЫЕ ОФФЕРЫ ДЛЯ ВАЙБКОДИНГА / AGENTIC AI DEV:');
    lines.push(...offers.map((offer) => {
      const note = offer.note ? ` ${offer.note}` : '';
      return `- ${offer.title} (${offer.id}) — ${offer.priceLabel}.${note}`;
    }));
  }

  lines.push(
    'ПРАВИЛА ДЛЯ ОТВЕТОВ ПО УСЛУГАМ И ЦЕНАМ:',
    '- Считай этот каталог актуальным источником правды по товарам, услугам и публичным ценовым якорям сайта.',
    '- Если пользователь спрашивает стоимость, называй priceLabel и поясняй, что финальная смета зависит от задачи, объема, материалов, интеграций и сроков.',
    '- Если задача пользователя похожа на несколько услуг, предложи 1-3 подходящих направления и объясни разницу простыми словами.',
    '- Не придумывай новые цены, скидки, сроки и гарантии. Если данных мало, задай 1-3 уточняющих вопроса или направь к @Stivanovv.',
    '- Этот коммерческий контекст не отменяет safety-ограничения конкретного агента, особенно для health-тем.',
  );

  return lines.join('\n');
}
