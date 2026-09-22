import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CLAIM_COOKIE, SESSION_COOKIE, tokenHash, verifyProductEntitlement } from '../../server/recipes/access.js';
import { confirmPayment, consumeMagicLink, authStatus, startCheckout, requestLogin } from '../../server/recipes/flow.js';
import { handleCheckoutRequest } from '../../api/recipes/checkout.js';
import { handleLoginRequest } from '../../api/recipes/login.js';
import { handleStatusRequest } from '../../api/recipes/status.js';
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

test('checkout envia à InfinitePay o mesmo e-mail normalizado que vincula o pedido', async () => {
  const writes = [];
  const store = {
    query: async (sql, params) => {
      if (sql.includes('FROM recipe_entitlements')) return result();
      if (sql.includes('FROM recipe_products')) return result([{ id: RECIPES_PRODUCT_ID, title: 'Coleção', price_cents: 999, published: true }]);
      writes.push({ sql, params }); return result();
    },
    connect: async () => ({ query: async (sql, params) => { writes.push({ sql, params }); return result(); }, release() {} }),
  };
  let payload;
  const checkout = await startCheckout('  Compradora@Example.com  ', request('/api/recipes/checkout'), {
    env: secureEnv, store,
    fetcher: async (_url, options) => { payload = JSON.parse(options.body); return Response.json({ url: 'https://checkout.infinitepay.io/conta_teste?lenc=example' }); },
  });
  assert.deepEqual(payload.customer, { email: 'compradora@example.com' });
  assert.equal(payload.order_nsu, checkout.orderId);
  assert.equal(payload.redirect_url, `${base}/api/recipes/return`);
  assert.equal(new URL(payload.webhook_url).pathname, '/api/recipes/webhook');
  const order = writes.find(({ sql }) => sql.includes('INSERT INTO recipe_orders'));
  assert.equal(order.params[1], payload.customer.email);
  assert.equal(order.params[3], 999);
});

