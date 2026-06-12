/**
 * Entry point — тонкий файл, который только собирает модули.
 * v3.1 — ESM, OpenAI SDK v6, Vite 8
 */
import express from 'express';
import cors from 'cors';
import path from 'path';

// Config
import config from './config/env.js';

// Middleware
import { createCspReportOnlyMiddleware, createHelmetMiddleware } from './middleware/security.js';
import { createRateLimiters } from './middleware/rate-limit.js';
import { createCooldownMiddleware } from './middleware/cooldown.js';
import { logger, attachRequestId, createRequestLogger, createErrorLogger, safePath } from './middleware/logging.js';
import { appVersion } from './config/version.js';

// Routes
import chatRoutes from './routes/chat.js';
import analyticsRoutes from './routes/analytics.js';
import securityReportRoutes from './routes/security-reports.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import cartRoutes from './routes/cart.js';
import adminPriceRoutes from './routes/admin-prices.js';
import maxFunnelRoutes from './routes/max-funnel.js';

// Services (for health check)
import { isConnected } from './services/openai-client.js';
import { getDatabaseStatus, initializeDatabase } from './services/db.js';

const __dirname = import.meta.dirname;
const app = express();
app.set('trust proxy', config.trustProxy);

// ────── Security ──────
app.use(createHelmetMiddleware());
app.use(createCspReportOnlyMiddleware());
app.use(attachRequestId());

// ────── CORS ──────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    let isLocalDevOrigin = false;
    if (config.isDevelopment) {
      try {
        const originUrl = new URL(origin);
        isLocalDevOrigin = ['localhost', '127.0.0.1', '::1'].includes(originUrl.hostname);
      } catch {
        isLocalDevOrigin = false;
      }
    }
    if (config.cors.allowedOrigins.includes(origin) || isLocalDevOrigin) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin });
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      callback(error);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use('/api/csp-report', express.json({
  type: ['application/csp-report', 'application/reports+json', 'application/json'],
  limit: config.security.cspReportBodyLimit,
}));
app.use(express.json({ limit: config.security.requestBodyLimit }));

// ────── Logging ──────
app.use(createRequestLogger());

// ────── Rate Limiting ──────
const { botMinuteLimiter, botHourLimiter, botDayLimiter, apiLimiter } = createRateLimiters(logger);
const cooldownMiddleware = createCooldownMiddleware(logger);

app.use('/api', apiLimiter);
app.use('/chat', apiLimiter);

// Apply bot-specific rate limits to chat endpoints
const botLimitStack = [cooldownMiddleware, botMinuteLimiter, botHourLimiter, botDayLimiter];
app.use('/chat', ...botLimitStack);
app.use('/api/chat', ...botLimitStack);
app.use('/api/health/chat', ...botLimitStack);
app.use('/api/hipych/chat', ...botLimitStack);
app.use('/api/valyusha/chat', ...botLimitStack);

// ────── Favicon ──────
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ────── Cyrillic URL decode ──────
app.use((req, res, next) => {
  if (req.url) {
    try { req.url = decodeURIComponent(req.url); } catch (e) { /* keep original */ }
  }
  next();
});

// ────── Dev: disable caching ──────
if (config.isDevelopment) {
  app.use((req, res, next) => {
    if (req.path.match(/\.(html|css|js)$/)) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
    }
    next();
  });
}

// ────── Routes ──────
app.use('/api/csp-report', securityReportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api', adminPriceRoutes);
app.use('/api', cartRoutes);
app.use('/api', maxFunnelRoutes);
app.use(chatRoutes);

// ────── Static pages ──────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/ai-photo-detail.html', (req, res) => {
  res.redirect(301, '/service-detail.html?id=1');
});

// Static files (after API routes)
app.use(express.static(path.join(__dirname, '..'), {
  etag: !config.isDevelopment,
  lastModified: !config.isDevelopment,
  setHeaders: (res, filePath) => {
    if (path.basename(filePath) === 'sw.js') {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Service-Worker-Allowed': '/',
      });
      return;
    }
    if (config.isDevelopment && filePath.match(/\.(html|css|js)$/)) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
    }
    if (filePath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.ogg')) {
      res.set('Content-Type', 'video/ogg');
    }
  },
  index: false,
}));

// ────── Error handling ──────
app.use(createErrorLogger());

app.use((req, res) => {
  const pathOnly = safePath(req.originalUrl || req.url);
  res.status(404).json({ error: 'Страница не найдена', status: 404, path: pathOnly });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500 || config.isDevelopment) {
    const log = status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    log('Request error handled', {
      error: config.isDevelopment ? err.message : err.name || 'Error',
      stack: config.isDevelopment ? err.stack : undefined,
      path: safePath(req.originalUrl || req.url),
      method: req.method,
      ip: req.ip,
      requestId: req.requestId,
      statusCode: status,
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS: Доступ запрещён',
      message: 'Ваш домен не разрешён для доступа к API',
    });
  }

  const error = status === 413
    ? 'Слишком большой запрос'
    : (status < 500 && err.message ? err.message : 'Внутренняя ошибка сервера');
  res.status(status >= 400 && status < 600 ? status : 500).json({ error, timestamp: new Date().toISOString() });
});

// ────── Start ──────
await initializeDatabase(logger);

const listenArgs = config.host ? [config.port, config.host] : [config.port];
app.listen(...listenArgs, () => {
  logger.info(`🚀 Сервер работает на http://localhost:${config.port}`, {
    host: config.host || '0.0.0.0',
    port: config.port,
    openai: isConnected() ? 'connected' : 'unavailable',
    database: getDatabaseStatus(),
    security: 'enhanced',
    version: appVersion,
  });
  logger.info('🔒 Безопасность: Helmet, CORS, Rate Limiting, Валидация включены');
  logger.info('📊 Логирование: Winston включен, логи сохраняются в /logs');
});

export default app;
