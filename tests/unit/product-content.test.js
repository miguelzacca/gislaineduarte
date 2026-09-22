import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { load } from 'cheerio';
import { buildProtectedProductPayload, buildPublicProductPreview, consolidateShoppingList, formatIngredient, recipesProduct } from '../../src/data/recipes-product.js';

test('fonte canônica tem sete receitas únicas, com ingredientes, preparo, imagens e validação', () => {
  assert.equal(recipesProduct.recipes.length, 7);
  assert.equal(new Set(recipesProduct.recipes.map((recipe) => recipe.slug)).size, 7);
  for (const recipe of recipesProduct.recipes) {
    assert.ok(recipe.ingredients.length >= 4);
    assert.ok(recipe.preparation.length >= 4);
    assert.ok(recipe.image.alt);
    assert.ok(recipe.validation.status.includes('pending'));
    assert.ok(recipe.allergenIds.length);
    assert.equal(recipe.yield, null);
  }
  assert.equal(formatIngredient(recipesProduct.recipes[0].ingredients[4]), '½ colher de chá de cúrcuma');
  assert.equal(formatIngredient(recipesProduct.recipes[4].ingredients[2]), '½ colher de chá de sal');
});

test('prévia pública não contém ingredientes/preparo, e payload adquirido contém as sete receitas', () => {
  const preview = buildPublicProductPreview();
  const payload = buildProtectedProductPayload();
  assert.equal(preview.recipes.length, 7);
  assert.equal(payload.recipes.length, 7);
  assert.equal(JSON.stringify(preview).includes('preparation'), false);
  assert.equal(JSON.stringify(preview).includes('ingredients'), false);
  assert.equal(JSON.stringify(preview).includes('validation'), false);
  assert.equal(JSON.stringify(payload).includes('src/assets/recipes'), false);
  assert.deepEqual(preview.recipes.map((recipe) => recipe.name), payload.recipes.map((recipe) => recipe.name));
  assert.equal(payload.recipes.every((recipe) => recipe.allergens.length > 0), true);
});

test('lista consolidada soma medidas iguais sem inventar quantidades a gosto', () => {
  const list = consolidateShoppingList();
  const eggs = list.find((item) => item.shoppingKey === 'eggs');
  assert.equal(eggs.quantity, 17);
  const chicken = list.find((item) => item.shoppingKey === 'chicken-to-taste');
  assert.equal(chicken.quantity, null);
  assert.equal(chicken.display, 'Frango cozido e desfiado a gosto');
  const doubled = consolidateShoppingList(recipesProduct.recipes, { 'recipe-01': 2 });
  assert.equal(doubled.find((item) => item.shoppingKey === 'eggs').quantity, 19);
});

test('HTML offline é autocontido, traz as sete receitas e não tem referências externas', async () => {
  const html = await readFile('artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar-offline.html', 'utf8');
  const $ = load(html);
  assert.equal($('.recipe').length, 7);
  assert.equal($('img[src^="data:image/"]').length, 8);
  assert.equal($('style').length, 1);
  assert.equal($('script[src],link[href^="http"],img[src^="http"],link[rel="stylesheet"]').length, 0);
  assert.match(html, /connect-src 'none'/);
  assert.equal(/\bfetch\s*\(/.test(html), false);
  assert.equal(/url\(\s*['"]?https?:\/\//i.test(html), false);
  assert.equal(/\.img_tmp_refs|instagram|reels/i.test(html), false);
  const embedded = JSON.parse($('#product-data').text());
  assert.deepEqual(embedded.recipes.map((recipe) => recipe.name), recipesProduct.recipes.map((recipe) => recipe.name));
});

test('landing e shell protegido não entregam o preparo; sitemap omite área adquirida', async () => {
  const landing = await readFile('dist/7-receitas-para-ajudar-voce-a-desinflamar/index.html', 'utf8');
  const protectedPage = await readFile('dist/minhas-receitas/index.html', 'utf8');
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  assert.match(landing, /7 receitas para ajudar você a/);
  assert.equal(landing.includes('Misture todos os ingredientes até obter uma massa uniforme.'), false);
  assert.equal(protectedPage.includes('Misture todos os ingredientes até obter uma massa uniforme.'), false);
  assert.match(protectedPage, /noindex, nofollow/);
  assert.equal(sitemap.includes('/minhas-receitas'), false);
  assert.equal(sitemap.includes('/7-receitas-para-ajudar-voce-a-desinflamar'), true);
  const bundles = (await readdir('dist/assets')).filter((file) => file.endsWith('.js'));
  for (const bundle of bundles) {
    const source = await readFile(`dist/assets/${bundle}`, 'utf8');
    assert.equal(source.includes('Misture todos os ingredientes até obter uma massa uniforme.'), false, `preparo encontrado no bundle ${bundle}`);
  }
});
