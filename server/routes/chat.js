/**
 * Универсальный chat handler для всех ботов.
 * Вместо дублирования одной и той же логики для каждого бота.
 */
import express from 'express';
import Joi from 'joi';
import { timingSafeEqual } from 'crypto';
import config from '../config/env.js';
import { logger, sanitizedApiMeta } from '../middleware/logging.js';
import { appVersion } from '../config/version.js';
import { chatCompletion, isConnected } from '../services/openai-client.js';
import { stripMarkdown } from '../services/text-cleaner.js';
import { getBot, getAllBotIds, getBotName, getFallbackResponse } from '../bots/registry.js';
import { agentChat } from '../agents/agent-chat.js';
import { streamAgentChat } from '../agents/stream-chat.js';
import { consumeChatQuota } from '../services/chat-quota.js';

const router = express.Router();

function safeTokenEquals(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isWebhookAuthorized(req) {
  if (config.isDevelopment && !config.security.webhookToken) return true;
  return safeTokenEquals(req.get('x-rv-webhook-token'), config.security.webhookToken);
}

// Схема валидации
const messageSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required(),
  userId: Joi.string().max(100).optional(),
  context: Joi.object().optional(),
  chatHistory: Joi.array().optional(),
});

/**
 * Общий handler чата для любого бота.
 */
async function handleChat(req, res, botId) {
  const startedAt = Date.now();
  try {
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      logger.warn('Chat/API rejected', sanitizedApiMeta(req, {
        botId,
        startedAt,
        statusCode: 400,
        outcome: 'validation_error',
        reason: error.details[0]?.type || 'validation',
      }));
      return res.status(400).json({
        error: 'Неверный формат данных',
        details: error.details[0].message,
      });
    }

    const bot = getBot(botId);
    if (!bot) {
      logger.warn('Chat/API rejected', sanitizedApiMeta(req, {
        botId,
        startedAt,
        statusCode: 404,
        outcome: 'bot_not_found',
      }));
      return res.status(404).json({ error: 'Ассистент не найден' });
    }

    const { message } = value;
    if (config.isDevelopment) {
      logger.info('Chat request accepted', sanitizedApiMeta(req, {
        botId,
        startedAt,
        statusCode: 202,
        outcome: 'accepted',
      }));
    }

    const quota = await consumeChatQuota(req, res, botId);
    if (!quota.allowed) {
      logger.warn('Chat/API rejected', sanitizedApiMeta(req, {
        botId,
        startedAt,
        statusCode: quota.status,
        outcome: 'quota_limited',
        reason: quota.body?.code || 'quota',
      }));
      return res.status(quota.status).json(quota.body);
    }

    let reply;

    if (isConnected()) {
      // Сначала пробуем агентный чат (с tools)
      reply = await agentChat(bot.prompt, message);

      // Fallback на простой chatCompletion если агент не ответил
      if (!reply || reply.trim() === '') {
        reply = await chatCompletion(bot.prompt, message);
      }

      if (!reply || reply.trim() === '') {
        logger.warn('Chat/API fallback', sanitizedApiMeta(req, {
          botId,
          startedAt,
          statusCode: 200,
          outcome: 'empty_ai_reply',
        }));
        reply = getFallbackResponse(botId, message);
      } else {
        reply = stripMarkdown(reply);
      }
    } else {
      reply = getFallbackResponse(botId, message);
    }

    if (config.isDevelopment) {
      logger.info('Chat response generated', sanitizedApiMeta(req, {
        botId,
        startedAt,
        statusCode: 200,
        outcome: 'ok',
      }));
    }
    res.json({ reply });
  } catch (error) {
    logger.error('Chat/API error', sanitizedApiMeta(req, {
      botId,
      startedAt,
      statusCode: 200,
      outcome: 'emergency_reply',
      error,
    }));

    const bot = getBot(botId);
    const emergencyReply = bot?.emergencyReply || 'Извините, временные неполадки. Обращайтесь к @Stivanovv!';
    res.json({ reply: emergencyReply });
  }
}

// ────── Основной чат (Кот Бро) ──────
router.post('/chat', (req, res) => handleChat(req, res, 'bro-cat'));

