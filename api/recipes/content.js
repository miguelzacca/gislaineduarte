import { buildProtectedProductPayload } from '../../src/data/recipes-product.js';
import { productAccessHeaders, verifyProductEntitlement } from '../../server/recipes/access.js';

export async function handleContentRequest(request, { env = process.env, now = Date.now() } = {}) {
  const entitlement = await verifyProductEntitlement(request, { env, now });
  if (!entitlement.granted) {
    return Response.json(
      { error: 'Acesso não autorizado.', reason: entitlement.reason },
      { status: 401, headers: productAccessHeaders({ 'Content-Type': 'application/json; charset=utf-8' }) },
    );
  }
  return Response.json(buildProtectedProductPayload(), {
    status: 200,
    headers: productAccessHeaders({ 'Content-Type': 'application/json; charset=utf-8' }),
  });
}

export function GET(request) {
  return handleContentRequest(request);
}

