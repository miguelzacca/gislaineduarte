import { randomUUID } from 'node:crypto';
import { clinicalProfiles, foodById, planTemplates } from '../../src/data/nutrition.js';
import { curatedContentIdeas } from '../../src/data/nutrition-journey.js';
import { teaIdeas } from '../../src/data/nutrition-teas.js';
import { dayTotals, generatePlan, validatePlan } from '../../src/lib/nutrition.js';
import { curatedImageAllowed } from '../../src/lib/nutrition-clinical.js';
import { NutritionError } from './service.js';
import { seal, unseal } from './store.js';

const emptyIntake = { conditions: [], allergies: [], excludedFoodIds: [], diet: 'omnivore', symptoms: [] };
const allowedGoals = ['wellbeing', 'weight-management', 'muscle', 'clinical'];
export function reusablePlan(plan, profile, { fromPatient = false } = {}) {
  // Editorial models retain reusable labels; patient-derived models retain no free text.
  return { title: 'Seu plano alimentar', templateId: `${profile}-pratica`,
    days: plan.days.map((day, index) => ({ label: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][index], meals: day.meals.map((meal, mi) => ({ name: fromPatient ? `Refeição ${mi + 1}` : meal.name || `Refeição ${mi + 1}`, time: meal.time, note: fromPatient ? '' : meal.note || '', items: meal.items.map(item => ({ foodId: item.foodId, grams: item.grams, alternatives: item.alternatives.map(alt => ({ foodId: alt.foodId, grams: alt.grams })) })) })) })),
    targets: { energy: null, protein: null, carbs: null, fat: null, water: null, sodium: null, potassium: null, phosphorus: null },
    guidance: 'Siga as porções e os preparos combinados em atendimento.', clinicalNotes: '', review: {}, version: 2,
    assessment: { summary: '', criteria: '', calculationInput: null }, curatedModules: [],
  };
}
export function templateMetadata(row, env) {
  const plan = unseal(row.plan_encrypted, env);
  const daily = plan.days.map(dayTotals);
  return { id: row.id, title: row.title, profile: row.profile, goals: row.goals, tags: row.tags, revision: row.revision || 1,
    meals: plan.days[0].meals.length, kcal: Math.round(daily.reduce((sum, day) => sum + day.kcal, 0) / daily.length),
    images: [...new Set(plan.days[0].meals.flatMap(meal => meal.items.map(item => foodById[item.foodId]?.image)).filter(Boolean))].slice(0, 3) };
}
export async function readTemplates(db, env) {
  const result = await db.query('SELECT id,title,profile,goals,tags,revision,plan_encrypted FROM nutrition_templates ORDER BY created_at DESC LIMIT 300');
  return result.rows.map(row => templateMetadata(row, env));
}
export async function templateDetail(db, id, env) {
  const builtin = planTemplates.find(item => item.id === id);
  if (builtin) return { ...builtin, title: builtin.name, plan: generatePlan(emptyIntake, id), builtin: true };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new NutritionError('Modelo não encontrado.', 404);
  const row = (await db.query('SELECT * FROM nutrition_templates WHERE id=$1', [id])).rows[0];
  if (!row) throw new NutritionError('Modelo não encontrado.', 404);
  return { ...templateMetadata(row, env), plan: unseal(row.plan_encrypted, env), builtin: false };
}
export async function saveTemplate(db, input, env) {
  if (typeof input.title !== 'string' || input.title.trim().length < 3 || input.title.length > 120 || !clinicalProfiles.some(item => item.id === input.profile)) throw new NutritionError('Informe nome e contexto do modelo.');
  if (!Array.isArray(input.goals) || input.goals.length > 4 || input.goals.some(goal => !allowedGoals.includes(goal))) throw new NutritionError('Confira os objetivos do modelo.');
  const errors = validatePlan(input.plan, emptyIntake);
  if (errors.length) throw new NutritionError(errors[0], 422);
  const plan = reusablePlan(input.plan, input.profile);
  const profileErrors = validatePlan(plan, emptyIntake);
  if (profileErrors.length) throw new NutritionError(profileErrors[0], 422);
  const id = input.id || randomUUID();
  if (input.id) {
    if (!Number.isInteger(input.revision)) throw new NutritionError('Reabra o modelo para editar a versão atual.', 409);
    const updated = await db.query('UPDATE nutrition_templates SET title=$1,profile=$2,goals=$3,plan_encrypted=$4,revision=revision+1 WHERE id=$5 AND revision=$6 RETURNING id', [input.title.trim(), input.profile, JSON.stringify([...new Set(input.goals)]), seal(plan, env), id, input.revision]);
    if (!updated.rowCount) throw new NutritionError('O modelo mudou em outra aba. Reabra antes de salvar.', 409);
  } else await db.query('INSERT INTO nutrition_templates (id,title,profile,goals,tags,plan_encrypted) VALUES ($1,$2,$3,$4,$5,$6)', [id, input.title.trim(), input.profile, JSON.stringify([...new Set(input.goals)]), '[]', seal(plan, env)]);
  return templateDetail(db, id, env);
}
const validImage = curatedImageAllowed;
export async function readContentLibrary(db) {
  const row = (await db.query('SELECT curated_library, library_revision FROM nutrition_settings WHERE id=1')).rows[0];
  return { modules: row?.curated_library || [...curatedContentIdeas.filter(item => item.type !== 'tea'), ...teaIdeas], revision: row?.library_revision || 0 };
}
export async function saveContentLibrary(db, body) {
  if (!Number.isInteger(body.revision) || !Array.isArray(body.modules) || body.modules.length > 200) throw new NutritionError('Confira a biblioteca de conteúdos.');
  const ids = new Set();
  const modules = body.modules.map(item => {
    if (!item || typeof item.id !== 'string' || item.id.length > 80 || ids.has(item.id) || !['recipe', 'food', 'seasoning', 'tea', 'supplement'].includes(item.type) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120 || typeof item.content !== 'string' || !item.content.trim() || item.content.length > 3000 || !validImage(item.image)) throw new NutritionError('Cada conteúdo precisa de título, texto e imagem válida quando informada.');
    ids.add(item.id);
    if (!Array.isArray(item.foodIds) || item.foodIds.some(id => !foodById[id]) || !Array.isArray(item.allergens) || item.allergens.some(id => !['milk','egg','fish','shellfish','nuts','peanut','soy','gluten','lactose'].includes(id))) throw new NutritionError('Confira os ingredientes e alérgenos do conteúdo.');
    return { id: item.id, type: item.type, title: item.title.trim(), content: item.content.trim(), image: item.image || '', foodIds: [...new Set(item.foodIds)], allergens: [...new Set(item.allergens)], requiresIngredientReview: true, reviewed: false };
  });
  const result = await db.query('UPDATE nutrition_settings SET curated_library=$1,library_revision=library_revision+1 WHERE id=1 AND library_revision=$2 RETURNING library_revision', [JSON.stringify(modules), body.revision]);
  if (!result.rowCount) throw new NutritionError('A biblioteca mudou em outra aba. Recarregue antes de salvar.', 409);
  return { modules, revision: result.rows[0].library_revision };
}
