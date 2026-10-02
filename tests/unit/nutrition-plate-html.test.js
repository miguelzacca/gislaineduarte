import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { buildPlanHtml } from '../../server/nutrition/html.js';
import { generatePlan } from '../../src/lib/nutrition.js';
import { buildAssessment } from '../../src/lib/nutrition-journey.js';

async function plateDocument(restrictions = {}, withGuide = true) {
  const intake = { diet: 'omnivore', ...restrictions };
  const plan = generatePlan(intake);
  plan.days = [{ label: 'Segunda-feira', meals: [{ name: 'Almoço', time: '12:00', items: [
    { foodId: intake.diet === 'vegetarian' ? 'lentils' : 'chicken', grams: 100, alternatives: [] },
    { foodId: 'rice', grams: 100, alternatives: [] },
    { foodId: 'broccoli', grams: 100, alternatives: [] },
  ] }] }];
  if (withGuide) plan.plateGuide = { protein: 25, carbs: 25, vegetables: 50 };
  else delete plan.plateGuide;
  plan.assessment = buildAssessment(intake, plan);
  const html = await buildPlanHtml({ plan, patientName: 'Pessoa fictícia', id: 'plate-integration', revision: 1, draft: true });
  return parseHTML(html).document;
}

test('HTML keeps the prescribed guide and navigation when restrictions suppress the photograph', async () => {
  for (const restriction of [{ diet: 'vegetarian' }, { seasoningExclusions: 'Evitar alho' }]) {
    const document = await plateDocument(restriction);
    const section = document.getElementById('plate');
    assert.ok(section);
    assert.ok(document.querySelector('a[href="#plate"][data-plan-anchor]'));
    assert.equal(section.querySelector('img'), null);
    assert.deepEqual([...section.querySelectorAll('.plate-prescription strong')].map(node => node.textContent), ['25%', '25%', '50%']);
    assert.match(section.textContent, /Não representam percentuais de macronutrientes nem substituem os pesos prescritos/);
  }
});

test('HTML embeds the complete real plate with source, descriptive alt and portion distinction', async () => {
  const document = await plateDocument();
  const section = document.getElementById('plate');
  const photo = section.querySelector('img.real-plate-photo');
  assert.ok(photo);
  assert.match(photo.getAttribute('src'), /^data:image\/jpeg;base64,\/9j\//);
  assert.match(photo.getAttribute('alt'), /Fotografia real de uma refeição montada/);
  assert.match(photo.getAttribute('alt'), /não representam a porção prescrita/);
  assert.equal(photo.getAttribute('width'), '960');
  assert.equal(photo.getAttribute('height'), '1280');
  assert.ok(section.querySelector('a[href="https://www.pexels.com/photo/delicious-grilled-chicken-with-vegetables-on-plate-36351896/"]'));
  assert.ok(section.querySelector('a[href="https://www.pexels.com/license/"]'));
  assert.match(section.textContent, /Masuma Rahaman/);
  assert.match(section.textContent, /A foto não representa as suas porções nem os percentuais/);
  assert.equal(document.querySelector('.food-plate, .plate-photo, [data-food-plate]'), null);
});

test('HTML does not invent a plate guide when none was prescribed', async () => {
  const document = await plateDocument({}, false);
  assert.equal(document.getElementById('plate'), null);
  assert.equal(document.querySelector('a[href="#plate"]'), null);
});
