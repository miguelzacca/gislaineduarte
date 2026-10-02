import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import PDFDocument from 'pdfkit';
import { parseHTML } from 'linkedom';
import { buildPlanHtml, buildPlanPdf } from '../../server/nutrition/export.js';
import { foodById, foodSource } from '../../src/data/nutrition.js';
import { bristolTypes, bristolSource } from '../../src/data/nutrition-journey.js';
import { generatePlan, dayTotals, shoppingList, sumItems } from '../../src/lib/nutrition.js';
import { buildAssessment, formatFoodPortion } from '../../src/lib/nutrition-journey.js';

const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const precise = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 15 }).format(value);
const normalize = value => String(value).replace(/\s+/g, ' ').replace(/:\s+/g, ' ').trim();
const secrets = ['PRIVATE_CLINICAL_NOTES', 'PRIVATE_MEDICATION', 'PRIVATE_CONTACT', 'PRIVATE_PHOTO', 'UNREVIEWED_TEA_CONTENT'];

function fixture() {
  // Synthetic values exercise every delivery block; this is not a prescription.
  const intake = {
    diet: 'omnivore', goal: 'wellbeing', conditions: ['hypertension'], allergies: ['fish'], excludedFoodIds: ['banana'],
    likedFoodIds: ['apple'], dislikedFoodIds: ['pear'], intolerances: ['lactose'],
    foodExclusionNotes: 'Exclusão alimentar registrada para verificar os dois documentos',
    seasoningPreferences: 'Tempero preferido da avaliação fictícia',
    seasoningExclusions: 'Tempero excluído da avaliação fictícia', avoidReadySeasonings: true,
    routine: 'Rotina registrada para verificar os dois documentos',
    activityDetails: 'Atividade registrada na avaliação fictícia',
    waterIntake: 'Consumo relatado na avaliação fictícia',
    bristolType: 3, bowelFrequency: 'Frequência intestinal registrada na avaliação fictícia',
    teaHabit: 'sometimes', teasUsed: 'Camomila relatada no questionário',
    teaPreferences: 'Preferência de chá registrada', teaAvoidances: 'Chá a evitar registrado',
    clinicalNotes: secrets[0], medications: secrets[1], email: secrets[2], photos: [{ dataUrl: secrets[3] }],
  };
  const plan = generatePlan(intake);
  plan.title = 'Plano fictício para conferir os dois formatos';
  plan.guidance = 'Orientação editorial fictícia, sem finalidade de prescrição.';
  plan.clinicalNotes = secrets[0];
  plan.targets = { energy: 1800, protein: 98, carbs: 202.5, fat: 60, water: 2100, sodium: 2000, potassium: 3500, phosphorus: 1000 };
  plan.plateGuide = { protein: 25, carbs: 25, vegetables: 50 };
  plan.days = plan.days.map((day, index) => ({ ...day, meals: [
    { name: `Refeição de manhã ${index + 1}`, time: '08:00', note: `Observação exclusiva da manhã do dia ${index + 1}.`, items: [
      { foodId: 'egg', grams: 50 + index, alternatives: [{ foodId: 'chicken', grams: 63 + index }] },
      { foodId: 'bread', grams: 40 + index, alternatives: [{ foodId: 'couscous', grams: 113 + index }] },
      { foodId: 'apple', grams: 123 + index, alternatives: [] },
    ] },
    { name: `Refeição da tarde ${index + 1}`, time: '13:00', note: `Observação exclusiva da tarde do dia ${index + 1}.`, items: [
      { foodId: 'rice', grams: 127 + index, alternatives: [] },
      { foodId: 'chicken', grams: 91 + index, alternatives: [] },
      { foodId: 'carrot', grams: 79 + index, alternatives: [] },
    ] },
  ] }));
  plan.assessment = {
    summary: 'Resumo individual registrado para conferir a entrega.',
    criteria: 'Critérios registrados: metas fictícias selecionadas para este teste.',
    calculationInput: {
      weight: 70, height: 165, age: 35, sex: 'female', activity: 1.4, usualWeight: 74,
      waist: 80, hip: 100, bodyFat: 29, bodyFatMethod: 'Método informado na avaliação fictícia',
      proteinRatio: 1.4, waterRatio: 30, energy: 1800, carbPercent: 45, fatPercent: 30,
      skinfoldMethod: 'jackson-pollock-3', skinfolds: { triceps: 20, suprailiac: 18, thigh: 25 },
      measurementDate: '2026-10-01',
    },
  };
  plan.assessment = buildAssessment(intake, plan, '2026-10-02T12:00:00.000Z');
  plan.curatedModules = [
    { id: 'parity-tea', type: 'tea', title: 'Chá selecionado na avaliação fictícia',
      content: 'Orientação individual revisada sobre o chá, preservada no HTML e no PDF.',
      foodIds: ['apple'], allergens: [], image: '/images/teas/chamomile.jpg', reviewed: true },
    { id: 'parity-draft', type: 'tea', title: secrets[4], content: secrets[4], foodIds: [], allergens: [], reviewed: false },
  ];
  return { intake, plan };
}

