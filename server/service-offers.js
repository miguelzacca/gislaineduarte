import { defaultServiceOffers, legacyDefaultServiceOffers, normalizeServiceOffer, validateServiceOffers } from '../src/data/service-offers.js';
import { getStore, transaction } from './recipes/store.js';

const initialized = new WeakMap();
async function ensureStore(db) {
  if (!initialized.has(db)) {
    const ready = transaction(db, async client => {
      await client.query('SELECT pg_advisory_xact_lock(71020261001)');
      await client.query(`CREATE TABLE IF NOT EXISTS service_offers_settings (id integer PRIMARY KEY CHECK (id = 1), offers jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())`);
      await client.query('ALTER TABLE service_offers_settings ADD COLUMN IF NOT EXISTS catalog_version integer NOT NULL DEFAULT 1');
      await client.query('INSERT INTO service_offers_settings (id, offers, catalog_version) VALUES (1, $1::jsonb, 2) ON CONFLICT (id) DO NOTHING', [JSON.stringify(defaultServiceOffers)]);
      // Corrige apenas a semeadura antiga intacta; preserva qualquer edição da profissional.
      const oldUnreviewedDefaults = legacyDefaultServiceOffers.map(offer => ({ ...offer, published: true }));
      await client.query(`UPDATE service_offers_settings SET offers = $1::jsonb, catalog_version = 2, revision = revision + 1, updated_at = now()
        WHERE id = 1 AND catalog_version < 2 AND ((revision IN (1, 2) AND offers = $2::jsonb) OR (revision = 1 AND offers = $3::jsonb))`,
      [JSON.stringify(defaultServiceOffers), JSON.stringify(legacyDefaultServiceOffers), JSON.stringify(oldUnreviewedDefaults)]);
      const existing = (await client.query('SELECT offers, catalog_version FROM service_offers_settings WHERE id = 1')).rows[0];
      if (existing.catalog_version < 2) {
        const offers = existing.offers.map(normalizeServiceOffer);
        for (const option of defaultServiceOffers) {
          if (offers.length < 12 && !offers.some(offer => offer.audience === option.audience && offer.durationMonths === option.durationMonths)) {
            let id = option.id;
            for (let suffix = 2; offers.some(offer => offer.id === id); suffix++) id = `${option.id}-${suffix}`;
            offers.push({ ...option, id });
          }
        }
        await client.query('UPDATE service_offers_settings SET offers = $1::jsonb, catalog_version = 2, revision = revision + 1, updated_at = now() WHERE id = 1', [JSON.stringify(offers)]);
      }
    });
    initialized.set(db, ready);
    ready.catch(() => initialized.delete(db));
  }
  await initialized.get(db);
}

export async function readServiceOffers({ env = process.env, store } = {}) {
  const db = store || await getStore(env); await ensureStore(db);
  const result = await db.query('SELECT offers, revision FROM service_offers_settings WHERE id = 1');
  const data = result.rows[0];
  return { ...data, offers: data.offers.map(normalizeServiceOffer) };
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
