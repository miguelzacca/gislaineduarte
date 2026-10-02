import test from 'node:test';
import assert from 'node:assert/strict';
import { plateReferenceForPlan } from '../../server/nutrition/plate-reference.js';

function planFor(dataSnapshot = {}, protein = 'grilled-chicken') {
  return {
    plateGuide: { protein: 25, carbs: 25, vegetables: 50 },
    assessment: { dataSnapshot },
    days: [{ meals: [{ items: [{ foodId: protein, grams: 100 }, { foodId: 'rice', grams: 100 }, { foodId: 'broccoli', grams: 100 }] }] }],
  };
}

test('a real plate is a labeled presentation reference even when the menu does not prescribe potato', async () => {
  const plan = planFor();
  const before = structuredClone(plan);
  const reference = await plateReferenceForPlan(plan);
  assert.equal(reference.photo.id, 'chicken-vegetables');
  assert.deepEqual([...reference.photo.buffer.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.match(reference.photo.sourceUrl, /^https:\/\/www\.pexels\.com\/photo\//);
  assert.ok(reference.photo.author);
  assert.match(reference.note, /referência de montagem/);
  assert.match(reference.note, /não representa as suas porções/);
  assert.deepEqual(plan, before);
  assert.ok(await plateReferenceForPlan(planFor({}, 'chicken')));
});

test('the plate respects vegetarian and vegan restrictions', async () => {
  for (const diet of ['vegetarian', 'vegan']) assert.equal(await plateReferenceForPlan(planFor({ diet })), null);
});

test('the plate respects exclusions and dislikes, including the other chicken preparation', async () => {
  for (const key of ['excludedFoodIds', 'dislikedFoodIds']) {
    for (const foodId of ['potato', 'chicken', 'grilled-chicken', 'carrot', 'broccoli']) {
      assert.equal(await plateReferenceForPlan(planFor({ [key]: [foodId] })), null, `${key}: ${foodId}`);
    }
  }
});

test('free-text food or seasoning restrictions suppress an unreviewed photograph', async () => {
  for (const key of ['foodExclusionNotes', 'seasoningExclusions']) {
    assert.equal(await plateReferenceForPlan(planFor({ [key]: 'Evitar alho' })), null);
    assert.ok(await plateReferenceForPlan(planFor({ [key]: '  ' })));
  }
});

test('the photograph is absent without an individualized plate guide or matching menu protein', async () => {
  const plan = planFor();
  delete plan.plateGuide;
  assert.equal(await plateReferenceForPlan(plan), null);
  assert.equal(await plateReferenceForPlan(planFor({}, 'tofu')), null);
  assert.equal(await plateReferenceForPlan(undefined), null);
});
