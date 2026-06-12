import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import Joi from 'joi';
import { logger } from '../middleware/logging.js';

const router = express.Router();
const LEADS_PATH = path.join(process.cwd(), 'logs', 'max-funnel-leads.jsonl');

const forbiddenSecretPattern = /(sk-[a-z0-9_-]{16,}|[0-9]{6,}:AA[a-z0-9_-]{20,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|(?:token|secret|password|api[_ -]?key|парол[ья]|pin|пин|ключ)\s*[:=]\s*\S{4,})/i;

const leadSchema = Joi.object({
  contact: Joi.string().max(180).allow('').optional(),
  goal: Joi.string().valid('Business setup', 'Bot', 'Mini app', 'AI agent').required(),
  assets: Joi.array().items(Joi.string().max(80)).max(8).default([]),
  destinations: Joi.array().items(Joi.string().max(80)).max(8).default([]),
  title: Joi.string().max(120).required(),
  brief: Joi.string().max(1200).required(),
  source: Joi.string().max(80).default('max-funnel'),
}).unknown(false);

function cleanText(value, maxLength) {
  const text = String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function cleanList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => cleanText(value, 80))
    .filter(Boolean)
    .slice(0, 8);
}

function containsSecretLanguage(value) {
  if (typeof value === 'string') return forbiddenSecretPattern.test(value);
  if (Array.isArray(value)) return value.some((item) => containsSecretLanguage(item));
  return false;
}

function isLocalRequest(req) {
  const hostname = String(req.hostname || '').toLowerCase();
  const ip = String(req.ip || '');
  const localHost = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  const localIp = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  return localHost && localIp;
}

function publicLeadView(lead) {
  return {
    id: lead.id,
    shortId: lead.shortId,
    createdAt: lead.createdAt,
    source: lead.source,
    contact: lead.contact,
    goal: lead.goal,
    assets: Array.isArray(lead.assets) ? lead.assets : [],
    destinations: Array.isArray(lead.destinations) ? lead.destinations : [],
    title: lead.title,
    brief: lead.brief,
  };
}

async function readLatestLeads(limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  try {
    const content = await fs.readFile(LEADS_PATH, 'utf8');
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-safeLimit)
      .reverse()
      .map((line) => {
        try {
          return publicLeadView(JSON.parse(line));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

router.get('/max-funnel/leads', async (req, res, next) => {
  try {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ error: 'MAX lead inbox доступен только локально' });
    }

    const leads = await readLatestLeads(req.query.limit);
    return res.json({ leads });
  } catch (error) {
    return next(error);
  }
});

router.post('/max-funnel/leads', async (req, res, next) => {
  try {
    const { error, value } = leadSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ error: 'Проверьте поля MAX-заявки' });
    }

    if (containsSecretLanguage([value.contact, value.brief, value.assets, value.destinations])) {
      return res.status(400).json({ error: 'Не отправляйте токены, пароли, PIN или закрытые ключи через форму' });
    }

    const lead = {
      id: randomUUID(),
      shortId: `MAX-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      source: cleanText(value.source, 80) || 'max-funnel',
      contact: cleanText(value.contact, 180),
      goal: value.goal,
      assets: cleanList(value.assets),
      destinations: cleanList(value.destinations),
      title: cleanText(value.title, 120),
      brief: cleanText(value.brief, 1200),
      requestId: req.requestId,
    };

    await fs.mkdir(path.dirname(LEADS_PATH), { recursive: true });
    await fs.appendFile(LEADS_PATH, `${JSON.stringify(lead)}\n`, 'utf8');

    logger.info('MAX funnel lead captured', {
      requestId: req.requestId,
      leadId: lead.id,
      shortId: lead.shortId,
      goal: lead.goal,
      assetsCount: lead.assets.length,
      destinationsCount: lead.destinations.length,
      hasContact: Boolean(lead.contact),
    });

    return res.status(201).json({
      ok: true,
      lead: {
        id: lead.id,
        shortId: lead.shortId,
        createdAt: lead.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
