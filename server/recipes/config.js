export class ProductConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductConfigurationError';
  }
}

export function readAccessConfig(env = process.env) {
  const siteUrl = String(env.RECIPES_SITE_URL || '').trim();
  let origin = '';
  try {
    const url = new URL(siteUrl);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('invalid');
    origin = url.origin;
  } catch {
    // A URL precisa ser configurada antes de criar links de pagamento.
  }
  const ready = Boolean(origin) && Boolean(env.DATABASE_URL) &&
    Boolean(env.SMTP_USER) && Boolean(env.SMTP_APP_PASSWORD) && Boolean(env.SMTP_FROM);
  return { origin, ready };
}

export function requireAccessConfig(env = process.env) {
  const config = readAccessConfig(env);
  if (!config.ready) throw new ProductConfigurationError('Configure RECIPES_SITE_URL, DATABASE_URL e SMTP_*.');
  return config;
}

export function readCommerceConfig(env = process.env) {
  const access = readAccessConfig(env);
  const handle = String(env.INFINITEPAY_HANDLE || '').trim().replace(/^\$/, '');
  return { ...access, handle, ready: access.ready && /^[a-z0-9_.-]{3,64}$/i.test(handle) };
}

export function requireCommerceConfig(env = process.env) {
  const config = readCommerceConfig(env);
  if (!config.ready) throw new ProductConfigurationError('Configure INFINITEPAY_HANDLE, RECIPES_SITE_URL, DATABASE_URL e SMTP_*.');
  return config;
}

export function sessionDays(env = process.env) {
  const days = Number(env.RECIPES_PRODUCT_SESSION_TTL_DAYS || 30);
  return Number.isInteger(days) && days >= 1 && days <= 365 ? days : 30;
}
