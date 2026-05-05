/**
 * Winston logging configuration.
 */
import winston from 'winston';
import expressWinston from 'express-winston';
import fs from 'fs';
import path from 'path';

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

export function createRequestLogger() {
  return expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}}',
    colorize: false,
    ignoreRoute: () => false,
  });
}

export function createErrorLogger() {
  return expressWinston.errorLogger({
    winstonInstance: logger,
  });
}
