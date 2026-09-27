import { activityLevels, allergies, conditions, foodById, foods, mealModules, nutrients, planTemplates, symptoms } from '../data/nutrition.js';
import { intolerances } from '../data/nutrition-journey.js';
import { journeyPlanErrors } from './nutrition-journey.js';

export const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
export const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function calculateAnthropometry({ weight, height, age, sex, activity = 1.2, usualWeight, waist, hip, bodyFat }) {
  weight = Number(weight); height = Number(height); age = Number(age); activity = Number(activity);
  if (![weight, height, age, activity].every(Number.isFinite) || weight < 25 || weight > 350 || height < 120 || height > 230 || age < 18 || age > 100 || !activityLevels.some(level => level.value === activity)) return null;
  const bmi = weight / (height / 100) ** 2;
  const resting = ['female', 'male'].includes(sex) ? 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161) : null;
  return {
    bmi: round(bmi), resting: resting === null ? null : Math.round(resting), expenditure: resting === null ? null : Math.round(resting * activity),
    weightChangePercent: Number(usualWeight) >= 25 && Number(usualWeight) <= 350 ? round((Number(usualWeight) - weight) / Number(usualWeight) * 100) : null,
    waistHip: Number(waist) > 30 && Number(hip) > 30 ? round(Number(waist) / Number(hip), 2) : null,
    waistHeight: Number(waist) > 30 ? round(Number(waist) / height, 2) : null,
    leanMass: Number(bodyFat) > 0 && Number(bodyFat) < 70 ? round(weight * (1 - Number(bodyFat) / 100)) : null,
  };
}

