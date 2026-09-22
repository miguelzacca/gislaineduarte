import pg from 'pg';
import { ProductConfigurationError } from './config.js';
import { RECIPES_PRODUCT_ID, recipesProduct } from '../../src/data/recipes-product.js';

const pools = new Map();
const initialized = new Map();

export async function getStore(env = process.env) {
  const url = String(env.DATABASE_URL || '');
  if (!url) throw new ProductConfigurationError('DATABASE_URL não configurada.');
  if (!pools.has(url)) pools.set(url, new pg.Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000 }));
  const pool = pools.get(url);
  if (!initialized.has(url)) {
    const setup = (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(71020260921)');
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_accounts (
          email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now()
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_products (
          id text PRIMARY KEY, kind text NOT NULL DEFAULT 'draft', title text NOT NULL, description text NOT NULL,
          price_cents integer CHECK (price_cents BETWEEN 100 AND 10000000),
          published boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
        )`);
        await client.query('INSERT INTO recipe_products (id, kind, title, description) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
          [RECIPES_PRODUCT_ID, 'recipes', recipesProduct.title, recipesProduct.description]);
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_login_challenges (
          id text PRIMARY KEY, secret_hash text NOT NULL, email text NOT NULL,
          order_id text, expires_at timestamptz NOT NULL,
          confirmed_at timestamptz, redeemed_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_orders (
          id text PRIMARY KEY, email text NOT NULL, product_id text NOT NULL REFERENCES recipe_products(id),
          amount_cents integer NOT NULL CHECK (amount_cents >= 100),
          merchant_handle text NOT NULL, webhook_token_hash text NOT NULL,
          challenge_id text NOT NULL REFERENCES recipe_login_challenges(id),
          checkout_url text, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
          transaction_nsu text UNIQUE, invoice_slug text,
          paid_at timestamptz, email_sent_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_entitlements (
          email text NOT NULL REFERENCES recipe_accounts(email), product_id text NOT NULL,
          order_id text NOT NULL REFERENCES recipe_orders(id), granted_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (email, product_id)
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_magic_links (
          token_hash text PRIMARY KEY, email text NOT NULL REFERENCES recipe_accounts(email),
          challenge_id text NOT NULL REFERENCES recipe_login_challenges(id),
          expires_at timestamptz NOT NULL, used_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_sessions (
          token_hash text PRIMARY KEY, email text NOT NULL REFERENCES recipe_accounts(email),
          expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
          revoked_at timestamptz
        )`);
        await client.query(`CREATE TABLE IF NOT EXISTS recipe_admin_attempts (
          id bigserial PRIMARY KEY, ip_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        )`);
        await client.query('CREATE INDEX IF NOT EXISTS recipe_admin_attempts_recent_idx ON recipe_admin_attempts (ip_hash, created_at)');
        await client.query('CREATE INDEX IF NOT EXISTS recipe_sessions_email_idx ON recipe_sessions (email, expires_at)');
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })();
    initialized.set(url, setup);
    setup.catch(() => initialized.delete(url));
  }
  await initialized.get(url);
  return pool;
}

export async function transaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
