import assert from 'node:assert/strict';
import test from 'node:test';
import { foodById, planTemplates } from '../../src/data/nutrition.js';
import { bristolTypes, curatedContentIdeas } from '../../src/data/nutrition-journey.js';
import { clinicalAlerts, foodAllowed, generatePlan, intakeErrors, sanitizeIntake, validatePlan } from '../../src/lib/nutrition.js';
import { assessmentApprovalErrors, buildAssessment, createCalculationRecords, curatedModuleAllowed, formatFoodPortion, moduleEligibility, searchPlanTemplates } from '../../src/lib/nutrition-journey.js';

const intake = { name: 'Pessoa Fictícia', email: 'person@example.com', phone: '47999990000', age: 30, weight: 70, height: 170, sex: 'female', activity: 1.2, goal: 'muscle', diet: 'omnivore', conditions: [], allergies: [], symptoms: [], excludedFoodIds: [], pregnant: false, consent: true };

test('journey intake: distinct conditional answers are required without making optional photos or Bristol mandatory', () => {
  assert.deepEqual(intakeErrors(intake), {});
  const errors = intakeErrors({ ...intake, conditions: ['other', 'glp1'], intolerances: ['other'], medicationUse: true });
  for (const key of ['otherConditionDetails', 'glp1Details', 'intoleranceNotes', 'medications']) assert.ok(errors[key]);
  const complete = { ...intake, conditions: ['other', 'glp1'], otherConditionDetails: 'Condição relatada em consulta', glp1Details: 'Substância informada pela pessoa', medicationUse: true, medications: 'Medicamento informado', intolerances: ['other'], intoleranceNotes: 'Reação informada', bristolType: 7 };
  assert.deepEqual(intakeErrors(complete), {});
  for (const value of [0, 8, '3', 1.5]) assert.ok(intakeErrors({ ...intake, bristolType: value }).bristolType);
  assert.ok(intakeErrors({ ...intake, photos: [{ name: 'refeicao.jpg', type: 'image/jpeg', purpose: 'food-context', dataUrl: 'data:image/jpeg;base64,YWJj' }] }).photosConsent);
  assert.ok(intakeErrors({ ...intake, photos: [{ name: 'rosto.jpg', type: 'image/jpeg', purpose: 'face', dataUrl: 'data:image/jpeg;base64,YWJj' }], photosConsent: true }).photos);
});

test('journey intake: sanitizer preserves intentional health fields and removes unexpected photo metadata', () => {
  const clean = sanitizeIntake({ ...intake, likedFoodIds: ['apple', 'apple'], dislikedFoodIds: ['banana'], intolerances: ['lactose'], seasoningPreferences: '  manjericão  ', avoidReadySeasonings: true, bristolType: 3, photosConsent: true, photos: [{ name: ' refeicao.jpg ', type: 'image/jpeg', purpose: 'food-context', dataUrl: 'data:image/jpeg;base64,YWJj', gps: 'private location' }] });
  assert.deepEqual(clean.likedFoodIds, ['apple']); assert.deepEqual(clean.dislikedFoodIds, ['banana']);
  assert.equal(clean.seasoningPreferences, 'manjericão'); assert.equal(clean.bristolType, 3);
  assert.equal(clean.photos[0].name, 'refeicao.jpg'); assert.equal('gps' in clean.photos[0], false);
});

test('journey intake: free-text food exclusions remain separate from dislikes and are retained for professional review', () => {
  const person = { ...intake, dislikes: 'Não gosto de sabores amargos', foodExclusionNotes: '  Excluir alimento ainda fora do catálogo  ' };
  assert.deepEqual(intakeErrors(person), {});
  assert.ok(intakeErrors({ ...person, foodExclusionNotes: 'x'.repeat(2001) }).foodExclusionNotes);
  assert.ok(intakeErrors({ ...person, foodExclusionNotes: ['invalid'] }).foodExclusionNotes);
  const clean = sanitizeIntake(person);
  assert.equal(clean.dislikes, person.dislikes);
  assert.equal(clean.foodExclusionNotes, 'Excluir alimento ainda fora do catálogo');
  assert.ok(clinicalAlerts({ ...intake, foodExclusionNotes: clean.foodExclusionNotes }).some(alert => alert.id === 'restrictions'));
  assert.equal(buildAssessment(clean, generatePlan(clean)).dataSnapshot.foodExclusionNotes, clean.foodExclusionNotes);
});

test('journey restrictions: milk allergy, lactose intolerance, dislikes and explicit exclusions remain distinct but block incompatible choices', () => {
  assert.equal(foodAllowed(foodById.yogurt, { ...intake, intolerances: ['lactose'] }), false);
  assert.equal(foodAllowed(foodById.yogurt, { ...intake, allergies: ['milk'] }), false);
  const person = { ...intake, intolerances: ['lactose'], dislikedFoodIds: ['banana'], excludedFoodIds: ['apple'], likedFoodIds: ['banana', 'apple'] };
  const plan = generatePlan(person);
  assert.deepEqual(validatePlan(plan, person), []);
  for (const day of plan.days) for (const meal of day.meals) for (const item of meal.items) for (const entry of [item, ...item.alternatives]) assert.equal(foodAllowed(foodById[entry.foodId], person), true);
  plan.days[0].meals[0].items[0].alternatives.push({ foodId: 'banana', grams: 70 });
  assert.ok(validatePlan(plan, person).some(error => error.includes('incompatível')));
});

