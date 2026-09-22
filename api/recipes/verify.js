import { SESSION_COOKIE, cookie, isAllowedCheckoutRequest, isSecureRequest, productAccessHeaders } from '../../server/recipes/access.js';
import { readCommerceConfig } from '../../server/recipes/config.js';
import { consumeMagicLink } from '../../server/recipes/flow.js';
import { recipesProduct } from '../../src/data/recipes-product.js';

function page(message, token = '') {
  const button = token ? `<form action="/api/recipes/verify/" method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Confirmar meu acesso</button></form>` : '<a href="/minhas-receitas/">Voltar à coleção</a>';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmar acesso | Gislaine Duarte</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f1eee5;color:#173f35;font-family:Arial,sans-serif;padding:20px;box-sizing:border-box}main{max-width:480px;background:#fff;padding:42px;border-radius:20px;box-shadow:0 24px 70px #173f351a}small{letter-spacing:.25em;color:#927747}h1{font-family:Georgia,serif;font-weight:400;font-size:42px;line-height:1.15}p{line-height:1.6}button,a{display:inline-block;border:0;border-radius:8px;background:#173f35;color:white;text-decoration:none;padding:16px 22px;font:600 15px Arial;cursor:pointer}</style></head><body><main><small>GISLAINE DUARTE</small><h1>${message}</h1><p>Seu link de acesso é pessoal e expira em 15 minutos. Ao confirmar, você poderá abrir a coleção neste dispositivo e no computador onde iniciou o pedido.</p>${button}</main></body></html>`;
}

const htmlHeaders = () => productAccessHeaders({
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
});

export function GET(request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const valid = /^[A-Za-z0-9_-]{40,60}$/.test(token);
  return new Response(page(valid ? 'Sua coleção está pronta.' : 'Link inválido.', valid ? token : ''), {
    status: valid ? 200 : 400, headers: htmlHeaders(),
  });
}

export async function handleVerifyRequest(request, { env = process.env, store } = {}) {
  if (!isAllowedCheckoutRequest(request)) return new Response('Origem não autorizada.', { status: 403, headers: htmlHeaders() });
  if (Number(request.headers.get('content-length') || 0) > 4096) return new Response('Solicitação muito grande.', { status: 413, headers: htmlHeaders() });
  try {
    const form = await request.formData();
    const session = await consumeMagicLink(form.get('token'), { env, store });
    if (!session) return new Response(page('Este link expirou ou já foi usado.'), { status: 400, headers: htmlHeaders() });
    const origin = readCommerceConfig(env).origin || new URL(request.url).origin;
    return new Response(null, {
      status: 303,
      headers: productAccessHeaders({
        Location: new URL(recipesProduct.experiencePath, origin).href,
        'Set-Cookie': cookie(SESSION_COOKIE, session.token, { maxAge: session.maxAge, secure: isSecureRequest(request, env) }),
      }),
    });
  } catch (error) {
    console.error('Falha ao confirmar link de acesso:', error);
    return new Response(page('Não foi possível confirmar agora.'), { status: 503, headers: htmlHeaders() });
  }
}

export function POST(request) { return handleVerifyRequest(request); }
