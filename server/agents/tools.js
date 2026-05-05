/**
 * Данные студии — услуги, портфолио, цены.
 * Единый источник правды для function calling.
 */

export const SERVICES = [
  {
    id: 'ai-video',
    name: 'AI-видео',
    emoji: '🎬',
    description: 'Продающие рекламные ролики, сгенерированные нейросетями. Рилсы, шортсы, промо.',
    priceFrom: 5000,
    priceTo: 50000,
    currency: 'RUB',
    timeline: '3-7 дней',
    examples: ['Промо-ролик для кофейни', 'Рилс для фитнес-клуба', 'Product-видео для маркетплейса'],
  },
  {
    id: 'ai-photo',
    name: 'AI-фото',
    emoji: '📸',
    description: 'Фотоконтент для брендов и соцсетей. Продуктовая съёмка, лайфстайл, обложки.',
    priceFrom: 1700,
    priceTo: 15000,
    currency: 'RUB',
    timeline: '1-3 дня',
    examples: ['Продуктовые фото для каталога', 'Обложки для соцсетей', 'Баннеры для рекламы'],
  },
  {
    id: 'ai-bots',
    name: 'AI-боты (персона-боты)',
    emoji: '🤖',
    description: 'Telegram/VK боты с уникальным характером и AI под капотом. Автокомментирование, ответы, модерация.',
    priceFrom: 12000,
    priceTo: 80000,
    currency: 'RUB',
    timeline: '5-14 дней',
    examples: ['Кот Бро — маскот для VK группы', 'Хипыч AI — бот для стримера', 'НейроВалюша — педагогический бот'],
  },
  {
    id: 'custom-gpts',
    name: 'Кастомные GPTs',
    emoji: '🧠',
    description: 'Персональные GPT-ассистенты под задачи бизнеса. Обученные на ваших данных.',
    priceFrom: 7000,
    priceTo: 35000,
    currency: 'RUB',
    timeline: '3-7 дней',
    examples: ['GPT для анализа медданных', 'GPT-консультант по недвижимости', 'GPT для техподдержки'],
  },
  {
    id: 'websites',
    name: 'Создание сайтов',
    emoji: '🌐',
    description: 'Сайты с AI-функциями. Лендинги, витрины, веб-приложения. Вайбкодинг.',
    priceFrom: 15000,
    priceTo: 100000,
    currency: 'RUB',
    timeline: '7-21 день',
    examples: ['Лендинг для студии', 'Сайт-визитка с AI-чатом', 'Веб-приложение с дашбордом'],
  },
  {
    id: 'ai-animation',
    name: 'AI-анимация',
    emoji: '🎞',
    description: 'Инфографика и анимация для e-commerce и соцсетей.',
    priceFrom: 3000,
    priceTo: 30000,
    currency: 'RUB',
    timeline: '3-7 дней',
    examples: ['Анимированная инфографика', 'Motion-дизайн для рилс', 'Промо-анимация'],
  },
  {
    id: 'ai-voice',
    name: 'Озвучка и саунддизайн',
    emoji: '🎤',
    description: 'AI-озвучка, музыка, звуковое оформление для видео и подкастов.',
    priceFrom: 2000,
    priceTo: 20000,
    currency: 'RUB',
    timeline: '1-5 дней',
    examples: ['Озвучка промо-ролика', 'Подкаст-озвучка', 'Звуковое оформление рилс'],
  },
  {
    id: 'smm',
    name: 'SMM с AI',
    emoji: '📱',
    description: 'Ведение соцсетей с AI-контентом. Планирование, генерация, публикация.',
    priceFrom: 15000,
    priceTo: 60000,
    currency: 'RUB',
    timeline: 'ежемесячно',
    examples: ['Ведение Instagram', 'Контент для VK группы', 'TikTok-стратегия'],
  },
];