export function intakeErrors(input) {
  const errors = {};
  const selected = (key, value) => Array.isArray(input?.[key]) && input[key].includes(value);
  if (typeof input?.name !== 'string' || input.name.trim().length < 3 || input.name.length > 100) errors.name = 'Informe seu nome completo.';
  if (typeof input?.email !== 'string' || input.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.email)) errors.email = 'Confira seu e-mail.';
  if (!/^\+?[\d\s().-]{10,22}$/.test(input?.phone || '') || String(input.phone).replace(/\D/g, '').length < 10) errors.phone = 'Informe seu telefone com DDD.';
  if (!Number.isInteger(Number(input?.age)) || Number(input.age) < 18 || Number(input.age) > 100) errors.age = 'Este formulário é para adultos de 18 a 100 anos. Para outras idades, converse com Gislaine.';
  if (!['female', 'male', 'unspecified'].includes(input?.sex)) errors.sex = 'Selecione uma opção.';
  for (const [key, min, max] of [['weight', 25, 350], ['height', 120, 230]]) if (!Number.isFinite(Number(input?.[key])) || Number(input[key]) < min || Number(input[key]) > max) errors[key] = key === 'weight' ? 'Informe o peso em kg, entre 25 e 350.' : 'Informe a altura em cm, entre 120 e 230.';
  if (!activityLevels.some(level => level.value === Number(input?.activity))) errors.activity = 'Selecione seu nível de atividade.';
  if (!['wellbeing', 'weight-management', 'muscle', 'clinical'].includes(input?.goal)) errors.goal = 'Selecione seu objetivo.';
  if (!['omnivore', 'vegetarian', 'vegan'].includes(input?.diet)) errors.diet = 'Selecione seu padrão alimentar.';
  for (const [key, options] of [['conditions', conditions], ['allergies', allergies], ['symptoms', symptoms]]) {
    if (!Array.isArray(input?.[key]) || input[key].length > options.length || input[key].some(value => !options.some(option => option.id === value))) errors[key] = 'Confira as opções selecionadas.';
  }
  for (const key of ['medications', 'clinicalNotes', 'routine', 'preferences', 'dislikes', 'foodExclusionNotes', 'allergyNotes', 'glp1Details', 'weightHistory', 'sleep', 'bowel', 'budget', 'otherConditionDetails', 'intoleranceNotes', 'seasoningPreferences', 'seasoningExclusions']) {
    if (input?.[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 2000)) errors[key] = 'Use até 2.000 caracteres.';
  }
  if (Array.isArray(input?.allergies) && input.allergies.length && (typeof input?.allergyNotes !== 'string' || !input.allergyNotes.trim())) errors.allergyNotes = 'Descreva os alimentos e as reações para a nutricionista.';
  if (selected('conditions', 'other') && !String(input.otherConditionDetails || '').trim()) errors.otherConditionDetails = 'Descreva a outra condição para a nutricionista.';
  if (selected('conditions', 'glp1') && !String(input.glp1Details || '').trim()) errors.glp1Details = 'Informe qual medicamento ou substância GLP-1 utiliza.';
  if (input?.medicationUse !== undefined && typeof input.medicationUse !== 'boolean') errors.medicationUse = 'Confira a informação sobre medicamentos.';
  if (input?.medicationUse === true && !String(input.medications || '').trim()) errors.medications = 'Informe quais medicamentos ou substâncias utiliza.';
  if (input?.intolerances !== undefined && (!Array.isArray(input.intolerances) || input.intolerances.length > intolerances.length || input.intolerances.some(id => !intolerances.some(option => option.id === id)))) errors.intolerances = 'Confira as intolerâncias selecionadas.';
  if (selected('intolerances', 'other') && !String(input.intoleranceNotes || '').trim()) errors.intoleranceNotes = 'Descreva a outra intolerância.';
  if (!Array.isArray(input?.excludedFoodIds) || input.excludedFoodIds.length > foods.length || input.excludedFoodIds.some(id => !foodById[id])) errors.excludedFoodIds = 'Confira os alimentos excluídos.';
  for (const key of ['likedFoodIds', 'dislikedFoodIds']) if (input?.[key] !== undefined && (!Array.isArray(input[key]) || input[key].length > foods.length || input[key].some(id => !foodById[id]))) errors[key] = 'Confira os alimentos selecionados.';
  for (const key of ['avoidReadySeasonings', 'photosConsent']) if (input?.[key] !== undefined && typeof input[key] !== 'boolean') errors[key] = 'Confira a opção selecionada.';
  if (input?.bristolType !== undefined && input.bristolType !== null && (!Number.isInteger(input.bristolType) || input.bristolType < 1 || input.bristolType > 7)) errors.bristolType = 'Selecione um tipo de 1 a 7 ou deixe sem resposta.';
  if (input?.photos !== undefined) {
    if (!Array.isArray(input.photos) || input.photos.length > 2 || input.photos.some(photo => !photo || typeof photo.name !== 'string' || !photo.name.trim() || photo.name.length > 100 || photo.type !== 'image/jpeg' || photo.purpose !== 'food-context' || typeof photo.dataUrl !== 'string' || photo.dataUrl.length > 245783 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.dataUrl))) errors.photos = 'Anexe até duas fotos JPEG de alimentos ou refeições, com até 180 KB cada.';
    if (input.photos?.length && input.photosConsent !== true) errors.photosConsent = 'Autorize o uso opcional das fotos para contextualizar sua alimentação.';
  }
  if (typeof input?.pregnant !== 'boolean') errors.pregnant = 'Confira a informação sobre gestação ou amamentação.';
  if (input?.consent !== true) errors.consent = 'É necessário autorizar o uso destes dados para o seu atendimento.';
  if (input?.aiConsent !== undefined && typeof input.aiConsent !== 'boolean') errors.aiConsent = 'Confira a autorização opcional de IA.';
  return errors;
}

export function sanitizeIntake(input) {
  const result = {};
  for (const key of ['name', 'email', 'phone', 'sex', 'goal', 'diet', 'medications', 'clinicalNotes', 'routine', 'preferences', 'dislikes', 'foodExclusionNotes', 'allergyNotes', 'glp1Details', 'weightHistory', 'sleep', 'bowel', 'budget', 'otherConditionDetails', 'intoleranceNotes', 'seasoningPreferences', 'seasoningExclusions']) result[key] = String(input[key] || '').trim();
  result.email = result.email.toLowerCase();
  for (const key of ['age', 'weight', 'height', 'activity']) result[key] = Number(input[key]);
  for (const key of ['conditions', 'allergies', 'symptoms', 'excludedFoodIds', 'intolerances', 'likedFoodIds', 'dislikedFoodIds']) result[key] = [...new Set(input[key] || [])];
  result.pregnant = input.pregnant === true; result.consent = true; result.aiConsent = input.aiConsent === true;
  result.medicationUse = input.medicationUse === true || Boolean(result.medications);
  result.avoidReadySeasonings = input.avoidReadySeasonings === true;
  result.bristolType = Number.isInteger(input.bristolType) ? input.bristolType : null;
  result.photosConsent = input.photosConsent === true;
  result.photos = (input.photos || []).map(({ name, type, dataUrl, purpose }) => ({ name: name.trim(), type, dataUrl, purpose }));
  return result;
}

