/**
 * Rate limiting middleware.
 * Включает multi-tier rate limiting для ботов и общий API limiter.
 */
import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

/**
 * Проверяет, нужно ли пропустить rate limiting для данного запроса.
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function shouldSkipRateLimit(req) {
  if (!config.isDevelopment) return false;

  const ip = req.ip || req.connection?.remoteAddress || '';

  return ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.includes('localhost') ||
    ip.startsWith('127.') ||
    ip.startsWith('::ffff:127.');
}

function createRateLimitHandler(logger, message, retryAfter) {
  return (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
    res.status(429).json({ error: message, retryAfter });
  };
}

export function createRateLimiters(logger) {
  const botMinuteLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: config.rateLimits.minuteMax,
    skip: shouldSkipRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(logger, 'Слишком много запросов, подождите минуту', 60),
  });

  const botHourLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: config.rateLimits.hourMax,
    skip: shouldSkipRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(logger, 'Превышен часовой лимит запросов, подождите', 3600),
  });

  const botDayLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: config.rateLimits.dayMax,
    skip: shouldSkipRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(logger, 'Дневной лимит запросов исчерпан, попробуйте завтра', 86400),
  });

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: config.rateLimits.apiMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ error: 'Слишком много запросов, попробуйте позже' });
    },
  });

  return { botMinuteLimiter, botHourLimiter, botDayLimiter, apiLimiter };
}
