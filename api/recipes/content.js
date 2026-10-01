import { getStore } from '../../server/recipes/store.js';
import { readRecipeProduct } from '../../server/recipes/content.js';
import { requestedRecipeProduct } from '../../src/data/recipes-product.js';
import { productAccessHeaders, verifyProductEntitlement } from '../../server/recipes/access.js';

export async function handleContentRequest(request, { env = process.env, store } = {}) {
  const product = requestedRecipeProduct(request);
  if (!product) return Response.json({ error: 'Produto não encontrado.' }, { status: 404, headers: productAccessHeaders() });
  const entitlement = await verifyProductEntitlement(request, { env, store });
  if (!entitlement.granted) {
    return Response.json(
      { error: 'Acesso não autorizado.', reason: entitlement.reason },
      { status: 401, headers: productAccessHeaders({ 'Content-Type': 'application/json; charset=utf-8' }) },
    );
  }
  try {
    return Response.json(await readRecipeProduct(store || await getStore(env), product.id), { status: 200, headers: productAccessHeaders() });
  } catch (error) {
    console.error('Falha ao carregar receitas:', error.message);
    return Response.json({ error: 'Não foi possível carregar o livro. Tente novamente.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function GET(request) {
  return handleContentRequest(request);
}
