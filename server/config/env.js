/**
 * Валидация и нормализация переменных окружения.
 * Загружается один раз при старте сервера.
 */
import dotenv from 'dotenv';
dotenv.config();

function parseList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4300',
  'http://127.0.0.1:4300',
  'https://realcampdzen.github.io',
  'https://real-vibe.studio',
  'https://www.real-vibe.studio',
  'https://vps.real-vibe.studio',
  'https://real-vibe-ai-studio.pages.dev',
];

const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.BIND_HOST || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  trustProxy: process.env.TRUST_PROXY || 'loopback',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || '',
    proxyUrl: process.env.OPENAI_PROXY_URL || process.env.OPENAI_SOCKS_PROXY_URL || '',
    get isConfigured() {
      return Boolean(this.apiKey && this.apiKey !== 'your_openai_api_key_here');
    },
  },

  cors: {
    allowedOrigins: [...new Set([...defaultAllowedOrigins, ...parseList(process.env.ALLOWED_ORIGINS)])],
  },

  rateLimits: {
    minuteMax: Number(process.env.CHAT_MSG_RATE_LIMIT_PER_MIN) || 10,
    hourMax: 30,
    dayMax: Number(process.env.CHAT_MESSAGES_PER_DAY) || 100,
    apiMax: 30,
    cooldownMs: 2000,
  },

  chatQuota: {
    dailyPerBot: Number(process.env.CHAT_DAILY_LIMIT_PER_BOT) || 5,
    storePath: process.env.CHAT_QUOTA_STORE_PATH || 'data/chat-quotas.json',
    timezone: process.env.CHAT_LIMIT_TIMEZONE || 'Europe/Moscow',
    ownerToken: process.env.CHAT_OWNER_TOKEN || '',
  },

  imageProvider: process.env.IMAGE_PROVIDER || 'openai',
};

export default config;
