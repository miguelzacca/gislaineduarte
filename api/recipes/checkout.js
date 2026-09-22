import { isAllowedCheckoutRequest, productAccessHeaders } from '../../server/recipes/access.js';
import { ProductConfigurationError } from '../../server/recipes/config.js';
import { claimCookie, startCheckout } from '../../server/recipes/flow.js';

const wantsJson = (request) => request.headers.get('accept')?.includes('application/json');

export async function handleCheckoutRequest(request, options = {}) {
  const env = options.env || process.env;
  if (!isAllowedCheckoutRequest(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  if (Number(request.headers.get('content-length') || 0) > 4096) return Response.json({ error: 'Solicitação muito grande.' }, { status: 413, headers: productAccessHeaders() });
  try {
    const data = await request.formData();
    const result = await startCheckout(data.get('email'), request, options);
    if (result.error) return Response.json({ error: result.error }, { status: result.status, headers: productAccessHeaders() });
    if (result.accessUrl) {
      const headers = productAccessHeaders(result.cookie ? { 'Set-Cookie': result.cookie } : {});
      if (wantsJson(request)) return Response.json({ accessUrl: result.accessUrl }, { headers });
      return new Response(null, { status: 303, headers: { ...headers, Location: result.accessUrl } });
    }
    const headers = productAccessHeaders({ 'Set-Cookie': claimCookie(result.claim, request, env) });
    if (wantsJson(request)) return Response.json({ checkoutUrl: result.url }, { headers });
    return new Response(null, { status: 303, headers: { ...headers, Location: result.url } });
  } catch (error) {
    if (!(error instanceof ProductConfigurationError)) console.error('Falha ao criar checkout:', error);
    return Response.json({ error: 'Pagamento temporariamente indisponível.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function POST(request) { return handleCheckoutRequest(request); }
export function GET() { return new Response('Method Not Allowed', { status: 405, headers: productAccessHeaders({ Allow: 'POST' }) }); }
