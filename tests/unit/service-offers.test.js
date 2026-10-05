import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { handleServiceOffersRequest } from '../../api/service-offers.js';
import { handleAdminServiceOffersRequest } from '../../api/admin/service-offers.js';
import { adminCookie } from '../../server/recipes/admin.js';
import { legacyDefaultServiceOffers } from '../../src/data/service-offers.js';
import { readServiceOffers, saveServiceOffers } from '../../server/service-offers.js';

const wrapStore = pg => ({ query: (...args) => pg.query(...args), connect: async () => ({ query: (...args) => pg.query(...args), release() {} }) });

test('individual, couple and family prices persist independently and reject stale or unauthenticated changes', async t => {
  const pg = await PGlite.create();
  t.after(() => pg.close());
  const store = wrapStore(pg);
  const env = { RECIPES_ADMIN_USERNAME: 'test-admin', RECIPES_ADMIN_PASSWORD: 'test-only-password', RECIPES_ADMIN_SESSION_SECRET: randomBytes(40).toString('hex') };
  const cookie = adminCookie(new Request('https://example.test/api/admin/session'), env).split(';')[0];
  const publicRead = () => handleServiceOffersRequest(new Request('https://example.test/api/service-offers'), { store });
  const admin = (body, overrides = {}) => handleAdminServiceOffersRequest(new Request('https://example.test/api/admin/service-offers', { method: body ? 'PATCH' : 'GET', headers: { cookie, origin: 'https://example.test', 'content-type': 'application/json', ...overrides }, ...(body ? { body: JSON.stringify(body) } : {}) }), { env, store });
  assert.equal((await admin(null, { cookie: '' })).status, 401);
  const initial = await (await admin()).json();
  assert.equal(initial.offers.length, 6);
  assert.deepEqual(initial.offers.map(offer => [offer.audience, offer.durationMonths, offer.priceCents]), [
    ['individual', 3, 29900], ['individual', 6, 24900], ['casal', 3, 49900], ['casal', 6, 44900], ['familia', 3, 69900], ['familia', 6, 59900],
  ]);
  assert.equal((await (await publicRead()).json()).offers.length, 6);
  const changed = { ...initial, offers: initial.offers.map((offer, index) => ({ ...offer, published: index !== 1, priceCents: offer.priceCents + 100, billing: index === 4 ? 'person-total' : offer.billing })) };
  assert.equal((await admin(changed, { origin: 'https://other.invalid' })).status, 403);
  assert.equal((await admin(changed)).status, 200);
  const saved = await (await admin()).json();
  assert.equal(saved.revision, initial.revision + 1);
  assert.equal(saved.offers[0].priceCents, 30000);
  assert.equal(saved.offers[4].priceCents, 70000);
  assert.equal(saved.offers[4].audience, 'familia');
  assert.equal(saved.offers[4].billing, 'person-total');
  assert.equal((await admin(initial)).status, 409);
  assert.equal((await admin({ ...saved, offers: [{ ...saved.offers[0], priceCents: -100 }] })).status, 400);
  assert.equal((await admin({ ...saved, offers: [{ ...saved.offers[2], billing: 'person', published: true }] })).status, 400);
  assert.equal((await admin({ ...saved, offers: [{ ...saved.offers[2], audience: 'unknown' }] })).status, 400);
  assert.equal((await admin({ ...saved, offers: [{ ...saved.offers[2], priceCents: null, published: true }] })).status, 400);
  const response = await publicRead();
  assert.match(response.headers.get('cache-control'), /no-store/);
  const visible = await response.json();
  assert.equal(visible.offers.length, 5);
  assert.equal(visible.offers[0].priceCents, 30000);
  assert.deepEqual(visible.offers.filter(offer => offer.audience === 'familia').map(offer => offer.priceCents), [70000, 60000]);
  assert.ok(!('revision' in visible));
  const drafts = { ...saved, offers: saved.offers.map(offer => ({ ...offer, published: false, priceCents: null, originalPriceCents: null })) };
  assert.equal((await admin(drafts)).status, 200);
  assert.equal((await (await publicRead()).json()).offers.length, 0);
  assert.ok((await (await admin()).json()).offers.every(offer => offer.priceCents === null));
});

for (const [label, revision, offers] of [
  ['original published seed', 1, legacyDefaultServiceOffers.map(offer => ({ ...offer, published: true }))],
  ['unreviewed draft seed', 2, legacyDefaultServiceOffers],
  ['edited prices', 8, legacyDefaultServiceOffers.map((offer, index) => ({ ...offer, priceCents: index === 0 ? 38000 : offer.priceCents, title: index === 0 ? 'Meu acompanhamento individual' : offer.title }))],
]) {
  test(`legacy catalog migration: ${label}`, async t => {
    const pg = await PGlite.create(); t.after(() => pg.close());
    await pg.query('CREATE TABLE service_offers_settings (id integer PRIMARY KEY, offers jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())');
    await pg.query('INSERT INTO service_offers_settings (id, offers, revision) VALUES (1, $1::jsonb, $2)', [JSON.stringify(offers), revision]);
    const store = wrapStore(pg);
    const migrated = await readServiceOffers({ store });
    assert.equal(migrated.offers.length, 6);
    assert.equal(migrated.revision, revision + 1);
    assert.deepEqual(new Set(migrated.offers.map(offer => `${offer.audience}-${offer.durationMonths}`)), new Set(['individual-3', 'individual-6', 'casal-3', 'casal-6', 'familia-3', 'familia-6']));
    if (label === 'edited prices') {
      for (const old of offers) {
        const retained = migrated.offers.find(offer => offer.id === old.id);
        assert.deepEqual({ ...retained, audience: undefined }, { ...old, audience: undefined });
      }
      assert.equal(migrated.offers.find(offer => offer.id === 'atendimento-em-dupla').audience, 'casal');
    }
    // A segunda inicialização não pode recriar opções que a profissional removeu.
    const reduced = await saveServiceOffers({ ...migrated, offers: migrated.offers.slice(0, 1) }, { store });
    const restarted = await readServiceOffers({ store: wrapStore(pg) });
    assert.deepEqual(restarted, reduced);
  });
}

test('service prices do not fall back to stale promotional values when unavailable', async () => {
  const store = { connect: async () => { throw new Error('unavailable'); } };
  const response = await handleServiceOffersRequest(new Request('https://example.test/api/service-offers'), { store });
  assert.equal(response.status, 503);
  assert.ok(!('offers' in await response.json()));
});
