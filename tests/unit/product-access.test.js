import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createMockProductSession, isSecureRequest, readProductAccessConfig, verifyMockProductSession, verifyProductEntitlement } from '../../server/recipes/access.js';
import { handleCheckoutRequest } from '../../api/recipes/checkout.js';
import { handleContentRequest } from '../../api/recipes/content.js';
import { handleDownloadRequest } from '../../api/recipes/download.js';
import { recipesProduct } from '../../src/data/recipes-product.js';

const mockEnv = {
  RECIPES_PRODUCT_ACCESS_MODE: 'mock',
  RECIPES_PRODUCT_MOCK_CHECKOUT_ENABLED: 'true',
  RECIPES_PRODUCT_ACCESS_SECRET: 'long-secret-for-tests-only-42-characters-minimum',
  RECIPES_PRODUCT_SESSION_TTL_DAYS: '30',
};
const base = 'https://gislaineduarte.com.br';
const request = (path, { cookie, method = 'GET', accept = 'application/json', origin } = {}) => new Request(`${base}${path}`, {
  method,
  headers: {
    accept,
    ...(cookie ? { cookie } : {}),
    ...(origin ? { origin } : {}),
  },
});
const cookieFor = (now = Date.now()) => `gd_recipes_access=${createMockProductSession({ env: mockEnv, now, nonce: 'unique-test-session-value' }).token}`;

test('configuração ausente/locked bloqueia acesso e checkout, mesmo com cookie mock antigo', async () => {
  assert.equal(readProductAccessConfig({}).mockReady, false);
  assert.equal(readProductAccessConfig({ RECIPES_PRODUCT_ACCESS_MODE: 'mock', RECIPES_PRODUCT_MOCK_CHECKOUT_ENABLED: 'true' }).mockReady, false);
  const entitlement = await verifyProductEntitlement(request('/api/recipes/content', { cookie: cookieFor() }), { env: {} });
  assert.deepEqual(entitlement, { granted: false, reason: 'locked', mode: 'locked' });
  const content = await handleContentRequest(request('/api/recipes/content'), { env: {} });
  assert.equal(content.status, 401);
  assert.equal(content.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  const lockedCheckout = await handleCheckoutRequest(request('/api/recipes/checkout', { method: 'POST' }), { env: {} });
  assert.equal(lockedCheckout.status, 423);
  const oldSession = await verifyProductEntitlement(request('/api/recipes/content', { cookie: cookieFor() }), { env: { ...mockEnv, RECIPES_PRODUCT_ACCESS_MODE: 'locked' } });
  assert.equal(oldSession.granted, false);
});

test('checkout emite cookie assinado httpOnly, Secure em produção, SameSite=Lax e sem redirecionamento aberto', async () => {
  const now = Date.UTC(2026, 8, 21);
  const response = await handleCheckoutRequest(request('/api/recipes/checkout?next=https://evil.example', { method: 'POST', accept: 'text/html' }), { env: { ...mockEnv, VERCEL_ENV: 'production' }, now });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), `${base}${recipesProduct.experiencePath}`);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^gd_recipes_access=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=2592000/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(isSecureRequest(request('/api/recipes/checkout'), { VERCEL_ENV: 'production' }), true);
  const foreign = await handleCheckoutRequest(request('/api/recipes/checkout', { method: 'POST', origin: 'https://evil.example' }), { env: mockEnv });
  assert.equal(foreign.status, 403);
});

test('sessão adulterada, expirada ou com segredo trocado não autoriza conteúdo', async () => {
  const now = Date.UTC(2026, 8, 21);
  const session = createMockProductSession({ env: mockEnv, now, nonce: 'unique-test-session-value' });
  assert.equal(verifyMockProductSession(session.token, { env: mockEnv, now }).granted, true);
  const altered = `${session.token.slice(0, -1)}${session.token.at(-1) === 'A' ? 'B' : 'A'}`;
  assert.equal(verifyMockProductSession(altered, { env: mockEnv, now }).granted, false);
  assert.equal(verifyMockProductSession(session.token, { env: mockEnv, now: now + 31 * 24 * 60 * 60 * 1000 }).reason, 'expired-session');
  assert.equal(verifyMockProductSession(session.token, { env: { ...mockEnv, RECIPES_PRODUCT_ACCESS_SECRET: 'another-long-secret-for-test-only-42-chars' }, now }).granted, false);
  const direct = await handleContentRequest(request('/api/recipes/content'), { env: mockEnv, now });
  assert.equal(direct.status, 401);
  const authorized = await handleContentRequest(request('/api/recipes/content', { cookie: `gd_recipes_access=${session.token}` }), { env: mockEnv, now });
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json()).recipes.length, 7);
});

test('downloads negam acesso direto e formatos inválidos; respostas privadas têm tipo e nome corretos', async () => {
  const now = Date.UTC(2026, 8, 21);
  const withoutSession = await handleDownloadRequest(request('/api/recipes/download?format=pdf'), { env: mockEnv, now, loadArtifact: async () => Buffer.from('secret') });
  assert.equal(withoutSession.status, 401);
  const cookie = cookieFor(now);
  const invalid = await handleDownloadRequest(request('/api/recipes/download?format=exe', { cookie }), { env: mockEnv, now });
  assert.equal(invalid.status, 400);
  for (const [format, type] of [['html', 'text/html; charset=utf-8'], ['pdf', 'application/pdf']]) {
    const response = await handleDownloadRequest(request(`/api/recipes/download?format=${format}`, { cookie }), { env: mockEnv, now, loadArtifact: async () => Buffer.from(`private-${format}`) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), type);
    assert.match(response.headers.get('content-disposition'), new RegExp(`attachment; filename="7-receitas-.*\\.${format}"`));
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.equal(await response.text(), `private-${format}`);
  }
});

test('artefatos reais permanecem abaixo do limite de 4,5 MB das Functions', async () => {
  for (const suffix of ['offline.html', 'pdf']) {
    const filename = `artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar${suffix === 'offline.html' ? '-offline.html' : '.pdf'}`;
    const contents = await readFile(filename);
    assert.ok(contents.byteLength < 4_500_000, `${filename}: ${contents.byteLength} bytes`);
  }
});

