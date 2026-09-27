import { activityLevels, foodById } from '../data/nutrition.js';
import { curatedModuleTypes, goalOptions } from '../data/nutrition-journey.js';
import { calculateAnthropometry, foodAllowed, normalizeText, round } from './nutrition.js';

const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const units = { unidade: 'unidades', 'unidade pequena': 'unidades pequenas', 'unidade média': 'unidades médias', 'colher de sopa': 'colheres de sopa', 'colher de servir': 'colheres de servir', 'colher de sobremesa': 'colheres de sobremesa', fatia: 'fatias', 'fatia grossa': 'fatias grossas', porção: 'porções', folha: 'folhas', ramo: 'ramos', pedaço: 'pedaços', 'cacho pequeno': 'cachos pequenos', 'filé pequeno': 'filés pequenos', 'bife pequeno': 'bifes pequenos', pote: 'potes', 'concha pequena': 'conchas pequenas', copo: 'copos', 'copo pequeno': 'copos pequenos' };

export function formatFoodPortion(foodId, grams) {
  const food = typeof foodId === 'object' ? foodId : foodById[foodId];
  if (!food || !Number.isFinite(Number(grams)) || Number(grams) <= 0) return 'Quantidade não informada';
  const count = Number(grams) / food.portionGrams;
  const single = food.id === 'egg' || food.id === 'egg-white' ? 'unidade' : food.portionLabel;
  const label = Math.abs(count - 1) < 0.001 ? single : units[single] || single;
  return `Quantidade: ${decimal(Number(grams))} g · Medida caseira: ≈ ${decimal(count)} ${label} (1 ${single} ≈ ${decimal(food.portionGrams)} g)`;
}

export function searchPlanTemplates(templates, { query = '', goal = '', profile = '' } = {}) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return templates.filter(template => {
    const goals = template.goals || goalOptions.map(option => option.id);
    if (goal && goal !== 'all' && !goals.includes(goal)) return false;
    if (profile && profile !== 'all' && template.profile !== profile) return false;
    const goalLabels = goalOptions.filter(option => goals.includes(option.id)).map(option => option.label);
    const text = normalizeText([template.name, template.title, template.description, template.profile, ...(template.tags || []), ...goalLabels].join(' '));
    return words.every(word => text.includes(word));
  });
}

export const calculationFields = ['weight', 'height', 'age', 'sex', 'activity', 'usualWeight', 'waist', 'hip', 'bodyFat', 'proteinRatio', 'waterRatio', 'energy', 'carbPercent', 'fatPercent'];
const numericRanges = { weight: [25, 350], height: [120, 230], age: [18, 100], usualWeight: [25, 350], waist: [31, 250], hip: [31, 250], bodyFat: [0.1, 69.9], proteinRatio: [0.1, 4], waterRatio: [1, 60], energy: [1, 6000], carbPercent: [1, 100], fatPercent: [1, 100] };
const calculationFieldLabels = { weight: 'peso (kg)', height: 'altura (cm)', age: 'idade (anos)', usualWeight: 'peso habitual (kg)', waist: 'cintura (cm)', hip: 'quadril (cm)', bodyFat: 'gordura corporal (%)', proteinRatio: 'proteína (g/kg)', waterRatio: 'água (ml/kg)', energy: 'energia (kcal)', carbPercent: 'carboidratos (%)', fatPercent: 'gorduras (%)' };
const filled = value => value !== '' && value !== null && value !== undefined;

export function calculationInputErrors(input) {
  if (input === null || input === undefined) return [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['Confira os dados dos cálculos.'];
  const errors = [];
  for (const [key, [min, max]] of Object.entries(numericRanges)) {
    if (filled(input[key]) && (!Number.isFinite(Number(input[key])) || typeof input[key] === 'boolean' || Number(input[key]) < min || Number(input[key]) > max)) errors.push(`Confira o valor de ${calculationFieldLabels[key]} nos cálculos.`);
  }
  if (filled(input.age) && !Number.isInteger(Number(input.age))) errors.push('A idade do cálculo deve ser inteira.');
  if (filled(input.sex) && !['female', 'male', 'unspecified'].includes(input.sex)) errors.push('Confira a opção de sexo nos cálculos.');
  if (filled(input.activity) && !activityLevels.some(level => level.value === Number(input.activity))) errors.push('Confira o fator de atividade nos cálculos.');
  if (filled(input.carbPercent) && filled(input.fatPercent) && Number(input.carbPercent) + Number(input.fatPercent) > 100) errors.push('Os percentuais de carboidratos e gorduras ultrapassam 100% da energia.');
  return errors;
}

export function sanitizeCalculationInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  return Object.fromEntries(calculationFields.filter(key => filled(input[key])).map(key => [key, key === 'sex' ? String(input[key]) : Number(input[key])]));
}

