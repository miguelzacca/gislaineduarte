const API_ORIGIN = 'https://api.checkout.infinitepay.io';

async function post(path, payload, fetcher = fetch) {
  const response = await fetcher(`${API_ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`InfinitePay retornou HTTP ${response.status}.`);
  return response.json();
}

export async function createPaymentLink({ handle, orderId, title, amountCents, origin, webhookToken }, fetcher = fetch) {
  const response = await post('/links', {
    handle,
    order_nsu: orderId,
    items: [{ quantity: 1, price: amountCents, description: title }],
    redirect_url: `${origin}/api/recipes/return/`,
    webhook_url: `${origin}/api/recipes/webhook/?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(webhookToken)}`,
  }, fetcher);
  const url = new URL(response.url);
  if (url.protocol !== 'https:' || !/(^|\.)infinitepay\.(io|com\.br)$/.test(url.hostname) || url.username || url.password) {
    throw new Error('A InfinitePay retornou uma URL de checkout inválida.');
  }
  return url.href;
}

export async function checkPayment({ handle, orderId, transactionNsu, slug }, fetcher = fetch) {
  const result = await post('/payment_check', {
    handle,
    order_nsu: orderId,
    transaction_nsu: transactionNsu,
    slug,
  }, fetcher);
  return result.success === true && result.paid === true && Number.isSafeInteger(result.amount)
    ? result
    : null;
}
