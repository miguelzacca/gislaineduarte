import { allergies, conditions, foodById, planTemplates } from '../../src/data/nutrition.js';
import { goalOptions, intolerances, bristolTypes, bristolSource } from '../../src/data/nutrition-journey.js';
import { sumItems } from '../../src/lib/nutrition.js';
import { bmiInterpretation, plateFoodGroup, skinfoldEvaluation } from '../../src/lib/nutrition-clinical.js';

export const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const calculationDecimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 15 }).format(value);
export const mealColors = ['#315e49', '#b38d45', '#9b6557', '#668092', '#879747', '#77648b', '#477b73'];
export const targetLabels = { energy: 'Energia', protein: 'Proteínas', carbs: 'Carboidratos', fat: 'Gorduras', water: 'Água', sodium: 'Sódio', potassium: 'Potássio', phosphorus: 'Fósforo' };
export const plateGroupLabels = { protein: 'Proteínas e leguminosas', carbs: 'Cereais e raízes', vegetables: 'Vegetais' };
export function mealVisualData(items, guide) {
  const grams = items.reduce((sum, item) => sum + Number(item.grams), 0);
  const values = sumItems(items);
  const groups = new Set(items.map(item => plateFoodGroup(foodById[item.foodId])));
  const plateGuide = guide && ['protein', 'carbs', 'vegetables'].every(group => groups.has(group)) ? guide : null;
  return { grams, values, max: Math.max(10, Math.ceil(Math.max(values.protein, values.carbs, values.fat) / 10) * 10),
    plateGuide,
    portions: items.map((item, index) => {
      const food = foodById[item.foodId];
      const angle = -Math.PI / 2 + index * Math.PI * 2 / items.length;
      const distance = items.length === 1 ? 0 : items.length === 2 ? 30 : 39;
      return { foodId: item.foodId, name: food.name, grams: item.grams, group: plateFoodGroup(food), color: mealColors[index % mealColors.length], x: 100 + Math.cos(angle) * distance, y: 100 + Math.sin(angle) * distance, radius: items.length <= 2 ? 43 : items.length <= 4 ? 35 : 29 };
    }) };
}

export function assessmentHighlights(plan) {
  const input = plan.assessment?.calculationInput || {};
  const calculations = plan.assessment?.calculations || [];
  const find = id => calculations.find(item => item.id === id);
  const bmi = bmiInterpretation(input);
  const skinfold = skinfoldEvaluation(input);
  const bristol = bristolTypes.find(item => item.type === Number(plan.assessment?.dataSnapshot?.bristolType));
  return { bmi, skinfold, bristol, bristolSource,
    metrics: ['bmi', 'resting', 'expenditure', 'skinfoldBodyFat', 'skinfoldFatMass', 'skinfoldLeanMass', 'fatMass', 'leanMass'].map(find).filter(Boolean),
    energyNote: 'O gasto em repouso (TMB estimada) usa Mifflin–St Jeor. O GET multiplica esse gasto pelo fator de atividade escolhido. São estimativas para adultos de 19 a 78 anos, sem gestação/amamentação; não determinam sozinhas a meta do plano.',
    compositionNote: skinfold?.note || 'Massa livre de gordura inclui água, órgãos, ossos e outros tecidos; não é uma medida de massa muscular. Resultados dependem do método e da qualidade das medidas informadas.',
  };
}

