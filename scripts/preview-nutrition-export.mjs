import { mkdir, writeFile } from 'node:fs/promises';
import { buildPlanHtml, buildPlanPdf } from '../server/nutrition/export.js';
import { generatePlan, scalePlanEnergy } from '../src/lib/nutrition.js';
import { buildAssessment } from '../src/lib/nutrition-journey.js';

const plan = scalePlanEnergy(generatePlan({ conditions: [], allergies: [], diet: 'omnivore', excludedFoodIds: [] }), 1800);
plan.targets = { ...plan.targets, protein: 98, water: 2100 };
plan.title = 'Seu cuidado, dia após dia';
plan.guidance = 'Exemplo fictício para visualizar o acompanhamento nutricional. Porções e metas ilustrativas; este documento não é uma prescrição.';
plan.days[0].meals[0].items[0].alternatives = [{ foodId: 'couscous', grams: 100 }];
plan.days[0].meals[0].note = 'Este campo reúne as orientações individuais da nutricionista para a refeição.';
plan.plateGuide = { protein: 25, carbs: 25, vegetables: 50 };
plan.assessment = { summary: 'Marina tem 35 anos. Este exemplo reúne medidas corporais, uma semana de refeições e alternativas para mostrar a experiência do paciente.', criteria: 'As metas desta demonstração são ilustrativas. O painel diferencia o gasto estimado das metas registradas e mostra como cada valor foi calculado.', calculationInput: { weight: 70, height: 165, age: 35, sex: 'female', activity: 1.4, waist: 80, hip: 100, skinfoldMethod: 'jackson-pollock-3', skinfolds: { triceps: 20, suprailiac: 18, thigh: 25 }, measurementDate: '2026-10-01', energy: 1800, proteinRatio: 1.4, waterRatio: 30 } };
plan.assessment = buildAssessment({ bristolType: 3, bowelFrequency: 'Relato fictício: uma vez ao dia.', teaHabit: 'sometimes', teaPreferences: 'Camomila' }, plan, '2026-10-01T15:00:00.000Z');
plan.curatedModules = [{ id: 'example-tea', type: 'tea', title: 'Seu momento de pausa', content: 'Exemplo editorial para revisar a apresentação de um chá. O conteúdo definitivo deve registrar a planta, a finalidade e a orientação individual aprovada em consulta.', image: '/images/teas/chamomile.jpg', foodIds: [], allergens: [], reviewed: true }];
const options = { plan, patientName: 'Marina · exemplo fictício', id: 'demo-visual', revision: 3, draft: true };
await mkdir('tmp/nutrition', { recursive: true });
await mkdir('output/pdf', { recursive: true });
await mkdir('output/html', { recursive: true });
const html = await buildPlanHtml(options);
await writeFile('tmp/nutrition/exemplo-plano.html', html);
await writeFile('output/html/plano-paciente-visual.html', html);
if (!process.argv.includes('--html-only')) {
  const pdf = await buildPlanPdf(options);
  await writeFile('tmp/nutrition/exemplo-plano.pdf', pdf);
  await writeFile('output/pdf/plano-paciente-visual.pdf', pdf);
}
console.log('Exemplo fictício gerado em output/html e output/pdf (quando solicitado).');
