import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { load } from 'cheerio';
import { foods, foodById, planTemplates } from '../../src/data/nutrition.js';
import { calculateAnthropometry, clinicalAlerts, dayTotals, foodAllowed, generatePlan, intakeErrors, scalePlanEnergy, shoppingList, substituteFood, validatePlan } from '../../src/lib/nutrition.js';
import { seal, unseal } from '../../server/nutrition/store.js';
import { analyzeWithNim, suggestWithNim } from '../../server/nutrition/ai.js';
import { buildPlanHtml, buildPlanPdf } from '../../server/nutrition/export.js';

const intake = { name: 'Pessoa Fictícia', email: 'test@example.com', phone: '47999990000', age: 32, weight: 70, height: 170, sex: 'female', goal: 'wellbeing', activity: 1.2, diet: 'omnivore', conditions: [], allergies: [], symptoms: [], excludedFoodIds: [], pregnant: false, consent: true, aiConsent: true };
test('nutrition: TACO catalogue includes source, valid local image and independently checked staple composition', async () => {
  assert.equal(foods.length, 60);
  assert.equal(new Set(foods.map(food => food.id)).size, 60);
  assert.equal(foodById['olive-oil'].tacoId, 260); assert.equal(foodById['olive-oil'].kcal, 884); assert.equal(foodById['olive-oil'].fat, 100);
  assert.equal(foodById['brown-rice'].kcal, 124); assert.equal(foodById['brown-rice'].sodium, 1); assert.equal(foodById['brown-rice'].potassium, 75);
  assert.equal(foodById.chicken.protein, 31.5); assert.equal(foodById.beans.fiber, 8.5);
  for (const food of foods) { assert.ok(food.sourcePage >= 29); assert.ok(food.sourceName); assert.ok(food.portionGrams > 0); assert.ok((await readFile(`public${food.image}`)).length > 1000); }
});
test('nutrition: adult calculations use units and reject invalid/missing input', () => {
  const result = calculateAnthropometry({ weight: 70, height: 170, age: 30, sex: 'female', activity: 1.2, usualWeight: 80, waist: 80, hip: 100, bodyFat: 20 });
  assert.equal(result.bmi, 24.2); assert.equal(result.resting, 1452); assert.equal(result.expenditure, 1742); assert.equal(result.leanMass, 56); assert.equal(result.weightChangePercent, 12.5); assert.equal(result.waistHip, .8);
  assert.equal(calculateAnthropometry({ ...intake, height: 1.7 }), null);
  assert.equal(calculateAnthropometry({ ...intake, age: 15 }), null);
  assert.equal(calculateAnthropometry({ ...intake, activity: 5 }), null);
  assert.equal(calculateAnthropometry({ ...intake, sex: 'unspecified' }).resting, null);
});
test('nutrition: intake requires consent and valid structured health input, with optional AI consent', () => {
  assert.deepEqual(intakeErrors(intake), {});
  assert.deepEqual(intakeErrors({ ...intake, aiConsent: false }), {});
  assert.ok(intakeErrors({ ...intake, consent: false }).consent);
  assert.ok(intakeErrors({ ...intake, allergies: ['unknown'] }).allergies);
  assert.ok(intakeErrors({ ...intake, allergies: ['milk'] }).allergyNotes);
  assert.ok(intakeErrors({ ...intake, name: '<'.repeat(101) }).name);
});
test('nutrition: all 36 bases and combinations of restrictions yield compatible drafts', () => {
  assert.equal(planTemplates.length, 36);
  for (const template of planTemplates) for (const diet of ['omnivore', 'vegan', 'vegetarian']) {
    const person = { ...intake, diet, conditions: ['celiac', 'lactose', template.profile], allergies: ['nuts', 'fish'], excludedFoodIds: ['banana'] };
    const plan = generatePlan(person, template.id);
    assert.deepEqual(validatePlan(plan, person), [], `${template.id}/${diet}`);
    assert.equal(plan.days.length, 7); assert.equal(plan.targets.energy, null);
    for (const day of plan.days) for (const meal of day.meals) for (const item of meal.items) assert.equal(foodAllowed(foodById[item.foodId], person), true);
  }
});
test('nutrition: validation catches prohibited alternatives, invalid weights, meals and target injection', () => {
  const person = { ...intake, conditions: ['celiac'] }; const plan = generatePlan(person);
  plan.days[0].meals[0].items[0].alternatives.push({ foodId: 'bread', grams: 25 });
  assert.ok(validatePlan(plan, person).some(message => message.includes('incompatível')));
  plan.days[0].meals[0].items[0].grams = -10;
  assert.ok(validatePlan(plan, person).some(message => message.includes('Porções')));
  plan.days[0] = null; assert.ok(validatePlan(plan, person).length);
  assert.ok(validatePlan(null).length);
});
test('nutrition: substitution, daily scaling and shopping reflect actual weights without silently prescribing goals', () => {
  const plan = generatePlan(intake);
  const old = dayTotals(plan.days[0]).kcal;
  const adjusted = scalePlanEnergy(plan, 1800);
  assert.notEqual(old, 1800); assert.equal(plan.targets.energy, null);
  for (const day of adjusted.days) assert.ok(Math.abs(dayTotals(day).kcal - 1800) < 15);
  const sub = substituteFood({ foodId: 'chicken', grams: 100 }, 'white-fish', 'protein');
  assert.ok(Math.abs(sub.grams * foodById['white-fish'].protein / 100 - 31.5) < .1);
  assert.equal(substituteFood({ foodId: 'chicken', grams: 100 }, 'olive-oil', 'protein'), null);
  const shopping = shoppingList(plan); const egg = shopping.find(item => item.food.id === 'egg');
  assert.equal(egg.grams, 350);
  assert.ok(dayTotals(plan.days[0]).missing.includes('sodium'));
});
test('nutrition: clinical review catches renal/oncology/GLP-1, severe symptoms and target discrepancies', () => {
  const plan = generatePlan(intake); plan.targets.energy = 3000; plan.targets.water = 2000;
  const ids = clinicalAlerts({ ...intake, conditions: ['renal', 'oncology', 'glp1'], symptoms: ['severe-pain'] }, plan).map(alert => alert.id);
  for (const id of ['individual', 'renal', 'oncology', 'glp1', 'fluid', 'symptoms', 'energy']) assert.ok(ids.includes(id));
});
test('nutrition: health data encrypted with authenticated encryption, wrong key/tampering fails', () => {
  const env = { NUTRITION_DATA_KEY: randomBytes(32).toString('base64') };
  const a = seal(intake, env); const b = seal(intake, env);
  assert.notEqual(a, b); assert.ok(!a.includes(intake.name)); assert.deepEqual(unseal(a, env), intake);
  assert.throws(() => unseal(a, { NUTRITION_DATA_KEY: randomBytes(32).toString('base64') }));
  const fields = a.split('.'); fields[2] = randomBytes(16).toString('base64url'); assert.throws(() => unseal(fields.join('.'), env));
});
test('nutrition: NIM minimizes patient data, honors consent and rejects unsafe/invalid responses', async () => {
  const person = { ...intake, medications: 'private medicine', routine: 'private routine' }; const plan = generatePlan(person);
  const env = { NVIDIA_NIM_API_KEY: 'test-only-key' }; let sent;
  const fetcher = async (_url, init) => { sent = JSON.parse(init.body); return Response.json({ choices: [{ message: { content: JSON.stringify({ swaps: [{ day: 0, meal: 0, item: 2, foodId: 'apple' }] }) } }] }); };
  const candidate = await suggestWithNim(person, plan, { env, fetcher });
  assert.deepEqual(validatePlan(candidate, person), []);
  assert.equal(candidate.days[0].meals[0].items[2].foodId, 'apple');
  assert.ok(Math.abs(dayTotals(candidate.days[0]).kcal - dayTotals(plan.days[0]).kcal) < 2);
  for (const sensitive of [person.name, person.email, person.phone, person.medications, person.routine]) assert.ok(!JSON.stringify(sent).includes(sensitive));
  assert.equal(sent.chat_template_kwargs.enable_thinking, false);
  await assert.rejects(suggestWithNim({ ...person, aiConsent: false }, plan, { env, fetcher }), /não autorizou/);
  await assert.rejects(suggestWithNim(person, plan, { env, fetcher: async () => new Response('limited', { status: 429 }) }), /limite/);
  for (const foodId of ['hallucinated-food', 'chicken', 'papaya']) {
    await assert.rejects(suggestWithNim(person, plan, { env, fetcher: async () => Response.json({ choices: [{ message: { content: JSON.stringify({ swaps: [{ day: 0, meal: 0, item: 2, foodId }] }) } }] }) }), /descartada/);
  }
  await assert.rejects(analyzeWithNim(person, { env, fetcher: async () => Response.json({ choices: [{ message: { content: '{"summary":"ok","templateIds":["fake"],"questions":[],"actions":[]}' } }] }) }), /validação/);
});
test('nutrition: offline HTML embeds fonts/images, escapes patient text and never exports clinical notes', async () => {
  const plan = generatePlan(intake); plan.clinicalNotes = 'PRIVATE CLINICAL HISTORY'; plan.guidance = '<script>alert(1)</script> & orientação';
  const html = await buildPlanHtml({ plan, patientName: '<img src=x onerror=alert(1)>', id: 'test-offline', revision: 2, draft: true });
  const $ = load(html);
  assert.equal($('script').length, 1);
  assert.ok($('symbol image').length > 10);
  assert.equal($('symbol image').toArray().every(element => $(element).attr('href').startsWith('data:image/jpeg;base64,')), true);
  for (const element of $('use').toArray()) assert.equal($($(element).attr('href')).length, 1);
  assert.ok(html.includes('data:font/woff2;base64,')); assert.ok(!html.includes('PRIVATE CLINICAL HISTORY'));
  assert.ok(html.includes('&lt;script&gt;')); assert.equal($('img[src=x]').length, 0);
  assert.ok($('meta[http-equiv="Content-Security-Policy"]').attr('content').includes("connect-src 'none'"));
  const script = $('script').text(); assert.ok(!/fetch\(|XMLHttpRequest|https?:\/\//.test(script));
  const hash = createHash('sha256').update(script).digest('base64'); assert.ok(html.includes(`sha256-${hash}`));
  assert.equal($('[data-day]').length, 7); assert.equal($('.day').length, 7); assert.ok($('[data-shop]').length > 10);
  assert.doesNotThrow(() => new Function(script));
});
test('nutrition: PDF is a real downloadable document with embedded font and images', async () => {
  const pdf = await buildPlanPdf({ plan: generatePlan(intake), patientName: 'Pessoa Fictícia', id: 'test-pdf', revision: 1, draft: true });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-'); assert.ok(pdf.length > 100000);
  assert.ok(pdf.toString('latin1').includes('/Subtype /Image')); assert.ok(pdf.toString('latin1').includes('/FontFile2'));
});
