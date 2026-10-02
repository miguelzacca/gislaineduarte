import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProtectedProductPayload, recipeProducts } from '../src/data/recipes-product.js';
import { buildRecipeHtml, buildRecipePdf } from '../server/recipes/export.js';
import { generateRecipesPreview } from './generate-recipes-preview.mjs';
import sharp from 'sharp';

export async function buildRecipesProduct() {
  await mkdir(resolve('artifacts/recipes'), { recursive: true });
  await generateRecipesPreview();
  const editions = [];
  for (const product of recipeProducts) {
    const data = buildProtectedProductPayload(product);
    const name = product.id === 'receitas-glp1' ? 'receitas-glp1' : '7-receitas-para-ajudar-voce-a-desinflamar';
    editions.push({ id: product.id, name, title: product.title, recipeCount: data.recipes.length, available: data.recipes.length > 0 });
    if (!data.recipes.length) {
      // These are known generated outputs inside artifacts/recipes. Do not leave
      // an obsolete unreviewed edition behind after its contents become drafts.
      await rm(resolve('artifacts/recipes', `${name}-offline.html`), { force: true });
      await rm(resolve('artifacts/recipes', `${name}.pdf`), { force: true });
      console.log(`${product.title}: em preparação; nenhum arquivo de livro liberado.`);
      continue;
    }
    const html = await buildRecipeHtml(data);
    const pdf = await buildRecipePdf(data);
    await writeFile(resolve('artifacts/recipes', `${name}-offline.html`), html);
    await writeFile(resolve('artifacts/recipes', `${name}.pdf`), pdf);
    console.log(`${product.title}: ${data.recipes.length} receitas; HTML ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB; PDF ${(pdf.length / 1048576).toFixed(2)} MB.`);
  }
  await writeFile(resolve('artifacts/recipes/editions.json'), JSON.stringify(editions, null, 2));
  await writeFile(resolve('public/images/og-7-receitas.jpg'), await sharp(await readFile(resolve('public/images/foods/oats.jpg'))).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer());
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildRecipesProduct();
