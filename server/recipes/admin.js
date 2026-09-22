import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookie, isAllowedCheckoutRequest, isSecureRequest, parseCookieHeader, productAccessHeaders } from './access.js';
import { ProductConfigurationError } from './config.js';
import { getStore } from './store.js';

export const ADMIN_COOKIE = 'gd_recipes_admin';
const MAX_AGE = 8 * 60 * 60;

function config(env) {
  const username = String(env.RECIPES_ADMIN_USERNAME || '').trim();
  const password = String(env.RECIPES_ADMIN_PASSWORD || '');
  const secret = String(env.RECIPES_ADMIN_SESSION_SECRET || '');
  if (username.length < 3 || password.length < 8 || secret.length < 32) {
    throw new ProductConfigurationError('Configure RECIPES_ADMIN_USERNAME, RECIPES_ADMIN_PASSWORD (8+ caracteres) e RECIPES_ADMIN_SESSION_SECRET (32+ caracteres).');
  }
  const key = createHmac('sha256', secret).update(password).digest();
  return { username, password, key, secret };
}

function constantEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function readAdminSession(request, env = process.env) {
  try {
    const { username, key } = config(env);
    const token = parseCookieHeader(request.headers.get('cookie'))[ADMIN_COOKIE] || '';
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra || body.length > 512) return false;
    const expected = createHmac('sha256', key).update(body).digest('base64url');
    if (!constantEqual(signature, expected)) return false;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    return payload.v === 1 && payload.u === username && Number.isInteger(payload.iat) &&
      Number.isInteger(payload.exp) && payload.exp > now && payload.exp - payload.iat <= MAX_AGE &&
      payload.iat <= now + 60;
  } catch { return false; }
}

export function adminCookie(request, env = process.env) {
  const { username, key } = config(env);
  const issued = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ v: 1, u: username, iat: issued, exp: issued + MAX_AGE, n: randomBytes(16).toString('hex') })).toString('base64url');
  const signature = createHmac('sha256', key).update(body).digest('base64url');
  return cookie(ADMIN_COOKIE, `${body}.${signature}`, { maxAge: MAX_AGE, secure: isSecureRequest(request, env) }).replace('Path=/', 'Path=/api/admin').replace('SameSite=Lax', 'SameSite=Strict');
}

export function clearAdminCookie(request, env = process.env) {
  return cookie(ADMIN_COOKIE, '', { clear: true, secure: isSecureRequest(request, env) }).replace('Path=/', 'Path=/api/admin').replace('SameSite=Lax', 'SameSite=Strict');
}

export async function verifyAdminCredentials(username, password, request, { env = process.env, store } = {}) {
  const settings = config(env);
  const db = store || await getStore(env);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ipHash = createHmac('sha256', settings.secret).update(ip).digest('hex');
  const recent = await db.query(`SELECT count(*)::integer AS count FROM recipe_admin_attempts
    WHERE ip_hash = $1 AND created_at > now() - interval '15 minutes'`, [ipHash]);
  if (recent.rows[0].count >= 5) return false;
  const globalRecent = await db.query(`SELECT count(*)::integer AS count FROM recipe_admin_attempts
    WHERE created_at > now() - interval '15 minutes'`);
  if (globalRecent.rows[0].count >= 100) return false;
  const salt = `recipes-admin:${settings.username}`;
  const expected = scryptSync(settings.password, salt, 64);
  const received = scryptSync(String(password || ''), salt, 64);
  const valid = constantEqual(username, settings.username) && timingSafeEqual(expected, received);
  if (!valid) await db.query('INSERT INTO recipe_admin_attempts (ip_hash) VALUES ($1)', [ipHash]);
  return valid;
}

export function adminMutationAllowed(request) { return isAllowedCheckoutRequest(request); }

export function unauthorizedAdminResponse() {
  return Response.json({ error: 'Acesso administrativo não autorizado.' }, { status: 401, headers: productAccessHeaders() });
}
