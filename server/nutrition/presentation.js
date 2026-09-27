import { allergies, conditions, foodById, planTemplates } from '../../src/data/nutrition.js';
import { goalOptions, intolerances } from '../../src/data/nutrition-journey.js';
import { sumItems } from '../../src/lib/nutrition.js';

export const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const calculationDecimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 15 }).format(value);
export const mealColors = ['#315e49', '#b38d45', '#9b6557', '#668092', '#879747', '#77648b', '#477b73'];
export const targetLabels = { energy: 'Energia', protein: 'Proteínas', carbs: 'Carboidratos', fat: 'Gorduras', water: 'Água', sodium: 'Sódio', potassium: 'Potássio', phosphorus: 'Fósforo' };
export function mealVisualData(items) {
  const grams = items.reduce((sum, item) => sum + Number(item.grams), 0);
  const values = sumItems(items);
  let angle = -Math.PI / 2;
  return { grams, values, max: Math.max(10, Math.ceil(Math.max(values.protein, values.carbs, values.fat) / 10) * 10),
    portions: items.map((item, index) => {
      const start = angle; angle += grams > 0 ? item.grams / grams * Math.PI * 2 : 0;
      const steps = Math.max(1, Math.ceil((angle - start) / .10));
      const points = Array.from({ length: steps + 1 }, (_, i) => { const a = start + (angle - start) * i / steps; return `${(60 + 52 * Math.cos(a)).toFixed(2)} ${(60 + 52 * Math.sin(a)).toFixed(2)}`; });
      return { name: foodById[item.foodId].name, grams: item.grams, color: mealColors[index % mealColors.length], path: `M 60 60 L ${points.join(' L ')} Z` };
    }) };
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
    const labels = { goal: 'Objetivo', diet: 'Padrão alimentar', conditions: 'Condições informadas', allergies: 'Alergias', intolerances: 'Intolerâncias', excludedFoodIds: 'Alimentos excluídos', foodExclusionNotes: 'Outros alimentos excluídos', dislikedFoodIds: 'Alimentos de que não gosta', likedFoodIds: 'Preferências', seasoningPreferences: 'Temperos preferidos', seasoningExclusions: 'Temperos excluídos', avoidReadySeasonings: 'Evitar temperos prontos com conservantes', bristolType: 'Tipo de Bristol', templateId: 'Modelo de base' };
    const names = Object.fromEntries([...goalOptions].map(item => [item.id, item.label]));
    Object.assign(names, { omnivore: 'Onívoro', vegetarian: 'Vegetariano', vegan: 'Vegano' });
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
