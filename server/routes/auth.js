import express from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes } from 'crypto';
import config from '../config/env.js';
import { logger } from '../middleware/logging.js';
import { shouldSkipRateLimit } from '../middleware/rate-limit.js';
import {
  authenticatePasswordUser,
  bindSessionToUser,
  consumeOAuthCodeVerifier,
  createOAuthState,
  createPasswordUser,
  destroySession,
  ensureSession,
  findOrCreateOAuthUser,
  getSession,
  getRequestOrigin,
  requireCsrf,
  sanitizeReturnTo,
  storeOAuthCodeVerifier,
  verifyOAuthState,
  verifyTelegramLoginPayload,
} from '../services/auth.js';
import { mergeSessionCartToUser } from '../services/cart-store.js';
import { isDatabaseEnabled } from '../services/db.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', { requestId: req.requestId, path: req.path, ip: req.ip });
    res.status(429).json({ error: 'Слишком много попыток входа, попробуйте позже' });
  },
});

const registerSchema = Joi.object({
  email: Joi.string().email().max(180).required(),
  password: Joi.string().min(8).max(160).required(),
  name: Joi.string().max(120).allow('').optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().max(180).required(),
  password: Joi.string().min(1).max(160).required(),
});

const telegramSchema = Joi.object({
  id: Joi.alternatives(Joi.string(), Joi.number()).required(),
  first_name: Joi.string().max(120).allow('').optional(),
  last_name: Joi.string().max(120).allow('').optional(),
  username: Joi.string().max(80).allow('').optional(),
  photo_url: Joi.string().uri().max(600).allow('').optional(),
  auth_date: Joi.alternatives(Joi.string(), Joi.number()).required(),
  hash: Joi.string().max(200).required(),
}).unknown(true);

function authResponse(req) {
  return {
    available: true,
    user: req.auth?.user || null,
    csrfToken: req.auth?.session?.csrfToken || null,
    providers: {
      google: Boolean(config.auth.googleClientId && config.auth.googleClientSecret),
      yandex: Boolean(config.auth.yandexClientId && config.auth.yandexClientSecret),
      vk: Boolean(config.auth.vkClientId),
      telegram: Boolean(config.auth.telegramBotUsername && config.auth.telegramBotToken),
      telegramBotUsername: config.auth.telegramBotUsername || '',
    },
  };
}

function unavailableAuthResponse() {
  return {
    available: false,
    user: null,
    csrfToken: null,
    providers: {
      google: false,
      yandex: false,
      vk: false,
      telegram: false,
      telegramBotUsername: '',
    },
  };
}

function redirectWithReason(res, returnTo, reason) {
  const url = new URL(sanitizeReturnTo(returnTo), 'https://local');
  url.searchParams.set('auth', reason);
  return res.redirect(`${url.pathname}${url.search}${url.hash}`);
}

async function loginSession(req, user) {
  await bindSessionToUser(req.auth.session.id, user.id);
  await mergeSessionCartToUser(req.auth.session.id, user.id);
  req.auth.user = user;
}

function oauthRedirectUri(req, provider) {
  const configured = config.auth[`${provider}RedirectUri`];
  return configured || `${getRequestOrigin(req)}/api/auth/${provider}/callback`;
}

function createCodeVerifier() {
  return randomBytes(32).toString('base64url');
}

function createCodeChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

async function readJsonResponse(response, label) {
  const payload = await response.json().catch(async () => {
    const text = await response.text().catch(() => '');
    return { error: text || 'invalid_json' };
  });
  if (!response.ok || payload?.error) {
    const errorText = payload?.error_description || payload?.error || `HTTP ${response.status}`;
    throw new Error(`${label}: ${errorText}`);
  }
  return payload;
}

function verifyProviderState(req, rawState, provider) {
  const state = verifyOAuthState(rawState);
  if (state.provider && state.provider !== provider) {
    const error = new Error('OAuth provider mismatch');
    error.status = 400;
    throw error;
  }
  if (state.csrfToken !== req.auth.session.csrfToken) {
    const error = new Error('OAuth state mismatch');
    error.status = 400;
    throw error;
  }
  return state;
}

router.get('/session', async (req, res, next) => {
  if (!isDatabaseEnabled()) {
    return res.json(unavailableAuthResponse());
  }

  try {
    req.auth = await getSession(req, res, { create: true });
    res.json(authResponse(req));
  } catch (error) {
    next(error);
  }
});