export function foodAllowed(food, intake = {}) {
  if (!food || !Array.isArray(food.allergens)) return false;
  const restricted = new Set(intake.allergies || []);
  if (intake.conditions?.includes('celiac')) restricted.add('gluten');
  if (intake.conditions?.includes('lactose') || intake.intolerances?.includes('lactose')) restricted.add('lactose');
  return !food.allergens.some(allergen => restricted.has(allergen)) &&
    !(intake.diet === 'vegan' && !food.vegan) && !(intake.diet === 'vegetarian' && !food.vegetarian) &&
    !intake.excludedFoodIds?.includes(food.id) && !intake.dislikedFoodIds?.includes(food.id);
}

export function sumItems(items = []) {
  const result = Object.fromEntries(nutrients.map(key => [key, 0]));
  const missing = new Set();
  for (const item of items) {
    const food = foodById[item.foodId];
    if (!food || !Number.isFinite(Number(item.grams))) continue;
    for (const key of nutrients) {
      // NA for fibre in meat/egg/oil is structurally zero; other absent data stays visible.
      if (food[key] === null && key !== 'fiber') missing.add(key);
      result[key] += (food[key] || 0) * Number(item.grams) / 100;
    }
  }
  return { ...Object.fromEntries(Object.entries(result).map(([key, value]) => [key, round(value)])), missing: [...missing] };
}
export function dayTotals(day) { return sumItems(day.meals.flatMap(meal => meal.items)); }
export function shoppingList(plan) {
  const amounts = new Map();
  for (const day of plan.days) for (const meal of day.meals) for (const item of meal.items) amounts.set(item.foodId, (amounts.get(item.foodId) || 0) + Number(item.grams));
  return [...amounts].map(([foodId, grams]) => ({ food: foodById[foodId], grams: round(grams) })).sort((a, b) => a.food.group.localeCompare(b.food.group, 'pt-BR'));
}
export function substituteFood(item, replacementId, basis = 'kcal') {
  const original = foodById[item.foodId]; const replacement = foodById[replacementId];
  if (!original || !replacement || !['kcal', 'protein', 'carbs'].includes(basis) || replacement[basis] <= 0) return null;
  const grams = round(Number(item.grams) * original[basis] / replacement[basis]);
  return grams >= 1 && grams <= 1500 ? { foodId: replacementId, grams, alternatives: [] } : null;
}

// Keep the culinary role as well as the nutrient basis: oil is not a snack of
// nuts, avocado is not interchangeable with a low-fat fruit, and a drink is not
// a serving of beans. Equivalence still requires a professional's review.
const exchangeFamilies = [
  ['fruit', ['papaya', 'banana', 'silver-banana', 'apple', 'pear', 'melon', 'strawberry', 'orange', 'tangerine', 'kiwi', 'plum', 'guava', 'pineapple', 'mango', 'watermelon', 'grapes'], 'carbs', 250],
  ['avocado', ['avocado'], 'kcal', 150],
  ['cooked-vegetable', ['zucchini', 'broccoli', 'carrot', 'chayote', 'cauliflower', 'eggplant', 'beet'], 'kcal', 180],
  ['raw-vegetable', ['lettuce', 'cucumber', 'kale', 'cabbage', 'arugula', 'tomato'], 'kcal', 150],
  ['pumpkin', ['pumpkin'], 'carbs', 200],
  ['starch', ['rice', 'brown-rice', 'couscous', 'polenta', 'potato', 'sweet-potato', 'cassava', 'arracacha'], 'carbs', 300],
  ['bread', ['bread', 'french-bread'], 'carbs', 120],
  ['oats', ['oats'], 'carbs', 80],
  ['meat', ['chicken', 'grilled-chicken', 'white-fish', 'salmon', 'beef', 'ground-beef'], 'protein', 200],
  ['egg', ['egg', 'egg-white'], 'protein', 200],
  ['yogurt', ['yogurt', 'skim-yogurt'], 'protein', 250],
  ['soy-drink', ['soy-milk'], 'protein', 300],
  ['legume', ['lentils', 'beans', 'black-beans', 'cowpea'], 'protein', 300],
  ['nuts', ['walnut', 'brazil-nut'], 'kcal', 30],
  ['oil', ['olive-oil'], 'kcal', 25],
];
const exchangeFamily = foodId => exchangeFamilies.find(([, ids]) => ids.includes(foodId));
export const foodExchangeRole = foodId => exchangeFamily(foodId)?.[0] || null;
export function canSubstituteFood(item, replacementId, basis = 'kcal') {
  const family = exchangeFamily(item?.foodId);
  if (!family || !family[1].includes(replacementId) || replacementId === item.foodId) return false;
  const replacement = substituteFood(item, replacementId, basis);
  return Boolean(replacement && replacement.grams <= family[3]);
}

