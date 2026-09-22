import { CLAIM_COOKIE, SESSION_COOKIE, cookie, isAllowedCheckoutRequest, isSecureRequest, parseCookieHeader, productAccessHeaders, tokenHash } from '../../server/recipes/access.js';
import { getStore } from '../../server/recipes/store.js';

export async function handleLogoutRequest(request, { env = process.env, store } = {}) {
  if (!isAllowedCheckoutRequest(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  try {
    const token = parseCookieHeader(request.headers.get('cookie'))[SESSION_COOKIE];
    if (token && /^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      const db = store || await getStore(env);
      await db.query('UPDATE recipe_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash(token)]);
    }
    const headers = new Headers(productAccessHeaders());
    headers.append('Set-Cookie', cookie(SESSION_COOKIE, '', { clear: true, secure: isSecureRequest(request, env) }));
    headers.append('Set-Cookie', cookie(CLAIM_COOKIE, '', { clear: true, secure: isSecureRequest(request, env) }));
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error('Falha ao encerrar sessão da coleção:', error);
    return Response.json({ error: 'Não foi possível sair agora.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function POST(request) { return handleLogoutRequest(request); }
