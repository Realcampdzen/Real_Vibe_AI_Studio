/**
 * Универсальный chat handler для всех ботов.
 * Вместо дублирования одной и той же логики для каждого бота.
 */
import express from 'express';
import Joi from 'joi';
import { logger } from '../middleware/logging.js';
import { chatCompletion, isConnected } from '../services/openai-client.js';
import { stripMarkdown } from '../services/text-cleaner.js';
import { getBot, getAllBotIds, getBotName, getFallbackResponse } from '../bots/registry.js';
import { agentChat } from '../agents/agent-chat.js';
import { streamAgentChat } from '../agents/stream-chat.js';
import { consumeChatQuota } from '../services/chat-quota.js';

const router = express.Router();

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
  try {
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      logger.warn(`Validation error: ${error.details[0].message}`, { botId, ip: req.ip });
      return res.status(400).json({
        error: 'Неверный формат данных',
        details: error.details[0].message,
      });
    }

    const bot = getBot(botId);
    if (!bot) {
      logger.warn(`Bot not found: ${botId}`, { ip: req.ip });
      return res.status(404).json({ error: 'Ассистент не найден' });
    }

    const { message } = value;
    logger.info(`🤖 Запрос к ${bot.name}:`, { message: message.substring(0, 100), ip: req.ip });

    const quota = await consumeChatQuota(req, res, botId);
    if (!quota.allowed) {
      logger.warn(`Daily chat quota exceeded for ${bot.name}`, { botId, ip: req.ip });
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
        logger.warn(`⚠️ Пустой ответ от API для ${bot.name}`, { botId });
        reply = getFallbackResponse(botId, message);
      } else {
        reply = stripMarkdown(reply);
      }
    } else {
      reply = getFallbackResponse(botId, message);
    }

    logger.info(`✅ Ответ от ${bot.name}:`, { reply: reply.substring(0, 100) });
    res.json({ reply });
  } catch (error) {
    logger.error(`❌ Ошибка ${botId}:`, { error: error.message, stack: error.stack, ip: req.ip });

    const bot = getBot(botId);
    const emergencyReply = bot?.emergencyReply || 'Извините, временные неполадки. Обращайтесь к @Stivanovv!';
    res.json({ reply: emergencyReply });
  }
}

// ────── Основной чат (Кот Бро) ──────
router.post('/chat', (req, res) => handleChat(req, res, 'bro-cat'));

// ────── SSE Streaming endpoint ──────
router.post('/api/chat/:botId/stream', async (req, res) => {
  const { error, value } = messageSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const bot = getBot(req.params.botId);
  if (!bot) {
    return res.status(404).json({ error: 'Ассистент не найден' });
  }

  const quota = await consumeChatQuota(req, res, req.params.botId);
  if (!quota.allowed) {
    logger.warn(`Daily chat quota exceeded for ${bot.name}`, { botId: req.params.botId, ip: req.ip });
    return res.status(quota.status).json(quota.body);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  logger.info(`📡 SSE stream для ${bot.name}`, { message: value.message.substring(0, 80) });
  await streamAgentChat(res, bot.prompt, value.message);
});

// ────── Универсальный endpoint по botId ──────
router.post('/api/chat/:botId', (req, res) => handleChat(req, res, req.params.botId));

// ────── Выделенные endpoints для ключевых ботов ──────
router.post('/api/hipych/chat', (req, res) => handleChat(req, res, 'hipych-ai'));
router.post('/api/valyusha/chat', (req, res) => handleChat(req, res, 'valyusha'));

// ────── Status endpoints ──────
router.get('/api/valyusha/test', (req, res) => {
  logger.info('💜 Тестовый endpoint НейроВалюши вызван');
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
      version: '3.0',
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
    api_version: '3.0',
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
    version: '3.0.0',
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
  try {
    const { error, value } = webhookSchema.validate(req.body);
    if (error) {
      logger.warn(`Webhook validation error: ${error.details[0].message}`, { botId: req.params.botId, ip: req.ip });
      return res.status(400).json({
        error: 'Неверный формат webhook данных',
        details: error.details[0].message,
      });
    }

    const { botId } = req.params;
    logger.info(`🔗 Webhook от ${botId}:`, { type: value.type, ip: req.ip });

    res.json({
      status: 'received',
      botId,
      timestamp: new Date().toISOString(),
      processed: true,
    });
  } catch (error) {
    logger.error('❌ Ошибка webhook:', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({ error: 'Webhook error' });
  }
});

export default router;
