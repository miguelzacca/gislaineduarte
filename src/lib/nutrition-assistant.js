import { clinicalProfiles, foodById, mealModules, planTemplates } from '../data/nutrition.js';
import { goalOptions } from '../data/nutrition-journey.js';
import { foodAllowed, normalizeText, recommendedTemplate, round, scalePlanEnergy, sumItems, suggestSubstitutions, validatePlan } from './nutrition.js';

export const assistantContextVersion = 2;

export function assistantTemplateOptions(intake, custom = []) {
  const preferred = recommendedTemplate(intake);
  const priorityProfile = planTemplates.find(item => item.id === preferred)?.profile;
  const contexts = new Set(['balanced', ...(intake.conditions || [])]);
  return [...planTemplates, ...custom.map(item => ({ ...item, name: item.title, custom: true }))]
    .filter(item => contexts.has(item.profile) && (item.profile !== 'balanced' || !item.goals?.length || !intake.goal || item.goals.includes(intake.goal)))
    .sort((a, b) => score(b) - score(a))
    .map(item => ({ ...item, reason: reason(item) }));

  function score(item) {
    return (item.id === preferred ? 100 : 0) + (priorityProfile !== 'balanced' && item.profile === priorityProfile ? 40 : 0) + (item.goal === intake.goal ? 20 : 0) + (intake.diet === 'vegan' && item.diet === 'vegan' ? 10 : 0);
  }
  function reason(item) {
    const goal = goalOptions.find(goal => goal.id === intake.goal)?.label || 'a rotina informada';
    const context = clinicalProfiles.find(profile => profile.id === item.profile);
    if (item.profile !== 'balanced') return `${context?.name || 'Contexto informado'} foi registrado na anamnese. Esta base organiza ${item.meals || 5} refeições; ajuste a composição para ${goal.toLowerCase()}.`;
    return `${item.meals || 5} refeições para ${goal.toLowerCase()}. ${item.description || 'Estrutura salva por você, com restrições a conferir ao aplicar.'}`;
  }
}

// Only structured categories leave the application. Identity, patient prose,
// photographs, medication names and anthropometric measurements stay local.
export function assistantContext(intake) {
  const keys = ['goal', 'diet', 'conditions', 'allergies', 'intolerances', 'symptoms', 'pregnant', 'medicationUse', 'likedFoodIds', 'dislikedFoodIds', 'excludedFoodIds', 'teaHabit', 'bristolType', 'avoidReadySeasonings'];
  return { ...Object.fromEntries(keys.filter(key => intake[key] !== undefined).map(key => [key, intake[key]])), goalLabel: goalOptions.find(goal => goal.id === intake.goal)?.label };
}

export function mealType(meal) {
  const name = normalizeText(meal.name);
  if (/cafe|desjejum/.test(name)) return 'breakfast';
  if (/almoco/.test(name)) return 'lunch';
  if (/jantar/.test(name)) return 'dinner';
  if (/ceia/.test(name)) return 'supper';
  if (/lanche/.test(name)) return 'snack';
  const hour = Number(meal.time?.split(':')[0]);
  return hour < 9 ? 'breakfast' : hour < 12 ? 'snack' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : hour < 21 ? 'dinner' : 'supper';
}

export function assistantMealCatalogue(intake, plan) {
  const template = planTemplates.find(item => item.id === plan.templateId);
  const constraints = { ...intake, ...(template?.diet ? { diet: template.diet } : {}), conditions: [...new Set([...(intake.conditions || []), ...(template ? [template.profile] : [])])] };
  const modules = mealModules.filter(module => module.items.every(([id]) => foodAllowed(foodById[id], constraints)));
  return { constraints, modules, days: plan.days.map((day, d) => ({ day: d, meals: day.meals.map((meal, m) => ({
    meal: m, type: mealType(meal), time: meal.time, items: meal.items.map(({ foodId, grams }) => ({ foodId, grams })),
    totals: sumItems(meal.items), options: ['current', ...modules.filter(module => module.type === mealType(meal)).map(module => module.id)],
  })) })) };
}

export function applyAssistantMeals(intake, plan, selections) {
  const { constraints, modules } = assistantMealCatalogue(intake, plan);
  const expected = plan.days.reduce((count, day) => count + day.meals.length, 0);
  if (!Array.isArray(selections) || selections.length !== expected) throw new Error('A IA precisa organizar todas as refeições dos sete dias.');
  let candidate = structuredClone(plan);
  candidate.review = {};
  const seen = new Set();
  for (const choice of selections) {
    if (!choice || ![choice.day, choice.meal].every(Number.isInteger) || choice.day < 0 || choice.meal < 0) throw new Error('Índice de refeição inválido.');
    const key = `${choice.day}-${choice.meal}`;
    const meal = candidate.days[choice.day]?.meals[choice.meal];
    if (!meal || seen.has(key)) throw new Error('Refeição inexistente ou repetida.');
    seen.add(key);
    if (choice.moduleId === 'current') continue;
    const module = modules.find(module => module.id === choice.moduleId && module.type === mealType(meal));
    if (!module) throw new Error('Preparação incompatível com a refeição ou as restrições.');
    const originalEnergy = sumItems(meal.items).kcal;
    const moduleEnergy = sumItems(module.items.map(([foodId, grams]) => ({ foodId, grams }))).kcal;
    const ratio = originalEnergy > 0 && moduleEnergy > 0 ? originalEnergy / moduleEnergy : 1;
    const items = module.items.map(([foodId, grams]) => ({ foodId, grams: round(grams * ratio), alternatives: [] }));
    for (const item of items) item.alternatives = suggestSubstitutions(item, constraints, { excludeFoodIds: items.map(item => item.foodId), limit: 2 }).map(({ foodId, grams }) => ({ foodId, grams }));
    meal.items = items;
    // Replace known catalogue instructions when the recipe changes, while
    // preserving any independently entered professional note for review.
    const catalogueNote = mealModules.some(item => item.note && item.note === meal.note);
    meal.note = !meal.note || catalogueNote ? module.note || '' : [meal.note, module.note && `Preparo desta sugestão: ${module.note}`].filter(Boolean).join('\n').slice(0, 1000);
  }
  if (candidate.targets.energy) candidate = scalePlanEnergy(candidate, candidate.targets.energy);
  const errors = validatePlan(candidate, constraints);
  if (errors.length) throw new Error(errors[0]);
  return candidate;
}
