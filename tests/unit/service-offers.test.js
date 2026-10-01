import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { handleServiceOffersRequest } from '../../api/service-offers.js';
import { handleAdminServiceOffersRequest } from '../../api/admin/service-offers.js';
import { adminCookie } from '../../server/recipes/admin.js';

test('service prices persist, remain private until published and reject stale or unauthenticated changes', async t => {
  const pg = await PGlite.create();
  t.after(() => pg.close());
  const store = { query: (...args) => pg.query(...args), connect: async () => ({ query: (...args) => pg.query(...args), release() {} }) };
  const env = { RECIPES_ADMIN_USERNAME: 'test-admin', RECIPES_ADMIN_PASSWORD: 'test-only-password', RECIPES_ADMIN_SESSION_SECRET: randomBytes(40).toString('hex') };
  const cookie = adminCookie(new Request('https://example.test/api/admin/session'), env).split(';')[0];
  const publicRead = () => handleServiceOffersRequest(new Request('https://example.test/api/service-offers'), { store });
  const admin = (body, overrides = {}) => handleAdminServiceOffersRequest(new Request('https://example.test/api/admin/service-offers', { method: body ? 'PATCH' : 'GET', headers: { cookie, origin: 'https://example.test', 'content-type': 'application/json', ...overrides }, ...(body ? { body: JSON.stringify(body) } : {}) }), { env, store });
  assert.equal((await admin(null, { cookie: '' })).status, 401);
  const initial = await (await admin()).json();
  assert.equal(initial.offers.length, 3);
  assert.equal(initial.offers[2].billing, 'person');
  assert.equal(initial.offers[2].priceCents, 19700);
  const changed = { ...initial, offers: initial.offers.map((offer, index) => ({ ...offer, published: index !== 1, priceCents: index === 0 ? 30000 : offer.priceCents })) };
  assert.equal((await admin(changed, { origin: 'https://other.invalid' })).status, 403);
  assert.equal((await admin(changed)).status, 200);
  const saved = await (await admin()).json();
  assert.equal(saved.revision, initial.revision + 1);
  assert.equal(saved.offers[0].priceCents, 30000);
  assert.equal((await admin(initial)).status, 409);
  assert.equal((await admin({ ...saved, offers: [{ ...saved.offers[0], priceCents: -100 }] })).status, 400);
  const response = await publicRead();
  assert.match(response.headers.get('cache-control'), /no-store/);
  const visible = await response.json();
  assert.equal(visible.offers.length, 2);
  assert.equal(visible.offers[0].priceCents, 30000);
  assert.ok(!('revision' in visible));
});

test('service prices do not fall back to stale promotional values when unavailable', async () => {
  const store = { connect: async () => { throw new Error('unavailable'); } };
  const response = await handleServiceOffersRequest(new Request('https://example.test/api/service-offers'), { store });
  assert.equal(response.status, 503);
  assert.ok(!('offers' in await response.json()));
});
