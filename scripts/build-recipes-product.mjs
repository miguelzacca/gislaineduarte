import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProtectedProductPayload, recipeProducts, recipesProduct } from '../src/data/recipes-product.js';
import { buildRecipeHtml, buildRecipePdf } from '../server/recipes/export.js';
import { generateRecipesPreview } from './generate-recipes-preview.mjs';
import { buildProductBundle } from './lib/build-product-bundle.mjs';
import sharp from 'sharp';

export async function buildRecipesProduct() {
  await mkdir(resolve('artifacts/recipes'), { recursive: true });
  await generateRecipesPreview();
  const editions = [];
  for (const product of recipeProducts) {
    const data = buildProtectedProductPayload(product);
    const name = product.id === 'receitas-glp1' ? 'receitas-glp1' : '7-receitas-para-ajudar-voce-a-desinflamar';
    editions.push({ id: product.id, name, title: product.title, recipeCount: data.recipes.length, recipeCounts: data.recipeCounts, available: data.recipes.length > 0 });
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
    if (product.id === 'receitas-glp1') {
      await mkdir(resolve('output/pdf'), { recursive: true });
      await mkdir(resolve('output/glp1'), { recursive: true });
      await writeFile(resolve('output/pdf/a-mesa-com-glp1.pdf'), pdf);
      await writeFile(resolve('output/glp1/a-mesa-com-glp1-offline.html'), html);
      const editorialData = JSON.stringify({ ...data, editorialReview: 'pending-professional-review', kitchenTested: false }, null, 2);
      const [readme, commercial] = await Promise.all(['docs/glp1-product.md', 'docs/glp1-kit-comercial.md'].map(path => readFile(resolve(path))));
      const socialImage = await sharp(await readFile(resolve(product.hero.image.original))).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer();
      await writeFile(resolve('output/glp1/conteudo-editorial.json'), editorialData);
      await writeFile(resolve('output/glp1/LEIA-ME.md'), readme);
      await writeFile(resolve('output/glp1/kit-comercial.md'), commercial);
      await writeFile(resolve('public/images/og-glp1.jpg'), socialImage);
      const recipePhotos = await Promise.all(data.recipes.map(async recipe => ({ name: `imagens/${recipe.image.src.split('/').at(-1)}`, content: await readFile(resolve('public', `.${recipe.image.src}`)) })));
      await writeFile(resolve('output/glp1/a-mesa-com-glp1-entrega.zip'), buildProductBundle([
        { name: 'a-mesa-com-glp1.pdf', content: pdf }, { name: 'a-mesa-com-glp1-offline.html', content: html },
        { name: 'conteudo-editorial.json', content: editorialData }, { name: 'LEIA-ME.md', content: readme },
        { name: 'kit-comercial.md', content: commercial }, { name: 'capa-compartilhamento.jpg', content: socialImage }, ...recipePhotos,
      ]));
    }
    console.log(`${product.title}: ${data.recipes.length} receitas; HTML ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB; PDF ${(pdf.length / 1048576).toFixed(2)} MB.`);
  }
  await writeFile(resolve('artifacts/recipes/editions.json'), JSON.stringify(editions, null, 2));
  await writeFile(resolve('public/images/og-7-receitas.jpg'), await sharp(await readFile(resolve(recipesProduct.hero.image.original))).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer());
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildRecipesProduct();