export const PORTFOLIO_ITEMS = [
  { category: 'ai-bots', title: 'Кот Бро', description: 'Маскот VK-группы по аренде недвижимости. Автокомментирование, общение с подписчиками.', link: '#assistants' },
  { category: 'ai-bots', title: 'Хипыч AI', description: 'Бот для телеграм-канала стримера. CTA, модерация, розыгрыши.', link: '#assistants' },
  { category: 'ai-bots', title: 'НейроВалюша', description: 'Педагогический бот для детского лагеря. VK + Telegram + приложение.', link: '#assistants' },
  { category: 'ai-video', title: 'Промо-ролики', description: 'AI-сгенерированные рекламные видео для бизнеса.', link: '#projects-showreel' },
  { category: 'ai-photo', title: 'AI-фотоконтент', description: 'Обложки, баннеры, продуктовые фото.', link: '#projects-showreel' },
  { category: 'websites', title: 'Real Vibe Studio', description: 'Этот самый сайт — витрина с AI-чат-ботами.', link: '/' },
];

/**
 * Tool: Получить список услуг студии.
 */
export function getServices({ category } = {}) {
  let services = SERVICES;
  if (category) {
    services = services.filter(s => s.id === category || s.name.toLowerCase().includes(category.toLowerCase()));
  }
  return services.map(s => ({
    id: s.id,
    name: `${s.emoji} ${s.name}`,
    description: s.description,
    price: `от ${s.priceFrom.toLocaleString('ru-RU')}₽`,
    timeline: s.timeline,
  }));
}

/**
 * Tool: Получить портфолио по категории.
 */
export function getPortfolio({ category } = {}) {
  let items = PORTFOLIO_ITEMS;
  if (category) {
    items = items.filter(p => p.category === category || p.title.toLowerCase().includes(category.toLowerCase()));
  }
  if (items.length === 0) {
    return { message: 'Портфолио по этой категории пока нет. Но мы можем создать проект именно для вас!' };
  }
  return items;
}

/**
 * Tool: Получить детальное ценообразование.
 */
export function getPricing({ serviceId }) {
  const service = SERVICES.find(s => s.id === serviceId);
  if (!service) {
    return { error: 'Услуга не найдена', available: SERVICES.map(s => s.id) };
  }
  return {
    name: `${service.emoji} ${service.name}`,
    description: service.description,
    priceRange: `${service.priceFrom.toLocaleString('ru-RU')}₽ – ${service.priceTo.toLocaleString('ru-RU')}₽`,
    timeline: service.timeline,
    examples: service.examples,
    cta: 'Для точной оценки свяжитесь с @Stivanovv в Telegram',
  };
}

/**
 * Tool: Собрать заявку.
 */
export function submitLead({ name, task, contact }) {
  // В будущем: отправка в TG через Bot API
  // Сейчас: логируем и подтверждаем
  console.log(`📋 НОВАЯ ЗАЯВКА: ${name} | ${task} | ${contact}`);
  return {
    status: 'success',
    message: `Заявка принята! Степан (@Stivanovv) свяжется с вами в ближайшее время.`,
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
      description: 'Получить список услуг студии Реальный Вайб AI Studio. Используй когда пользователь спрашивает про услуги, что вы делаете, чем занимаетесь.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Фильтр по категории: ai-video, ai-photo, ai-bots, custom-gpts, websites, ai-animation, ai-voice, smm. Не указывай для полного списка.',
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
      description: 'Показать примеры работ / портфолио студии. Используй когда пользователь просит примеры, кейсы, работы.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Фильтр по категории: ai-bots, ai-video, ai-photo, websites',
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
      description: 'Получить детальное ценообразование по конкретной услуге. Используй когда пользователь спрашивает про цены, стоимость, сколько стоит.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: {
            type: 'string',
            enum: ['ai-video', 'ai-photo', 'ai-bots', 'custom-gpts', 'websites', 'ai-animation', 'ai-voice', 'smm'],
            description: 'ID услуги для получения цен',
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
          contact: { type: 'string', description: 'Контакт: телеграм, телефон или email' },
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
