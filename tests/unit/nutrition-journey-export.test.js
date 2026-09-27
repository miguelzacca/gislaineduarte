import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { generatePlan } from '../../src/lib/nutrition.js';
import { buildAssessment, formatFoodPortion } from '../../src/lib/nutrition-journey.js';
import { buildPlanHtml } from '../../server/nutrition/export.js';
import { assessmentSections, mealVisualData } from '../../server/nutrition/presentation.js';
import { publicOffer, sanitizePhotos } from '../../server/nutrition/service.js';

test('delivery summary and portion quantities retain calculation provenance without private record fields', async () => {
  const intake = { weight: 80, height: 175, age: 38, sex: 'male', activity: 1.2, goal: 'muscle', diet: 'omnivore', clinicalNotes: 'PRIVATE_RECORD', medications: 'PRIVATE_MEDICATION', photos: [{ dataUrl: 'PRIVATE_PHOTO' }] };
  const plan = generatePlan(intake);
  plan.targets.protein = 120;
  plan.assessment = { summary: 'Rotina e porções combinadas.', criteria: 'Fator proteico escolhido e revisado pela profissional.', calculationInput: { weight: 80, proteinRatio: 1.5 } };
  plan.assessment = buildAssessment(intake, plan, '2026-09-27T15:00:00.000Z');
  const sections = assessmentSections(plan);
  const html = await buildPlanHtml({ plan, patientName: 'Pessoa de exemplo', id: 'export-test', revision: 1, draft: true });
  for (const secret of ['PRIVATE_RECORD', 'PRIVATE_MEDICATION', 'PRIVATE_PHOTO']) assert.ok(!html.includes(secret));
  assert.ok(sections.some(section => section.lines.some(line => line.includes('120 g/dia') && line.includes('peso (kg) × fator'))));
  assert.ok(html.includes(formatFoodPortion('egg', 50)));
  assert.ok(html.includes('Diagrama proporcional à massa'));
  assert.ok(html.includes('Mesma escala: 0 a'));
  const visual = mealVisualData([{ foodId: 'egg', grams: 100 }, { foodId: 'rice', grams: 200 }]);
  assert.equal(visual.grams, 300);
  assert.ok(visual.max >= visual.values.carbs && visual.max >= visual.values.protein);
});

test('optional food photos reject mismatched content and remove EXIF metadata on re-encoding', async () => {
  const jpeg = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#bb8866' } }).withMetadata({ orientation: 1 }).jpeg().toBuffer();
  const [photo] = await sanitizePhotos([{ name: 'secret patient name.jpg', type: 'image/jpeg', purpose: 'food-context', dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}` }]);
  const metadata = await sharp(Buffer.from(photo.dataUrl.split(',')[1], 'base64')).metadata();
  assert.equal(metadata.exif, undefined); assert.equal(photo.name, 'Foto opcional da alimentação');
  await assert.rejects(sanitizePhotos([{ type: 'image/jpeg', purpose: 'food-context', dataUrl: 'data:image/jpeg;base64,AAAA' }]));
  await assert.rejects(sanitizePhotos([{ ...photo, type: 'image/png' }]));
  await assert.rejects(sanitizePhotos([photo, photo, photo]));
});

test('public offers expose Bristol availability without the administrative review identity', () => {
  const offer = publicOffer({ title: 'Consulta', published: true, bristolReviewed: true, bristolReviewedBy: 'private-admin-user', bristolReviewedAt: '2026-09-27T12:00:00Z', otherPrivateField: 'private' });
  assert.equal(offer.bristolReviewed, true);
  assert.equal(offer.bristolReviewedBy, undefined);
  assert.equal(offer.bristolReviewedAt, undefined);
  assert.equal(offer.otherPrivateField, undefined);
});

test('public calculation records preserve ratios and entered factor precision', () => {
  const sections = assessmentSections({ assessment: { summary: 'Exemplo', criteria: 'Revisado', calculations: [{ label: 'Razão', value: .84, unit: 'razão', method: 'Método informado', formula: 'cintura / quadril', inputs: [{ label: 'Fator', value: 1.25, unit: 'g/kg' }], source: { title: 'Dados informados' } }] } });
  const line = sections.find(section => section.title === 'Cálculos registrados').lines[0];
  assert.ok(line.includes('0,84 razão')); assert.ok(line.includes('Fator 1,25 g/kg'));
});
