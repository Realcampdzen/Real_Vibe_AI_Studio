import pg from 'pg';
import config from '../config/env.js';

const { Pool } = pg;

let pool = null;
let status = config.database.url ? 'configured' : 'disabled';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS rv_users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  name text NOT NULL DEFAULT '',
  default_contact text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rv_users
  ADD COLUMN IF NOT EXISTS default_contact text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS rv_user_credentials (
  user_id uuid PRIMARY KEY REFERENCES rv_users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rv_auth_identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES rv_users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  email text,
  display_name text,
  avatar_url text,
  raw_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS rv_sessions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id uuid REFERENCES rv_users(id) ON DELETE SET NULL,
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rv_sessions_user_id_idx ON rv_sessions(user_id);
CREATE INDEX IF NOT EXISTS rv_sessions_expires_at_idx ON rv_sessions(expires_at);

CREATE TABLE IF NOT EXISTS rv_oauth_states (
  id text PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES rv_sessions(id) ON DELETE CASCADE,
  provider text NOT NULL,
  code_verifier text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rv_oauth_states_session_provider_idx ON rv_oauth_states(session_id, provider);
CREATE INDEX IF NOT EXISTS rv_oauth_states_expires_at_idx ON rv_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS rv_carts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES rv_users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES rv_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  checked_out_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS rv_carts_user_active_idx
  ON rv_carts(user_id)
  WHERE user_id IS NOT NULL AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS rv_carts_session_active_idx
  ON rv_carts(session_id)
  WHERE session_id IS NOT NULL AND user_id IS NULL AND status = 'active';

CREATE TABLE IF NOT EXISTS rv_cart_items (
  id uuid PRIMARY KEY,
  cart_id uuid NOT NULL REFERENCES rv_carts(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 9),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, service_id)
);

CREATE TABLE IF NOT EXISTS rv_orders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES rv_users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES rv_sessions(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  contact text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  notification_status text NOT NULL DEFAULT 'pending',
  notification_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rv_orders_user_id_idx ON rv_orders(user_id);
CREATE INDEX IF NOT EXISTS rv_orders_created_at_idx ON rv_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS rv_order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES rv_orders(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  service_slug text NOT NULL,
  service_title text NOT NULL,
  price_label text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

function createUnavailableError() {
  const error = new Error('Database is not configured');
  error.status = 503;
  error.code = 'database_unavailable';
  return error;
}

export function isDatabaseEnabled() {
  return Boolean(pool);
}

export function getDatabaseStatus() {
  return status;
}

function buildPoolConfig() {
  const poolConfig = {
    connectionString: config.database.url,
    max: config.database.poolMax,
  };

  if (!config.database.ssl) {
    return poolConfig;
  }

  poolConfig.ssl = { rejectUnauthorized: false };

  try {
    const url = new URL(config.database.url);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    url.searchParams.delete('sslrootcert');
    url.searchParams.set('ssl', 'no-verify');
    poolConfig.connectionString = url.toString();
  } catch {}

  return poolConfig;
}

export async function initializeDatabase(logger) {
  if (!config.database.url) {
    status = 'disabled';
    logger?.warn?.('PostgreSQL is not configured; auth and cart APIs are disabled');
    return;
  }

  pool = new Pool(buildPoolConfig());

  try {
    await pool.query('SELECT 1');
    await pool.query(MIGRATION_SQL);
    status = 'ready';
    logger?.info?.('PostgreSQL connected and migrations applied');
  } catch (error) {
    status = 'error';
    await pool.end().catch(() => {});
    pool = null;
    throw error;
  }
}

export async function query(text, params = []) {
  if (!pool) throw createUnavailableError();
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  if (!pool) throw createUnavailableError();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
