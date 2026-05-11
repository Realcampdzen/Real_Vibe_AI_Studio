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
import { createHelmetMiddleware } from './middleware/security.js';
import { createRateLimiters } from './middleware/rate-limit.js';
import { createCooldownMiddleware } from './middleware/cooldown.js';
import { logger, createRequestLogger, createErrorLogger } from './middleware/logging.js';

// Routes
import chatRoutes from './routes/chat.js';

// Services (for health check)
import { isConnected } from './services/openai-client.js';

const __dirname = import.meta.dirname;
const app = express();
app.set('trust proxy', config.trustProxy);

// ────── Security ──────
app.use(createHelmetMiddleware());

// ────── CORS ──────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));

// ────── Logging ──────
app.use(createRequestLogger());

// ────── Rate Limiting ──────
const { botMinuteLimiter, botHourLimiter, botDayLimiter, apiLimiter } = createRateLimiters(logger);
const cooldownMiddleware = createCooldownMiddleware(logger);

app.use('/api', apiLimiter);

// Apply bot-specific rate limits to chat endpoints
const botLimitStack = [cooldownMiddleware, botMinuteLimiter, botHourLimiter, botDayLimiter];
app.use('/chat', ...botLimitStack);
app.use('/api/chat', ...botLimitStack);
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
app.use(chatRoutes);

// ────── Static pages ──────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
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
    if (filePath.match(/\.(mp4|webm|ogg)$/)) {
      res.set('Content-Type', 'video/mp4');
    }
  },
  index: false,
}));

// ────── Error handling ──────
app.use(createErrorLogger());

app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.url}`, { ip: req.ip });
  res.status(404).json({ error: 'Страница не найдена', status: 404, path: req.url });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message, stack: err.stack,
    url: req.url, method: req.method, ip: req.ip,
  });

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS: Доступ запрещён',
      message: 'Ваш домен не разрешён для доступа к API',
    });
  }

  res.status(500).json({ error: 'Внутренняя ошибка сервера', timestamp: new Date().toISOString() });
});

// ────── Start ──────
const listenArgs = config.host ? [config.port, config.host] : [config.port];
app.listen(...listenArgs, () => {
  logger.info(`🚀 Сервер работает на http://localhost:${config.port}`, {
    host: config.host || '0.0.0.0',
    port: config.port,
    openai: isConnected() ? 'connected' : 'unavailable',
    security: 'enhanced',
    version: '3.1.0',
  });
  logger.info('🔒 Безопасность: Helmet, CORS, Rate Limiting, Валидация включены');
  logger.info('📊 Логирование: Winston включен, логи сохраняются в /logs');
});

export default app;
