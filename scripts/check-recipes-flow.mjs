import assert from 'node:assert/strict';

const origin = process.env.RECIPES_PRODUCT_TEST_ORIGIN || 'http://127.0.0.1:4325';
const path = '/7-receitas-para-ajudar-voce-a-desinflamar/';

async function request(relative, options = {}) {
  return fetch(new URL(relative, origin), { redirect: 'manual', ...options });
}

const landing = await request(path);
assert.equal(landing.status, 200);
assert.match(await landing.text(), /7 receitas para ajudar você a desinflamar!/);

for (const relative of ['/api/recipes/content', '/api/recipes/download?format=html', '/api/recipes/download?format=pdf']) {
  const denied = await request(relative);
  assert.equal(denied.status, 401, `${relative} deve negar acesso sem sessão`);
  assert.match(denied.headers.get('x-robots-tag') || '', /noindex/);
}

const checkout = await request('/api/recipes/checkout', {
  method: 'POST',
  headers: { origin, 'sec-fetch-site': 'same-origin' },
});
assert.equal(checkout.status, 303);
assert.equal(new URL(checkout.headers.get('location')).pathname, '/minhas-receitas/');
const cookie = checkout.headers.get('set-cookie');
assert.match(cookie || '', /HttpOnly; SameSite=Lax/);
const session = cookie.split(';')[0];

const shell = await request('/minhas-receitas/', { headers: { cookie: session } });
assert.equal(shell.status, 200);
assert.match(await shell.text(), /noindex, nofollow/);

const content = await request('/api/recipes/content', { headers: { cookie: session } });
assert.equal(content.status, 200);
const data = await content.json();
assert.equal(data.recipes.length, 7);

for (const [format, contentType] of [['html', 'text/html'], ['pdf', 'application/pdf']]) {
  const download = await request(`/api/recipes/download?format=${format}`, { headers: { cookie: session } });
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-type'), new RegExp(contentType));
  assert.match(download.headers.get('content-disposition'), /attachment; filename=/);
  assert.ok((await download.arrayBuffer()).byteLength > 100_000);
}

const tampered = await request('/api/recipes/content', { headers: { cookie: `${session}x` } });
assert.equal(tampered.status, 401);
console.log('Fluxo HTTP: landing → mock → área adquirida → 2 downloads; acesso direto e cookie adulterado bloqueados.');
