import { randomBytes, randomUUID, createHmac, scrypt as scryptCallback, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import config from '../config/env.js';
import { query } from './db.js';

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = config.auth.sessionTtlDays * 24 * 60 * 60 * 1000;
const TELEGRAM_ALLOWED_AGE_SECONDS = 24 * 60 * 60;

function nowPlusSessionTtl() {
  return new Date(Date.now() + SESSION_TTL_MS);
}

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function safeEquals(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hmac(value) {
  return createHmac('sha256', config.auth.sessionSecret).update(String(value)).digest('base64url');
}

function parseCookies(cookieHeader = '') {
  const cookies = {};
  cookieHeader.split(';').forEach((part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return;
    try {
      cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
    } catch {
      cookies[rawName] = rawValue.join('=') || '';
    }
  });
  return cookies;
}

function sessionCookieOptions(req) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

function clearSessionCookie(res) {
  res.clearCookie(config.auth.sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function normalizeName(name, fallback = 'Клиент') {
  if (typeof name !== 'string') return fallback;
  const normalized = name.replace(/[\r\n\t]+/g, ' ').trim();
  return normalized ? normalized.slice(0, 120) : fallback;
}

function normalizeContact(contact) {
  if (typeof contact !== 'string') return '';
  return contact.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 180);
}

function mapUser(row) {
  if (!row?.user_id) return null;
  return {
    id: row.user_id,
    email: row.email || null,
    name: row.name || '',
    defaultContact: row.default_contact || '',
    avatarUrl: row.avatar_url || null,
  };
}

function mapSession(row) {
  return {
    id: row.id,
    csrfToken: row.csrf_token,
    expiresAt: row.expires_at,
  };
}

async function createAnonymousSession(req, res) {
  const token = randomToken();
  const row = await query(
    `INSERT INTO rv_sessions (id, token_hash, csrf_token, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, csrf_token, expires_at`,
    [randomUUID(), hmac(token), randomToken(24), nowPlusSessionTtl()],
  );

  res.cookie(config.auth.sessionCookieName, token, sessionCookieOptions(req));
  return { session: mapSession(row.rows[0]), user: null };
}

export async function getSession(req, res, { create = false } = {}) {
  const token = parseCookies(req.headers.cookie || '')[config.auth.sessionCookieName];
  if (token) {
    const result = await query(
      `SELECT
        s.id,
        s.csrf_token,
        s.expires_at,
        u.id AS user_id,
        u.email,
        u.name,
        u.default_contact,
        u.avatar_url
       FROM rv_sessions s
       LEFT JOIN rv_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()
       LIMIT 1`,
      [hmac(token)],
    );

    if (result.rows[0]) {
      await query('UPDATE rv_sessions SET updated_at = now(), expires_at = $1 WHERE id = $2', [
        nowPlusSessionTtl(),
        result.rows[0].id,
      ]);
      res.cookie(config.auth.sessionCookieName, token, sessionCookieOptions(req));
      return { session: mapSession(result.rows[0]), user: mapUser(result.rows[0]) };
    }

    await query('DELETE FROM rv_sessions WHERE token_hash = $1', [hmac(token)]).catch(() => {});
    clearSessionCookie(res);
  }

  if (!create) return { session: null, user: null };
  return createAnonymousSession(req, res);
}

export async function ensureSession(req, res, next) {
  try {
    req.auth = await getSession(req, res, { create: true });
    next();
  } catch (error) {
    next(error);
  }
}

export function requireCsrf(req, res, next) {
  const token = req.get('x-rv-csrf');
  if (!safeEquals(token, req.auth?.session?.csrfToken)) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ error: 'Нужен вход в аккаунт' });
  }
  next();
}

export async function bindSessionToUser(sessionId, userId) {
  await query('UPDATE rv_sessions SET user_id = $1, updated_at = now() WHERE id = $2', [userId, sessionId]);
}

