import { RECIPES_PRODUCT_ID } from '../../src/data/recipes-product.js';
import { productAccessHeaders } from '../../server/recipes/access.js';
import { readCommerceConfig } from '../../server/recipes/config.js';
import { getStore } from '../../server/recipes/store.js';

export async function handleCatalogRequest(_request, { env = process.env, store } = {}) {
  try {
    if (!readCommerceConfig(env).ready) throw new Error('Pagamento ainda não configurado.');
    const db = store || await getStore(env);
    const result = await db.query('SELECT price_cents FROM recipe_products WHERE id = $1 AND published = true AND price_cents IS NOT NULL', [RECIPES_PRODUCT_ID]);
    return Response.json({ available: Boolean(result.rowCount), priceCents: result.rows[0]?.price_cents || null, currency: 'BRL' }, { headers: productAccessHeaders() });
  } catch {
    return Response.json({ available: false, priceCents: null, currency: 'BRL' }, { headers: productAccessHeaders() });
  }
}

export function GET(request) { return handleCatalogRequest(request); }
