import { allergies, conditions, foodById, planTemplates, symptoms } from '../../src/data/nutrition.js';
import { goalOptions } from '../../src/data/nutrition-journey.js';
import { assistantContext, assistantTemplateOptions } from '../../src/lib/nutrition-assistant.js';
import { validatePlan } from '../../src/lib/nutrition.js';
import { NutritionError } from './service.js';
import { chatActionLabels } from '../../src/lib/nutrition-chat.js';
const steps = ['Vamos nos conhecer', 'Seu momento, seu objetivo', 'Um olhar para sua saúde', 'Sua alimentação e rotina', 'Revisão e envio'];
const views = ['panel', 'patients', 'templates', 'foods', 'calculators', 'library', 'settings', 'plan', 'intake', 'assessment', 'delivery', 'followup', 'history', 'nutrition-landing', 'nutrition-status', 'home'];

// The page supplies structured application state, never a scrape of the DOM.
// Reject arbitrary categories before they can become automatic provider context.
export function safeChatIntake(input = {}) {
  const clean = {};
  for (const [key, allowed] of Object.entries({ goal: goalOptions.map(item => item.id), diet: ['omnivore', 'vegetarian', 'vegan'], teaHabit: ['daily', 'sometimes', 'interested', 'dislike'] })) {
    if (allowed.includes(input[key])) clean[key] = input[key];
  }
  for (const [key, allowed] of Object.entries({ conditions: conditions.map(item => item.id), allergies: allergies.map(item => item.id), symptoms: symptoms.map(item => item.id), intolerances: ['lactose', 'other'], likedFoodIds: Object.keys(foodById), dislikedFoodIds: Object.keys(foodById), excludedFoodIds: Object.keys(foodById) })) {
    clean[key] = Array.isArray(input[key]) ? [...new Set(input[key].filter(id => allowed.includes(id)))].slice(0, 100) : [];
  }
  for (const key of ['pregnant', 'medicationUse', 'avoidReadySeasonings']) if (typeof input[key] === 'boolean') clean[key] = input[key];
  if (Number.isInteger(input.bristolType) && input.bristolType >= 1 && input.bristolType <= 7) clean.bristolType = input.bristolType;
  return clean;
}

export function chatMessages(input) {
  if (!Array.isArray(input) || !input.length || input.length > 12 || input.at(-1)?.role !== 'user') throw new NutritionError('Envie uma mensagem para conversar com a assistente.');
  if (input.some(item => !['user', 'assistant'].includes(item?.role) || typeof item.content !== 'string' || !item.content.trim() || item.content.length > 3000)) throw new NutritionError('Use mensagens de até 3.000 caracteres.');
  return input.map(({ role, content }) => ({ role, content: content.trim() }));
}

export function chatPageContext(page = {}, { intake, plan, scope, customTemplates = [] } = {}) {
  const safe = safeChatIntake(intake || page.intake);
  if (scope === 'professional' && goalOptions.some(item => item.id === page.goal)) safe.goal = page.goal;
  const view = views.includes(page.view) ? page.view : scope === 'professional' ? 'panel' : 'nutrition-landing';
  const context = { scope, view, ...assistantContext(safe) };
  if (scope === 'intake') {
    const step = Number.isInteger(page.step) && page.step >= 0 && page.step < steps.length ? page.step : null;
    context.formStep = step === null ? null : { index: step, title: steps[step] };
    context.formHelp = 'A anamnese tem cinco etapas: contato; objetivo e medidas; saúde, medicamentos, alergias e sintomas; alimentação e rotina; revisão e autorização de atendimento. Fotos e Bristol são opcionais. Não inventar respostas, diagnósticos nem medidas. Não enviar o formulário pela pessoa.';
    return context;
  }
  context.availableActions = Object.keys(chatActionLabels).filter(id => Array.isArray(page.actions) && page.actions.includes(id));
  if (typeof page.professionalRequest === 'string' && page.professionalRequest.length <= 800) context.professionalRequest = page.professionalRequest.trim();
  if (typeof page.search === 'string' && page.search.length <= 200) context.search = page.search.trim();
  context.templates = assistantTemplateOptions(safe, customTemplates).slice(0, 30).map(item => ({ id: item.id, name: item.custom ? 'Modelo profissional salvo' : item.name, goal: item.goal, profile: item.profile, description: item.custom ? 'Estrutura reutilizável da profissional' : item.description }));
  if (view === 'templates' && Array.isArray(page.visibleTemplateIds)) context.visibleTemplates = [...planTemplates, ...customTemplates].filter(item => page.visibleTemplateIds.slice(0, 30).includes(item.id)).map(item => ({ id: item.id, name: item.title ? 'Modelo profissional salvo' : item.name, goal: item.goal, profile: item.profile }));
  if (view === 'foods' && Array.isArray(page.visibleFoodIds)) context.visibleFoods = page.visibleFoodIds.slice(0, 30).filter(id => foodById[id]).map(id => {
    const food = foodById[id];
    const grams = page.foodPortion === 'household' ? food.portionGrams : 100;
    return { id, name: food.name, grams, nutrients: Object.fromEntries(['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'potassium', 'phosphorus'].map(key => [key, food[key] === null ? null : Math.round(food[key] * grams) / 100])) };
  });
  const selected = [...planTemplates, ...customTemplates].find(item => item.id === page.templateId);
  if (selected) context.selectedTemplate = { id: selected.id, name: selected.title ? 'Modelo profissional salvo' : selected.name };
  if (plan) {
    let complete = false;
    try { complete = validatePlan(plan, intake).length === 0; } catch { /* Partial edits can still be explained by the chat. */ }
    const entries = value => Array.isArray(value) ? value : [];
    context.plan = {
      complete,
      targets: Object.fromEntries(['energy', 'protein', 'carbs', 'fat', 'water', 'sodium', 'potassium', 'phosphorus'].map(key => [key, Number.isFinite(plan.targets?.[key]) && plan.targets[key] > 0 && plan.targets[key] <= 10000 ? plan.targets[key] : null])),
      days: entries(plan.days).slice(0, 7).map((day, d) => ({ day: d, meals: entries(day?.meals).slice(0, 8).map((meal, m) => ({
        meal: m, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(meal?.time) ? meal.time : null,
        foods: entries(meal?.items).slice(0, 15).map(item => ({ id: foodById[item?.foodId] ? item.foodId : null, name: foodById[item?.foodId]?.name, grams: Number.isFinite(item?.grams) && item.grams >= 1 && item.grams <= 1500 ? item.grams : null })),
      })) })),
    };
    if (!complete) context.plan.reviewNeeded = 'Há campos incompletos ou incompatíveis no rascunho em edição. Ajude a identificar o que falta usando apenas os dados válidos; não trate os totais como uma prescrição pronta.';
  }
  return context;
}
