import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getStore, transaction } from '../recipes/store.js';
import { defaultOffer } from '../../src/data/nutrition.js';

const initialized = new WeakMap();
export function dataKey(env = process.env) {
  const raw = String(env.NUTRITION_DATA_KEY || '');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(raw) || Buffer.from(raw, 'base64').length !== 32) throw new Error('NUTRITION_DATA_KEY precisa de uma chave de 32 bytes em base64.');
  return Buffer.from(raw, 'base64');
}
export function seal(value, env = process.env) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function unseal(value, env = process.env) {
  if (!value) return null;
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== 'v1') throw new Error('Formato de dados inválido.');
  const decipher = createDecipheriv('aes-256-gcm', dataKey(env), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8'));
}
export async function getNutritionStore(env = process.env, injectedStore) {
  const db = injectedStore || await getStore(env);
  if (!initialized.has(db)) {
    const setup = transaction(db, async client => {
      await client.query('SELECT pg_advisory_xact_lock(71020260926)');
      await client.query(`CREATE TABLE IF NOT EXISTS nutrition_settings (id integer PRIMARY KEY CHECK (id = 1), offer jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
      await client.query('INSERT INTO nutrition_settings (id, offer) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [JSON.stringify(defaultOffer)]);
      await client.query(`CREATE TABLE IF NOT EXISTS nutrition_requests (
        id uuid PRIMARY KEY, intake_encrypted text NOT NULL, consent_version text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now(),
        access_hash text NOT NULL UNIQUE, access_expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
        idempotency_hash text UNIQUE NOT NULL, ip_hash text NOT NULL,
        payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid')),
        stage text NOT NULL DEFAULT 'received' CHECK (stage IN ('received','draft','approved')),
        amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 100 AND 10000000), offer_snapshot jsonb NOT NULL,
        merchant_handle text NOT NULL, webhook_hash text NOT NULL, webhook_encrypted text NOT NULL, checkout_url text,
        transaction_nsu text UNIQUE, invoice_slug text, paid_at timestamptz,
        plan_encrypted text, revision integer NOT NULL DEFAULT 0, approved_at timestamptz, approved_by text,
        share_hash text, share_expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await client.query('ALTER TABLE nutrition_requests ADD COLUMN IF NOT EXISTS first_delivered_at timestamptz');
      await client.query(`CREATE TABLE IF NOT EXISTS nutrition_events (
        id bigserial PRIMARY KEY, request_id uuid NOT NULL REFERENCES nutrition_requests(id) ON DELETE CASCADE,
        type text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS nutrition_checkins (
        id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES nutrition_requests(id) ON DELETE CASCADE,
        body_encrypted text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS nutrition_templates (
        id uuid PRIMARY KEY, title text NOT NULL, profile text NOT NULL, plan_encrypted text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS nutrition_plan_versions (
        request_id uuid NOT NULL REFERENCES nutrition_requests(id) ON DELETE CASCADE,
        revision integer NOT NULL, stage text NOT NULL, reason text NOT NULL,
        plan_encrypted text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (request_id, revision, stage)
      )`);
      await client.query('CREATE INDEX IF NOT EXISTS nutrition_requests_created_idx ON nutrition_requests(created_at DESC)');
      await client.query('CREATE INDEX IF NOT EXISTS nutrition_requests_ip_idx ON nutrition_requests(ip_hash, created_at)');
      await client.query('CREATE INDEX IF NOT EXISTS nutrition_events_request_idx ON nutrition_events(request_id, created_at DESC)');
      await client.query('CREATE INDEX IF NOT EXISTS nutrition_checkins_request_idx ON nutrition_checkins(request_id, created_at DESC)');
    });
    initialized.set(db, setup); setup.catch(() => initialized.delete(db));
  }
  await initialized.get(db);
  return db;
}

export async function event(db, id, type, actor = 'professional') {
  await db.query('INSERT INTO nutrition_events (request_id, type, actor) VALUES ($1, $2, $3)', [id, type, actor]);
}

export async function archivePlan(db, row, reason) {
  if (!row.plan_encrypted || !row.revision) return;
  await db.query(`INSERT INTO nutrition_plan_versions (request_id,revision,stage,reason,plan_encrypted)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (request_id,revision,stage) DO NOTHING`,
  [row.id, row.revision, row.stage, reason, row.plan_encrypted]);
}