// Both exports consume this exact sequence. No private professional notes,
// medications, photos or contact data are copied into the delivery summary.
export function assessmentSections(plan) {
  const assessment = plan.assessment;
  if (!assessment) return [{ title: 'Registro de avaliação', lines: ['Esta versão não possui memória de cálculo registrada. Nenhum cálculo foi inferido para este documento.'] }];
  const sections = [
    { title: 'O que orientou seu plano', lines: [assessment.summary || 'Resumo ainda não registrado.', assessment.criteria || 'Critérios ainda não registrados.'] },
  ];
  if (Array.isArray(assessment.dataSnapshot)) sections.push({ title: 'Dados usados na avaliação', lines: assessment.dataSnapshot.map(item => `${item.label}: ${Array.isArray(item.value) ? item.value.join(', ') : item.value}${item.unit ? ` ${item.unit}` : ''}`) });
  if (assessment.dataSnapshot && !Array.isArray(assessment.dataSnapshot)) {
    const labels = { goal: 'Objetivo', diet: 'Padrão alimentar', conditions: 'Condições informadas', allergies: 'Alergias', intolerances: 'Intolerâncias', excludedFoodIds: 'Alimentos excluídos', foodExclusionNotes: 'Outros alimentos excluídos', dislikedFoodIds: 'Alimentos de que não gosta', likedFoodIds: 'Preferências', seasoningPreferences: 'Temperos preferidos', seasoningExclusions: 'Temperos excluídos', avoidReadySeasonings: 'Evitar temperos prontos com conservantes', bristolType: 'Tipo de Bristol', bowelFrequency: 'Frequência intestinal informada', waterIntake: 'Água e outras bebidas informadas', activityDetails: 'Atividade física informada', routine: 'Rotina alimentar informada', teaHabit: 'Hábito de consumir chás', teasUsed: 'Chás que costuma consumir', teaPreferences: 'Preferências de chás', teaAvoidances: 'Chás que prefere evitar', templateId: 'Modelo de base' };
    const names = Object.fromEntries([...goalOptions].map(item => [item.id, item.label]));
    Object.assign(names, { omnivore: 'Onívoro', vegetarian: 'Vegetariano', vegan: 'Vegano', daily: 'Todos os dias', sometimes: 'Às vezes', interested: 'Tem interesse em experimentar', dislike: 'Prefere não consumir' });
    const lines = Object.entries(labels).filter(([key]) => assessment.dataSnapshot[key] != null && assessment.dataSnapshot[key] !== '').map(([key, label]) => {
      const options = { conditions, allergies, intolerances }[key] || [];
      const value = assessment.dataSnapshot[key]; const display = Array.isArray(value) ? value.map(entry => foodById[entry]?.name || options.find(option => option.id === entry)?.label || names[entry] || entry).join(', ') || 'Nenhum informado' : key === 'templateId' ? planTemplates.find(template => template.id === value)?.name || 'Modelo personalizado da nutricionista' : typeof value === 'boolean' ? value ? 'Sim' : 'Não' : names[value] || value;
      return `${label}: ${display}`;
    });
    sections.push({ title: 'Dados usados na avaliação', lines });
  }
  sections.push({ title: 'Cálculos registrados', lines: (assessment.calculations || []).length ? assessment.calculations.map(calculation => `${calculation.label}: ${calculationDecimal(calculation.value)} ${calculation.unit}. Método: ${calculation.method}. Fórmula: ${calculation.formula}. Dados: ${(calculation.inputs || []).map(input => `${input.label} ${typeof input.value === 'number' ? calculationDecimal(input.value) : ({ female: 'feminino', male: 'masculino', unspecified: 'não informado' }[input.value] || input.value)}${input.unit ? ` ${input.unit}` : ''}`).join('; ')}. Fonte: ${calculation.source?.title || calculation.source}${calculation.source?.url ? ` (${calculation.source.url})` : ''}.`) : ['Nenhum cálculo selecionado nesta avaliação. As metas abaixo foram definidas pela nutricionista e justificadas nos critérios.'] });
  sections.push({ title: 'Metas e origem', lines: Object.entries(assessment.targetSources || {}).map(([key, origin]) => `${targetLabels[key] || key}: ${calculationDecimal(origin.value)} ${origin.unit}. Origem: ${origin.method}${origin.calculationId ? ` (${origin.calculationId})` : ''}.`) });
  if (assessment.recordedAt) sections.push({ title: 'Registro', lines: [`Avaliação registrada em ${new Date(assessment.recordedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (horário de Brasília). Os resultados são estimativas a interpretar no acompanhamento; não constituem diagnóstico.`] });
  return sections.filter(section => section.lines.length);
}
