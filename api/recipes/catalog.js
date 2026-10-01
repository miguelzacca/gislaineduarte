import { readRecipeProduct } from '../../server/recipes/content.js';
import { requestedRecipeProduct } from '../../src/data/recipes-product.js';
import { productAccessHeaders } from '../../server/recipes/access.js';
import { readCommerceConfig } from '../../server/recipes/config.js';
import { getStore } from '../../server/recipes/store.js';

export async function handleCatalogRequest(request, { env = process.env, store } = {}) {
  const product = requestedRecipeProduct(request);
  if (!product) return Response.json({ error: 'Produto não encontrado.' }, { status: 404, headers: productAccessHeaders() });
  try {
    const commerceReady = readCommerceConfig(env).ready;
    const db = store || await getStore(env);
    const result = await db.query('SELECT price_cents FROM recipe_products WHERE id = $1 AND published = true AND price_cents IS NOT NULL', [product.id]);
    return Response.json({ available: commerceReady && Boolean(result.rowCount), priceCents: result.rows[0]?.price_cents || null, currency: 'BRL', product: await readRecipeProduct(db, product.id, { publicPreview: true }) }, { headers: productAccessHeaders() });
  } catch {
    return Response.json({ available: false, priceCents: null, currency: 'BRL' }, { headers: productAccessHeaders() });
  }
}

export function GET(request) { return handleCatalogRequest(request); }
