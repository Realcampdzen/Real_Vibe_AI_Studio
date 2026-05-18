import { readPriceBookSync } from './price-book.js';

export const SERVICE_CATALOG = [
  { id: '0', slug: 'ai-video', title: 'AI-видео и рекламные рилсы', priceLabel: 'от 80 000₽', url: '/service-detail.html?id=0' },
  { id: '1', slug: 'ai-photo', title: 'AI-фото для e-commerce и key visual', priceLabel: 'от 20 000₽ за сет', url: '/service-detail.html?id=1' },
  { id: '2', slug: 'ecom-animation', title: 'ИИ-анимация и инфографика для e-commerce', priceLabel: 'от 35 000₽', url: '/service-detail.html?id=2' },
  { id: '3', slug: 'smm-content', title: 'SMM и контент', priceLabel: 'от 40 000₽', url: '/service-detail.html?id=3' },
  { id: '4', slug: 'music', title: 'Создание музыки', priceLabel: 'от 20 000₽', url: '/service-detail.html?id=4' },
  { id: '5', slug: 'sound-design', title: 'Озвучка и саунд-дизайн', priceLabel: 'от 15 000₽', url: '/service-detail.html?id=5' },
  { id: '6', slug: 'apps', title: 'MVP, SaaS и приложения с AI-функциями', priceLabel: 'от 50 000₽ за MVP-модуль', url: '/service-detail.html?id=6' },
  { id: '7', slug: 'bots', title: 'Telegram-боты с AI, базой и admin-панелью', priceLabel: 'от 10 000₽', url: '/service-detail.html?id=7' },
  { id: '8', slug: 'websites', title: 'Сайты и веб-сервисы с AI-функциями', priceLabel: 'от 70 000₽', url: '/service-detail.html?id=8' },
  { id: '9', slug: 'ai-agents', title: 'AI-агенты для бизнеса и GPT-ассистенты', priceLabel: 'от 25 000₽', url: '/service-detail.html?id=9' },
  { id: '10', slug: 'creative-production', title: 'Creative Direction + AI Production', priceLabel: 'от 150 000₽', url: '/service-detail.html?id=10' },
  { id: '11', slug: 'agentic-ai-dev', title: 'Вайбкодинг и agentic AI dev', priceLabel: 'разработка от 30 000₽', url: '/service-detail.html?id=11' },
];

const catalogById = new Map(SERVICE_CATALOG.map((service) => [service.id, service]));

function withCurrentPrice(service, priceBook) {
  return {
    ...service,
    priceLabel: priceBook.services?.[service.slug]?.price || service.priceLabel,
  };
}

export function getCatalogService(serviceId) {
  if (serviceId === undefined || serviceId === null) return null;
  const service = catalogById.get(String(serviceId));
  return service ? withCurrentPrice(service, readPriceBookSync()) : null;
}

export function listCatalogServices() {
  const priceBook = readPriceBookSync();
  return SERVICE_CATALOG.map((service) => withCurrentPrice(service, priceBook));
}
