import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { foodById } from '../../src/data/nutrition.js';
import { foodAllowed } from '../../src/lib/nutrition.js';
import credits from '../../public/images/plates/credits.json' with { type: 'json' };

// A presentation reference may contain allowed foods outside the prescribed menu.
// A photograph does not establish the patient's portions or plate percentages.
export async function plateReferenceForPlan(plan) {
  if (!plan?.plateGuide) return null;
  const intake = plan.assessment?.dataSnapshot || {};
  // The photographed garnish cannot be checked against free-text restrictions.
  if (String(intake.foodExclusionNotes || '').trim() || String(intake.seasoningExclusions || '').trim()) return null;
  const selected = new Set(plan.days.flatMap(day => day.meals.flatMap(meal => meal.items.map(item => item.foodId))));
  const photo = credits.photos.find(item => {
    const proteinIds = item.id === 'chicken-vegetables' ? ['chicken', 'grilled-chicken'] : [];
    // Treat the two chicken preparations together when checking explicit exclusions.
    return proteinIds.some(id => selected.has(id)) &&
      [...item.requiredFoodIds, ...proteinIds].every(id => foodAllowed(foodById[id], intake));
  });
  if (!photo) return null;
  return {
    photo: { ...photo, alt: photo.caption, buffer: await readFile(resolve('public', `.${photo.file}`)) },
    groups: photo.groups,
    note: 'Fotografia de uma refeição pronta, usada como referência de montagem. Para a sua refeição, siga os alimentos, os preparos e as quantidades escritos no plano. A foto não representa as suas porções nem os percentuais abaixo.',
  };
}
