import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { curatedImageAllowed } from '../../src/lib/nutrition-clinical.js';
import { foodById } from '../../src/data/nutrition.js';

export async function curatedImageCredit(value) {
  if (!value) return null;
  const food = Object.values(foodById).find(item => item.image === value);
  if (food?.photo) return food.photo;
  if (value.startsWith('/images/teas/')) {
    const credits = JSON.parse(await readFile(resolve('public/images/teas/credits.json'), 'utf8'));
    return credits.find(item => item.file === value) || null;
  }
  return null;
}

// Exported files embed pixels, never a live remote URL. Restricted origins and
// disabled redirects prevent authored image fields from reaching internal URLs.
export async function curatedImageBuffer(value) {
  if (!value) return null;
  if (!curatedImageAllowed(value)) throw new Error('Imagem de conteúdo inválida.');
  let buffer;
  if (value.startsWith('/images/')) buffer = await readFile(resolve('public', `.${value}`));
  else {
    const response = await fetch(value, { redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok || !/^image\/(jpeg|png|webp)/i.test(response.headers.get('content-type') || '')) throw new Error('Não foi possível carregar a imagem do conteúdo.');
    const parts = []; let size = 0;
    for await (const part of response.body) { size += part.length; if (size > 8 * 1024 * 1024) throw new Error('A imagem do conteúdo excede 8 MB.'); parts.push(part); }
    buffer = Buffer.concat(parts);
  }
  return sharp(buffer, { limitInputPixels: 25000000 }).rotate().resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
}
