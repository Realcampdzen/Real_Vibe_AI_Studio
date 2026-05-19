/**
 * Реестр ботов — центральная конфигурация.
 * Добавление нового бота = 1 запись здесь + промпт в prompts.js + fallback в fallbacks.js.
 */
import PROMPTS from './prompts.js';
import { getFallbackResponse } from './fallbacks.js';

const BOT_REGISTRY = {
  'bro-cat': {
    id: 'bro-cat',
    name: '🐱 Кот Бро',
    route: '/chat',            // Также доступен через /api/chat/:botId
    prompt: PROMPTS['bro-cat'],
    emergencyReply: 'Мяу! 😿 У меня лапки запутались... Но @Stivanovv всё исправит! AI-боты от 10 000₽, AI-агенты от 25 000₽, вайбкодинг от 30 000₽ 🤖',
  },
  'valyusha': {
    id: 'valyusha',
    name: '💜 НейроВалюша',
    route: '/api/valyusha/chat',
    prompt: PROMPTS['valyusha'],
    emergencyReply: 'Ой! 💜 Временные технические работы. Но я всегда готова помочь! Персона-боты — это будущее! @Stivanovv всё настроит! 🌈',
  },
  'health-assistant': {
    id: 'health-assistant',
    name: '🩺 Wellness Bro',
    route: '/api/health/chat',
    prompt: PROMPTS['health-assistant'],
    emergencyReply: 'Сейчас Wellness Bro временно недоступен. Если есть острые симптомы или риск для жизни — обратитесь за срочной медицинской помощью. По проекту AI-бота можно написать @Stivanovv.',
  },
  'business-advisor': {
    id: 'business-advisor',
    name: '📈 Максим Стратег',
    prompt: PROMPTS['business-advisor'],
    emergencyReply: 'Извините, временная ошибка сервиса.',
  },
  'support-agent': {
    id: 'support-agent',
    name: '🎧 Техно-Саша',
    prompt: PROMPTS['support-agent'],
    emergencyReply: 'Извините, временная ошибка сервиса.',
  },
  'content-creator': {
    id: 'content-creator',
    name: '✍️ Креатив-Лиза',
    prompt: PROMPTS['content-creator'],
    emergencyReply: 'Извините, временная ошибка сервиса.',
  },
};

/**
 * Получить конфигурацию бота по ID.
 */
function getBot(botId) {
  return BOT_REGISTRY[botId] || null;
}

/**
 * Получить список всех ID ботов.
 */
function getAllBotIds() {
  return Object.keys(BOT_REGISTRY);
}

/**
 * Получить имя бота по ID.
 */
function getBotName(botId) {
  return BOT_REGISTRY[botId]?.name || 'Неизвестный бот';
}

export { BOT_REGISTRY, getBot, getAllBotIds, getBotName, getFallbackResponse };
