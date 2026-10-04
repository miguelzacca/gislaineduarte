import assert from 'node:assert/strict';
import test from 'node:test';
import { foodById } from '../../src/data/nutrition.js';
import { goalOptions } from '../../src/data/nutrition-journey.js';
import { dayTotals, foodAllowed, generatePlan, intakeErrors, recommendedTemplate, validatePlan } from '../../src/lib/nutrition.js';
import { applyAssistantMeals, assistantMealCatalogue, assistantTemplateOptions } from '../../src/lib/nutrition-assistant.js';
import { analyzeWithNim, defaultNimModel, draftWithNim, fallbackNimModel } from '../../server/nutrition/ai.js';

const person = { name: 'Pessoa Fictícia', email: 'demo@example.com', phone: '47999990000', age: 32, weight: 70, height: 170, sex: 'female', activity: 1.2, aiConsent: true, consent: true, goal: 'muscle', diet: 'omnivore', conditions: [], allergies: [], symptoms: [], excludedFoodIds: [], pregnant: false };
const env = { NVIDIA_NIM_API_KEY: 'test-only-key' };
const analysisReply = (id = 'muscle-pratica') => ({ summary: 'Base prática para distribuir refeições.', templateIds: [id], recommendations: [{ templateId: id, reason: 'Base com o objetivo solicitado.' }], questions: ['Conferir horários do treino.'], actions: ['Revisar as porções.'] });
const response = content => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] });
const choices = (intake, plan) => assistantMealCatalogue(intake, plan).days.flatMap(day => day.meals.map(meal => ({ day: day.day, meal: meal.meal, moduleId: meal.options[1] || 'current' })));

test('objectives have named bases and defaults; GLP-1 is never inferred from the objective', () => {
  for (const goal of ['muscle', 'weight-management', 'weight-gain']) {
    const intake = { ...person, goal };
    assert.equal(intakeErrors(intake).goal, undefined);
    assert.match(recommendedTemplate(intake), new RegExp(`^${goal}-`));
    const first = assistantTemplateOptions(intake)[0];
    assert.equal(first.goal, goal);
    assert.ok(first.name.includes(goalOptions.find(item => item.id === goal).label));
    assert.equal(assistantTemplateOptions(intake).some(item => item.profile !== 'balanced'), false);
  }
  const clinical = { ...person, goal: 'weight-management', conditions: ['glp1'] };
  assert.equal(recommendedTemplate(clinical), 'glp1-fracionada');
  assert.equal(assistantTemplateOptions(clinical)[0].id, 'glp1-fracionada');
  assert.equal(assistantTemplateOptions({ ...person, conditions: ['renal'] })[0].profile, 'renal');
});

test('analysis explains its choices and sends the objective without identity, patient prose or saved titles', async () => {
  let context;
  const analysis = await analyzeWithNim({ ...person, medications: 'private-medicine', routine: 'private-routine' }, { env, customTemplates: [{ id: 'custom-base', title: 'private-title', profile: 'balanced', goals: ['muscle'] }], fetcher: async (_url, init) => {
    const body = JSON.parse(init.body); assert.equal(body.model, defaultNimModel); context = JSON.parse(body.messages[1].content);
    return response(analysisReply());
  } });
  assert.equal(context.goal, 'muscle'); assert.match(context.goalLabel, /Hipertrofia/);
  assert.equal(context.templates.some(item => item.profile === 'glp1'), false);
  for (const value of [person.name, person.email, person.phone, 'private-medicine', 'private-routine', 'private-title']) assert.ok(!JSON.stringify(context).includes(value));
  assert.equal(analysis.recommendations[0].templateId, 'muscle-pratica');
  await assert.rejects(analyzeWithNim(person, { env, fetcher: async () => response(analysisReply('glp1-pratica')) }), /validação/);
});

test('the weekly assembly covers every slot, preserves work and calculates portions locally', async () => {
  const intake = { ...person, allergies: ['milk'], dislikedFoodIds: ['banana'], excludedFoodIds: ['salmon'] };
  const plan = generatePlan(intake); plan.targets.energy = 2200; plan.targets.protein = 120;
  plan.clinicalNotes = 'private-clinical-note'; plan.guidance = 'Orientação profissional'; plan.assessment.summary = 'Texto já escrito';
  const before = structuredClone(plan); let sent;
  const result = await draftWithNim(intake, plan, { env, fetcher: async (_url, init) => {
    sent = JSON.parse(JSON.parse(init.body).messages[1].content);
    return response({ summary: 'Semana completa com preparos práticos.', questions: [], actions: [], meals: choices(intake, plan) });
  } });
  assert.deepEqual(plan, before); assert.deepEqual(result.suggestion.targets, plan.targets);
  assert.equal(result.suggestion.clinicalNotes, plan.clinicalNotes); assert.deepEqual(result.suggestion.assessment, plan.assessment);
  assert.equal(sent.goal, 'muscle'); assert.ok(!JSON.stringify(sent).includes('private-clinical-note'));
  assert.equal(sent.targetsDefinedByDietitian.protein, 120);
  assert.equal(result.suggestion.days.length, 7); assert.deepEqual(validatePlan(result.suggestion, intake), []);
  for (const day of result.suggestion.days) {
    assert.ok(Math.abs(dayTotals(day).kcal - 2200) < 15);
    for (const meal of day.meals) for (const item of meal.items) for (const food of [item, ...item.alternatives]) assert.equal(foodAllowed(foodById[food.foodId], intake), true);
  }
});

test('incomplete, duplicate, hallucinated or incompatible meals never mutate the original', () => {
  const intake = { ...person, diet: 'vegan' }; const plan = generatePlan(intake); const before = structuredClone(plan);
  const valid = choices(intake, plan);
  for (const invalid of [valid.slice(1), valid.map((choice, index) => index === 1 ? valid[0] : choice), valid.map((choice, index) => index === 0 ? { ...choice, moduleId: 'breakfast-bread' } : choice), valid.map((choice, index) => index === 0 ? { ...choice, moduleId: 'lunch-lentil-bowl' } : choice)]) {
    assert.throws(() => applyAssistantMeals(intake, plan, invalid)); assert.deepEqual(plan, before);
  }
  const candidate = applyAssistantMeals(intake, plan, valid);
  assert.deepEqual(validatePlan(candidate, intake), []);
});

test('provider overload uses one free fallback, reserving both calls; 429 has no fallback', async () => {
  let reservations = 0; const models = [];
  const analysis = await analyzeWithNim(person, { env, beforeRequest: () => { reservations++; }, fetcher: async (_url, init) => {
    models.push(JSON.parse(init.body).model);
    return models.length === 1 ? new Response('Overloaded', { status: 503 }) : response(analysisReply());
  } });
  assert.deepEqual(models, [defaultNimModel, fallbackNimModel]); assert.equal(reservations, 2); assert.equal(analysis.model, fallbackNimModel);
  let calls = 0; let blocked;
  await assert.rejects(analyzeWithNim(person, { env, beforeRequest: () => { calls++; }, onRateLimited: seconds => { blocked = seconds; }, fetcher: async () => new Response('Limited', { status: 429, headers: { 'Retry-After': '17' } }) }), error => error.status === 429 && error.retryAfter === 17);
  assert.equal(calls, 1); assert.equal(blocked, 17);
  await assert.rejects(analyzeWithNim({ ...person, aiConsent: false }, { env, fetcher: async () => { throw new Error('Must not call'); } }), /não autorizou/);
});
