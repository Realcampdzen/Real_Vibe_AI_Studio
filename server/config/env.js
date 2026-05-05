/**
 * Валидация и нормализация переменных окружения.
 * Загружается один раз при старте сервера.
 */
import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    get isConfigured() {
      return Boolean(this.apiKey && this.apiKey !== 'your_openai_api_key_here');
    },
  },

  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://realcampdzen.github.io',
      'https://real-vibe.studio',
      'https://www.real-vibe.studio',
      'https://real-vibe-ai-studio.pages.dev',
    ],
  },

  rateLimits: {
    minuteMax: Number(process.env.CHAT_MSG_RATE_LIMIT_PER_MIN) || 10,
    hourMax: 30,
    dayMax: Number(process.env.CHAT_MESSAGES_PER_DAY) || 100,
    apiMax: 30,
    cooldownMs: 2000,
  },

  imageProvider: process.env.IMAGE_PROVIDER || 'openai',
};

export default config;
