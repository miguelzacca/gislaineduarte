import { mkdir, writeFile } from 'node:fs/promises';
import { buildPlanHtml, buildPlanPdf } from '../server/nutrition/export.js';
import { generatePlan, scalePlanEnergy } from '../src/lib/nutrition.js';
import { buildAssessment } from '../src/lib/nutrition-journey.js';

const plan = scalePlanEnergy(generatePlan({ conditions: [], allergies: [], diet: 'omnivore', excludedFoodIds: [] }), 1800);
plan.title = 'Uma semana de possibilidades';
plan.guidance = 'Exemplo fictício para revisão visual do sistema. Não é uma prescrição e não deve ser utilizado como orientação alimentar. As porções foram geradas somente para demonstrar a apresentação.';
plan.days[0].meals[0].items[0].alternatives = [{ foodId: 'couscous', grams: 100 }];
plan.days[0].meals[0].note = 'Este campo reúne as orientações individuais da nutricionista para a refeição.';
plan.plateGuide = { protein: 25, carbs: 25, vegetables: 50 };
plan.assessment = { summary: 'Avaliação fictícia: rotina de refeições e preferências usadas para demonstrar o documento.', criteria: 'Exemplo de memória de cálculo. As metas ilustrativas foram definidas apenas para revisão do sistema.', calculationInput: { weight: 70, height: 165, age: 35, sex: 'female', activity: 1.4, waist: 80, hip: 100, skinfoldMethod: 'jackson-pollock-3', skinfolds: { triceps: 20, suprailiac: 18, thigh: 25 }, measurementDate: '2026-10-01', energy: 1800, proteinRatio: 1.4, waterRatio: 30 } };
plan.assessment = buildAssessment({ bristolType: 3, bowelFrequency: 'Relato fictício: uma vez ao dia.', teaHabit: 'sometimes', teaPreferences: 'Camomila' }, plan);
plan.curatedModules = [{ id: 'example-tea', type: 'tea', title: 'Seu momento de pausa', content: 'Exemplo editorial para revisar a apresentação de um chá. O conteúdo definitivo deve registrar a planta, a finalidade e a orientação individual aprovada em consulta.', image: '/images/teas/chamomile.jpg', foodIds: [], allergens: [], reviewed: true }];
const options = { plan, patientName: 'Pessoa de exemplo', id: 'demo-visual', revision: 1, draft: true };
await mkdir('tmp/nutrition', { recursive: true });
await writeFile('tmp/nutrition/exemplo-plano.html', await buildPlanHtml(options));
await writeFile('tmp/nutrition/exemplo-plano.pdf', await buildPlanPdf(options));
console.log('Prévias fictícias geradas em tmp/nutrition (HTML e PDF).');
