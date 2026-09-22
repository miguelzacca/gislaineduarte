import { productAccessHeaders } from '../../server/recipes/access.js';
import { confirmPayment } from '../../server/recipes/flow.js';

export async function handleWebhookRequest(request, options = {}) {
  if (Number(request.headers.get('content-length') || 0) > 16_384) return new Response(null, { status: 413, headers: productAccessHeaders() });
  try {
    const url = new URL(request.url);
    const payload = await request.json();
    const orderId = url.searchParams.get('order');
    if (payload.order_nsu !== orderId) return new Response(null, { status: 400, headers: productAccessHeaders() });
    const result = await confirmPayment({
      orderId,
      transactionNsu: payload.transaction_nsu,
      slug: payload.invoice_slug,
      webhookKey: url.searchParams.get('key') || '',
    }, options);
    return new Response(null, { status: result.status, headers: productAccessHeaders() });
  } catch (error) {
    console.error('Falha ao confirmar pagamento InfinitePay:', error);
    return new Response(null, { status: 400, headers: productAccessHeaders() });
  }
}

export function POST(request) { return handleWebhookRequest(request); }