export async function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie || '')[config.auth.sessionCookieName];
  if (token) {
    await query('DELETE FROM rv_sessions WHERE token_hash = $1', [hmac(token)]);
  }
  clearSessionCookie(res);
}

export async function hashPassword(password) {
  const salt = randomToken(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, passwordHash) {
  const [scheme, salt, hash] = String(passwordHash || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = await scrypt(password, salt, 64);
  return safeEquals(Buffer.from(derived).toString('base64url'), hash);
}

export async function createPasswordUser({ email, password, name }) {
  const normalizedEmail = normalizeEmail(email);
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await query(
      `INSERT INTO rv_users (id, email, name)
       VALUES ($1, $2, $3)`,
      [userId, normalizedEmail, normalizeName(name, normalizedEmail.split('@')[0] || 'Клиент')],
    );
    await query(
      `INSERT INTO rv_user_credentials (user_id, password_hash)
       VALUES ($1, $2)`,
      [userId, passwordHash],
    );
  } catch (error) {
    if (error.code === '23505') {
      const conflict = new Error('Пользователь с таким email уже существует');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }

  return getUserById(userId);
}

export async function authenticatePasswordUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const result = await query(
    `SELECT u.id, u.email, u.name, u.default_contact, u.avatar_url, c.password_hash
     FROM rv_users u
     JOIN rv_user_credentials c ON c.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  const row = result.rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    const error = new Error('Неверный email или пароль');
    error.status = 401;
    throw error;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    defaultContact: row.default_contact || '',
    avatarUrl: row.avatar_url || null,
  };
}

export async function getUserById(userId) {
  const result = await query(
    `SELECT id, email, name, default_contact, avatar_url
     FROM rv_users
     WHERE id = $1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    defaultContact: user.default_contact || '',
    avatarUrl: user.avatar_url || null,
  };
}

export async function updateUserProfile(userId, { name, defaultContact }) {
  const current = await getUserById(userId);
  if (!current) {
    const error = new Error('Пользователь не найден');
    error.status = 404;
    throw error;
  }

  const result = await query(
    `UPDATE rv_users
     SET name = $2,
         default_contact = $3,
         updated_at = now()
     WHERE id = $1
     RETURNING id, email, name, default_contact, avatar_url`,
    [
      userId,
      normalizeName(name, current.email?.split('@')[0] || current.name || 'Клиент'),
      normalizeContact(defaultContact),
    ],
  );
  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    defaultContact: user.default_contact || '',
    avatarUrl: user.avatar_url || null,
  };
}

