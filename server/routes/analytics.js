import express from 'express';
import { logger, safePath } from '../middleware/logging.js';

const router = express.Router();

const ALLOWED_TYPES = new Set([
  'page_view',
  'service_card_click',
  'cta_click',
  'chat_open',
  'chat_send_result',
]);

const ALLOWED_STATUSES = new Set(['success', 'error', 'rate_limited', 'network_error']);

function limitString(value, maxLength = 120) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/[\r\n\t]+/g, ' ').trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function normalizeServiceId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim();
  return /^\d{1,2}$/.test(text) ? text : undefined;
}

function normalizeTarget(value) {
  const text = limitString(value, 160);
  if (!text) return undefined;
  if (/token|secret|password|message|reply|body/i.test(text)) return undefined;

  try {
    const parsed = new URL(text, 'https://vps.real-vibe.studio');
    if (parsed.protocol === 'mailto:') return 'mailto';
    if (parsed.protocol === 'tel:') return 'tel';
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return parsed.protocol.replace(/:$/, '');
    return parsed.pathname === '/' ? parsed.pathname : safePath(parsed.pathname);
  } catch {
    return limitString(text.replace(/[?#].*$/, ''), 80);
  }
}

function sanitizeEvent(body, req) {
  const type = limitString(body?.type, 48);
  if (!ALLOWED_TYPES.has(type)) return null;

  const status = limitString(body?.status, 32);
  const sanitizedStatus = ALLOWED_STATUSES.has(status) ? status : undefined;

  return {
    type,
    page: safePath(limitString(body?.page, 160) || req.path),
    serviceId: normalizeServiceId(body?.serviceId),
    target: normalizeTarget(body?.target),
    botId: limitString(body?.botId, 64),
    status: sanitizedStatus,
    requestId: req.requestId,
  };
}

router.post('/event', (req, res) => {
  const event = sanitizeEvent(req.body, req);
  if (!event) {
    return res.status(204).end();
  }

  logger.info('Analytics event', event);
  res.status(204).end();
});

export default router;