function openOffline(html) {
  const { document } = parseHTML(html);
  for (const select of document.querySelectorAll('select')) {
    let selected = Math.max(0, [...select.options].findIndex(option => option.hasAttribute('selected')));
    Object.defineProperties(select, {
      selectedIndex: { get: () => selected, set: value => { selected = value; } },
      value: { get: () => select.options[selected]?.value || '', set: value => { selected = [...select.options].findIndex(option => option.value === String(value)); } },
    });
  }
  const storage = new Map();
  runInNewContext(document.querySelector('script').textContent, {
    document, Intl, Date, Blob,
    window: { print() {}, confirm: () => true },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    URL: { createObjectURL: () => 'blob:parity-test', revokeObjectURL() {} },
    setTimeout: callback => callback(),
  }, { timeout: 10000 });
  return document;
}

function readableText(node) {
  if (node.nodeType === 3) return node.textContent;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.nodeName)) return '';
  return [...node.childNodes].map(readableText).join(' ');
}

test('nutrition delivery: HTML and PDF retain the same approved patient data', { timeout: 120000 }, async t => {
  const { intake, plan } = fixture();
  const emitted = [];
  const pdfLinks = new Set();
  const footerRanges = [];
  let pagesBeforeFooters = null;
  let pagesBeforeFinalization = null;
  const originalText = PDFDocument.prototype.text;
  const originalLink = PDFDocument.prototype.link;
  const originalEnd = PDFDocument.prototype.end;
  // Capture the text passed to the real PDF renderer, while still producing a
  // real PDF in memory. This is a content check, not a clipping/layout check.
  t.mock.method(PDFDocument.prototype, 'text', function (value, ...args) {
    if (value != null) emitted.push(String(value));
    for (const argument of args) if (argument?.link) pdfLinks.add(argument.link);
    const footer = typeof args[1] === 'number' && args[1] >= 785;
    const countBefore = footer ? this.bufferedPageRange().count : null;
    if (footer && pagesBeforeFooters === null) pagesBeforeFooters = countBefore;
    const result = originalText.call(this, value, ...args);
    if (footer) footerRanges.push({ before: countBefore, after: this.bufferedPageRange().count });
    return result;
  });
  t.mock.method(PDFDocument.prototype, 'link', function (x, y, width, height, url, ...args) {
    if (typeof url === 'string') pdfLinks.add(url);
    return originalLink.call(this, x, y, width, height, url, ...args);
  });
  t.mock.method(PDFDocument.prototype, 'end', function (...args) {
    pagesBeforeFinalization = this.bufferedPageRange().count;
    return originalEnd.call(this, ...args);
  });
  const options = { plan, patientName: 'Pessoa Fictícia de Paridade', id: 'delivery-parity', revision: 3, draft: true };
  const html = await buildPlanHtml(options);
  const pdf = await buildPlanPdf(options);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const document = openOffline(html);
  const htmlLinks = new Set([...document.querySelectorAll('a[href]')].map(anchor => anchor.getAttribute('href')));
  const htmlText = normalize(readableText(document.body));
  const pdfText = normalize(emitted.join(' '));
  const bothContain = (value, context = value) => {
    assert.ok(htmlText.includes(normalize(value)), `HTML omitted ${context}`);
    assert.ok(pdfText.includes(normalize(value)), `PDF omitted ${context}`);
  };

  await t.test('assessment, recorded data, methods, formulas and sources are readable in both formats', () => {
    for (const value of [options.patientName, plan.title, plan.guidance, plan.assessment.summary, plan.assessment.criteria]) bothContain(value);
    for (const key of ['foodExclusionNotes', 'seasoningPreferences', 'seasoningExclusions', 'routine', 'activityDetails', 'waterIntake', 'bowelFrequency', 'teasUsed', 'teaPreferences', 'teaAvoidances']) bothContain(intake[key], `assessment ${key}`);
    for (const value of ['Bem-estar e rotina', 'Onívoro', 'Hipertensão', 'Peixe', 'Intolerância à lactose', foodById.banana.name, foodById.pear.name]) bothContain(value, `readable questionnaire data: ${value}`);
    for (const id of ['bmi', 'resting', 'expenditure', 'waistHip', 'waistHeight', 'fatMass', 'leanMass', 'skinfoldSum', 'bodyDensity', 'skinfoldBodyFat', 'skinfoldFatMass', 'skinfoldLeanMass', 'protein', 'water', 'energy', 'carbs', 'fat']) {
      assert.ok(plan.assessment.calculations.some(calculation => calculation.id === id), `Fixture must exercise ${id}`);
    }
    for (const record of plan.assessment.calculations) {
      for (const value of [record.label, record.method, record.formula, `${precise(record.value)} ${record.unit}`, record.source.title].filter(Boolean)) bothContain(value, `${record.id}: ${value}`);
      if (record.source.url) {
        assert.ok(htmlLinks.has(record.source.url), `HTML omitted clickable source for ${record.id}`);
        assert.ok(pdfLinks.has(record.source.url), `PDF omitted clickable source for ${record.id}`);
      }
      for (const input of record.inputs) bothContain(`${input.label} ${typeof input.value === 'number' ? precise(input.value) : input.value}${input.unit ? ` ${input.unit}` : ''}`, `${record.id} input ${input.label}`);
    }
    bothContain('horário de Brasília');
    bothContain(foodSource.title, 'food composition source');
  });

  await t.test('every individual target retains its value, unit and origin', () => {
    const labels = { energy: 'Energia', protein: 'Proteínas', carbs: 'Carboidratos', fat: 'Gorduras', water: 'Água', sodium: 'Sódio', potassium: 'Potássio', phosphorus: 'Fósforo' };
    assert.equal(Object.keys(plan.assessment.targetSources).length, 8);
    for (const [key, target] of Object.entries(plan.assessment.targetSources)) {
      bothContain(`${labels[key]}: ${precise(target.value)} ${target.unit}`, `individual target ${key}`);
      bothContain(target.method, `target origin ${key}`);
    }
  });

  await t.test('all seven days retain meals, household portions, approved substitutions and shopping quantities', () => {
    assert.equal(plan.days.length, 7);
    const weekTotals = plan.days.map(dayTotals);
    for (const [key, unit] of [['kcal', 'kcal'], ['protein', 'g'], ['carbs', 'g'], ['fat', 'g'], ['fiber', 'g']]) {
      const average = decimal(weekTotals.reduce((sum, total) => sum + total[key], 0) / weekTotals.length);
      const averageNode = document.getElementById(`week-average-${key}`);
      assert.ok(averageNode, `HTML omitted weekly average ${key}`);
      assert.ok(normalize(readableText(averageNode)).includes(`${average} ${unit}`), `HTML weekly average ${key}: expected ${average} ${unit}, got ${normalize(readableText(averageNode))}`);
      assert.ok(pdfText.includes(`${average} ${unit}`), `PDF omitted weekly average ${key}`);
    }
    for (const [dayIndex, day] of plan.days.entries()) {
      const dayNode = document.getElementById(`day-${dayIndex}`);
      assert.ok(dayNode, `HTML has navigable day ${dayIndex + 1}`);
      bothContain(day.label);
      const total = dayTotals(day);
      for (const [key, unit] of [['kcal', 'kcal'], ['protein', 'g'], ['carbs', 'g'], ['fat', 'g'], ['fiber', 'g']]) {
        assert.ok(pdfText.includes(`${decimal(total[key])} ${unit}`), `PDF omitted day ${dayIndex + 1} ${key}`);
        assert.ok(normalize(readableText(dayNode)).includes(decimal(total[key])), `HTML omitted day ${dayIndex + 1} ${key}`);
      }
      for (const meal of day.meals) {
        bothContain(meal.name); bothContain(meal.time); bothContain(meal.note);
        for (const item of meal.items) {
          for (const option of [item, ...item.alternatives]) {
            bothContain(foodById[option.foodId].name);
            bothContain(`${decimal(option.grams)} g`);
            // PDF may abbreviate the label and the single-unit reference; the
            // household quantity itself must survive in both deliveries.
            const household = formatFoodPortion(option.foodId, option.grams).split('≈ ')[1].split(' (1 ')[0];
            bothContain(household, `household portion ${option.foodId} ${option.grams}g`);
            const values = sumItems([option]);
            bothContain(`${decimal(values.kcal)} kcal`, `option energy ${option.foodId} ${option.grams}g`);
            for (const [key, label] of [['protein', 'P'], ['carbs', 'C'], ['fat', 'G']]) {
              // Formats may spell out the label differently; both must retain
              // the exact amount calculated for this approved alternative.
              assert.ok(pdfText.includes(`${label} ${decimal(values[key])} g`), `PDF omitted ${key} for ${option.foodId} ${option.grams}g`);
            }
          }
        }
      }
    }
    for (const item of shoppingList(plan)) bothContain(`${decimal(item.grams)} g`, `weekly shopping ${item.food.id}`);
    assert.ok(document.querySelectorAll('[data-choice]').length > 0, 'HTML substitutions are actually rendered by the offline app');
  });

  await t.test('reviewed tea content and Bristol descriptions are included, private data and drafts are excluded', () => {
    bothContain(plan.curatedModules[0].title); bothContain(plan.curatedModules[0].content);
    bothContain(`Alimentos deste conteúdo: ${foodById.apple.name}`);
    const reported = bristolTypes.find(type => type.type === intake.bristolType);
    bothContain(reported.label, `reported Bristol type ${reported.type}`);
    bothContain(reported.description, 'reported Bristol description');
    bothContain(bristolSource.title, 'Bristol source');
    assert.ok(htmlLinks.has(bristolSource.url), 'HTML omitted clickable Bristol reference');
    assert.ok(pdfLinks.has(bristolSource.url), 'PDF omitted clickable Bristol reference');
    for (const secret of secrets) {
      assert.ok(!html.includes(secret), `HTML leaks ${secret}`);
      assert.ok(!pdfText.includes(secret), `PDF leaks ${secret}`);
    }
  });

  await t.test('rendering fixed footers does not append extra pages', () => {
    assert.ok(pagesBeforeFooters > 0, 'The real PDF must render fixed footers');
    assert.ok(footerRanges.length >= pagesBeforeFooters, 'Every page must receive a footer');
    for (const range of footerRanges) assert.equal(range.after, range.before, 'Footer text unexpectedly appended a page');
    assert.equal(pagesBeforeFinalization, pagesBeforeFooters, 'Footer pass changed the final page count');
  });
});