export function suggestSubstitutions(item, intake = {}, { basis, excludeFoodIds = [], limit = 3 } = {}) {
  const family = exchangeFamily(item?.foodId);
  if (!family) return [];
  const [, ids, defaultBasis, maxGrams] = family;
  const result = [];
  for (const id of ids) {
    if (id === item.foodId || excludeFoodIds.includes(id) || !foodAllowed(foodById[id], intake)) continue;
    const replacement = substituteFood(item, id, basis || defaultBasis);
    if (replacement && replacement.grams <= maxGrams) result.push(replacement);
  }
  return result.sort((a, b) => Math.abs(Math.log(a.grams / item.grams)) - Math.abs(Math.log(b.grams / item.grams))).slice(0, Math.max(0, Math.min(3, limit)));
}

export function scalePlanEnergy(plan, energy) {
  if (!Number.isFinite(energy) || energy < 500 || energy > 6000) throw new Error('Defina uma meta energética entre 500 e 6.000 kcal para ajustar as porções.');
  const next = structuredClone(plan);
  for (const day of next.days) {
    const total = dayTotals(day).kcal;
    if (total <= 0) throw new Error('Adicione alimentos a todos os dias antes de ajustar as porções.');
    const ratio = energy / total;
    for (const meal of day.meals) for (const item of meal.items) for (const option of [item, ...item.alternatives]) {
      const grams = Math.round(option.grams * ratio);
      if (grams < 1 || grams > 1500) throw new Error('O ajuste criaria porções fora dos limites. Revise a composição das refeições primeiro.');
      option.grams = grams;
    }
  }
  next.targets.energy = energy; next.review = {};
  return next;
}

export function recommendedTemplate(intake = {}) {
  const profile = ['renal', 'oncology', 'glp1', 'celiac', 'diabetes', 'hypertension', 'cardiovascular', 'lactose', 'ibs', 'hpylori', 'gastric'].find(id => intake.conditions?.includes(id)) || 'balanced';
  return `${profile}-${intake.symptoms?.some(id => ['early-satiety', 'nausea'].includes(id)) || profile === 'glp1' ? 'fracionada' : 'pratica'}`;
}

