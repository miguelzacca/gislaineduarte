import test from 'node:test';
import assert from 'node:assert/strict';
import { bmiInterpretation, skinfoldEvaluation, skinfoldInputErrors, plateGuideErrors, curatedImageAllowed } from '../../src/lib/nutrition-clinical.js';
import { buildAssessment, calculationInputErrors, createCalculationRecords, journeyPlanErrors } from '../../src/lib/nutrition-journey.js';
import { mealVisualData } from '../../server/nutrition/presentation.js';

test('clinical: BMI uses unrounded adult thresholds and older-specific SISVAN limits', () => {
  const bmi = (value, age = 35) => bmiInterpretation({ weight: value * 4, height: 200, age });
  assert.equal(bmi(24.99).label, 'Faixa adequada');
  assert.equal(bmi(25).label, 'Sobrepeso');
  assert.equal(bmi(22, 60).label, 'Baixo peso');
  assert.equal(bmi(22.01, 60).label, 'Adequado');
  assert.equal(bmi(27, 60).label, 'Sobrepeso');
  assert.equal(bmi(23, 19).bands.length, 0);
  assert.equal(bmiInterpretation({ weight: 75, height: 170, age: 35, pregnant: true }).bands.length, 0);
});

test('clinical: energy requires supported ages, sex and non-pregnant context; selected factor is explicit', () => {
  const input = { weight: 70, height: 170, age: 30, sex: 'female', activity: 1.4 };
  assert.equal(createCalculationRecords(input).find(row => row.id === 'expenditure').value, 2032);
  for (const override of [{ age: 18 }, { age: 79 }, { pregnant: true }, { sex: 'unspecified' }]) assert.equal(createCalculationRecords({ ...input, ...override }).some(row => row.id === 'resting'), false);
  assert.equal(createCalculationRecords({ weight: 70, height: 170 }).find(row => row.id === 'bmi').value, 24.2);
  assert.equal(createCalculationRecords({ waist: 84, hip: 100 }).find(row => row.id === 'waistHip').value, .84);
  assert.ok(calculationInputErrors({ activity: 2.6 }).length);
  const plan = { assessment: { summary: 'Resumo', criteria: 'Critérios', calculationInput: { ...input, pregnant: false } }, targets: {} };
  assert.equal(buildAssessment({ pregnant: true }, plan).calculations.some(row => row.id === 'resting'), false);
});

test('clinical: JP3 computes sex-specific density and Siri only with complete plausible measurements', () => {
  const input = { weight: 70, age: 35, sex: 'female', skinfoldMethod: 'jackson-pollock-3', measurementDate: '2026-10-01', skinfolds: { triceps: 20, suprailiac: 18, thigh: 25 } };
  const result = skinfoldEvaluation(input);
  assert.equal(result.sum, 63); assert.ok(Math.abs(result.density - 1.0411961) < 1e-9);
  assert.equal(result.bodyFat, 25.4); assert.equal(result.fatMass, 17.8); assert.equal(result.leanMass, 52.2);
  const male = skinfoldEvaluation({ ...input, sex: 'male', age: 30, skinfolds: { chest: 10, abdomen: 20, thigh: 15 } });
  assert.ok(Math.abs(male.density - 1.0676965) < 1e-9); assert.equal(male.bodyFat, 13.6);
  for (const override of [{ pregnant: true }, { age: 56 }, { measurementDate: '2026-02-30' }, { skinfolds: { triceps: 20 } }]) { assert.ok(skinfoldInputErrors({ ...input, ...override }).length); assert.equal(skinfoldEvaluation({ ...input, ...override }), null); }
  assert.ok(journeyPlanErrors({ assessment: { summary: '', criteria: '', calculationInput: input } }, { pregnant: true }).length);
  assert.deepEqual(createCalculationRecords({ weight: 70 }).filter(row => /Mass|Density|BodyFat/.test(row.id)), []);
});

test('clinical: food-group guide is distinct from macro grams and unsafe content images are rejected', () => {
  const guide = { protein: 25, carbs: 25, vegetables: 50 };
  assert.deepEqual(plateGuideErrors(guide), []); assert.ok(plateGuideErrors({ ...guide, carbs: 50 }).length);
  const visual = mealVisualData([{ foodId: 'chicken', grams: 100 }, { foodId: 'rice', grams: 100 }, { foodId: 'broccoli', grams: 100 }], guide);
  assert.deepEqual(visual.plateGuide, guide); assert.equal(visual.portions.length, 3); assert.ok(visual.portions.every(part => part.foodId && !part.path));
  assert.equal(mealVisualData([{ foodId: 'egg', grams: 50 }], guide).plateGuide, null);
  for (const value of ['file:///secret.jpg', 'https://localhost/x.jpg', '/images/../secret.jpg', 'data:image/png;base64,abcd', 'https://images.unsplash.com@evil.example/x']) assert.equal(curatedImageAllowed(value), false);
  assert.equal(curatedImageAllowed('/images/teas/chamomile.jpg'), true);
});
