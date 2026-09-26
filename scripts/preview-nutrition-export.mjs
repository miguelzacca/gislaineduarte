import { mkdir, writeFile } from 'node:fs/promises';
import { buildPlanHtml, buildPlanPdf } from '../server/nutrition/export.js';
import { generatePlan, scalePlanEnergy } from '../src/lib/nutrition.js';

const plan = scalePlanEnergy(generatePlan({ conditions: [], allergies: [], diet: 'omnivore', excludedFoodIds: [] }), 1800);
plan.title = 'Uma semana de possibilidades';
plan.guidance = 'Exemplo fictício para revisão visual do sistema. Não é uma prescrição e não deve ser utilizado como orientação alimentar. As porções foram geradas somente para demonstrar a apresentação.';
plan.days[0].meals[0].items[0].alternatives = [{ foodId: 'couscous', grams: 100 }];
plan.days[0].meals[0].note = 'Este campo reúne as orientações individuais da nutricionista para a refeição.';
const options = { plan, patientName: 'Pessoa de exemplo', id: 'demo-visual', revision: 1, draft: true };
await mkdir('tmp/nutrition', { recursive: true });
await writeFile('tmp/nutrition/exemplo-plano.html', await buildPlanHtml(options));
await writeFile('tmp/nutrition/exemplo-plano.pdf', await buildPlanPdf(options));
console.log('Prévias fictícias geradas em tmp/nutrition (HTML e PDF).');