test('sessão válida abre a coleção sem novo checkout, e-mail ou verificação', async () => {
  const token = 'v'.repeat(43);
  const store = { query: async (sql) => {
    assert.ok(sql.includes('FROM recipe_sessions'));
    return result([{ email: 'buyer@example.com' }]);
  } };
  const post = (path) => new Request(`${base}${path}`, {
    method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${token}`, accept: 'application/json' }, body: new URLSearchParams(),
  });
  const options = { env: { ...secureEnv, INFINITEPAY_HANDLE: '' }, store,
    fetcher: () => { throw new Error('Não deve criar pagamento'); }, mailer: () => { throw new Error('Não deve enviar e-mail'); } };
  const checkout = await handleCheckoutRequest(post('/api/recipes/checkout'), options);
  assert.equal(checkout.status, 200);
  assert.deepEqual(await checkout.json(), { accessUrl: '/minhas-receitas' });
  const login = await handleLoginRequest(post('/api/recipes/login'), options);
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { ok: true, ready: true });
});

test('compradora sem sessão recebe acesso à compra existente, sem cobrança duplicada', async () => {
  const sent = [], writes = [];
  const store = { query: async (sql, params) => {
    if (sql.includes('FROM recipe_entitlements')) return result([{ ok: 1 }]);
    if (sql.includes('count(*)')) return result([{ count: 0 }]);
    writes.push({ sql, params }); return result();
  } };
  const req = new Request(`${base}/api/recipes/checkout`, { method: 'POST', headers: { accept: 'application/json' }, body: new URLSearchParams({ email: 'buyer@example.com' }) });
  const response = await handleCheckoutRequest(req, {
    env: secureEnv, store,
    fetcher: () => { throw new Error('Não deve criar outra cobrança'); }, mailer: async (mail) => sent.push(mail),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accessUrl: '/minhas-receitas' });
  assert.ok(response.headers.get('set-cookie').startsWith(`${CLAIM_COOKIE}=`));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, 'buyer@example.com');
  assert.equal(writes.length, 2);
  assert.ok(writes.every(({ sql }) => sql.includes('INSERT INTO recipe_login_challenges') || sql.includes('INSERT INTO recipe_magic_links')));
});

test('cookie de acompanhamento permite reenviar o link sem repetir e-mail nem recriar conta', async () => {
  const secret = 'r'.repeat(43);
  const challenge = { id: 'existing-challenge', secret_hash: tokenHash(secret), email: 'buyer@example.com', confirmed_at: null, redeemed_at: null };
  const writes = [], sent = [];
  const store = { query: async (sql, params) => {
    if (sql.includes('FROM recipe_login_challenges')) return result([challenge]);
    if (sql.includes('FROM recipe_entitlements')) return result([{ ok: 1 }]);
    if (sql.includes('count(*)')) return result([{ count: 0 }]);
    writes.push({ sql, params }); return result();
  } };
  const req = request('/api/recipes/login', `${CLAIM_COOKIE}=${challenge.id}.${secret}`);
  const response = await requestLogin('', req, { env: secureEnv, store, mailer: async (mail) => sent.push(mail) });
  assert.equal(response.sent, true);
  assert.equal(response.cookie, undefined, 'mantém o cookie e o acompanhamento em outros dispositivos');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, challenge.email);
  assert.equal(writes.length, 1);
  assert.ok(writes[0].sql.includes('INSERT INTO recipe_magic_links'));
  assert.equal(writes[0].params[2], challenge.id);
});

test('reenvio sem e-mail rejeita acompanhamento forjado e respeita limite de envios', async () => {
  const secret = 'r'.repeat(43);
  const challenge = { id: 'existing-challenge', secret_hash: tokenHash(secret), email: 'buyer@example.com' };
  const store = { query: async (sql) => {
    if (sql.includes('FROM recipe_login_challenges')) return result([challenge]);
    if (sql.includes('FROM recipe_entitlements')) return result([{ ok: 1 }]);
    if (sql.includes('count(*)')) return result([{ count: 3 }]);
    throw new Error('Não deve alterar o banco');
  } };
  const options = { env: secureEnv, store, mailer: () => { throw new Error('Não deve enviar e-mail'); } };
  assert.equal((await requestLogin('', request('/api/recipes/login', `${CLAIM_COOKIE}=${challenge.id}.${'x'.repeat(43)}`), options)).status, 400);
  assert.equal((await requestLogin('', request('/api/recipes/login', `${CLAIM_COOKIE}=${challenge.id}.${secret}`), options)).sent, true);
});

test('sessão expirada pede novo link para a conta existente, preservando compras', async () => {
  const writes = [], sent = [];
  const store = { query: async (sql, params) => {
    if (sql.includes('FROM recipe_sessions')) return result();
    if (sql.includes('FROM recipe_entitlements')) return result([{ ok: 1 }]);
    if (sql.includes('count(*)')) return result([{ count: 0 }]);
    writes.push({ sql, params }); return result();
  } };
  const req = request('/api/recipes/login', `${SESSION_COOKIE}=${'e'.repeat(43)}`);
  const response = await requestLogin('buyer@example.com', req, { env: secureEnv, store, mailer: async (mail) => sent.push(mail) });
  assert.equal(response.sent, true);
  assert.equal(sent[0].email, 'buyer@example.com');
  assert.equal(writes.length, 2);
  assert.ok(writes.every(({ sql }) => sql.includes('INSERT INTO recipe_login_challenges') || sql.includes('INSERT INTO recipe_magic_links')));
});

test('acompanhamento retoma pagamento sem pedir e-mail e sem conceder acesso antecipado', async () => {
  const secret = 'p'.repeat(43);
  const challenge = { id: 'payment-challenge', secret_hash: tokenHash(secret), email: 'buyer@example.com', confirmed_at: null, order_id: 'order' };
  let paid = false;
  const store = { query: async (sql) => {
    if (sql.includes('FROM recipe_login_challenges')) return result([challenge]);
    if (sql.includes('FROM recipe_orders')) return result([{ status: paid ? 'paid' : 'pending', checkout_url: 'https://checkout.infinitepay.io/conta_teste?lenc=example' }]);
    throw new Error(`Consulta inesperada: ${sql}`);
  } };
  const req = request('/api/recipes/status', `${CLAIM_COOKIE}=${challenge.id}.${secret}`);
  assert.deepEqual(await (await handleStatusRequest(req, { env: secureEnv, store })).json(), { state: 'payment', checkoutUrl: 'https://checkout.infinitepay.io/conta_teste?lenc=example' });
  assert.equal((await handleContentRequest(req, { env: secureEnv, store })).status, 401);
  paid = true;
  assert.deepEqual(await (await handleStatusRequest(req, { env: secureEnv, store })).json(), { state: 'email' });
  assert.equal((await handleContentRequest(req, { env: secureEnv, store })).status, 401);
  assert.deepEqual(await authStatus(request('/api/recipes/status', `${CLAIM_COOKIE}=${challenge.id}.${'x'.repeat(43)}`), { env: secureEnv, store }), { state: 'login' });
});

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
  assert.match(sent[0].url, /^https:\/\/gislaineduarte\.com\.br\/api\/recipes\/verify\?token=/);
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
  assert.equal(mobileSession.maxAge, 30 * 86400);
  assert.equal(await consumeMagicLink(token, { env: secureEnv, store }), null);
  const pc = await authStatus(request('/api/recipes/status', `${CLAIM_COOKIE}=${challenge.id}.${claimSecret}`), { env: secureEnv, store });
  assert.equal(pc.state, 'ready');
  assert.ok(pc.session?.token);
  assert.notEqual(pc.session.token, mobileSession.token);
  assert.ok(inserted.filter(({ sql }) => sql.includes('INSERT INTO recipe_sessions')).length === 2);
});

test('senha e segredo do painel ficam só no servidor; troca da senha invalida cookie anterior', async () => {
  const env = { RECIPES_ADMIN_USERNAME: 'gestora', RECIPES_ADMIN_PASSWORD: 'test-admin!', RECIPES_ADMIN_SESSION_SECRET: 's'.repeat(40) };
  const store = { query: async (sql) => sql.includes('count(*)') ? result([{ count: 0 }]) : result() };
  const loginRequest = new Request(`${base}/api/admin/login`, { method: 'POST' });
  assert.equal(await verifyAdminCredentials('gestora', env.RECIPES_ADMIN_PASSWORD, loginRequest, { env, store }), true);
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
