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

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

const developmentAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4300',
  'http://127.0.0.1:4300',
  'http://localhost:4301',
  'http://127.0.0.1:4301',
];

const productionAllowedOrigins = [
  'https://real-vibe.studio',
  'https://www.real-vibe.studio',
  'https://vps.real-vibe.studio',
];

const stagingAllowedOrigins = [
  'https://realcampdzen.github.io',
  'https://real-vibe-ai-studio.pages.dev',
];

const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv !== 'production';
const envAllowedOrigins = parseList(process.env.ALLOWED_ORIGINS);

function resolveAllowedOrigins() {
  if (!isDevelopment) {
    return envAllowedOrigins.length
      ? envAllowedOrigins
      : productionAllowedOrigins;
  }

  return [
    ...developmentAllowedOrigins,
    ...productionAllowedOrigins,
    ...stagingAllowedOrigins,
    ...envAllowedOrigins,
  ];
}

const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.BIND_HOST || '',
  nodeEnv,
  isDevelopment,
  trustProxy: process.env.TRUST_PROXY || 'loopback',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || '',
    proxyUrl: process.env.OPENAI_PROXY_URL || process.env.OPENAI_SOCKS_PROXY_URL || '',
    get isConfigured() {
      return Boolean(this.apiKey && this.apiKey !== 'your_openai_api_key_here');
    },
  },

  hermes: {
    wellnessGatewayUrl: process.env.HERMES_WELLNESS_GATEWAY_URL || 'http://127.0.0.1:8649/v1/chat/completions',
    wellnessApiKey: process.env.HERMES_WELLNESS_API_KEY || '',
    wellnessModel: process.env.HERMES_WELLNESS_MODEL || 'gpt-5.3-codex',
    wellnessTimeoutMs: Number(process.env.HERMES_WELLNESS_TIMEOUT_MS) || 90000,
  },

  cors: {
    allowedOrigins: [...new Set(resolveAllowedOrigins())],
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
    timeZone: process.env.CHAT_LIMIT_TIMEZONE || 'Europe/Moscow',
    ownerToken: process.env.CHAT_OWNER_TOKEN || '',
  },

  database: {
    url: process.env.DATABASE_URL || '',
    ssl: parseBoolean(process.env.DATABASE_SSL, false),
    poolMax: Number(process.env.DATABASE_POOL_MAX) || 10,
  },

  auth: {
    sessionCookieName: 'rv_session',
    sessionSecret: process.env.AUTH_SESSION_SECRET ||
      process.env.AUTH_SECRET ||
      'development-only-change-me-real-vibe-session-secret',
    sessionTtlDays: Number(process.env.AUTH_SESSION_TTL_DAYS) || 30,
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    yandexClientId: process.env.YANDEX_CLIENT_ID || '',
    yandexClientSecret: process.env.YANDEX_CLIENT_SECRET || '',
    yandexRedirectUri: process.env.YANDEX_REDIRECT_URI || '',
    yandexScope: process.env.YANDEX_SCOPE || 'login:info login:email login:avatar',
    vkClientId: process.env.VK_CLIENT_ID || process.env.VK_ID_APP_ID || process.env.VK_APP_ID || '',
    vkRedirectUri: process.env.VK_REDIRECT_URI || '',
    vkScope: process.env.VK_SCOPE || 'email phone',
    telegramBotUsername: process.env.TELEGRAM_LOGIN_BOT_USERNAME || '',
    telegramBotToken: process.env.TELEGRAM_LOGIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
  },

  admin: {
    priceEditorToken: process.env.RV_PRICE_EDITOR_TOKEN || '',
  },

  orders: {
    telegramBotToken: process.env.ORDER_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.ORDER_TELEGRAM_CHAT_ID || process.env.TELEGRAM_USER_ID || '',
  },

  security: {
    requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '256kb',
    cspReportBodyLimit: process.env.CSP_REPORT_BODY_LIMIT || '16kb',
    cspReportOnly: process.env.CSP_REPORT_ONLY !== 'false',
    webhookToken: process.env.RV_WEBHOOK_TOKEN || '',
  },

  imageProvider: process.env.IMAGE_PROVIDER || 'openai',
};

export default config;
