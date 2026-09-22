import { CLAIM_COOKIE, SESSION_COOKIE, cookie, isSecureRequest, productAccessHeaders } from '../../server/recipes/access.js';
import { authStatus } from '../../server/recipes/flow.js';

export async function handleStatusRequest(request, options = {}) {
  const env = options.env || process.env;
  try {
    const status = await authStatus(request, options);
    const headers = new Headers(productAccessHeaders());
    if (status.session) {
      headers.append('Set-Cookie', cookie(SESSION_COOKIE, status.session.token, { maxAge: status.session.maxAge, secure: isSecureRequest(request, env) }));
      headers.append('Set-Cookie', cookie(CLAIM_COOKIE, '', { clear: true, secure: isSecureRequest(request, env) }));
    }
    return Response.json({ state: status.state, ...(status.checkoutUrl ? { checkoutUrl: status.checkoutUrl } : {}) }, { headers });
  } catch (error) {
    console.error('Falha ao consultar acesso:', error);
    return Response.json({ state: 'error' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function GET(request) { return handleStatusRequest(request); }
