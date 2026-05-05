/**
 * Cooldown middleware — минимальная задержка между запросами.
 */
import { shouldSkipRateLimit } from './rate-limit.js';
import config from '../config/env.js';

const lastRequestTime = new Map();

export function createCooldownMiddleware(logger) {
  return function cooldownMiddleware(req, res, next) {
    if (shouldSkipRateLimit(req)) return next();

    const ip = req.ip;
    const lastTime = lastRequestTime.get(ip) || 0;
    const now = Date.now();

    if (now - lastTime < config.rateLimits.cooldownMs) {
      logger.warn(`Cooldown violation for IP: ${ip}`);
      return res.status(429).json({
        error: 'Слишком быстро, подождите 2 секунды',
        retryAfter: 2,
      });
    }

    lastRequestTime.set(ip, now);
    next();
  };
}