export function generatePlan(intake, templateId = recommendedTemplate(intake), variation = 0) {
  const template = planTemplates.find(item => item.id === templateId);
  if (!template) throw new Error('Selecione uma base válida.');
  const profileIntake = { ...intake, conditions: [...new Set([...(intake.conditions || []), template.profile])] };
  const divided = template.pattern === 2;
  const seed = Number.isInteger(variation) ? Math.abs(variation % 97) : 0;
  const preferredTags = {
    balanced: [], diabetes: ['wholegrain'], cardiovascular: ['wholegrain', 'fish', 'plant'],
    hypertension: ['wholegrain', 'plant'], renal: [], oncology: ['soft', 'cooked'],
    ibs: ['cooked'], gastric: ['soft', 'cooked'], hpylori: ['soft', 'cooked'],
    lactose: ['plant'], celiac: ['cooked'], glp1: ['soft', 'cooked'],
  }[template.profile] || [];
  const slots = [
    ['breakfast', 'Café da manhã', '07:30'], ['snack', 'Lanche da manhã', '10:00'],
    ['lunch', 'Almoço', '12:30'], ['snack', 'Lanche da tarde', divided ? '15:30' : '16:00'],
    ['dinner', 'Jantar', divided ? '18:30' : '19:30'],
    ...(divided ? [['supper', 'Ceia', '21:00']] : []),
  ];
  const pools = Object.fromEntries([...new Set(slots.map(([type]) => type))].map(type => [type,
    mealModules.filter(module => module.type === type && module.items.every(([id]) => foodAllowed(foodById[id], profileIntake)))
      .map((module, index) => ({ module, index, score: module.tags.filter(tag => preferredTags.includes(tag)).length * 3 + (template.pattern === 0 && module.tags.includes('practical') ? 1 : 0) + module.items.filter(([id]) => intake.likedFoodIds?.includes(id)).length * 2 }))
      .sort((a, b) => b.score - a.score || a.index - b.index).map(entry => entry.module),
  ]));
  const usedModules = new Map();
  const selectModule = (type, index, slotIndex) => {
    const pool = pools[type];
    if (!pool.length) return null;
    // A practical week reuses a compact set of preparations; the varied week
    // deliberately opens the repertoire. Both still rotate compatible produce.
    const eligible = pool.slice(0, template.pattern !== 1 ? 4 : Math.max(7, pool.filter(module => module.tags.some(tag => preferredTags.includes(tag))).length));
    const offset = seed + (template.pattern === 1 ? 2 : 0);
    const start = (index + offset + (slotIndex === 3 ? 3 : 0)) % eligible.length;
    const rotated = eligible.slice(start).concat(eligible.slice(0, start));
    const result = rotated.reduce((best, module) => (usedModules.get(module.id) || 0) < (usedModules.get(best.id) || 0) ? module : best);
    usedModules.set(result.id, (usedModules.get(result.id) || 0) + 1);
    return result;
  };
  const prepareItems = (module, dayIndex, slotIndex) => {
    if (!module) return [];
    const ratio = divided ? (['lunch', 'dinner'].includes(module.type) ? .8 : module.type === 'breakfast' ? .85 : 1) : 1;
    const items = module.items.map(([foodId, grams]) => ({ foodId, grams: Math.round(grams * ratio), alternatives: [] }));
    // Rotate fruit and vegetable choices within the same preparation family.
    // This is independent of sex/body type; no clinical target is inferred.
    if (dayIndex + seed > 0) for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex]; const family = exchangeFamily(item.foodId);
      if (!['fruit', 'cooked-vegetable', 'raw-vegetable'].includes(family?.[0])) continue;
      const basket = template.pattern !== 1 ? {
        fruit: ['papaya', 'banana', 'apple', 'orange'],
        'cooked-vegetable': ['broccoli', 'carrot', 'zucchini'],
        'raw-vegetable': ['lettuce', 'tomato', 'cucumber'],
      }[family[0]] : family[1];
      const excluded = [...items.map(entry => entry.foodId), ...family[1].filter(id => !basket.includes(id))];
      const choices = suggestSubstitutions(item, profileIntake, { excludeFoodIds: excluded });
      if (choices.length) items[itemIndex] = choices[(dayIndex + seed + slotIndex + itemIndex) % choices.length];
    }
    for (const item of items) item.alternatives = suggestSubstitutions(item, profileIntake, { excludeFoodIds: items.map(entry => entry.foodId), limit: 2 }).map(({ foodId, grams }) => ({ foodId, grams }));
    return items;
  };
  const days = Array.from({ length: 7 }, (_, index) => ({
    label: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][index],
    meals: slots.map(([type, name, time], slotIndex) => {
      const module = selectModule(type, index, slotIndex);
      // With unusually broad exclusions a slot stays empty for the dietitian;
      // validation prevents approval, without inventing an incompatible meal.
      return { name, time, note: module?.note || '', items: prepareItems(module, index, slotIndex) };
    }),
  }));
  return { title: 'Seu plano alimentar', templateId, days, targets: { energy: null, protein: null, carbs: null, fat: null, water: null, sodium: null, potassium: null, phosphorus: null },
    guidance: 'Siga as porções e os preparos combinados em atendimento. Conte como tem sido sua rotina para ajustarmos o plano juntos.',
    clinicalNotes: '', review: {}, version: 1,
    assessment: { summary: '', criteria: '', calculationInput: null, calculations: [], dataSnapshot: {} }, curatedModules: [],
  };
}

export function assessPlan(plan) {
  const totalsByDay = (plan?.days || []).map(dayTotals);
  const signatures = (plan?.days || []).map(day => JSON.stringify(day.meals.map(meal => meal.items.map(({ foodId, grams }) => [foodId, grams]))));
  const meals = (plan?.days || []).flatMap(day => day.meals);
  return {
    uniqueFoods: new Set(meals.flatMap(meal => meal.items.map(item => item.foodId))).size,
    uniqueMeals: new Set(meals.map(meal => meal.items.map(item => item.foodId).sort().join('|'))).size,
    repeatedDays: signatures.map((signature, index) => signatures.indexOf(signature) === index ? null : index).filter(index => index !== null),
    totalsByDay,
  };
}

