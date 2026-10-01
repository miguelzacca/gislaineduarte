import { readServiceOffers } from '../server/service-offers.js';
import { productAccessHeaders } from '../server/recipes/access.js';

export async function handleServiceOffersRequest(request, options = {}) {
  const headers = productAccessHeaders();
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET' } });
  try {
    const data = await readServiceOffers(options);
    return Response.json({ offers: data.offers.filter(item => item.published) }, { headers });
  } catch {
    return Response.json({ error: 'Consulte as opções de acompanhamento pelo WhatsApp.' }, { status: 503, headers });
  }
}
export function GET(request) { return handleServiceOffersRequest(request); }
