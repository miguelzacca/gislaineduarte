import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicProductPreview } from '../src/data/recipes-product.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'src/generated/recipes-product-preview.js');

export async function generateRecipesPreview() {
  const preview = buildPublicProductPreview();
  const source = [
    '/** Arquivo gerado. Edite src/data/recipes-product.js e execute npm run product:preview. */',
    `export const recipesProductPreview = Object.freeze(${JSON.stringify(preview, null, 2)});`,
    '',
  ].join('\n');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, source, 'utf8');
  return destination;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = await generateRecipesPreview();
  console.log(`Prévia pública gerada em ${output}`);
}

