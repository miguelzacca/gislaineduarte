import { foodById } from '../../src/data/nutrition.js';
import { foodExchangeRole } from '../../src/lib/nutrition.js';

const validOption = option => option && Object.hasOwn(foodById, option.foodId) && Number.isFinite(option.grams) && option.grams >= 1 && option.grams <= 1500;

// These are examples of recorded alternatives, not new dietary recommendations.
export function patientSwapExamples(plan, limit = 4) {
  const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 4;
  if (!count || !Array.isArray(plan?.days)) return [];
  const candidates = [];
  const pairs = new Set();
  plan.days.forEach((day, dayIndex) => {
    if (!Array.isArray(day?.meals)) return;
    day.meals.forEach((meal, mealIndex) => {
      if (!Array.isArray(meal?.items)) return;
      meal.items.forEach((item, itemIndex) => {
        if (!validOption(item) || !Array.isArray(item.alternatives)) return;
        const alternative = item.alternatives.find(option => validOption(option) && option.foodId !== item.foodId);
        if (!alternative) return;
        const from = { foodId: item.foodId, grams: item.grams };
        const to = { foodId: alternative.foodId, grams: alternative.grams };
        const pair = JSON.stringify([from, to]);
        if (pairs.has(pair)) return;
        pairs.add(pair);
        candidates.push({
          family: foodExchangeRole(item.foodId) || foodById[item.foodId].group,
          example: { from, to, dayIndex, mealIndex, itemIndex, dayLabel: day.label, mealName: meal.name },
        });
      });
    });
  });
  const chosen = [];
  const families = new Set();
  for (const candidate of candidates) {
    if (families.has(candidate.family)) continue;
    families.add(candidate.family);
    chosen.push(candidate);
    if (chosen.length === count) break;
  }
  if (chosen.length < count) for (const candidate of candidates) {
    if (!chosen.includes(candidate)) chosen.push(candidate);
    if (chosen.length === count) break;
  }
  return chosen.map(({ example }) => example);
}