export function clinicalAlerts(intake = {}, plan) {
  const templateProfile = planTemplates.find(template => template.id === plan?.templateId)?.profile;
  intake = { ...intake, conditions: [...new Set([...(intake.conditions || []), ...(templateProfile ? [templateProfile] : [])])] };
  const alerts = [{ id: 'individual', text: 'Conferir anamnese, adequação energética, porções, preparo e preferências antes da entrega.' }];
  if (intake.symptoms?.some(id => ['persistent-vomiting', 'severe-pain', 'dehydration', 'swallowing'].includes(id))) alerts.push({ id: 'symptoms', text: 'Sinais que exigem avaliação da equipe de saúde: revisar relato e encaminhamento antes da prescrição.' });
  if (intake.pregnant) alerts.push({ id: 'pregnant', text: 'Gestação/amamentação: estimativas gerais não contemplam necessidades específicas. Definir metas individualizadas.' });
  if (intake.conditions?.includes('renal')) alerts.push({ id: 'renal', text: 'Revisar estágio renal, diálise, exames, proteína, potássio, fósforo, sódio e eventual restrição hídrica.' });
  if (intake.conditions?.includes('oncology')) alerts.push({ id: 'oncology', text: 'Avaliar tratamento oncológico, perda de peso, ingestão, textura e segurança alimentar; sem déficit automático.' });
  if (intake.conditions?.includes('glp1')) alerts.push({ id: 'glp1', text: 'Conferir prescrição de GLP-1, saciedade precoce, tolerância, ingestão e acompanhamento médico.' });
  if (intake.conditions?.includes('diabetes')) alerts.push({ id: 'diabetes', text: 'Conferir distribuição de carboidratos, medicamentos, hipoglicemias e compatibilidade com a rotina.' });
  if (intake.conditions?.some(id => ['cardiovascular', 'hypertension'].includes(id))) alerts.push({ id: 'cardiovascular', text: 'Revisar qualidade das gorduras, fibras, pressão arterial e medicamentos. O sódio da tabela não inclui sal acrescentado; não recomendar sal de potássio automaticamente.' });
  if (intake.conditions?.includes('ibs')) alerts.push({ id: 'ibs', text: 'Conferir padrão intestinal, fibras e tolerância. O modelo não é low-FODMAP; restrições e reintroduções precisam de avaliação individual.' });
  if (intake.conditions?.some(id => ['gastric', 'hpylori'].includes(id)) || intake.symptoms?.includes('reflux')) alerts.push({ id: 'gastric', text: 'Revisar gatilhos relatados, volume e horários. Em refluxo noturno, conferir intervalo entre a última refeição e deitar; a ceia sugerida não conhece o horário de sono.' });
  if (intake.conditions?.includes('lactose') || intake.intolerances?.includes('lactose')) alerts.push({ id: 'lactose', text: 'Conferir tolerância, rótulos e fontes de cálcio/proteína após as trocas. Bebida de soja não equivale nutricionalmente ao leite, e zero lactose não significa ausência de proteína do leite.' });
  if (intake.conditions?.includes('celiac')) alerts.push({ id: 'celiac', text: 'Verificar rótulos, certificação e contaminação cruzada; a seleção de ingredientes não garante preparo sem glúten.' });
  if (intake.conditions?.includes('hpylori')) alerts.push({ id: 'hpylori', text: 'Confirmar acompanhamento médico. Nenhum alimento ou plano erradica H. pylori.' });
  if (intake.allergies?.length || intake.allergyNotes || intake.dislikes || intake.foodExclusionNotes || intake.intolerances?.length || intake.intoleranceNotes || intake.seasoningExclusions) alerts.push({ id: 'restrictions', text: 'Revisar também as restrições escritas em texto livre e rótulos: o filtro automático usa apenas os alimentos e alérgenos selecionados.' });
  if (intake.medicationUse || intake.medications || intake.glp1Details) alerts.push({ id: 'medications', text: 'Conferir cada medicamento ou substância informada, sua finalidade e possíveis interações antes de validar o plano e os módulos adicionais.' });
  if (plan?.curatedModules?.length) alerts.push({ id: 'curated-content', text: 'Revisar individualmente ingredientes, quantidades, alergias, intolerâncias, medicamentos, preferências e temperos de cada módulo. Chás e suplementos exigem conteúdo e orientação próprios da nutricionista.' });
  if (plan?.targets?.water && intake.conditions?.some(id => ['renal', 'cardiovascular'].includes(id))) alerts.push({ id: 'fluid', text: 'Confirmar meta hídrica individual e eventual restrição de líquidos com a equipe.' });
  if (plan?.targets?.energy && plan.days.some(day => Math.abs(dayTotals(day).kcal - plan.targets.energy) / plan.targets.energy > .15)) alerts.push({ id: 'energy', text: 'Há dias com energia mais de 15% distante da meta. Ajustar porções ou justificar a diferença na avaliação.' });
  if (plan?.targets?.protein && plan.days.some(day => Math.abs(dayTotals(day).protein - plan.targets.protein) / plan.targets.protein > .2)) alerts.push({ id: 'protein', text: 'Há dias com proteína mais de 20% distante da meta que você definiu. Conferir distribuição, porções e substituições antes de entregar.' });
  if (intake.diet === 'vegan' || intake.diet === 'vegetarian') alerts.push({ id: 'plant-based', text: 'Conferir adequação de proteínas, vitamina B12, ferro e cálcio no padrão alimentar escolhido. A seleção automática não prescreve suplementos nem garante adequação de micronutrientes.' });
  if (plan?.targets && ['sodium', 'potassium', 'phosphorus'].some(key => plan.targets[key])) alerts.push({ id: 'minerals', text: 'Conferir metas de minerais com rótulos, exames e sal acrescentado. Totais com dados ausentes são parciais.' });
  return alerts;
}

