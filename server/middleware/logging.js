/**
 * Winston logging configuration.
 */
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import config from '../config/env.js';

// Создаём директорию для логов если её нет
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-studio-api' },
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

function safePath(rawUrl = '') {
  try {
    const url = new URL(rawUrl, 'http://local');
    return url.pathname;
  } catch {
    return String(rawUrl).split('?')[0] || '/';
  }
}

function requestMeta(req) {
  return {
    method: req.method,
    path: safePath(req.originalUrl || req.url),
    ip: req.ip,
  };
}

export function createRequestLogger() {
  return function requestLogger(req, res, next) {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info('HTTP request', {
        ...requestMeta(req),
        statusCode: res.statusCode,
        responseTimeMs: Date.now() - startedAt,
      });
    });
    next();
  };
}

export function createErrorLogger() {
  return function errorLogger(err, req, res, next) {
    logger.error('HTTP request error', {
      ...requestMeta(req),
      error: err.message,
      stack: config.isDevelopment ? err.stack : undefined,
    });
    next(err);
  };
}

export { safePath };
