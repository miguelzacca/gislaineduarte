import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { RECIPES_PRODUCT_ID, recipesProduct } from '../../src/data/recipes-product.js';

export const RECIPES_ACCESS_COOKIE = 'gd_recipes_access';
export const MIN_ACCESS_SECRET_LENGTH = 32;

export class ProductAccessConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductAccessConfigurationError';
  }
}

export function readProductAccessConfig(env = process.env) {
  const requestedMode = String(env.RECIPES_PRODUCT_ACCESS_MODE || 'locked').trim().toLowerCase();
  const mode = ['mock', 'locked'].includes(requestedMode) ? requestedMode : 'locked';
  const mockCheckoutEnabled = String(env.RECIPES_PRODUCT_MOCK_CHECKOUT_ENABLED || '').toLowerCase() === 'true';
  const secret = String(env.RECIPES_PRODUCT_ACCESS_SECRET || '');
  const parsedDays = Number.parseInt(env.RECIPES_PRODUCT_SESSION_TTL_DAYS || '30', 10);
  const ttlDays = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 365 ? parsedDays : 30;
  const mockReady = mode === 'mock' && mockCheckoutEnabled && secret.length >= MIN_ACCESS_SECRET_LENGTH;
  return { mode, requestedMode, mockCheckoutEnabled, secret, ttlDays, mockReady };
}

const encode = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => Buffer.from(value, 'base64url').toString('utf8');
const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url');

export function parseCookieHeader(header = '') {
  return String(header).split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 1) return cookies;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies[name] = value;
    return cookies;
  }, {});
}

export function createMockProductSession({ env = process.env, now = Date.now(), nonce } = {}) {
  const config = readProductAccessConfig(env);
  if (!config.mockReady) {
    throw new ProductAccessConfigurationError('O checkout temporário está bloqueado ou sem um segredo válido.');
  }
  const issuedAt = Math.floor(now / 1000);
  const maxAge = config.ttlDays * 24 * 60 * 60;
  const payload = {
    v: 1,
    sub: RECIPES_PRODUCT_ID,
    iat: issuedAt,
    exp: issuedAt + maxAge,
    nonce: nonce || randomBytes(16).toString('base64url'),
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return {
    token: `${encodedPayload}.${sign(encodedPayload, config.secret)}`,
    expiresAt: payload.exp,
    maxAge,
    payload,
  };
}

export function verifyMockProductSession(token, { env = process.env, now = Date.now() } = {}) {
  const config = readProductAccessConfig(env);
  if (!config.mockReady) return { granted: false, reason: 'locked', mode: config.mode };
  if (!token || typeof token !== 'string') return { granted: false, reason: 'missing-session', mode: config.mode };
  const [encodedPayload, receivedSignature, extra] = token.split('.');
  if (!encodedPayload || !receivedSignature || extra) return { granted: false, reason: 'malformed-session', mode: config.mode };

  const expectedSignature = sign(encodedPayload, config.secret);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { granted: false, reason: 'invalid-signature', mode: config.mode };
  }

  let payload;
  try {
    payload = JSON.parse(decode(encodedPayload));
  } catch {
    return { granted: false, reason: 'invalid-payload', mode: config.mode };
  }
  const nowSeconds = Math.floor(now / 1000);
  const maxAge = config.ttlDays * 24 * 60 * 60;
  const valid = payload?.v === 1 &&
    payload?.sub === RECIPES_PRODUCT_ID &&
    Number.isInteger(payload?.iat) &&
    Number.isInteger(payload?.exp) &&
    typeof payload?.nonce === 'string' &&
    payload.nonce.length >= 16 &&
    payload.iat <= nowSeconds + 60 &&
    payload.exp > nowSeconds &&
    payload.exp > payload.iat &&
    payload.exp - payload.iat <= maxAge;
  if (!valid) {
    const reason = Number.isInteger(payload?.exp) && payload.exp <= nowSeconds ? 'expired-session' : 'invalid-payload';
    return { granted: false, reason, mode: config.mode };
  }
  return { granted: true, reason: 'valid-session', mode: config.mode, subject: payload.sub, expiresAt: payload.exp };
}

/**
 * Ponto único de autorização do produto. Um gateway futuro deve adicionar seu
 * verificador aqui (ou em `providerVerifiers`) sem alterar páginas e downloads.
 */
export async function verifyProductEntitlement(request, {
  env = process.env,
  now = Date.now(),
  providerVerifiers = {},
} = {}) {
  const config = readProductAccessConfig(env);
  if (providerVerifiers[config.requestedMode]) {
    return providerVerifiers[config.requestedMode](request, { env, now, config });
  }
  if (config.mode !== 'mock') return { granted: false, reason: 'locked', mode: config.mode };
  const cookieHeader = request?.headers?.get?.('cookie') || '';
  const token = parseCookieHeader(cookieHeader)[RECIPES_ACCESS_COOKIE];
  return verifyMockProductSession(token, { env, now });
}

export function isSecureRequest(request, env = process.env) {
  if (env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production') return true;
  const forwarded = request?.headers?.get?.('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  try {
    if (new URL(request.url).protocol === 'https:') return true;
  } catch {
    // A configuração de produção ainda deve forçar Secure.
  }
  return false;
}

export function serializeProductSessionCookie(token, { maxAge, secure }) {
  const attributes = [
    `${RECIPES_ACCESS_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function productAccessHeaders(extra = {}) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
}

export function isAllowedCheckoutRequest(request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function safeProductUrl(path, request) {
  const allowed = new Set([recipesProduct.publicPath, recipesProduct.experiencePath]);
  const selected = allowed.has(path) ? path : recipesProduct.publicPath;
  return new URL(selected, new URL(request.url).origin);
}
