import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { RECIPES_PRODUCT_ID, recipesProduct } from '../../src/data/recipes-product.js';
import { getStore } from './store.js';
import { sessionDays } from './config.js';

export const SESSION_COOKIE = 'gd_recipes_session';
export const CLAIM_COOKIE = 'gd_recipes_claim';

export const randomToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function parseCookieHeader(header = '') {
  return String(header).split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 1) return cookies;
    cookies[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
    return cookies;
  }, {});
}

export function isSecureRequest(request, env = process.env) {
  if (env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production') return true;
  try { return new URL(request.url).protocol === 'https:'; } catch { return false; }
}

export function cookie(name, value, { maxAge, secure, clear = false } = {}) {
  const attributes = [`${name}=${clear ? '' : value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (clear) attributes.push('Max-Age=0');
  else if (maxAge) attributes.push(`Max-Age=${maxAge}`);
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function productAccessHeaders(extra = {}) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  };
}

export function isAllowedCheckoutRequest(request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export function safeProductUrl(path, request) {
  const allowed = new Set([recipesProduct.publicPath, recipesProduct.experiencePath]);
  return new URL(allowed.has(path) ? path : recipesProduct.publicPath, new URL(request.url).origin);
}

export async function createSession(email, { env = process.env, store, client } = {}) {
  const db = client || store || await getStore(env);
  const token = randomToken();
  const maxAge = sessionDays(env) * 86400;
  await db.query('INSERT INTO recipe_sessions (token_hash, email, expires_at) VALUES ($1, $2, now() + ($3 * interval \'1 second\'))', [tokenHash(token), email, maxAge]);
  return { token, maxAge };
}

export async function verifyProductEntitlement(request, { env = process.env, store } = {}) {
  const token = parseCookieHeader(request?.headers?.get?.('cookie'))[SESSION_COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return { granted: false, reason: 'missing-session' };
  const db = store || await getStore(env);
  const result = await db.query(`SELECT s.email FROM recipe_sessions s
    JOIN recipe_entitlements e ON e.email = s.email
    WHERE s.token_hash = $1 AND s.expires_at > now() AND s.revoked_at IS NULL AND e.product_id = $2`,
  [tokenHash(token), RECIPES_PRODUCT_ID]);
  return result.rowCount ? { granted: true, email: result.rows[0].email } : { granted: false, reason: 'no-entitlement' };
}

export async function getClaim(request, { env = process.env, store } = {}) {
  const raw = parseCookieHeader(request.headers.get('cookie'))[CLAIM_COOKIE] || '';
  const [id, secret, extra] = raw.split('.');
  if (!id || !secret || extra || !/^[A-Za-z0-9_-]{40,60}$/.test(secret)) return null;
  const db = store || await getStore(env);
  const result = await db.query('SELECT * FROM recipe_login_challenges WHERE id = $1 AND expires_at > now()', [id]);
  if (!result.rowCount || !safeEqual(result.rows[0].secret_hash, tokenHash(secret))) return null;
  return result.rows[0];
}
