import { activityLevels, allergies, conditions, foodById, foods, nutrients, planTemplates, symptoms } from '../data/nutrition.js';

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
  for (const key of ['medications', 'clinicalNotes', 'routine', 'preferences', 'dislikes', 'allergyNotes', 'glp1Details', 'weightHistory', 'sleep', 'bowel', 'budget']) {
    if (input?.[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 2000)) errors[key] = 'Use até 2.000 caracteres.';
  }
  if ((input?.allergies?.includes('other') || input?.allergies?.length) && !input?.allergyNotes?.trim()) errors.allergyNotes = 'Descreva os alimentos e as reações para a nutricionista.';
  if (!Array.isArray(input?.excludedFoodIds) || input.excludedFoodIds.length > foods.length || input.excludedFoodIds.some(id => !foodById[id])) errors.excludedFoodIds = 'Confira os alimentos excluídos.';
  if (typeof input?.pregnant !== 'boolean') errors.pregnant = 'Confira a informação sobre gestação ou amamentação.';
  if (input?.consent !== true) errors.consent = 'É necessário autorizar o uso destes dados para o seu atendimento.';
  if (input?.aiConsent !== undefined && typeof input.aiConsent !== 'boolean') errors.aiConsent = 'Confira a autorização opcional de IA.';
  return errors;
}

export function sanitizeIntake(input) {
  const result = {};
  for (const key of ['name', 'email', 'phone', 'sex', 'goal', 'diet', 'medications', 'clinicalNotes', 'routine', 'preferences', 'dislikes', 'allergyNotes', 'glp1Details', 'weightHistory', 'sleep', 'bowel', 'budget']) result[key] = String(input[key] || '').trim();
  result.email = result.email.toLowerCase();
  for (const key of ['age', 'weight', 'height', 'activity']) result[key] = Number(input[key]);
  for (const key of ['conditions', 'allergies', 'symptoms', 'excludedFoodIds']) result[key] = [...new Set(input[key] || [])];
  result.pregnant = input.pregnant === true; result.consent = true; result.aiConsent = input.aiConsent === true;
  return result;
}

export function foodAllowed(food, intake = {}) {
  if (!food) return false;
  const restricted = new Set(intake.allergies || []);
  if (intake.conditions?.includes('celiac')) restricted.add('gluten');
  if (intake.conditions?.includes('lactose')) restricted.add('lactose');
  return !food.allergens.some(allergen => restricted.has(allergen)) &&
    !(intake.diet === 'vegan' && !food.vegan) && !(intake.diet === 'vegetarian' && !food.vegetarian) &&
    !intake.excludedFoodIds?.includes(food.id);
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

const patterns = [
  [['Café da manhã', '07:30', ['bread', 50], ['egg', 50], ['papaya', 150]], ['Lanche da manhã', '10:00', ['banana', 80], ['walnut', 10]], ['Almoço', '12:30', ['brown-rice', 120], ['beans', 80], ['chicken', 100], ['broccoli', 80], ['olive-oil', 8]], ['Lanche da tarde', '16:00', ['yogurt', 170], ['oats', 20], ['strawberry', 80]], ['Jantar', '19:30', ['potato', 150], ['white-fish', 100], ['carrot', 80], ['olive-oil', 8]]],
  [['Café da manhã', '07:30', ['couscous', 100], ['egg', 50], ['melon', 100]], ['Lanche da manhã', '10:00', ['apple', 130], ['brazil-nut', 10]], ['Almoço', '12:30', ['rice', 120], ['lentils', 100], ['beef', 90], ['zucchini', 100], ['olive-oil', 8]], ['Lanche da tarde', '16:00', ['skim-yogurt', 170], ['mango', 100]], ['Jantar', '19:30', ['sweet-potato', 150], ['grilled-chicken', 100], ['pumpkin', 100], ['olive-oil', 8]]],
  [['Café da manhã', '07:30', ['couscous', 70], ['egg', 50]], ['Lanche da manhã', '10:00', ['papaya', 120], ['yogurt', 100]], ['Almoço', '12:30', ['rice', 90], ['chicken', 90], ['carrot', 60], ['olive-oil', 5]], ['Lanche da tarde', '15:30', ['banana', 65], ['oats', 15]], ['Jantar', '18:30', ['potato', 100], ['white-fish', 90], ['zucchini', 70], ['olive-oil', 5]], ['Ceia', '21:00', ['yogurt', 100], ['pear', 80]]],
];

export function recommendedTemplate(intake = {}) {
  const profile = ['renal', 'oncology', 'glp1', 'celiac', 'diabetes', 'hypertension', 'cardiovascular', 'lactose', 'ibs', 'hpylori', 'gastric'].find(id => intake.conditions?.includes(id)) || 'balanced';
  return `${profile}-${intake.symptoms?.includes('early-satiety') || profile === 'glp1' ? 'fracionada' : 'pratica'}`;
}

export function generatePlan(intake, templateId = recommendedTemplate(intake), variation = 0) {
  const template = planTemplates.find(item => item.id === templateId);
  if (!template) throw new Error('Selecione uma base válida.');
  const profileIntake = { ...intake, conditions: [...new Set([...(intake.conditions || []), template.profile])] };
  const allowed = foods.filter(food => foodAllowed(food, profileIntake));
  const days = Array.from({ length: 7 }, (_, index) => ({
    label: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][index],
    meals: patterns[template.pattern === 2 ? 2 : (index + template.pattern + variation) % 2].map(([name, time, ...items]) => ({
      name, time, note: '', items: items.flatMap(([foodId, grams]) => {
        if (foodAllowed(foodById[foodId], profileIntake)) {
          // Rotate everyday foods, retaining the chosen restriction filters and nutrient basis.
          const rotation = foodById[foodId].group === 'Frutas' ? ['papaya','banana','apple','pear','melon','strawberry','orange'] :
            ['chicken','grilled-chicken','white-fish','beef'].includes(foodId) ? ['chicken','white-fish','beef','grilled-chicken'] : null;
          const choices = rotation?.filter(id => foodAllowed(foodById[id], profileIntake));
          if (index > 1 && choices?.length) {
            const replacement = substituteFood({ foodId, grams }, choices[(index + variation) % choices.length], foodById[foodId].group === 'Proteínas' ? 'protein' : 'kcal');
            if (replacement) return [replacement];
          }
          return [{ foodId, grams, alternatives: [] }];
        }
        const original = foodById[foodId];
        const replacement = allowed.find(food => food.group === original.group) ||
          (['Proteínas', 'Laticínios'].includes(original.group) ? allowed.find(food => food.group === 'Leguminosas' && food.id !== 'soy-milk') : null);
        return replacement ? [{ foodId: replacement.id, grams, alternatives: [] }] : [];
      }),
    })),
  }));
  return { title: 'Seu plano alimentar', templateId, days, targets: { energy: null, protein: null, carbs: null, fat: null, water: null, sodium: null, potassium: null, phosphorus: null },
    guidance: 'Siga as porções e os preparos combinados em atendimento. Conte como tem sido sua rotina para ajustarmos o plano juntos.',
    clinicalNotes: '', review: {}, version: 1 };
}

