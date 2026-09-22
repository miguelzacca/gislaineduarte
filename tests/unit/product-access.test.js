import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CLAIM_COOKIE, SESSION_COOKIE, tokenHash, verifyProductEntitlement } from '../../server/recipes/access.js';
import { confirmPayment, consumeMagicLink, authStatus } from '../../server/recipes/flow.js';
import { handleContentRequest } from '../../api/recipes/content.js';
import { handleDownloadRequest } from '../../api/recipes/download.js';
import { handleLogoutRequest } from '../../api/recipes/logout.js';
import { adminCookie, readAdminSession, verifyAdminCredentials } from '../../server/recipes/admin.js';
import { RECIPES_PRODUCT_ID } from '../../src/data/recipes-product.js';

const base = 'https://gislaineduarte.com.br';
const secureEnv = {
  INFINITEPAY_HANDLE: 'conta_teste', RECIPES_SITE_URL: base,
  DATABASE_URL: 'postgres://test', SMTP_USER: 'test@example.com',
  SMTP_APP_PASSWORD: 'test-app-password', SMTP_FROM: 'Gislaine <test@example.com>',
  VERCEL_ENV: 'production', RECIPES_PRODUCT_SESSION_TTL_DAYS: '30',
};
const request = (path, cookie = '') => new Request(`${base}${path}`, { headers: cookie ? { cookie } : {} });
const result = (rows = []) => ({ rows, rowCount: rows.length });

test('conteúdo e arquivos negam acesso sem sessão comprada, inclusive com cookie do mock antigo', async () => {
  const mockCookie = 'gd_recipes_access=old-mock-session';
  assert.equal((await handleContentRequest(request('/api/recipes/content', mockCookie))).status, 401);
  assert.equal((await handleDownloadRequest(request('/api/recipes/download?format=pdf', mockCookie))).status, 401);
  assert.deepEqual(await verifyProductEntitlement(request('/api/recipes/content', mockCookie)), { granted: false, reason: 'missing-session' });
});

test('sessão opaca só funciona se o banco a relaciona a uma compra vigente', async () => {
  const token = 'x'.repeat(43);
  const seen = [];
  const store = { query: async (_sql, params) => {
    seen.push(params);
    return params[0] === tokenHash(token) && params[1] === RECIPES_PRODUCT_ID ? result([{ email: 'buyer@example.com' }]) : result();
  } };
  const authorized = request('/api/recipes/content', `${SESSION_COOKIE}=${token}`);
  assert.equal((await handleContentRequest(authorized, { store })).status, 200);
  const pdf = await handleDownloadRequest(request('/api/recipes/download?format=pdf', `${SESSION_COOKIE}=${token}`), {
    store, loadArtifact: async () => Buffer.from('private-pdf'),
  });
  assert.equal(pdf.status, 200);
  assert.equal(await pdf.text(), 'private-pdf');
  assert.equal((await handleContentRequest(request('/api/recipes/content', `${SESSION_COOKIE}=${token}a`), { store })).status, 401);
  assert.ok(seen.every((params) => params[1] === RECIPES_PRODUCT_ID));
});