export function validatePlan(plan, intake = {}) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return ['Plano inválido.'];
  if (typeof plan.title !== 'string' || !plan.title.trim() || plan.title.length > 120) errors.push('Informe um título de até 120 caracteres.');
  if (!Array.isArray(plan.days) || plan.days.length !== 7) return [...errors, 'O plano deve ter sete dias.'];
  const template = planTemplates.find(item => item.id === plan.templateId);
  const constraints = { ...intake, conditions: [...new Set([...(intake.conditions || []), ...(template ? [template.profile] : [])])] };
  for (const day of plan.days) {
    if (!day || typeof day.label !== 'string' || day.label.length > 40 || !Array.isArray(day.meals) || day.meals.length < 1 || day.meals.length > 8) { errors.push('Confira os dias e a quantidade de refeições.'); continue; }
    for (const meal of day.meals) {
      if (!meal || typeof meal.name !== 'string' || !meal.name.trim() || meal.name.length > 80 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time) || typeof meal.note !== 'string' || meal.note.length > 1000) { errors.push('Confira nome, horário e observações das refeições.'); continue; }
      if (!Array.isArray(meal.items) || meal.items.length < 1 || meal.items.length > 15) { errors.push('Cada refeição precisa de 1 a 15 alimentos.'); continue; }
      for (const item of meal.items) {
        if (!item || !Array.isArray(item.alternatives) || item.alternatives.length > 3) { errors.push('Limite de três substituições por alimento.'); continue; }
        for (const entry of [item, ...item.alternatives]) {
          if (!entry || typeof entry !== 'object') { errors.push('Confira os alimentos e as substituições.'); continue; }
          if (!foodAllowed(foodById[entry.foodId], constraints)) errors.push(`Alimento incompatível com as restrições: ${foodById[entry.foodId]?.name || 'não cadastrado'}.`);
          if (!Number.isFinite(entry.grams) || entry.grams < 1 || entry.grams > 1500) errors.push('Porções devem ficar entre 1 e 1.500 gramas.');
        }
      }
    }
  }
  for (const [key, max] of [['energy', 6000], ['protein', 400], ['carbs', 900], ['fat', 300], ['water', 6000], ['sodium', 6000], ['potassium', 10000], ['phosphorus', 5000]]) {
    const value = plan.targets?.[key];
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value > max)) errors.push(`Meta de ${key} inválida.`);
  }
  for (const key of ['guidance', 'clinicalNotes']) if (typeof plan[key] !== 'string' || plan[key].length > 6000) errors.push('Orientações devem ter até 6.000 caracteres.');
  return [...new Set([...errors, ...journeyPlanErrors(plan, constraints)])];
}