test('journey library: search combines objective, context and accent-independent words for base and custom models', () => {
  assert.equal(searchPlanTemplates(planTemplates, { query: 'hipertrofia diabetes', goal: 'muscle', profile: 'diabetes' }).length, 3);
  assert.equal(searchPlanTemplates(planTemplates, { query: 'GLP-1', goal: 'weight-management', profile: 'glp1' }).length, 3);
  assert.equal(searchPlanTemplates(planTemplates, { goal: 'muscle', profile: 'renal' }).length, 0);
  assert.equal(searchPlanTemplates([{ id: 'custom', title: 'Rotina pós-consulta', profile: 'diabetes', goals: ['muscle'], tags: ['hipertrofia'] }], { query: 'pos consulta hipertrofia', goal: 'muscle' }).length, 1);
});

test('journey portions: egg counts and units are explicit while grams remain authoritative', () => {
  assert.equal(formatFoodPortion('egg', 100), 'Quantidade: 100 g · Medida caseira: ≈ 2 unidades (1 unidade ≈ 50 g)');
  assert.match(formatFoodPortion('egg', 75), /75 g.*1,5 unidades.*50 g/);
  assert.match(formatFoodPortion('brown-rice', 100), /4 colheres de sopa.*25 g/);
  assert.doesNotMatch(formatFoodPortion('egg', 50), /×|inteiro/);
  assert.equal(formatFoodPortion('unknown', 50), 'Quantidade não informada');
});

test('journey assessment: recorded calculations are recomputed, have units and source, and never inferred when absent', () => {
  const plan = generatePlan(intake); plan.targets.protein = 105;
  assert.deepEqual(buildAssessment(intake, plan).calculations, []);
  plan.assessment = { summary: 'Plano organizado para sua rotina.', criteria: 'Metas avaliadas individualmente.', calculationInput: { ...intake, proteinRatio: 1.5, waterRatio: 30, energy: 1800, carbPercent: 45, fatPercent: 30 }, calculations: [{ id: 'bmi', value: 999 }] };
  const assessment = buildAssessment(intake, plan, '2026-09-27T12:00:00.000Z');
  assert.equal(assessment.calculations.find(record => record.id === 'bmi').value, 24.2);
  assert.equal(assessment.calculations.find(record => record.id === 'resting').value, 1452);
  assert.equal(assessment.calculations.find(record => record.id === 'protein').value, 105);
  assert.equal(assessment.calculations.find(record => record.id === 'water').value, 2100);
  assert.equal(assessment.targetSources.protein.calculationId, 'protein');
  for (const record of assessment.calculations) { assert.ok(record.method); assert.ok(record.formula); assert.ok(record.unit); assert.ok(record.source.title); assert.ok(record.inputs.every(input => input.unit)); }
  assert.equal('email' in assessment.calculationInput, false); assert.equal('name' in assessment.dataSnapshot, false);
  plan.targets.protein = 110;
  assert.equal(buildAssessment(intake, plan).targetSources.protein.calculationId, null);
  assert.match(buildAssessment(intake, plan).targetSources.protein.method, /Definida pela nutricionista/);
  assert.equal(createCalculationRecords({ ...intake, sex: 'unspecified' }).some(record => ['resting', 'expenditure'].includes(record.id)), false);
  assert.deepEqual(createCalculationRecords({ ...intake, weight: -1 }), []);
});

test('journey curation: incompatible ingredients and unreviewed modules cannot reach approval', () => {
  const plan = generatePlan(intake);
  assert.equal(assessmentApprovalErrors(plan, intake).length, 2);
  plan.assessment.summary = 'Seu plano considera a rotina que você relatou.';
  plan.assessment.criteria = 'Metas definidas em avaliação profissional individual.';
  const recipe = { ...curatedContentIdeas.find(idea => idea.id === 'recipe-bowl') };
  plan.curatedModules = [recipe];
  assert.ok(assessmentApprovalErrors(plan, intake).some(error => error.includes('módulo')));
  assert.equal(curatedModuleAllowed(recipe, { ...intake, allergies: ['milk'] }), false);
  assert.ok(moduleEligibility(recipe, { ...intake, intolerances: ['lactose'] }).some(reason => reason.includes('incompatível')));
  recipe.reviewed = true;
  assert.deepEqual(assessmentApprovalErrors(plan, intake), []);
  assert.ok(assessmentApprovalErrors(plan, { ...intake, allergies: ['milk'] }).some(error => error.includes('incompatível')));
  const celiacTemplate = generatePlan(intake, 'celiac-pratica'); celiacTemplate.curatedModules = [recipe];
  assert.ok(validatePlan(celiacTemplate, intake).some(error => error.includes('Módulo incompatível')));
});

test('journey Bristol: seven descriptive options remain neutral until professional review', () => {
  assert.deepEqual(bristolTypes.map(option => option.type), [1, 2, 3, 4, 5, 6, 7]);
  for (const option of bristolTypes) { assert.ok(option.description); assert.doesNotMatch(option.description, /diagnóstico|normal|doença|diabetes|desidratação/i); }
});
