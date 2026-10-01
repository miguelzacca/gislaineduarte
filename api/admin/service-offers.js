import { adminMutationAllowed, readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';
import { readServiceOffers, saveServiceOffers } from '../../server/service-offers.js';

export async function handleAdminServiceOffersRequest(request, options = {}) {
  const headers = productAccessHeaders();
  if (!readAdminSession(request, options.env || process.env)) return unauthorizedAdminResponse();
  if (!['GET', 'PATCH'].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, PATCH' } });
  if (request.method === 'PATCH' && !adminMutationAllowed(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  try {
    if (request.method === 'GET') return Response.json(await readServiceOffers(options), { headers });
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > 24576) return Response.json({ error: 'Conteúdo muito grande.' }, { status: 413, headers });
    let body; try { body = JSON.parse(text); } catch { return Response.json({ error: 'Conteúdo inválido.' }, { status: 400, headers }); }
    return Response.json(await saveServiceOffers(body, options), { headers });
  } catch (error) {
    return Response.json({ error: error.status ? error.message : 'Não foi possível carregar ou salvar as opções.' }, { status: error.status || 503, headers });
  }
}
export function GET(request) { return handleAdminServiceOffersRequest(request); }
export function PATCH(request) { return handleAdminServiceOffersRequest(request); }
