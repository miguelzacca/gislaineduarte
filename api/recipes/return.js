import { productAccessHeaders } from '../../server/recipes/access.js';
import { readCommerceConfig } from '../../server/recipes/config.js';
import { confirmPayment } from '../../server/recipes/flow.js';
import { recipeProductById, recipesProduct } from '../../src/data/recipes-product.js';

export async function handleReturnRequest(request, options = {}) {
  const env = options.env || process.env;
  const url = new URL(request.url);
  let confirmed = false;
  let productId;
  try {
    const result = await confirmPayment({
      orderId: url.searchParams.get('order_nsu'),
      transactionNsu: url.searchParams.get('transaction_nsu'),
      slug: url.searchParams.get('slug'),
    }, options);
    confirmed = result.confirmed;
    productId = result.productId;
  } catch (error) {
    console.error('Falha ao conferir retorno da InfinitePay:', error);
  }
  const origin = readCommerceConfig(env).origin || url.origin;
  const destination = new URL(recipeProductById(productId)?.experiencePath || recipesProduct.experiencePath, origin);
  destination.searchParams.set('payment', confirmed ? 'confirmed' : 'pending');
  return new Response(null, { status: 303, headers: productAccessHeaders({ Location: destination.href }) });
}

export function GET(request) { return handleReturnRequest(request); }
