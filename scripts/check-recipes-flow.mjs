import assert from 'node:assert/strict';

const origin = process.env.RECIPES_PRODUCT_TEST_ORIGIN || 'http://127.0.0.1:4321';
const request = (path, options = {}) => {
  const url = new URL(path, origin);
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return fetch(url, { redirect: 'manual', ...options });
};

const landing = await request('/7-receitas-para-ajudar-voce-a-desinflamar');
assert.equal(landing.status, 200);
assert.match(await landing.text(), /7 receitas para ajudar você a desinflamar!/);

for (const path of ['/api/recipes/content', '/api/recipes/download?format=html', '/api/recipes/download?format=pdf']) {
  const denied = await request(path);
  assert.equal(denied.status, 401, `${path} deve negar acesso sem sessão`);
  assert.match(denied.headers.get('x-robots-tag') || '', /noindex/);
}

const oldMock = await request('/api/recipes/content', { headers: { cookie: 'gd_recipes_access=old-mock-session' } });
assert.equal(oldMock.status, 401);

for (const path of ['/api/admin/products', '/api/admin/orders']) {
  assert.equal((await request(path)).status, 401, `${path} deve exigir login administrativo`);
}

const catalog = await request('/api/recipes/catalog');
assert.equal(catalog.status, 200);
const data = await catalog.json();
assert.equal(typeof data.available, 'boolean');

console.log('Fluxo HTTP: landing pública; conteúdo, downloads e painel protegidos; cookie mock antigo rejeitado.');
