import { recipesProduct } from '../../src/data/recipes-product.js';
import {
  ProductAccessConfigurationError,
  createMockProductSession,
  isAllowedCheckoutRequest,
  isSecureRequest,
  productAccessHeaders,
  safeProductUrl,
  serializeProductSessionCookie,
} from '../../server/recipes/access.js';

const wantsJson = (request) => request.headers.get('accept')?.includes('application/json');

export async function handleCheckoutRequest(request, { env = process.env, now = Date.now() } = {}) {
  if (!isAllowedCheckoutRequest(request)) {
    return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  }
  try {
    const session = createMockProductSession({ env, now });
    const headers = productAccessHeaders({
      'Set-Cookie': serializeProductSessionCookie(session.token, {
        maxAge: session.maxAge,
        secure: isSecureRequest(request, env),
      }),
      'Location': safeProductUrl(recipesProduct.experiencePath, request).href,
    });
    if (wantsJson(request)) {
      return Response.json({ ok: true, redirect: recipesProduct.experiencePath }, { status: 200, headers });
    }
    return new Response(null, { status: 303, headers });
  } catch (error) {
    if (!(error instanceof ProductAccessConfigurationError)) throw error;
    if (wantsJson(request)) {
      return Response.json({ error: 'Acesso temporariamente indisponível.' }, { status: 423, headers: productAccessHeaders() });
    }
    const locked = safeProductUrl(recipesProduct.publicPath, request);
    locked.searchParams.set('access', 'locked');
    locked.hash = 'acesso';
    return new Response(null, {
      status: 303,
      headers: productAccessHeaders({ Location: locked.href }),
    });
  }
}

export function POST(request) {
  return handleCheckoutRequest(request);
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: productAccessHeaders({ Allow: 'POST' }) });
}

