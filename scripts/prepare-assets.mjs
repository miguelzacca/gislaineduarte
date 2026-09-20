import sharp from 'sharp';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';

await mkdir('public/images', { recursive: true });
await mkdir('public/fonts', { recursive: true });
for (const [family, file, name] of [
  ['cormorant-garamond', 'cormorant-garamond-latin-wght-normal.woff2', 'editorial.woff2'],
  ['cormorant-garamond', 'cormorant-garamond-latin-wght-italic.woff2', 'editorial-italic.woff2'],
  ['manrope', 'manrope-latin-wght-normal.woff2', 'body.woff2'],
]) await copyFile(`node_modules/@fontsource-variable/${family}/files/${file}`, `public/fonts/${name}`);
for (const family of ['cormorant-garamond', 'manrope']) {
  await copyFile(`node_modules/@fontsource-variable/${family}/LICENSE`, `public/fonts/${family}-OFL.txt`);
}
const source = 'profile_foto.jpeg';
const { width, height } = await sharp(source).metadata();
// Only the generated alpha is used. Every retained RGB pixel comes from the original photograph.
const alpha = await sharp('src/assets/gislaine-cutout-mask-source.png')
  .resize(width, height, { fit: 'fill' }).extractChannel('alpha').raw().toBuffer();
const original = await sharp(source).removeAlpha().raw().toBuffer();
const cutout = await sharp(original, { raw: { width, height, channels: 3 } })
  .joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer();
await writeFile('src/assets/gislaine-duarte-recorte.png', cutout);
for (const size of [360, 540, 720, 960]) {
  await sharp(cutout).resize(size).webp({ quality: 86, alphaQuality: 95 }).toFile(`public/images/gislaine-duarte-${size}.webp`);
  await sharp(cutout).resize(size).avif({ quality: 65, effort: 6 }).toFile(`public/images/gislaine-duarte-${size}.avif`);
}
console.log(`Portrait derivatives: ${width}×${height}; original RGB pixels, generated alpha only.`);

{
  const brand = await readFile('public/images/brand-mark.svg');
  for (const size of [32, 180, 192, 512]) {
    await sharp(brand).resize(size - 12, size - 12, { fit: 'contain' }).extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#F5F1E8' }).png().toFile(`public/images/icon-${size}.png`);
  }
  const socialBase = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#173F35"/><rect x="765" width="435" height="630" fill="#D8DBCD"/><path d="M45 82H715M45 576H715" stroke="#B69A58" stroke-opacity=".5"/><text x="49" y="56" font-family="Georgia" font-size="26" fill="#F5F1E8">Gislaine Duarte</text><text x="49" y="139" font-family="Arial" font-size="13" letter-spacing="4" fill="#D9BF85">NUTRICIONISTA</text><g font-family="Georgia" font-size="72" fill="#F5F1E8"><text x="45" y="262">Um cuidado</text><text x="45" y="344">de dentro</text><text x="45" y="426" font-style="italic" fill="#D9BF85">para fora.</text></g><text x="49" y="538" font-family="Arial" font-size="17" fill="#D2D8C9">Ciência, escuta e cuidado individualizado.</text><text x="49" y="607" font-family="Arial" font-size="12" letter-spacing="2" fill="#D2D8C9">GISLAINEDUARTE.COM.BR</text></svg>`;
  const socialPortrait = await sharp(cutout).resize(485).extract({ left: 0, top: 0, width: 485, height: 620 }).toBuffer();
  const logo = await sharp(brand).resize(37, 53).png().toBuffer();
  await sharp(Buffer.from(socialBase)).composite([{ input: socialPortrait, left: 714, top: 10 }, { input: logo, left: 657, top: 18 }]).jpeg({ quality: 90 }).toFile('public/images/og-gislaine-duarte.jpg');
}
