import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { handleProductApiRequest } from '../../server/recipes/node-adapter.js';
import { nutritionIntakeBodyLimit, readBody } from '../../server/nutrition/service.js';

const jsonBytes = size => JSON.stringify({ probe: 'x'.repeat(size - 12) });

test('local intake accepts photo-sized bodies and returns readable errors above its limit', async t => {
  const server = createServer((request, response) => {
    handleProductApiRequest(request, response, { env: {} }).catch(() => {
      response.writeHead(500); response.end();
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const send = (path, size) => fetch(`${origin}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://unrelated.invalid' }, body: jsonBytes(size),
  });

  await t.test('bodies above the former 32 KB limit reach origin validation without database access', async () => {
    for (const [path, size] of [
      ['/api/nutrition?action=intake', 40_000],
      ['/api/nutrition?action=intake', 600_000],
      ['/api/nutrition/?action=intake', nutritionIntakeBodyLimit],
    ]) {
      const response = await send(path, size);
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error, 'Origem não autorizada.');
    }
  });

  await t.test('oversized intake returns JSON instructions without cache or reflected input', async () => {
    const response = await send('/api/nutrition?action=intake', nutritionIntakeBodyLimit + 1);
    assert.equal(response.status, 413);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const body = await response.json();
    assert.match(body.error, /fotos opcionais/);
    assert.deepEqual(Object.keys(body), ['error']);
  });

  await t.test('other actions keep their smaller limits, including trailing slash URLs', async () => {
    for (const [path, size] of [
      ['/api/nutrition?action=checkout', 32_001],
      ['/api/nutrition/?action=checkout', 32_001],
      ['/api/admin/nutrition/', 180_001],
      ['/api/recipes/checkout', 16_385],
    ]) {
      const response = await send(path, size);
      assert.equal(response.status, 413);
      assert.match((await response.json()).error, /limite de tamanho/);
    }
  });
});

test('API body reader agrees with the local intake boundary', async () => {
  const request = size => new Request('http://localhost/api/nutrition?action=intake', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: jsonBytes(size),
  });
  const body = await readBody(request(nutritionIntakeBodyLimit), nutritionIntakeBodyLimit);
  assert.equal(Buffer.byteLength(JSON.stringify(body)), nutritionIntakeBodyLimit);
  await assert.rejects(readBody(request(nutritionIntakeBodyLimit + 1), nutritionIntakeBodyLimit), { status: 413 });
});
