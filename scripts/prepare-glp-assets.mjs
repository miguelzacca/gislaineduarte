import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile(resolve('src/assets/glp-recipes/prompts.json'), 'utf8'));
await mkdir(resolve('public/images/glp-recipes'), { recursive: true });
for (const photo of manifest.images) {
  await sharp(await readFile(photo.source)).rotate().resize(1440, 1080, { fit: 'cover' }).jpeg({ quality: 87, mozjpeg: true }).toFile(resolve('public', `.${photo.file}`));
}
await writeFile(resolve('public/images/glp-recipes/CREDITS.md'), `# Imagens da coleção À mesa com GLP-1\n\n${manifest.images.length} imagens ilustrativas geradas com a ferramenta integrada image_gen em 4 de outubro de 2026. Não são fotografias de receitas testadas e não declaram aprovação clínica.\n\nPrompts e origem local estão em src/assets/glp-recipes/prompts.json. As cópias JPG fazem parte do projeto; os PNGs originais permanecem no diretório padrão da ferramenta.\n`);
console.log(`${manifest.images.length} imagens preparadas em public/images/glp-recipes.`);