// ────── SSE Streaming endpoint ──────
router.post('/api/chat/:botId/stream', async (req, res) => {
  const startedAt = Date.now();
  const { error, value } = messageSchema.validate(req.body);
  if (error) {
    logger.warn('Chat/API rejected', sanitizedApiMeta(req, {
      botId: req.params.botId,
      startedAt,
      statusCode: 400,
      outcome: 'stream_validation_error',
      reason: error.details[0]?.type || 'validation',
    }));
    return res.status(400).json({ error: error.details[0].message });
  }
  const bot = getBot(req.params.botId);
  if (!bot) {
    logger.warn('Chat/API rejected', sanitizedApiMeta(req, {
      botId: req.params.botId,
      startedAt,
      statusCode: 404,
      outcome: 'stream_bot_not_found',
    }));
    return res.status(404).json({ error: 'Ассистент не найден' });
  }

  const quota = await consumeChatQuota(req, res, req.params.botId);
  if (!quota.allowed) {
    logger.warn('Chat/API rejected', sanitizedApiMeta(req, {
      botId: req.params.botId,
      startedAt,
      statusCode: quota.status,
      outcome: 'stream_quota_limited',
      reason: quota.body?.code || 'quota',
    }));
    return res.status(quota.status).json(quota.body);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  if (config.isDevelopment) {
    logger.info('SSE chat stream started', sanitizedApiMeta(req, {
      botId: req.params.botId,
      startedAt,
      statusCode: 200,
      outcome: 'stream_started',
    }));
  }
  await streamAgentChat(res, bot.prompt, value.message);
});

// ────── Универсальный endpoint по botId ──────
router.post('/api/chat/:botId', (req, res) => handleChat(req, res, req.params.botId));

// ────── Выделенные endpoints для ключевых ботов ──────
router.post('/api/hipych/chat', (req, res) => handleChat(req, res, 'hipych-ai'));
router.post('/api/valyusha/chat', (req, res) => handleChat(req, res, 'valyusha'));

// ────── Status endpoints ──────
router.get('/api/valyusha/test', (req, res) => {
  if (config.isDevelopment) {
    logger.info('Valyusha test endpoint called', { requestId: req.requestId });
  }
  res.json({ status: 'ok', message: 'НейроВалюша endpoint работает!' });
});

function statusHandler(botId) {
  return (req, res) => {
    const bot = getBot(botId);
    res.json({
      status: isConnected() ? 'online' : 'fallback',
      bot_name: bot?.name || botId,
      api_status: isConnected() ? 'connected' : 'unavailable',
      last_check: new Date().toISOString(),
      response_time: 'fast',
      version: appVersion,
    });
  };
}

router.get('/api/valyusha/status', statusHandler('valyusha'));
router.get('/api/hipych/status', statusHandler('hipych-ai'));

router.get('/api/hipych/info', (req, res) => {
  res.json({
    name: 'Хипыч AI',
    role: 'Демо-ассистент AI Studio',
    personality: 'Геймер, стример, ИИ-помощник',
    specialization: ['AI-технологии', 'Автоматизация', 'Разработка ботов', 'Геймерская тематика'],
    avatar: '🎮',
    status: 'active',
    api_version: appVersion,
    description: 'Хипыч показывает возможности современных AI-ботов и рассказывает о услугах AI Studio',
  });
});

// ────── Статус всех ботов ──────
router.get('/api/bots/status', (req, res) => {
  const botsStatus = {};
  for (const botId of getAllBotIds()) {
    botsStatus[botId] = {
      status: isConnected() ? 'online' : 'fallback',
      name: getBotName(botId),
      lastCheck: new Date().toISOString(),
      apiStatus: isConnected() ? 'connected' : 'unavailable',
    };
  }
  res.json(botsStatus);
});

// ────── Health check ──────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Studio API Gateway',
    timestamp: new Date().toISOString(),
    openai: isConnected() ? 'connected' : 'unavailable',
    version: appVersion,
    security: 'enhanced',
  });
});

// ────── Webhook (для внешних ботов) ──────
const webhookSchema = Joi.object({
  type: Joi.string().required(),
  data: Joi.object().required(),
  timestamp: Joi.date().optional(),
});

router.post('/api/webhook/:botId', async (req, res) => {
  const startedAt = Date.now();
  try {
    if (!isWebhookAuthorized(req)) {
      logger.warn('Webhook forbidden', sanitizedApiMeta(req, {
        botId: req.params.botId,
        startedAt,
        statusCode: 403,
        outcome: 'webhook_forbidden',
      }));
      return res.status(403).json({ error: 'Webhook forbidden' });
    }

    const { error, value } = webhookSchema.validate(req.body);
    if (error) {
      logger.warn('Webhook validation error', sanitizedApiMeta(req, {
        botId: req.params.botId,
        startedAt,
        statusCode: 400,
        outcome: 'webhook_validation_error',
        reason: error.details[0]?.type || 'validation',
      }));
      return res.status(400).json({
        error: 'Неверный формат webhook данных',
        details: error.details[0].message,
      });
    }

    const { botId } = req.params;
    if (config.isDevelopment) {
      logger.info('Webhook received', sanitizedApiMeta(req, {
        botId,
        startedAt,
        statusCode: 200,
        outcome: 'webhook_received',
        reason: value.type,
      }));
    }

    res.json({
      status: 'received',
      botId,
      timestamp: new Date().toISOString(),
      processed: true,
    });
  } catch (error) {
    logger.error('Webhook error', sanitizedApiMeta(req, {
      botId: req.params.botId,
      startedAt,
      statusCode: 500,
      outcome: 'webhook_error',
      error,
    }));
    res.status(500).json({ error: 'Webhook error' });
  }
});

export default router;
