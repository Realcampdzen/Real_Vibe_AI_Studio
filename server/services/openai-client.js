/**
 * OpenAI client singleton.
 * Создаётся один раз при старте, переиспользуется всеми роутами.
 */
import config from '../config/env.js';
import winston from 'winston';
import OpenAI from 'openai';

const logger = winston.createLogger({
  level: 'info',
  defaultMeta: { service: 'openai-client' },
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

let openai = null;

if (config.openai.isConfigured) {
  try {
    openai = new OpenAI({ apiKey: config.openai.apiKey });
    logger.info('✅ OpenAI API подключен');
  } catch (error) {
    logger.error('⚠️ OpenAI API недоступен', { error: error.message });
  }
} else {
  logger.warn('⚠️ OpenAI API ключ не найден, fallback режим');
}

export async function chatCompletion(systemPrompt, userMessage, opts = {}) {
  if (!openai) return null;
  const completion = await openai.chat.completions.create({
    model: opts.model || 'gpt-5-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_completion_tokens: opts.maxTokens || 1000,
  });
  return completion.choices?.[0]?.message?.content || null;
}

export function isConnected() {
  return openai !== null;
}

export { openai };
