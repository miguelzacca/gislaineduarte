import test from 'node:test';
import assert from 'node:assert/strict';
import { patientSwapExamples } from '../../server/nutrition/swap-comparisons.js';

const item = (foodId, grams, to, toGrams) => ({ foodId, grams, alternatives: [{ foodId: to, grams: toGrams }] });
const plan = { days: [{ label: 'Segunda', meals: [{ name: 'Almoço', items: [
  item('banana', 90, 'apple', 120),
  item('papaya', 150, 'kiwi', 130),
  item('rice', 100, 'potato', 140),
  item('grilled-chicken', 110, 'white-fish', 120),
  item('beans', 90, 'lentils', 95),
] }] }] };

test('swap examples preserve exact recorded portions and meal anchors while diversifying families', () => {
  const before = structuredClone(plan);
  const result = patientSwapExamples(plan);
  assert.deepEqual(result.map(example => example.from.foodId), ['banana', 'rice', 'grilled-chicken', 'beans']);
  assert.deepEqual(result[1], { from: { foodId: 'rice', grams: 100 }, to: { foodId: 'potato', grams: 140 }, dayIndex: 0, mealIndex: 0, itemIndex: 2, dayLabel: 'Segunda', mealName: 'Almoço' });
  assert.deepEqual(patientSwapExamples(plan), result);
  assert.deepEqual(plan, before);
  assert.equal(patientSwapExamples(plan, 2).length, 2);
  assert.equal(patientSwapExamples(plan, 0).length, 0);
});

test('swap examples skip invalid options and duplicate pairs without fabricating replacements', () => {
  const valid = item('banana', 90, 'apple', 120);
  const candidate = { days: [{ label: 'Terça', meals: [{ name: 'Lanche', items: [
    item('missing-food', 90, 'apple', 120),
    item('rice', NaN, 'potato', 140),
    { foodId: 'banana', grams: 90, alternatives: [{ foodId: 'apple', grams: -1 }, { foodId: 'missing', grams: 100 }, { foodId: 'apple', grams: 120 }] },
    valid,
    item('papaya', 150, 'kiwi', 130),
  ] }] }] };
  const result = patientSwapExamples(candidate);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].to, { foodId: 'apple', grams: 120 });
  assert.equal(result[0].itemIndex, 2);
  assert.equal(result[1].from.foodId, 'papaya');
  assert.deepEqual(patientSwapExamples({ days: [] }), []);
});