export function createCalculationRecord({ id, label, method, formula, inputs, value, unit, source }) {
  if (!Number.isFinite(value) || !inputs.every(input => typeof input.value === 'string' || Number.isFinite(input.value))) return null;
  return { id, label, method, formula, inputs, value, unit, source };
}

export function createCalculationRecords(input) {
  if (calculationInputErrors(input).length || !input) return [];
  const data = sanitizeCalculationInput(input);
  const records = [];
  const add = (id, label, method, formula, fields, value, unit, source) => {
    if (fields.some(([key]) => !filled(data[key])) || !Number.isFinite(value)) return;
    records.push(createCalculationRecord({ id, label, method, formula, inputs: fields.map(([key, label, unit]) => ({ label, value: key === 'sex' ? ({ female: 'Feminina', male: 'Masculina', unspecified: 'Não informado' })[data[key]] : data[key], unit })), value, unit, source }));
  };
  const source = { title: 'Cálculo aritmético com dados informados e parâmetros definidos pela nutricionista', url: null };
  const weight = ['weight', 'Peso', 'kg']; const height = ['height', 'Altura', 'cm']; const age = ['age', 'Idade', 'anos'];
  const anthropometry = calculateAnthropometry(data);
  if (anthropometry) {
    add('bmi', 'Índice de massa corporal', 'IMC', 'peso (kg) ÷ [altura (cm) ÷ 100]²', [weight, height], anthropometry.bmi, 'kg/m²', source);
    const restingFields = [weight, height, age, ['sex', 'Parâmetro sexual da equação', 'categoria']];
    const mifflinSource = { title: 'Mifflin et al., 1990', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' };
    const constant = data.sex === 'male' ? '+ 5' : '− 161';
    add('resting', 'Gasto energético em repouso estimado', 'Mifflin–St Jeor', `10 × peso (kg) + 6,25 × altura (cm) − 5 × idade (anos) ${constant}`, restingFields, anthropometry.resting, 'kcal/dia', mifflinSource);
    add('expenditure', 'Gasto energético total estimado', 'Mifflin–St Jeor × fator de atividade selecionado', '(10 × peso + 6,25 × altura − 5 × idade + constante sexual) × fator de atividade; arredondamento final', [...restingFields, ['activity', 'Fator de atividade', 'fator']], anthropometry.expenditure, 'kcal/dia', mifflinSource);
    add('weightChangePercent', 'Variação relativa de peso', 'Peso habitual e atual informados', '(peso habitual − peso atual) ÷ peso habitual × 100; negativo indica ganho', [weight, ['usualWeight', 'Peso habitual', 'kg']], anthropometry.weightChangePercent, '%', source);
    add('waistHip', 'Relação cintura/quadril', 'Razão entre medidas informadas', 'cintura (cm) ÷ quadril (cm)', [['waist', 'Cintura', 'cm'], ['hip', 'Quadril', 'cm']], anthropometry.waistHip, 'razão', source);
    add('waistHeight', 'Relação cintura/altura', 'Razão entre medidas informadas', 'cintura (cm) ÷ altura (cm)', [['waist', 'Cintura', 'cm'], height], anthropometry.waistHeight, 'razão', source);
    add('leanMass', 'Massa livre de gordura estimada', 'Percentual de gordura informado', 'peso (kg) × [1 − gordura corporal (%) ÷ 100]', [weight, ['bodyFat', 'Gordura corporal informada', '%']], anthropometry.leanMass, 'kg', source);
  }
  add('protein', 'Meta calculada de proteína', 'Fator de proteína escolhido pela nutricionista', 'peso (kg) × fator de proteína (g/kg)', [weight, ['proteinRatio', 'Fator de proteína', 'g/kg']], round(data.weight * data.proteinRatio), 'g/dia', source);
  add('water', 'Meta calculada de água', 'Fator de água escolhido pela nutricionista', 'peso (kg) × fator de água (ml/kg)', [weight, ['waterRatio', 'Fator de água', 'ml/kg']], Math.round(data.weight * data.waterRatio), 'ml/dia', source);
  add('energy', 'Meta energética informada', 'Valor definido pela nutricionista', 'Valor informado; sem déficit ou superávit inferido', [['energy', 'Meta energética', 'kcal/dia']], data.energy, 'kcal/dia', source);
  add('carbs', 'Meta calculada de carboidratos', 'Percentual energético escolhido pela nutricionista', 'energia (kcal) × carboidratos (%) ÷ 100 ÷ 4 kcal/g', [['energy', 'Meta energética', 'kcal/dia'], ['carbPercent', 'Carboidratos', '%']], round(data.energy * data.carbPercent / 100 / 4), 'g/dia', source);
  add('fat', 'Meta calculada de gorduras', 'Percentual energético escolhido pela nutricionista', 'energia (kcal) × gorduras (%) ÷ 100 ÷ 9 kcal/g', [['energy', 'Meta energética', 'kcal/dia'], ['fatPercent', 'Gorduras', '%']], round(data.energy * data.fatPercent / 100 / 9), 'g/dia', source);
  return records.filter(Boolean);
}

export function buildAssessment(intake = {}, plan = {}, timestamp = new Date().toISOString()) {
  const assessment = plan.assessment || {};
  const calculationInput = sanitizeCalculationInput(assessment.calculationInput);
  const calculations = createCalculationRecords(calculationInput);
  const targetUnits = { energy: 'kcal/dia', protein: 'g/dia', carbs: 'g/dia', fat: 'g/dia', water: 'ml/dia', sodium: 'mg/dia', potassium: 'mg/dia', phosphorus: 'mg/dia' };
  const targetSources = Object.fromEntries(Object.entries(plan.targets || {}).filter(([key, value]) => targetUnits[key] && Number.isFinite(value)).map(([key, value]) => {
    const calculation = calculations.find(record => record.id === key && Math.abs(record.value - value) < 0.05);
    return [key, { method: calculation ? calculation.method : 'Definida pela nutricionista; justificativa nos critérios', calculationId: calculation?.id || null, value, unit: targetUnits[key] }];
  }));
  const dataSnapshot = {
    goal: intake.goal || '', diet: intake.diet || '', templateId: plan.templateId || '',
    conditions: [...(intake.conditions || [])], allergies: [...(intake.allergies || [])], intolerances: [...(intake.intolerances || [])],
    likedFoodIds: [...(intake.likedFoodIds || [])], dislikedFoodIds: [...(intake.dislikedFoodIds || [])], excludedFoodIds: [...(intake.excludedFoodIds || [])],
    foodExclusionNotes: intake.foodExclusionNotes || '',
    seasoningPreferences: intake.seasoningPreferences || '', seasoningExclusions: intake.seasoningExclusions || '',
    avoidReadySeasonings: intake.avoidReadySeasonings === true, bristolType: intake.bristolType || null,
    measurements: calculationInput ? Object.fromEntries(['weight', 'height', 'age', 'sex', 'activity', 'usualWeight', 'waist', 'hip', 'bodyFat'].filter(key => filled(calculationInput[key])).map(key => [key, calculationInput[key]])) : {},
  };
  return { summary: String(assessment.summary || '').trim(), criteria: String(assessment.criteria || '').trim(), calculationInput, recordedAt: timestamp, calculations, dataSnapshot, targetSources };
}

export function curatedModuleAllowed(module, intake = {}) {
  if (!module || !Array.isArray(module.foodIds) || !module.foodIds.every(id => foodAllowed(foodById[id], intake))) return false;
  const restrictions = new Set([...(intake.allergies || []), ...(intake.intolerances || []), ...(intake.conditions?.includes('celiac') ? ['gluten'] : []), ...(intake.conditions?.includes('lactose') ? ['lactose'] : [])]);
  if (module.allergens?.some(allergen => restrictions.has(allergen))) return false;
  return true;
}

export function moduleEligibility(module, intake = {}) {
  const reasons = [];
  if (!module || !Array.isArray(module.foodIds)) return ['Cadastre os ingredientes antes da revisão.'];
  for (const id of module.foodIds) if (!foodAllowed(foodById[id], intake)) reasons.push(`Ingrediente incompatível com as escolhas ou restrições: ${foodById[id]?.name || id}.`);
  const restrictions = new Set([...(intake.allergies || []), ...(intake.intolerances || []), ...(intake.conditions?.includes('celiac') ? ['gluten'] : []), ...(intake.conditions?.includes('lactose') ? ['lactose'] : [])]);
  if (module.allergens?.some(allergen => restrictions.has(allergen))) reasons.push('O conteúdo inclui um alérgeno ou intolerância informados.');
  if (module.requiresIngredientReview) reasons.push('Conferir ingredientes, rótulos, porções e restrições: esta ideia não possui composição completa cadastrada.');
  if (intake.medicationUse || intake.medications || intake.conditions?.includes('glp1')) reasons.push('Conferir a compatibilidade com cada medicamento ou substância informada.');
  if (intake.seasoningExclusions && module.type === 'seasoning') reasons.push('Conferir os temperos excluídos em texto livre.');
  if (module.type === 'tea' || module.type === 'supplement') reasons.push('Conteúdo exige avaliação e orientação individual da nutricionista; não há recomendação automática.');
  return [...new Set(reasons)];
}

export function assessmentApprovalErrors(plan, intake = {}) {
  const errors = journeyPlanErrors(plan, intake);
  if (typeof plan?.assessment?.summary !== 'string' || !plan.assessment.summary.trim()) errors.push('Escreva o resumo destinado ao cliente antes de aprovar.');
  if (typeof plan?.assessment?.criteria !== 'string' || !plan.assessment.criteria.trim()) errors.push('Registre os critérios da escolha do plano e a origem das metas antes de aprovar.');
  if (Array.isArray(plan?.curatedModules) && plan.curatedModules.some(module => module?.reviewed !== true)) errors.push('Revise e confirme cada módulo adicional antes de aprovar.');
  return [...new Set(errors)];
}

export function journeyPlanErrors(plan, intake = {}) {
  const errors = [];
  const assessment = plan?.assessment;
  if (assessment !== undefined) {
    if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment)) errors.push('Confira a justificativa do plano.');
    else {
      for (const key of ['summary', 'criteria']) if (typeof assessment[key] !== 'string' || assessment[key].length > 4000) errors.push('Resumo e critérios devem ter até 4.000 caracteres.');
      errors.push(...calculationInputErrors(assessment.calculationInput));
    }
  }
  if (plan?.curatedModules !== undefined) {
    if (!Array.isArray(plan.curatedModules) || plan.curatedModules.length > 12) errors.push('Inclua até 12 módulos de conteúdo.');
    else {
      const ids = new Set();
      for (const module of plan.curatedModules) {
        if (!module || typeof module !== 'object' || typeof module.id !== 'string' || !module.id || module.id.length > 100 || ids.has(module.id) || !curatedModuleTypes.some(type => type.id === module.type) || typeof module.title !== 'string' || !module.title.trim() || module.title.length > 120 || typeof module.content !== 'string' || !module.content.trim() || module.content.length > 3000 || typeof module.reviewed !== 'boolean' || !Array.isArray(module.foodIds) || module.foodIds.length > 60 || module.allergens !== undefined && (!Array.isArray(module.allergens) || module.allergens.length > 15 || module.allergens.some(value => typeof value !== 'string' || value.length > 40))) { errors.push('Confira título, conteúdo, alimentos e revisão dos módulos.'); continue; }
        ids.add(module.id);
        if (!curatedModuleAllowed(module, intake)) errors.push(`Módulo incompatível com alimentos ou restrições: ${module.title}.`);
      }
    }
  }
  return [...new Set(errors)];
}
