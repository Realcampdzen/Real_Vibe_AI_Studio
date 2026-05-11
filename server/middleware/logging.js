/**
 * Winston logging configuration.
 */
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
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
    requestId: req.requestId,
    method: req.method,
    path: safePath(req.originalUrl || req.url),
    ip: req.ip,
  };
}

function errorStatus(err) {
  const status = Number(err?.status || err?.statusCode || 500);
  return status >= 400 && status < 600 ? status : 500;
}

function isStaticAssetPath(pathname) {
  return /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|avif|mp4|webm|ogg|mp3|wav|woff2?|ttf|otf)$/i.test(pathname);
}

function shouldLogRequest(req, res, pathname) {
  if (config.isDevelopment) return true;
  if (res.statusCode >= 400) return true;
  if (pathname === '/health') return false;
  if ((req.method === 'GET' || req.method === 'HEAD') && isStaticAssetPath(pathname)) return false;
  return true;
}

export function createRequestLogger() {
  return function requestLogger(req, res, next) {
    const startedAt = Date.now();
    res.on('finish', () => {
      const pathname = safePath(req.originalUrl || req.url);
      if (!shouldLogRequest(req, res, pathname)) return;

      logger.info('HTTP request', {
        ...requestMeta(req),
        path: pathname,
        statusCode: res.statusCode,
        responseTimeMs: Date.now() - startedAt,
      });
    });
    next();
  };
}

export function attachRequestId() {
  return function requestIdMiddleware(req, res, next) {
    const headerValue = req.get('x-request-id');
    const requestId = typeof headerValue === 'string' && /^[a-zA-Z0-9._:-]{8,80}$/.test(headerValue)
      ? headerValue
      : randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  };
}

export function sanitizedApiMeta(req, options = {}) {
  const startedAt = Number(options.startedAt || req.startedAt || Date.now());
  return {
    requestId: req.requestId,
    method: req.method,
    path: safePath(req.originalUrl || req.url),
    botId: options.botId,
    statusCode: options.statusCode,
    outcome: options.outcome,
    reason: options.reason,
    errorName: options.error ? options.error.name || 'Error' : undefined,
    durationMs: Math.max(0, Date.now() - startedAt),
  };
}

export function createErrorLogger() {
  return function errorLogger(err, req, res, next) {
    const status = errorStatus(err);
    if (status >= 500 || config.isDevelopment) {
      const log = status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
      log('HTTP request error', {
        ...requestMeta(req),
        error: config.isDevelopment ? err.message : err.name || 'Error',
        statusCode: status,
        stack: config.isDevelopment ? err.stack : undefined,
      });
    }
    next(err);
  };
}

export { safePath };
