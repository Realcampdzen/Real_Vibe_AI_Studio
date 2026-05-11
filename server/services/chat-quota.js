/**
 * Per-visitor chat quotas for public demo bots.
 * Uses an anonymous cookie plus a small JSON store, suitable for the VPS demo.
 */
import fs from 'fs/promises';
import path from 'path';
import { randomUUID, timingSafeEqual } from 'crypto';
import config from '../config/env.js';

const VISITOR_COOKIE = 'rv_chat_uid';
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const VISITOR_ID_RE = /^[a-f0-9-]{36}$/i;

let cachedStore = null;
let loaded = false;
let quotaQueue = Promise.resolve();

function parseCookies(cookieHeader = '') {
  const cookies = {};

  cookieHeader.split(';').forEach((part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return;

    cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
  });

  return cookies;
}

function getStorePath() {
  const configuredPath = config.chatQuota.storePath;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

async function loadStore() {
  if (loaded) return cachedStore;

  try {
    const raw = await fs.readFile(getStorePath(), 'utf8');
    cachedStore = JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    cachedStore = { version: 1, days: {} };
  }

  if (!cachedStore || typeof cachedStore !== 'object') {
    cachedStore = { version: 1, days: {} };
  }
  if (!cachedStore.days || typeof cachedStore.days !== 'object') {
    cachedStore.days = {};
  }

  loaded = true;
  return cachedStore;
}

async function saveStore(store) {
  const storePath = getStorePath();
  const tmpPath = `${storePath}.tmp`;

  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, storePath);
}

function getDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
  };
}

function getDateKey(date = new Date()) {
  const { year, month, day } = getDateParts(date, config.chatQuota.timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const value = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  const match = value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * ((hours * 60 + minutes) * 60 * 1000);
}

function getResetAt(date = new Date()) {
  const current = getDateParts(date, config.chatQuota.timeZone);
  const nextUtcMidnightGuess = new Date(Date.UTC(current.year, current.month - 1, current.day + 1, 0, 0, 0));
  const offsetMs = getTimeZoneOffsetMs(nextUtcMidnightGuess, config.chatQuota.timeZone);
  return new Date(nextUtcMidnightGuess.getTime() - offsetMs).toISOString();
}

function safeTokenEquals(a, b) {
  if (!a || !b) return false;

  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

function isOwnerRequest(req) {
  return safeTokenEquals(req.get('x-rv-owner-token'), config.chatQuota.ownerToken);
}

function ensureVisitorId(req, res) {
  const cookies = parseCookies(req.headers.cookie || '');
  let visitorId = cookies[VISITOR_COOKIE];

  if (!VISITOR_ID_RE.test(visitorId || '')) {
    visitorId = randomUUID();
  }

  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  res.cookie(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });

  return visitorId;
}

function pruneOldDays(store, currentDateKey) {
  for (const dateKey of Object.keys(store.days)) {
    if (dateKey !== currentDateKey) {
      delete store.days[dateKey];
    }
  }
}

function buildLimitResponse(limit, resetAt) {
  return {
    code: 'chat_daily_limit',
    error: 'На сегодня демо-лимит этого бота исчерпан: 5 ответов в день. Завтра можно продолжить, а владельцу доступ без лимита.',
    limit,
    remaining: 0,
    resetAt,
  };
}

async function consumeQuotaUnlocked(req, res, botId) {
  const limit = config.chatQuota.dailyPerBot;
  if (!limit || limit < 1) {
    return { allowed: true, remaining: null, owner: false };
  }

  if (isOwnerRequest(req)) {
    return { allowed: true, remaining: null, owner: true };
  }

  const visitorId = ensureVisitorId(req, res);
  const dateKey = getDateKey();
  const resetAt = getResetAt();
  const store = await loadStore();

  pruneOldDays(store, dateKey);

  store.days[dateKey] ||= {};
  store.days[dateKey][visitorId] ||= {};

  const visitorCounts = store.days[dateKey][visitorId];
  const currentCount = Number(visitorCounts[botId] || 0);

  if (currentCount >= limit) {
    return {
      allowed: false,
      status: 429,
      body: buildLimitResponse(limit, resetAt),
    };
  }

  visitorCounts[botId] = currentCount + 1;
  await saveStore(store);

  return {
    allowed: true,
    remaining: Math.max(0, limit - visitorCounts[botId]),
    owner: false,
  };
}

export async function consumeChatQuota(req, res, botId) {
  const run = () => consumeQuotaUnlocked(req, res, botId);
  const result = quotaQueue.then(run, run);
  quotaQueue = result.catch(() => {});
  return result;
}