router.post('/register', ensureSession, requireCsrf, authLimiter, async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Проверьте email, имя и пароль' });

    const user = await createPasswordUser(value);
    await loginSession(req, user);
    res.status(201).json(authResponse(req));
  } catch (error) {
    next(error);
  }
});

router.post('/login', ensureSession, requireCsrf, authLimiter, async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Проверьте email и пароль' });

    const user = await authenticatePasswordUser(value);
    await loginSession(req, user);
    res.json(authResponse(req));
  } catch (error) {
    next(error);
  }
});

router.post('/logout', ensureSession, requireCsrf, async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/google/start', ensureSession, (req, res) => {
  if (!config.auth.googleClientId || !config.auth.googleClientSecret) {
    return res.status(503).json({ error: 'Google вход не настроен' });
  }

  const redirectUri = oauthRedirectUri(req, 'google');
  const state = createOAuthState({
    sessionId: req.auth.session.id,
    csrfToken: req.auth.session.csrfToken,
    returnTo: req.query.returnTo,
    provider: 'google',
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.auth.googleClientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
});

router.get('/google/callback', ensureSession, async (req, res, next) => {
  let state;
  try {
    state = verifyProviderState(req, req.query.state, 'google');
    if (req.query.error || !req.query.code) {
      return redirectWithReason(res, state.returnTo, 'google_error');
    }

    const redirectUri = oauthRedirectUri(req, 'google');
    const tokenBody = new URLSearchParams({
      code: String(req.query.code),
      client_id: config.auth.googleClientId,
      client_secret: config.auth.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    if (!tokenResponse.ok) {
      throw new Error(`Google token exchange failed: ${tokenResponse.status}`);
    }
    const token = await tokenResponse.json();
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!profileResponse.ok) {
      throw new Error(`Google profile request failed: ${profileResponse.status}`);
    }
    const profile = await profileResponse.json();
    const user = await findOrCreateOAuthUser({
      provider: 'google',
      providerUserId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      rawProfile: profile,
    });
    await loginSession(req, user);
    res.redirect(sanitizeReturnTo(state.returnTo));
  } catch (error) {
    if (state?.returnTo) return redirectWithReason(res, state.returnTo, 'google_error');
    next(error);
  }
});

router.get('/yandex/start', ensureSession, (req, res) => {
  if (!config.auth.yandexClientId || !config.auth.yandexClientSecret) {
    return res.status(503).json({ error: 'Яндекс вход не настроен' });
  }

  const redirectUri = oauthRedirectUri(req, 'yandex');
  const state = createOAuthState({
    sessionId: req.auth.session.id,
    csrfToken: req.auth.session.csrfToken,
    returnTo: req.query.returnTo,
    provider: 'yandex',
  });
  const url = new URL('https://oauth.yandex.ru/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.auth.yandexClientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', config.auth.yandexScope);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

router.get('/yandex/callback', ensureSession, async (req, res, next) => {
  let state;
  try {
    state = verifyProviderState(req, req.query.state, 'yandex');
    if (req.query.error || !req.query.code) {
      return redirectWithReason(res, state.returnTo, 'yandex_error');
    }

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(req.query.code),
      client_id: config.auth.yandexClientId,
      client_secret: config.auth.yandexClientSecret,
      redirect_uri: oauthRedirectUri(req, 'yandex'),
    });
    const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    const token = await readJsonResponse(tokenResponse, 'Yandex token exchange failed');

    const profileUrl = new URL('https://login.yandex.ru/info');
    profileUrl.searchParams.set('format', 'json');
    const profileResponse = await fetch(profileUrl, {
      headers: { Authorization: `OAuth ${token.access_token}` },
    });
    const profile = await readJsonResponse(profileResponse, 'Yandex profile request failed');
    const avatarUrl = profile.default_avatar_id && profile.is_avatar_empty === false
      ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
      : null;
    const user = await findOrCreateOAuthUser({
      provider: 'yandex',
      providerUserId: profile.id,
      email: profile.default_email || profile.emails?.[0] || null,
      name: profile.real_name || profile.display_name || profile.login || profile.default_email || 'Yandex user',
      avatarUrl,
      rawProfile: profile,
    });
    await loginSession(req, user);
    res.redirect(sanitizeReturnTo(state.returnTo));
  } catch (error) {
    if (state?.returnTo) return redirectWithReason(res, state.returnTo, 'yandex_error');
    next(error);
  }
});

router.get('/vk/start', ensureSession, async (req, res, next) => {
  try {
    if (!config.auth.vkClientId) {
      return res.status(503).json({ error: 'VK ID вход не настроен' });
    }

    const redirectUri = oauthRedirectUri(req, 'vk');
    const codeVerifier = createCodeVerifier();
    const state = createOAuthState({
      sessionId: req.auth.session.id,
      csrfToken: req.auth.session.csrfToken,
      returnTo: req.query.returnTo,
      provider: 'vk',
    });
    await storeOAuthCodeVerifier({
      state,
      sessionId: req.auth.session.id,
      provider: 'vk',
      codeVerifier,
    });

    const url = new URL('https://id.vk.ru/authorize');
    url.searchParams.set('client_id', config.auth.vkClientId);
    url.searchParams.set('app_id', config.auth.vkClientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.auth.vkScope);
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', '');
    url.searchParams.set('code_challenge', createCodeChallenge(codeVerifier));
    url.searchParams.set('code_challenge_method', 's256');
    url.searchParams.set('v', '2.6.1');
    url.searchParams.set('sdk_type', 'vkid');
    res.redirect(url.toString());
  } catch (error) {
    next(error);
  }
});

router.get('/vk/callback', ensureSession, async (req, res, next) => {
  let state;
  try {
    state = verifyProviderState(req, req.query.state, 'vk');
    if (req.query.error || !req.query.code || !req.query.device_id) {
      return redirectWithReason(res, state.returnTo, 'vk_error');
    }
    const codeVerifier = await consumeOAuthCodeVerifier({
      state: String(req.query.state || ''),
      sessionId: req.auth.session.id,
      provider: 'vk',
    });
    if (!codeVerifier) {
      throw new Error('VK code verifier missing');
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: oauthRedirectUri(req, 'vk'),
      client_id: config.auth.vkClientId,
      code_verifier: codeVerifier,
      state: String(req.query.state || ''),
      device_id: String(req.query.device_id),
    });
    const tokenResponse = await fetch(`https://id.vk.ru/oauth2/auth?${tokenParams.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: String(req.query.code) }),
    });
    const token = await readJsonResponse(tokenResponse, 'VK token exchange failed');
    if (token.state && token.state !== req.query.state) {
      throw new Error('VK state mismatch');
    }

    const profileUrl = new URL('https://id.vk.ru/oauth2/user_info');
    profileUrl.searchParams.set('client_id', config.auth.vkClientId);
    const profileResponse = await fetch(profileUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: token.access_token }),
    });
    const profilePayload = await readJsonResponse(profileResponse, 'VK profile request failed');
    const profile = profilePayload.user || {};
    const providerUserId = profile.user_id || token.user_id;
    if (!providerUserId) {
      throw new Error('VK profile did not include user id');
    }

    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
      || profile.email
      || `VK ${providerUserId}`;
    const user = await findOrCreateOAuthUser({
      provider: 'vk',
      providerUserId: String(providerUserId),
      email: profile.email || null,
      name,
      avatarUrl: profile.avatar || null,
      rawProfile: { ...profilePayload, tokenUserId: token.user_id },
    });
    await loginSession(req, user);
    res.redirect(sanitizeReturnTo(state.returnTo));
  } catch (error) {
    if (state?.returnTo) return redirectWithReason(res, state.returnTo, 'vk_error');
    next(error);
  }
});

async function loginTelegram(req, payload) {
  const data = verifyTelegramLoginPayload(payload);
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || `Telegram ${data.id}`;
  const user = await findOrCreateOAuthUser({
    provider: 'telegram',
    providerUserId: data.id,
    email: null,
    name: fullName,
    avatarUrl: data.photo_url || null,
    rawProfile: data,
  });
  await loginSession(req, user);
  return user;
}

router.get('/telegram/callback', ensureSession, async (req, res) => {
  const returnTo = sanitizeReturnTo(req.query.returnTo);
  try {
    await loginTelegram(req, req.query);
    res.redirect(returnTo);
  } catch (error) {
    logger.warn('Telegram login failed', { requestId: req.requestId, error: error.message });
    redirectWithReason(res, returnTo, 'telegram_error');
  }
});

router.post('/telegram/verify', ensureSession, requireCsrf, authLimiter, async (req, res, next) => {
  try {
    const { error, value } = telegramSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Telegram payload invalid' });

    await loginTelegram(req, value);
    res.json(authResponse(req));
  } catch (error) {
    next(error);
  }
});

export default router;