export function createOAuthState({ sessionId, csrfToken, returnTo, provider }) {
  const payload = Buffer.from(JSON.stringify({
    sessionId,
    csrfToken,
    returnTo: sanitizeReturnTo(returnTo),
    provider,
    expiresAt: Date.now() + 10 * 60 * 1000,
    nonce: randomToken(12),
  })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

function oauthStateKey(state) {
  return hmac(`oauth-state:${state}`);
}

export async function storeOAuthCodeVerifier({ state, sessionId, provider, codeVerifier }) {
  await query('DELETE FROM rv_oauth_states WHERE expires_at <= now()');
  await query(
    `INSERT INTO rv_oauth_states (id, session_id, provider, code_verifier, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '10 minutes')
     ON CONFLICT (id) DO UPDATE SET
       session_id = EXCLUDED.session_id,
       provider = EXCLUDED.provider,
       code_verifier = EXCLUDED.code_verifier,
       expires_at = EXCLUDED.expires_at`,
    [oauthStateKey(state), sessionId, provider, codeVerifier],
  );
}

export async function consumeOAuthCodeVerifier({ state, sessionId, provider }) {
  const result = await query(
    `DELETE FROM rv_oauth_states
     WHERE id = $1 AND session_id = $2 AND provider = $3 AND expires_at > now()
     RETURNING code_verifier`,
    [oauthStateKey(state), sessionId, provider],
  );
  return result.rows[0]?.code_verifier || '';
}

export function verifyOAuthState(state) {
  const [payload, signature] = String(state || '').split('.');
  if (!payload || !signature || !safeEquals(signature, hmac(payload))) {
    const error = new Error('OAuth state invalid');
    error.status = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    const error = new Error('OAuth state invalid');
    error.status = 400;
    throw error;
  }

  if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
    const error = new Error('OAuth state expired');
    error.status = 400;
    throw error;
  }

  return parsed;
}

export function sanitizeReturnTo(value) {
  if (typeof value !== 'string' || !value) return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  if (/[\r\n]/.test(value)) return '/';
  return value.slice(0, 240);
}

export function getRequestOrigin(req) {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  return `${proto}://${host}`;
}

export async function findOrCreateOAuthUser({ provider, providerUserId, email, name, avatarUrl, rawProfile = {} }) {
  const identity = await query(
    `SELECT u.id, u.email, u.name, u.default_contact, u.avatar_url
     FROM rv_auth_identities ai
     JOIN rv_users u ON u.id = ai.user_id
     WHERE ai.provider = $1 AND ai.provider_user_id = $2
     LIMIT 1`,
    [provider, String(providerUserId)],
  );
  if (identity.rows[0]) {
    await query(
      `UPDATE rv_auth_identities
       SET email = $1, display_name = $2, avatar_url = $3, raw_profile = $4, updated_at = now()
       WHERE provider = $5 AND provider_user_id = $6`,
      [email || null, name || null, avatarUrl || null, JSON.stringify(rawProfile), provider, String(providerUserId)],
    );
    const row = identity.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      defaultContact: row.default_contact || '',
      avatarUrl: row.avatar_url || null,
    };
  }

  const normalizedEmail = normalizeEmail(email);
  let userId = null;
  if (normalizedEmail) {
    const existing = await query('SELECT id FROM rv_users WHERE email = $1 LIMIT 1', [normalizedEmail]);
    userId = existing.rows[0]?.id || null;
  }

  if (!userId) {
    userId = randomUUID();
    await query(
      `INSERT INTO rv_users (id, email, name, avatar_url)
       VALUES ($1, $2, $3, $4)`,
      [userId, normalizedEmail || null, normalizeName(name, normalizedEmail?.split('@')[0] || 'Клиент'), avatarUrl || null],
    );
  }

  await query(
    `INSERT INTO rv_auth_identities (id, user_id, provider, provider_user_id, email, display_name, avatar_url, raw_profile)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (provider, provider_user_id) DO UPDATE
     SET user_id = excluded.user_id,
         email = excluded.email,
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         raw_profile = excluded.raw_profile,
         updated_at = now()`,
    [randomUUID(), userId, provider, String(providerUserId), normalizedEmail || null, name || null, avatarUrl || null, JSON.stringify(rawProfile)],
  );

  return getUserById(userId);
}

export function verifyTelegramLoginPayload(payload) {
  if (!config.auth.telegramBotToken) {
    const error = new Error('Telegram login is not configured');
    error.status = 503;
    throw error;
  }

  const allowedKeys = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'];
  const data = {};
  for (const key of allowedKeys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      data[key] = String(payload[key]);
    }
  }

  const hash = String(payload.hash || '');
  const authDate = Number(data.auth_date || 0);
  if (!data.id || !hash || !authDate) {
    const error = new Error('Telegram login payload invalid');
    error.status = 400;
    throw error;
  }

  if (Math.abs(Date.now() / 1000 - authDate) > TELEGRAM_ALLOWED_AGE_SECONDS) {
    const error = new Error('Telegram login payload expired');
    error.status = 400;
    throw error;
  }

  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(config.auth.telegramBotToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!safeEquals(expected, hash)) {
    const error = new Error('Telegram login signature invalid');
    error.status = 400;
    throw error;
  }

  return data;
}