test('sair da conta revoga a sessão no banco e apaga os cookies de acesso', async () => {
  const token = 'x'.repeat(43);
  const writes = [];
  const response = await handleLogoutRequest(new Request(`${base}/api/recipes/logout`, {
    method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${token}` },
  }), { env: secureEnv, store: { query: async (sql, params) => { writes.push({ sql, params }); return result(); } } });
  assert.equal(response.status, 200);
  assert.equal(writes[0].params[0], tokenHash(token));
  assert.match(writes[0].sql, /revoked_at/);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.ok(response.headers.getSetCookie().every((value) => value.includes('Max-Age=0')));
});

test('webhook forjado ou com valor divergente não cria titularidade', async () => {
  const orderId = '42a8e343-147e-4504-bdf6-2c634013faae';
  const transactionNsu = '6a5625f9-f184-4a82-b59c-1566047b7030';
  const key = 'valid-webhook-key';
  const order = {
    id: orderId, email: 'buyer@example.com', product_id: RECIPES_PRODUCT_ID,
    amount_cents: 2990, merchant_handle: 'conta_antiga', webhook_token_hash: tokenHash(key),
    status: 'pending', title: '7 receitas', challenge_id: 'challenge', email_sent_at: null,
  };
  const store = { query: async () => result([order]) };
  const baseInput = { orderId, transactionNsu, slug: 'invoice123' };
  const badKey = await confirmPayment({ ...baseInput, webhookKey: 'forged' }, { env: secureEnv, store, fetcher: () => { throw new Error('Não deve consultar a InfinitePay'); } });
  assert.equal(badKey.status, 403);
  const unpaid = await confirmPayment({ ...baseInput, webhookKey: key }, { env: secureEnv, store, fetcher: async (_url, options) => {
    assert.equal(JSON.parse(options.body).handle, 'conta_antiga');
    return { ok: true, json: async () => ({ success: true, paid: false, amount: 2990, paid_amount: 2990 }) };
  } });
  assert.equal(unpaid.status, 400);
  const wrongAmount = await confirmPayment({ ...baseInput, webhookKey: key }, { env: secureEnv, store, fetcher: async () => ({ ok: true, json: async () => ({ success: true, paid: true, amount: 100, paid_amount: 100 }) }) });
  assert.equal(wrongAmount.status, 400);
});

test('pagamento confirmado pela InfinitePay concede acesso e envia link para o e-mail do pedido', async () => {
  const orderId = '42a8e343-147e-4504-bdf6-2c634013faae';
  const transactionNsu = '6a5625f9-f184-4a82-b59c-1566047b7030';
  const writes = [];
  const order = {
    id: orderId, email: 'buyer@example.com', product_id: RECIPES_PRODUCT_ID,
    amount_cents: 2990, merchant_handle: 'conta_antiga', webhook_token_hash: tokenHash('key'),
    status: 'pending', title: '7 receitas', challenge_id: 'challenge', email_sent_at: null,
  };
  const store = {
    query: async (sql, params) => {
      if (sql.includes('JOIN recipe_products')) return result([order]);
      writes.push({ sql, params }); return result();
    },
    connect: async () => ({
      query: async (sql, params) => {
        if (sql.includes('FOR UPDATE')) return result([{ status: 'pending', transaction_nsu: null }]);
        writes.push({ sql, params }); return result();
      },
      release() {},
    }),
  };
  const sent = [];
  const checked = [];
  const confirmed = await confirmPayment({ orderId, transactionNsu, slug: 'invoice123', webhookKey: 'key' }, {
    env: { ...secureEnv, INFINITEPAY_HANDLE: '' }, store,
    fetcher: async (url, options) => { checked.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => ({ success: true, paid: true, amount: 2990, paid_amount: 2990 }) }; },
    mailer: async (mail) => sent.push(mail),
  });
  assert.equal(confirmed.confirmed, true);
  assert.equal(checked[0].body.order_nsu, orderId);
  assert.equal(checked[0].body.transaction_nsu, transactionNsu);
  assert.ok(writes.some(({ sql }) => sql.includes('INSERT INTO recipe_entitlements')));
  assert.equal(sent[0].email, order.email);
  assert.match(sent[0].url, /^https:\/\/gislaineduarte\.com\.br\/api\/recipes\/verify\/\?token=/);
});

test('link aberto no celular autentica também o computador com o cookie de solicitação', async () => {
  const token = 'm'.repeat(43);
  const claimSecret = 'c'.repeat(43);
  const challenge = { id: 'challenge-id', secret_hash: tokenHash(claimSecret), email: 'buyer@example.com', confirmed_at: new Date(), redeemed_at: null, order_id: null };
  const inserted = [];
  let used = false;
  const store = {
    query: async (sql) => {
      if (sql.includes('FROM recipe_login_challenges')) return result([challenge]);
      if (sql.includes('FROM recipe_sessions')) return result();
      throw new Error(`Consulta inesperada: ${sql}`);
    },
    connect: async () => ({
      query: async (sql, params) => {
        if (sql.includes('FROM recipe_magic_links')) return used ? result() : result([{ token_hash: tokenHash(token), email: 'buyer@example.com', challenge_id: challenge.id }]);
        if (sql.includes('FROM recipe_entitlements')) return result([{ ok: 1 }]);
        if (sql.includes('RETURNING email')) return result([{ email: 'buyer@example.com' }]);
        if (sql.includes('UPDATE recipe_magic_links SET used_at')) used = true;
        inserted.push({ sql, params }); return result();
      }, release() {},
    }),
  };
  const mobileSession = await consumeMagicLink(token, { env: secureEnv, store });
  assert.ok(mobileSession?.token);
  assert.equal(await consumeMagicLink(token, { env: secureEnv, store }), null);
  const pc = await authStatus(request('/api/recipes/status', `${CLAIM_COOKIE}=${challenge.id}.${claimSecret}`), { env: secureEnv, store });
  assert.equal(pc.state, 'ready');
  assert.ok(pc.session?.token);
  assert.notEqual(pc.session.token, mobileSession.token);
  assert.ok(inserted.filter(({ sql }) => sql.includes('INSERT INTO recipe_sessions')).length === 2);
});

test('senha e segredo do painel ficam só no servidor; troca da senha invalida cookie anterior', async () => {
  const env = { RECIPES_ADMIN_USERNAME: 'gestora', RECIPES_ADMIN_PASSWORD: 'very-long-private-password', RECIPES_ADMIN_SESSION_SECRET: 's'.repeat(40) };
  const store = { query: async (sql) => sql.includes('count(*)') ? result([{ count: 0 }]) : result() };
  const loginRequest = new Request(`${base}/api/admin/login`, { method: 'POST' });
  assert.equal(await verifyAdminCredentials('gestora', 'very-long-private-password', loginRequest, { env, store }), true);
  assert.equal(await verifyAdminCredentials('gestora', 'wrong-password', loginRequest, { env, store }), false);
  const session = adminCookie(loginRequest, env);
  assert.match(session, /HttpOnly/);
  assert.match(session, /SameSite=Strict/);
  assert.match(session, /Secure/);
  assert.equal(readAdminSession(request('/api/admin/session', session.split(';')[0]), env), true);
  assert.equal(readAdminSession(request('/api/admin/session', session.split(';')[0]), { ...env, RECIPES_ADMIN_PASSWORD: 'another-long-private-password' }), false);
});

test('artefatos reais permanecem abaixo do limite de 4,5 MB das Functions', async () => {
  for (const suffix of ['offline.html', 'pdf']) {
    const filename = `artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar${suffix === 'offline.html' ? '-offline.html' : '.pdf'}`;
    const contents = await readFile(filename);
    assert.ok(contents.byteLength < 4_500_000, `${filename}: ${contents.byteLength} bytes`);
  }
});
