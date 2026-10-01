import { defaultServiceOffers, validateServiceOffers } from '../src/data/service-offers.js';
import { getStore, transaction } from './recipes/store.js';

const initialized = new WeakMap();
async function ensureStore(db) {
  if (!initialized.has(db)) {
    const ready = transaction(db, async client => {
      await client.query('SELECT pg_advisory_xact_lock(71020261001)');
      await client.query(`CREATE TABLE IF NOT EXISTS service_offers_settings (id integer PRIMARY KEY CHECK (id = 1), offers jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())`);
      await client.query('INSERT INTO service_offers_settings (id, offers) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify(defaultServiceOffers)]);
    });
    initialized.set(db, ready);
    ready.catch(() => initialized.delete(db));
  }
  await initialized.get(db);
}

export async function readServiceOffers({ env = process.env, store } = {}) {
  const db = store || await getStore(env); await ensureStore(db);
  const result = await db.query('SELECT offers, revision FROM service_offers_settings WHERE id = 1');
  return result.rows[0];
}

export async function saveServiceOffers(body, { env = process.env, store } = {}) {
  if (!body || !Number.isSafeInteger(body.revision) || body.revision < 1) throw Object.assign(new Error('Recarregue as opções antes de salvar.'), { status: 400 });
  let offers;
  try { offers = validateServiceOffers(body.offers); } catch (error) { throw Object.assign(error, { status: 400 }); }
  const db = store || await getStore(env); await ensureStore(db);
  const result = await db.query('UPDATE service_offers_settings SET offers = $1::jsonb, revision = revision + 1, updated_at = now() WHERE id = 1 AND revision = $2 RETURNING offers, revision', [JSON.stringify(offers), body.revision]);
  if (!result.rowCount) throw Object.assign(new Error('Outra edição foi salva. Recarregue as opções e revise antes de tentar novamente.'), { status: 409 });
  return result.rows[0];
}