export function clinicalAlerts(intake = {}, plan) {
  const alerts = [{ id: 'individual', text: 'Conferir anamnese, adequação energética, porções, preparo e preferências antes da entrega.' }];
  if (intake.symptoms?.some(id => ['persistent-vomiting', 'severe-pain', 'dehydration', 'swallowing'].includes(id))) alerts.push({ id: 'symptoms', text: 'Sinais que exigem avaliação da equipe de saúde: revisar relato e encaminhamento antes da prescrição.' });
  if (intake.pregnant) alerts.push({ id: 'pregnant', text: 'Gestação/amamentação: estimativas gerais não contemplam necessidades específicas. Definir metas individualizadas.' });
  if (intake.conditions?.includes('renal')) alerts.push({ id: 'renal', text: 'Revisar estágio renal, diálise, exames, proteína, potássio, fósforo, sódio e eventual restrição hídrica.' });
  if (intake.conditions?.includes('oncology')) alerts.push({ id: 'oncology', text: 'Avaliar tratamento oncológico, perda de peso, ingestão, textura e segurança alimentar; sem déficit automático.' });
  if (intake.conditions?.includes('glp1')) alerts.push({ id: 'glp1', text: 'Conferir prescrição de GLP-1, saciedade precoce, tolerância, ingestão e acompanhamento médico.' });
  if (intake.conditions?.includes('diabetes')) alerts.push({ id: 'diabetes', text: 'Conferir distribuição de carboidratos, medicamentos, hipoglicemias e compatibilidade com a rotina.' });
  if (intake.conditions?.includes('celiac')) alerts.push({ id: 'celiac', text: 'Verificar rótulos, certificação e contaminação cruzada; a seleção de ingredientes não garante preparo sem glúten.' });
  if (intake.conditions?.includes('hpylori')) alerts.push({ id: 'hpylori', text: 'Confirmar acompanhamento médico. Nenhum alimento ou plano erradica H. pylori.' });
  if (intake.allergies?.length || intake.allergyNotes || intake.dislikes) alerts.push({ id: 'restrictions', text: 'Revisar também as restrições escritas em texto livre e rótulos: o filtro automático usa apenas os alimentos e alérgenos selecionados.' });
  if (plan?.targets?.water && intake.conditions?.some(id => ['renal', 'cardiovascular'].includes(id))) alerts.push({ id: 'fluid', text: 'Confirmar meta hídrica individual e eventual restrição de líquidos com a equipe.' });
  if (plan?.targets?.energy && plan.days.some(day => Math.abs(dayTotals(day).kcal - plan.targets.energy) / plan.targets.energy > .15)) alerts.push({ id: 'energy', text: 'Há dias com energia mais de 15% distante da meta. Ajustar porções ou justificar a diferença na avaliação.' });
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
  return [...new Set(errors)];
}
