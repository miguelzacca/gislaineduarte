import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { foods } from '../../src/data/nutrition.js';

test('nutrition photographs: every food uses a reviewed local photo with preserved provenance', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../public/images/foods/credits.json', import.meta.url), 'utf8'));
  assert.equal(manifest.photos.length, foods.length);
  assert.equal(new Set(manifest.photos.map(photo => photo.id)).size, foods.length);
  let totalBytes = 0;
  for (const food of foods) {
    const photo = manifest.photos.find(photo => photo.id === food.id);
    assert.ok(photo, `${food.id}: missing approved photograph`);
    assert.equal(food.photo.sourceUrl, photo.sourceUrl);
    assert.equal(food.photo.author, photo.author);
    assert.equal(food.photo.license, photo.license);
    assert.ok(photo.author.trim(), `${food.id}: attribution required`);
    assert.match(photo.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(photo.license, /^(CC BY|CC0|Public domain|PDM)/);
    assert.match(photo.licenseUrl, /^https:\/\/creativecommons\.org\//);
    assert.ok(food.photo.caption.trim().length > 10);
    assert.equal(photo.file, `/images/foods/${food.id}.jpg`);
    const bytes = await readFile(new URL(`../../public${photo.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), photo.sha256, `${food.id}: photograph changed without updating the reviewed manifest`);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.width, 640); assert.equal(metadata.height, 480);
    assert.equal(bytes.length, photo.bytes); assert.ok(bytes.length <= 55000, `${food.id}: optimize for offline delivery`);
    totalBytes += bytes.length;
  }
  // Base64 adds 33%; reserve space for the embedded fonts and interactive document.
  assert.ok(totalBytes < 3000000, 'Keep the complete gallery suitable for a self-contained serverless download.');
});
