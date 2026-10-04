import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';
import { load } from 'cheerio';
import { allRecipes, recipeProducts, buildProtectedProductPayload, buildPublicProductPreview, consolidateShoppingList, formatIngredient, recipesProduct } from '../../src/data/recipes-product.js';
import { initializeRecipeContent, readRecipeRecords } from '../../server/recipes/content.js';
import { PGlite } from '@electric-sql/pglite';

test('livro ampliado contém receitas completas e mantém os rascunhos GLP-1 separados', () => {
  assert.equal(recipesProduct.recipes.length, 31);
  assert.equal(allRecipes.length, 39);
  assert.equal(new Set(allRecipes.map((recipe) => recipe.slug)).size, 39);
  for (const recipe of allRecipes) {
    assert.ok(recipe.ingredients.length);
    assert.ok(recipe.preparation.length);
    assert.ok(recipe.image.alt);
    assert.ok(recipe.validation.status);
    assert.ok(recipe.productIds.length);
    assert.ok(recipe.image.credit?.author);
    assert.match(recipe.image.src, /^\/images\/(foods|recipes|recipes-editorial)\//);
  }
  assert.equal(recipesProduct.recipes.every(recipe => recipe.published), true);
  assert.equal(allRecipes.filter(recipe => recipe.productIds.includes('receitas-glp1')).every(recipe => !recipe.published), true);
  assert.equal(formatIngredient(recipesProduct.recipes[0].ingredients[4]), '½ colher de chá de cúrcuma');
  assert.equal(formatIngredient(recipesProduct.recipes[4].ingredients[2]), '½ colher de chá de sal');
});

test('prévia pública protege preparo e somente receitas publicadas entram em cada livro', () => {
  const preview = buildPublicProductPreview();
  const payload = buildProtectedProductPayload();
  assert.equal(preview.recipes.length, recipesProduct.recipes.filter(recipe => recipe.published).length);
  assert.equal(payload.recipes.length, preview.recipes.length);
  assert.equal(JSON.stringify(preview).includes('"preparation":'), false);
  assert.equal(JSON.stringify(preview).includes('ingredients'), false);
  assert.equal(JSON.stringify(preview).includes('validation'), false);
  assert.equal(JSON.stringify(payload).includes('src/assets/recipes'), false);
  assert.deepEqual(preview.recipes.map((recipe) => recipe.name), payload.recipes.map((recipe) => recipe.name));
  assert.equal(payload.recipes.every((recipe) => Array.isArray(recipe.allergens)), true);
  for (const product of recipeProducts) {
    assert.deepEqual(buildProtectedProductPayload(product).recipes.map(recipe => recipe.id), product.recipes.filter(recipe => recipe.published).map(recipe => recipe.id));
  }
});

test('lista consolidada soma medidas iguais sem inventar quantidades a gosto', () => {
  const list = consolidateShoppingList();
  const eggs = list.find((item) => item.shoppingKey === 'eggs');
  assert.equal(eggs.quantity, 21);
  const chicken = list.find((item) => item.shoppingKey === 'chicken-to-taste');
  assert.equal(chicken.quantity, null);
  assert.equal(chicken.display, 'Frango cozido e desfiado a gosto');
  const doubled = consolidateShoppingList(recipesProduct.recipes, { 'recipe-01': 2 });
  assert.equal(doubled.find((item) => item.shoppingKey === 'eggs').quantity, 23);
});

test('contagem inclui a variação com ingredientes próprios e sem somar substituições avulsas', () => {
  const payload = buildProtectedProductPayload();
  assert.deepEqual(payload.recipeCounts, { total: 31, preparations: 30, variations: 1 });
  assert.deepEqual(buildPublicProductPreview().recipeCounts, payload.recipeCounts);
  const variant = payload.recipes.find(recipe => recipe.variantOf);
  const base = payload.recipes.find(recipe => recipe.id === variant.variantOf);
  assert.ok(base.ingredients.some(ingredient => ingredient.shoppingKey === 'cassava-flour'));
  assert.ok(variant.ingredients.some(ingredient => ingredient.shoppingKey === 'almond-flour'));
  assert.equal(variant.ingredients.some(ingredient => ingredient.shoppingKey === 'cassava-flour'), false);
  assert.ok(variant.allergenIds.includes('almonds'));
  assert.equal(base.allergenIds.includes('almonds'), false);
  for (const recipe of payload.recipes) assert.doesNotMatch(JSON.stringify([recipe.ingredients, recipe.preparation]), /confirmar|não informado|não informada|não legível/i);
});

test('cada receita do livro aponta para uma imagem da preparação, presente no projeto', async () => {
  for (const recipe of recipesProduct.recipes) {
    assert.equal(recipe.image.reference, false);
    assert.equal(recipe.image.generated, true);
    assert.ok((await stat(`public${recipe.image.src}`)).size > 10000, recipe.slug);
  }
});

test('atualização do conteúdo antigo preserva fichas e fotos editadas pela profissional', async () => {
  const db = new PGlite();
  try {
    await initializeRecipeContent(db);
    const old = structuredClone(allRecipes.find(recipe => recipe.id === 'recipe-02'));
    old.seedVersion = '2026-10-02-editorial-audit'; old.published = false;
    old.validation.status = 'pending-professional-review'; old.image.src = '/images/foods/yogurt.jpg';
    const custom = structuredClone(allRecipes.find(recipe => recipe.id === 'recipe-03'));
    custom.seedVersion = old.seedVersion; custom.name = 'Receita personalizada';
    custom.validation.status = 'professional-reviewed'; custom.image.src = '/images/foto-personalizada.jpg';
    const draft = structuredClone(allRecipes.find(recipe => recipe.id === 'recipe-05'));
    draft.seedVersion = old.seedVersion; draft.name = 'Rascunho personalizado';
    draft.validation.status = 'draft'; draft.published = false;
    for (const record of [old, custom, draft]) await db.query('UPDATE recipe_content SET data = $1::jsonb, revision = 2 WHERE id = $2', [JSON.stringify(record), record.id]);
    await initializeRecipeContent(db);
    await initializeRecipeContent(db);
    const records = await readRecipeRecords(db);
    const updated = records.find(recipe => recipe.id === old.id);
    assert.equal(updated.published, true);
    assert.equal(updated.revision, 3);
    assert.match(updated.image.src, /\/images\/recipes\//);
    assert.equal(records.find(recipe => recipe.id === custom.id).name, custom.name);
    assert.equal(records.find(recipe => recipe.id === custom.id).image.src, custom.image.src);
    assert.equal(records.find(recipe => recipe.id === draft.id).name, draft.name);
    assert.equal(records.find(recipe => recipe.id === draft.id).published, false);
  } finally { await db.close(); }
});

test('HTML offline é autocontido e contém exatamente as receitas publicadas', async () => {
  const html = await readFile('artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar-offline.html', 'utf8');
  const $ = load(html);
  const published = recipesProduct.recipes.filter(recipe => recipe.published);
  assert.equal($('.recipe').length, published.length);
  assert.equal($('img[src^="data:image/"]').length, published.length + 1);
  assert.equal($('style').length, 1);
  assert.equal($('script[src],link[href^="http"],img[src^="http"],link[rel="stylesheet"]').length, 0);
  assert.match(html, /connect-src 'none'/);
  assert.equal(/\bfetch\s*\(/.test(html), false);
  assert.equal(/url\(\s*['"]?https?:\/\//i.test(html), false);
  assert.equal(/\.img_tmp_refs|instagram|reels/i.test(html), false);
  const embedded = JSON.parse($('#product-data').text());
  assert.deepEqual(embedded.recipes.map((recipe) => recipe.name), published.map((recipe) => recipe.name));
});

test('landing e shell protegido não entregam o preparo; sitemap omite área adquirida', async () => {
  const landing = await readFile('dist/livro-de-receitas/index.html', 'utf8');
  const protectedPage = await readFile('dist/minhas-receitas/index.html', 'utf8');
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  assert.match(landing, /Livro de receitas/);
  assert.equal(landing.includes('Misture todos os ingredientes até obter uma massa uniforme.'), false);
  assert.equal(protectedPage.includes('Misture todos os ingredientes até obter uma massa uniforme.'), false);
  assert.match(protectedPage, /noindex, nofollow/);
  assert.equal(sitemap.includes('/minhas-receitas'), false);
  assert.equal(sitemap.includes('/livro-de-receitas'), true);
  assert.equal(sitemap.includes('/7-receitas-para-ajudar-voce-a-desinflamar'), false);
  const $ = load(landing);
  assert.equal($('link[rel="canonical"]').attr('href'), 'https://gislaineduarte.com.br/livro-de-receitas');
  assert.equal($('a[href*="7-receitas-para-ajudar-voce-a-desinflamar"]').length, 0);
  const bundles = (await readdir('dist/assets')).filter((file) => file.endsWith('.js'));
  for (const bundle of bundles) {
    const source = await readFile(`dist/assets/${bundle}`, 'utf8');
    assert.equal(source.includes('Misture todos os ingredientes até obter uma massa uniforme.'), false, `preparo encontrado no bundle ${bundle}`);
  }
});
