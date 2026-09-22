import { randomUUID } from 'node:crypto';
import { RECIPES_PRODUCT_ID, recipesProduct } from '../../src/data/recipes-product.js';
import { CLAIM_COOKIE, cookie, createSession, getClaim, isSecureRequest, randomToken, safeEqual, tokenHash, verifyProductEntitlement } from './access.js';
import { requireAccessConfig, requireCommerceConfig } from './config.js';
import { getStore, transaction } from './store.js';
import { createPaymentLink, checkPayment } from './infinitepay.js';
import { sendAccessEmail } from './mail.js';

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
}

function claimValues(email) {
  const id = randomUUID();
  const secret = randomToken();
  return { id, secret, email, secretHash: tokenHash(secret) };
}

export function claimCookie(claim, request, env = process.env) {
  return cookie(CLAIM_COOKIE, `${claim.id}.${claim.secret}`, { maxAge: 86400, secure: isSecureRequest(request, env) });
}

export async function startCheckout(email, request, { env = process.env, fetcher = fetch, store, mailer = sendAccessEmail } = {}) {
  const entitlement = await verifyProductEntitlement(request, { env, store });
  if (entitlement.granted) return { accessUrl: recipesProduct.experiencePath };
  const config = requireCommerceConfig(env);
  const normalized = normalizeEmail(email);
  if (!normalized) return { error: 'Informe um e-mail válido.', status: 400 };
  const previousClaim = await getClaim(request, { env, store });
  if (previousClaim?.order_id) {
    if (normalized !== previousClaim.email) return { error: 'O e-mail deste pedido não pode ser alterado. Use o endereço informado na compra.', status: 409 };
    return { accessUrl: recipesProduct.experiencePath };
  }
  const db = store || await getStore(env);
  const owned = await db.query('SELECT 1 FROM recipe_entitlements WHERE email = $1 AND product_id = $2', [normalized, RECIPES_PRODUCT_ID]);
  if (owned.rowCount) {
    const login = await requestLogin(normalized, request, { env, store: db, mailer });
    if (login.throttled) return { error: 'Já enviamos links de acesso recentemente. Use o último e-mail recebido ou tente novamente mais tarde.', status: 429 };
    if (login.error) return login;
    return { accessUrl: recipesProduct.experiencePath, cookie: login.cookie };
  }
  const productResult = await db.query('SELECT id, title, price_cents, published FROM recipe_products WHERE id = $1', [RECIPES_PRODUCT_ID]);
  const product = productResult.rows[0];
  if (!product?.published || !product.price_cents) return { error: 'A coleção ainda não está disponível para compra.', status: 423 };
  const orderId = randomUUID();
  const claim = claimValues(normalized);
  const webhookToken = randomToken();
  await transaction(db, async (client) => {
    await client.query(`INSERT INTO recipe_login_challenges (id, secret_hash, email, order_id, expires_at)
      VALUES ($1, $2, $3, $4, now() + interval '24 hours')`, [claim.id, claim.secretHash, normalized, orderId]);
    await client.query(`INSERT INTO recipe_orders (id, email, product_id, amount_cents, merchant_handle, webhook_token_hash, challenge_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [orderId, normalized, product.id, product.price_cents, config.handle, tokenHash(webhookToken), claim.id]);
  });
  const url = await createPaymentLink({
    handle: config.handle, orderId, title: product.title,
    amountCents: product.price_cents,
    email: normalized,
    origin: config.origin, webhookToken,
  }, fetcher);
  await db.query('UPDATE recipe_orders SET checkout_url = $1 WHERE id = $2', [url, orderId]);
  return { url, orderId, claim };
}

async function sendMagicLink({ email, challengeId, title, origin, env, store, mailer }) {
  const token = randomToken();
  await store.query(`INSERT INTO recipe_magic_links (token_hash, email, challenge_id, expires_at)
    VALUES ($1, $2, $3, now() + interval '15 minutes')`, [tokenHash(token), email, challengeId]);
  const url = `${origin}/api/recipes/verify?token=${encodeURIComponent(token)}`;
  await mailer({ email, url, productTitle: title, env });
}

export async function confirmPayment({ orderId, transactionNsu, slug, webhookKey }, {
  env = process.env, fetcher = fetch, store, mailer = sendAccessEmail,
} = {}) {
  if (!/^[a-f0-9-]{36}$/i.test(String(orderId || '')) ||
      !/^[A-Za-z0-9_-]{6,128}$/.test(String(transactionNsu || '')) ||
      !/^[A-Za-z0-9_-]{2,128}$/.test(String(slug || ''))) return { confirmed: false, status: 400 };
  const db = store || await getStore(env);
  const found = await db.query(`SELECT o.*, p.title FROM recipe_orders o JOIN recipe_products p ON p.id = o.product_id WHERE o.id = $1`, [orderId]);
  if (!found.rowCount) return { confirmed: false, status: 404 };
  const order = found.rows[0];
  if (webhookKey !== undefined && !safeEqual(order.webhook_token_hash, tokenHash(webhookKey))) return { confirmed: false, status: 403 };
  if (order.status === 'paid' && order.transaction_nsu !== transactionNsu) return { confirmed: false, status: 409 };
  const payment = await checkPayment({ handle: order.merchant_handle, orderId, transactionNsu, slug }, fetcher);
  if (!payment || payment.amount !== order.amount_cents || !Number.isSafeInteger(payment.paid_amount) || payment.paid_amount < order.amount_cents) {
    return { confirmed: false, status: 400 };
  }
  await transaction(db, async (client) => {
    const locked = await client.query('SELECT status, transaction_nsu FROM recipe_orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (locked.rows[0].status === 'paid' && locked.rows[0].transaction_nsu !== transactionNsu) throw new Error('Transação divergente para pedido já pago.');
    if (locked.rows[0].status !== 'paid') {
      await client.query(`UPDATE recipe_orders SET status = 'paid', transaction_nsu = $1, invoice_slug = $2, paid_at = now() WHERE id = $3`, [transactionNsu, slug, orderId]);
      await client.query('INSERT INTO recipe_accounts (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [order.email]);
      await client.query(`INSERT INTO recipe_entitlements (email, product_id, order_id)
        VALUES ($1, $2, $3) ON CONFLICT (email, product_id) DO NOTHING`, [order.email, order.product_id, orderId]);
    }
  });
  if (!order.email_sent_at) {
    const origin = requireAccessConfig(env).origin;
    await transaction(db, async (client) => {
      // O webhook e o retorno do navegador podem chegar ao mesmo tempo.
      const delivery = await client.query('SELECT email_sent_at FROM recipe_orders WHERE id = $1 FOR UPDATE', [orderId]);
      if (delivery.rows[0].email_sent_at) return;
      await sendMagicLink({ email: order.email, challengeId: order.challenge_id, title: order.title, origin, env, store: client, mailer });
      await client.query('UPDATE recipe_orders SET email_sent_at = now() WHERE id = $1', [orderId]);
    });
  }
  return { confirmed: true, status: 200 };
}

export async function requestLogin(email, request, { env = process.env, store, mailer = sendAccessEmail } = {}) {
  const entitlement = await verifyProductEntitlement(request, { env, store });
  if (entitlement.granted) return { ready: true };
  const previousClaim = await getClaim(request, { env, store });
  const normalized = normalizeEmail(String(email || '').trim() || previousClaim?.email);
  if (!normalized) return { error: 'Informe um e-mail válido.', status: 400 };
  if (previousClaim?.order_id && normalized !== previousClaim.email) return { error: 'O e-mail deste pedido não pode ser alterado. Reenvie o link para o endereço informado na compra.', status: 409 };
  const config = requireAccessConfig(env);
  const db = store || await getStore(env);
  const entitled = await db.query('SELECT 1 FROM recipe_entitlements WHERE email = $1 AND product_id = $2', [normalized, RECIPES_PRODUCT_ID]);
  if (!entitled.rowCount) return { sent: true };
  const recent = await db.query(`SELECT count(*)::integer AS count FROM recipe_magic_links
    WHERE email = $1 AND created_at > now() - interval '15 minutes'`, [normalized]);
  if (recent.rows[0].count >= 3) return { sent: true, throttled: true };
  if (previousClaim?.email === normalized && !previousClaim.confirmed_at && !previousClaim.redeemed_at) {
    await sendMagicLink({ email: normalized, challengeId: previousClaim.id, title: '7 receitas para ajudar você a desinflamar!', origin: config.origin, env, store: db, mailer });
    return { sent: true };
  }
  const claim = claimValues(normalized);
  await db.query(`INSERT INTO recipe_login_challenges (id, secret_hash, email, expires_at)
    VALUES ($1, $2, $3, now() + interval '24 hours')`, [claim.id, claim.secretHash, normalized]);
  await sendMagicLink({ email: normalized, challengeId: claim.id, title: '7 receitas para ajudar você a desinflamar!', origin: config.origin, env, store: db, mailer });
  return { sent: true, claim, cookie: claimCookie(claim, request, env) };
}

export async function consumeMagicLink(token, { env = process.env, store } = {}) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(String(token || ''))) return null;
  const db = store || await getStore(env);
  return transaction(db, async (client) => {
    const found = await client.query(`SELECT * FROM recipe_magic_links WHERE token_hash = $1
      AND used_at IS NULL AND expires_at > now() FOR UPDATE`, [tokenHash(token)]);
    if (!found.rowCount) return null;
    const link = found.rows[0];
    const entitled = await client.query('SELECT 1 FROM recipe_entitlements WHERE email = $1 AND product_id = $2', [link.email, RECIPES_PRODUCT_ID]);
    if (!entitled.rowCount) return null;
    await client.query('UPDATE recipe_magic_links SET used_at = now() WHERE token_hash = $1', [link.token_hash]);
    await client.query('UPDATE recipe_login_challenges SET confirmed_at = now() WHERE id = $1 AND confirmed_at IS NULL', [link.challenge_id]);
    return createSession(link.email, { env, client });
  });
}

export async function authStatus(request, { env = process.env, store } = {}) {
  const db = store || await getStore(env);
  const entitlement = await verifyProductEntitlement(request, { env, store: db });
  if (entitlement.granted) return { state: 'ready' };
  const claim = await getClaim(request, { env, store: db });
  if (!claim) return { state: 'login' };
  if (!claim.confirmed_at) {
    if (!claim.order_id) return { state: 'email' };
    const order = await db.query('SELECT status, checkout_url FROM recipe_orders WHERE id = $1', [claim.order_id]);
    if (!order.rowCount) return { state: 'login' };
    return order.rows[0].status === 'paid' ? { state: 'email' } : { state: 'payment', checkoutUrl: order.rows[0].checkout_url };
  }
  const session = await transaction(db, async (client) => {
    const claimed = await client.query(`UPDATE recipe_login_challenges SET redeemed_at = now()
      WHERE id = $1 AND redeemed_at IS NULL AND confirmed_at IS NOT NULL AND expires_at > now()
      RETURNING email`, [claim.id]);
    if (!claimed.rowCount) return null;
    const entitled = await client.query('SELECT 1 FROM recipe_entitlements WHERE email = $1 AND product_id = $2', [claimed.rows[0].email, RECIPES_PRODUCT_ID]);
    if (!entitled.rowCount) return null;
    return createSession(claimed.rows[0].email, { env, client });
  });
  return session ? { state: 'ready', session } : { state: 'login' };
}
