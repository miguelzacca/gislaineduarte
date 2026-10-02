import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { initializeRecipeContent, readRecipeRecords, readRecipeProduct, normalizeRecipeEdit } from '../../server/recipes/content.js';
import { handleAdminRecipesRequest } from '../../api/admin/recipes.js';
import { handleAdminProductsRequest } from '../../api/admin/products.js';
import { handleContentRequest } from '../../api/recipes/content.js';
import { handleDownloadRequest } from '../../api/recipes/download.js';
import { adminCookie } from '../../server/recipes/admin.js';
import { SESSION_COOKIE, tokenHash } from '../../server/recipes/access.js';
import { recipeProducts, RECIPES_PRODUCT_ID, GLP_RECIPES_PRODUCT_ID } from '../../src/data/recipes-product.js';

test('PostgreSQL recipe editing preserves drafts, versions, purchases and current exports', async t => {
  const pg = await PGlite.create();
  const db = { query: async (...args) => { const result = await pg.query(...args); return { ...result, rowCount: result.rows.length }; } };
  const env = { RECIPES_ADMIN_USERNAME: 'test-admin', RECIPES_ADMIN_PASSWORD: 'not-real-password', RECIPES_ADMIN_SESSION_SECRET: randomBytes(40).toString('hex') };
  const origin = 'https://recipes.example';
  const admin = adminCookie(new Request(origin), env).split(';')[0];
  const token = 'p'.repeat(43);
  const call = (method, recipe, options = {}) => handleAdminRecipesRequest(new Request(`${origin}/api/admin/recipes`, { method, headers: { cookie: options.cookie ?? admin, origin: options.origin || origin, 'Content-Type': 'application/json' }, ...(recipe ? { body: JSON.stringify({ recipe }) } : {}) }), { env, store: db });
  try {
    await pg.exec(`CREATE TABLE recipe_products(id text PRIMARY KEY, kind text DEFAULT 'recipes', title text, description text, price_cents integer, published boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TABLE recipe_sessions(token_hash text, email text, expires_at timestamptz, revoked_at timestamptz);
      CREATE TABLE recipe_entitlements(email text, product_id text);`);
    for (const product of recipeProducts) await pg.query('INSERT INTO recipe_products(id,title,description) VALUES ($1,$2,$3)', [product.id, product.title, product.description]);
    await initializeRecipeContent(db);
    await pg.query("INSERT INTO recipe_sessions(token_hash,email,expires_at) VALUES ($1,'buyer@example.com',now()+interval '1 day')", [tokenHash(token)]);
    await pg.query("INSERT INTO recipe_entitlements VALUES ('buyer@example.com',$1)", [RECIPES_PRODUCT_ID]);
    const publicRequest = (path, product = RECIPES_PRODUCT_ID) => new Request(`${origin}${path}?product=${product}`, { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
    await t.test('admin authentication and cross-origin writes are enforced', async () => {
      assert.equal((await call('GET', null, { cookie: '' })).status, 401);
      assert.equal((await call('POST', {}, { origin: 'https://other.example' })).status, 403);
    });
    let edited;
    await t.test('save revision changes live catalog, source credit and protected recipe', async () => {
      const initial = await (await call('GET')).json();
      assert.equal(initial.recipes.length, 38);
      const recipe = initial.recipes.find(item => item.id === 'brigadeiro-banana');
      const response = await call('PATCH', { ...recipe, reviewConfirmed: true, title: 'Brigadeiro revisado', preparationText: 'Amasse a banana.\nCozinhe os ingredientes até firmar.\nDeixe esfriar antes de modelar.', imageAuthor: 'Crédito revisado', servings: 4, nutrition: { kcal: 50, protein: 2, carbs: 7, fat: 1, source: 'Ficha de cálculo da profissional' } });
      assert.equal(response.status, 200); edited = (await response.json()).recipe;
      assert.equal(edited.revision, 2); assert.equal(edited.imageAuthor, 'Crédito revisado');
      assert.equal((await call('PATCH', { ...recipe, title: 'Edição antiga' })).status, 409);
      const preview = await readRecipeProduct(db, RECIPES_PRODUCT_ID, { publicPreview: true });
      assert.ok(preview.recipes.some(item => item.name === edited.title));
      assert.equal(JSON.stringify(preview).includes('Cozinhe os ingredientes'), false);
      const content = await (await handleContentRequest(publicRequest('/api/recipes/content'), { store: db })).json();
      const saved = content.recipes.find(item => item.id === edited.id);
      assert.equal(saved.preparation[1], 'Cozinhe os ingredientes até firmar.');
      assert.equal(saved.nutrition.source, 'Ficha de cálculo da profissional');
    });
    await t.test('reseed never overwrites professional edits and drafts are private', async () => {
      await initializeRecipeContent(db);
      assert.equal((await readRecipeRecords(db)).find(item => item.id === edited.id).name, edited.title);
      const content = await readRecipeProduct(db, RECIPES_PRODUCT_ID);
      assert.equal(content.recipes.some(item => item.id === 'pao-fuba'), false);
      assert.equal((await call('POST', { title: 'Receita em rascunho', productIds: [RECIPES_PRODUCT_ID], imageUrl: '/images/foods/apple.jpg', published: false })).status, 201);
    });
    await t.test('GLP-1 requires its own entitlement for content and downloads', async () => {
      assert.equal((await handleContentRequest(publicRequest('/api/recipes/content', GLP_RECIPES_PRODUCT_ID), { store: db })).status, 401);
      const denied = new Request(`${origin}/api/recipes/download?product=${GLP_RECIPES_PRODUCT_ID}&format=pdf`, { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
      assert.equal((await handleDownloadRequest(denied, { store: db })).status, 401);
      await pg.query("INSERT INTO recipe_entitlements VALUES ('buyer@example.com',$1)", [GLP_RECIPES_PRODUCT_ID]);
      assert.equal((await handleContentRequest(publicRequest('/api/recipes/content', GLP_RECIPES_PRODUCT_ID), { store: db })).status, 200);
    });
    await t.test('offline download embeds the current edited record and real pixels', async () => {
      const req = new Request(`${origin}/api/recipes/download?format=html`, { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
      const response = await handleDownloadRequest(req, { store: db });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(edited.title)); assert.ok(html.includes('Crédito revisado'));
      assert.match(html, /data:image\/jpeg;base64,/);
      assert.ok(!html.includes('Receita em rascunho'));
    });
    await t.test('product metadata supports edits and rejects stale changes', async () => {
      const request = (method, body) => new Request(`${origin}/api/admin/products`, { method, headers: { cookie: admin, origin }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const listing = await (await handleAdminProductsRequest(request('GET'), { env, store: db })).json();
      const product = listing.products.find(item => item.id === GLP_RECIPES_PRODUCT_ID);
      const body = { ...product, title: 'Receitas GLP-1 revisadas', priceCents: 3900, published: true };
      assert.equal((await readRecipeProduct(db, GLP_RECIPES_PRODUCT_ID)).recipes.length, 0, 'exemplos gerados não são material GLP-1 aprovado');
      assert.equal((await handleAdminProductsRequest(request('PATCH', body), { env, store: db })).status, 400, 'livro sem receitas aprovadas permanece indisponível');
      const initialRecipes = await (await call('GET')).json();
      const reviewed = initialRecipes.recipes.find(item => item.id === 'glp-iogurte-mamao');
      assert.equal((await call('PATCH', { ...reviewed, published: true, reviewConfirmed: true, editorialSource: 'Receita selecionada pela profissional para este teste', editorialContext: 'Receita educativa revisada no teste.' })).status, 200);
      assert.equal((await handleAdminProductsRequest(request('PATCH', body), { env, store: db })).status, 200);
      assert.equal((await handleAdminProductsRequest(request('PATCH', body), { env, store: db })).status, 409);
      const editor = await (await call('GET')).json();
      assert.equal(editor.products.find(item => item.id === GLP_RECIPES_PRODUCT_ID).title, body.title);
      assert.equal((await readRecipeProduct(db, GLP_RECIPES_PRODUCT_ID)).title, body.title);
    });
  } finally { await pg.close(); }
});

test('recipe edits reject unsafe photos and nutrition without a declared source', () => {
  const draft = { title: 'Receita de teste', productIds: [RECIPES_PRODUCT_ID], imageUrl: '/images/foods/apple.jpg', published: false };
  assert.equal(normalizeRecipeEdit({ ...draft, imageUrl: '', ingredientsText: '', preparationText: '' }).published, false, 'rascunhos podem ser preservados antes de completar o conteúdo');
  for (const imageUrl of ['https://127.0.0.1/private', '/images/../../secrets.jpg', 'javascript:alert(1)', 'https://images.pexels.com@127.0.0.1/image.jpg']) assert.throws(() => normalizeRecipeEdit({ ...draft, imageUrl }), /fotografia/);
  assert.throws(() => normalizeRecipeEdit({ ...draft, servings: 1, nutrition: { kcal: 200, protein: 10, carbs: 20, fat: 7 } }), /fonte/);
  assert.throws(() => normalizeRecipeEdit({ ...draft, servings: 1, nutrition: { kcal: 200, protein: null, carbs: 20, fat: 7, source: 'Ficha' } }), /campos vazios/);
  assert.throws(() => normalizeRecipeEdit({ ...draft, published: true, ingredientsText: '1 maçã', preparationText: 'Lave e corte.', imageAlt: 'Maçã' }), /revisão/);
  assert.throws(() => normalizeRecipeEdit({ ...draft, published: true, reviewConfirmed: true, ingredientsText: '1 maçã', preparationText: 'Lave e corte.', imageAlt: 'Maçã' }), /autoria/);
});

test('editorial reseed corrects untouched invented GLP recipes without changing professional work', async t => {
  const pg = await PGlite.create();
  t.after(() => pg.close());
  await initializeRecipeContent(pg);
  const original = (await readRecipeRecords(pg)).find(item => item.id === 'glp-iogurte-mamao');
  const legacy = { ...original, published: true, validation: { status: 'source-transcribed', source: 'Referências fornecidas pela profissional em 01/10/2026.' } };
  delete legacy.seedVersion;
  await pg.query('UPDATE recipe_content SET data = $2::jsonb, revision = 1 WHERE id = $1', [legacy.id, JSON.stringify(legacy)]);
  await initializeRecipeContent(pg);
  const corrected = (await readRecipeRecords(pg)).find(item => item.id === legacy.id);
  assert.equal(corrected.published, false);
  assert.match(corrected.validation.source, /gerado pelo sistema/);
  assert.equal(corrected.revision, 2);
  const changed = { ...corrected, published: true, name: 'Preparação revisada', validation: { status: 'professional-reviewed', source: 'Cadastro profissional' } };
  await pg.query('UPDATE recipe_content SET data = $2::jsonb WHERE id = $1', [changed.id, JSON.stringify(changed)]);
  await initializeRecipeContent(pg);
  assert.equal((await readRecipeRecords(pg)).find(item => item.id === changed.id).name, changed.name);
});
