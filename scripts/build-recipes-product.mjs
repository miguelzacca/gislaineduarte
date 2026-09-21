import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  buildProtectedProductPayload,
  consolidateShoppingList,
  formatIngredient,
  recipesProduct,
} from '../src/data/recipes-product.js';
import { biography, contactLink, site } from '../src/data/site.js';
import { generateRecipesPreview } from './generate-recipes-preview.mjs';
import { buildOfflineHtml } from './lib/build-offline-recipes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = await import('sharp').catch(() => import(pathToFileURL(resolve(root, '.product-tools/node_modules/sharp/dist/index.mjs')).href)).then((module) => module.default);
const publicImages = resolve(root, 'public/images/recipes');
const artifactRoot = resolve(root, 'artifacts/recipes');
const artifactAssets = resolve(artifactRoot, 'assets');
const pdfTemp = resolve(root, 'tmp/pdfs');
const offlineFilename = '7-receitas-para-ajudar-voce-a-desinflamar-offline.html';
const pdfFilename = '7-receitas-para-ajudar-voce-a-desinflamar.pdf';

const absolute = (path) => resolve(root, path);
const toDataUri = (mime, buffer) => `data:${mime};base64,${buffer.toString('base64')}`;

async function ensureDirectories() {
  await Promise.all([publicImages, artifactRoot, artifactAssets, pdfTemp].map((directory) => mkdir(directory, { recursive: true })));
}

async function writeResponsiveImage(source, slug, widths) {
  await Promise.all(widths.flatMap((width) => [
    sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 82, smartSubsample: true }).toFile(resolve(publicImages, `${slug}-${width}.webp`)),
    sharp(source).resize({ width, withoutEnlargement: true }).avif({ quality: 61, effort: 5 }).toFile(resolve(publicImages, `${slug}-${width}.avif`)),
  ]));
}

async function prepareImages() {
  const offline = {};
  for (const recipe of recipesProduct.recipes) {
    const source = absolute(recipe.image.original);
    await writeResponsiveImage(source, recipe.slug, [480, 800, 1024]);
    await sharp(source).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(absolute(recipe.image.pdf));
    const offlineBuffer = await sharp(source).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 76, smartSubsample: true }).toBuffer();
    offline[recipe.slug] = toDataUri('image/webp', offlineBuffer);
  }

  const heroSource = absolute(recipesProduct.hero.image.original);
  await writeResponsiveImage(heroSource, 'colecao-hero', [720, 1200, 1536]);
  await sharp(heroSource).resize({ width: 1800, withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(absolute(recipesProduct.hero.image.pdf));
  const offlineHero = await sharp(heroSource).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 76, smartSubsample: true }).toBuffer();

  const portraitOutput = resolve(artifactAssets, 'gislaine-duarte.jpg');
  await sharp(resolve(root, 'src/assets/gislaine-duarte-recorte.png')).resize({ width: 900, withoutEnlargement: true }).flatten({ background: '#d8dbcd' }).jpeg({ quality: 87, mozjpeg: true }).toFile(portraitOutput);

  const socialOverlay = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#173f35" stop-opacity=".98"/><stop offset=".58" stop-color="#173f35" stop-opacity=".82"/><stop offset="1" stop-color="#173f35" stop-opacity=".08"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><path d="M70 75H610M70 555H610" stroke="#d9bf85" stroke-opacity=".65"/><text x="72" y="118" fill="#d9bf85" font-family="Arial" font-size="18" letter-spacing="4">COLEÇÃO DIGITAL DE RECEITAS</text><text x="68" y="225" fill="#f5f1e8" font-family="Georgia" font-size="68">7 receitas para</text><text x="68" y="300" fill="#f5f1e8" font-family="Georgia" font-size="68">ajudar você a</text><text x="68" y="383" fill="#a6b49a" font-family="Georgia" font-size="78" font-style="italic">desinflamar!</text><text x="72" y="515" fill="#f5f1e8" font-family="Arial" font-size="19">Gislaine Duarte · Nutricionista</text></svg>`);
  await sharp(heroSource).resize(1200, 630, { fit: 'cover', position: 'centre' }).composite([{ input: socialOverlay }]).jpeg({ quality: 88, mozjpeg: true }).toFile(resolve(root, 'public/images/og-7-receitas.jpg'));
  return { offline, offlineHero: toDataUri('image/webp', offlineHero), portraitOutput };
}

async function buildOffline(images) {
  const [editorial, editorialItalic, body, brandSvg] = await Promise.all([
    readFile(resolve(root, 'public/fonts/editorial.woff2')),
    readFile(resolve(root, 'public/fonts/editorial-italic.woff2')),
    readFile(resolve(root, 'public/fonts/body.woff2')),
    readFile(resolve(root, 'public/images/brand-mark.svg'), 'utf8'),
  ]);
  const html = buildOfflineHtml({
    data: buildProtectedProductPayload(),
    imageData: images.offline,
    heroData: images.offlineHero,
    fonts: {
      editorial: editorial.toString('base64'),
      editorialItalic: editorialItalic.toString('base64'),
      body: body.toString('base64'),
    },
    brandSvg: brandSvg.replace(/<\?xml[^>]*>/, ''),
  });
  const destination = resolve(artifactRoot, offlineFilename);
  await writeFile(destination, html, 'utf8');
  return destination;
}

function buildPdfData() {
  const protectedPayload = buildProtectedProductPayload();
  const shoppingList = consolidateShoppingList();
  return {
    ...protectedPayload,
    heroImage: recipesProduct.hero.image.pdf,
    portraitImage: 'artifacts/recipes/assets/gislaine-duarte.jpg',
    siteUrl: `${site.url}/`,
    contactUrl: contactLink(),
    authorBio: `${biography.short} ${biography.education}`,
    recipes: protectedPayload.recipes.map((recipe) => {
      const canonical = recipesProduct.recipes.find((item) => item.id === recipe.id);
      return {
        ...recipe,
        pdfImage: canonical.image.pdf,
        ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient, formatted: formatIngredient(ingredient) })),
      };
    }),
    shoppingList: shoppingList.map((ingredient) => ({ ...ingredient, formatted: formatIngredient(ingredient) })),
  };
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} terminou com código ${code}`)));
  });
}

async function buildPdf() {
  const dataFile = resolve(pdfTemp, 'recipes-product.json');
  await writeFile(dataFile, `${JSON.stringify(buildPdfData(), null, 2)}\n`, 'utf8');
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const output = resolve(artifactRoot, pdfFilename);
  await run(python, [
    resolve(root, 'scripts/build-recipes-pdf.py'),
    '--data', dataFile,
    '--output', output,
    '--root', root,
    '--editorial-font', resolve(root, 'public/fonts/editorial.woff2'),
    '--editorial-italic-font', resolve(root, 'public/fonts/editorial-italic.woff2'),
    '--body-font', resolve(root, 'public/fonts/body.woff2'),
  ]);
  return output;
}

export async function buildRecipesProduct() {
  await ensureDirectories();
  await generateRecipesPreview();
  const images = await prepareImages();
  const offline = await buildOffline(images);
  const pdf = await buildPdf();
  const [offlineBytes, pdfBytes] = await Promise.all([readFile(offline), readFile(pdf)]);
  console.log(`Produto gerado: HTML ${(offlineBytes.byteLength / 1024 / 1024).toFixed(2)} MB; PDF ${(pdfBytes.byteLength / 1024 / 1024).toFixed(2)} MB.`);
  return { offline, pdf };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildRecipesProduct();
}
