import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { load } from 'cheerio';

test('professional journey renders constraints, calculation origins and content review together', async t => {
  const server = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, logLevel: 'error' });
  try {
    const { CalculationTrail, CuratedContentEditor, MealQuantityVisual, PatientBrief, TemplateFinder } = await server.ssrLoadModule('/src/components/NutritionProfessionalJourney.jsx');
    const { ClinicalMeasurementFields } = await server.ssrLoadModule('/src/components/NutritionClinicalEditor.jsx');
    const render = (component, props) => load(renderToStaticMarkup(createElement(component, props)));
    await t.test('critical restrictions are named and remain outside collapsible content', () => {
      const $ = render(PatientBrief, { intake: { goal: 'muscle', conditions: ['glp1'], allergies: ['milk'], allergyNotes: 'Reação relatada', intolerances: ['lactose'], excludedFoodIds: ['egg'], medications: 'Substância informada pela pessoa', glp1Details: 'Nome específico do medicamento', dislikes: 'Prefere evitar frituras' }, onOpen() {} });
      assert.equal($('details').length, 0);
      assert.match($('dl').text(), /Proteína do leite/);
      assert.match($('dl').text(), /Lactose/);
      assert.match($('dl').text(), /Nome específico do medicamento/);
      assert.match($('dl').text(), /Ovo/);
    });
    await t.test('calculation display shows a real result and does not infer missing anthropometry', () => {
      const $ = render(CalculationTrail, { assessment: { calculationInput: { weight: 80, proteinRatio: 1.5 } } });
      assert.match($('section').text(), /120 g\/dia/);
      assert.match($('section').text(), /Peso: 80 kg/);
      assert.match($('section').text(), /1,5 g\/kg/);
      assert.doesNotMatch($('section').text(), /Mifflin|kg\/m²/);
      const empty = render(CalculationTrail, {});
      assert.equal(empty('article').length, 0);
      assert.match(empty('section').text(), /Nenhum cálculo aplicado/);
    });
    await t.test('egg name is separate from quantity and macros have gram labels', () => {
      const $ = render(MealQuantityVisual, { meal: { items: [{ foodId: 'egg', grams: 100 }, { foodId: 'rice', grams: 120 }] } });
      assert.match($('li').first().text(), /Quantidade: 100 g/);
      assert.match($('li').first().text(), /≈ 2 unidades/);
      assert.doesNotMatch($('li').first().text(), /2 ×|2 ovo inteiro/i);
      assert.match($('.nj-macro').text(), /Carboidratos.*gProteínas.*g/s);
    });
    await t.test('skinfold preview leaves fat and lean mass unknown until weight is supplied', () => {
      const $ = render(ClinicalMeasurementFields, { values: { sex: 'female', age: 30, pregnant: false, skinfoldMethod: 'jackson-pollock-3', measurementDate: '2026-09-30', skinfolds: { triceps: 20, suprailiac: 18, thigh: 25 } }, onChange() {} });
      assert.equal($('.nw-calc-results strong').slice(-2).text(), '——');
      assert.match($('.nw-calc-results').text(), /Gordura estimada/);
    });
    await t.test('library includes goal and context controls and a selected custom model', () => {
      const $ = render(TemplateFinder, { value: 'custom-id', custom: [{ id: 'custom-id', title: 'Modelo próprio', profile: 'diabetes', goals: ['muscle'] }], onChange() {} });
      assert.equal($('input[type=search]').length, 1);
      assert.equal($('select').length, 2);
      assert.match($('select').first().text(), /Hipertrofia/);
      assert.match($('select').last().text(), /GLP-1/);
      assert.equal($('button[aria-pressed=true]').length, 1);
      assert.match($('.nj-selected-base').text(), /Modelo próprio/);
    });
    await t.test('content with declared allergen cannot be marked reviewed for an allergic client', () => {
      const $ = render(CuratedContentEditor, { intake: { allergies: ['milk'], conditions: [], medications: 'Substância identificada' }, plan: { curatedModules: [{ id: 'custom', type: 'supplement', title: 'Conteúdo em avaliação', content: 'Composição a conferir.', foodIds: [], allergens: ['milk'], reviewed: false }] }, onChange() {}, onOpenIntake() {} });
      assert.match($('.nj-module-checks').text(), /alérgeno/);
      assert.match($('.nj-module-checks').text(), /medicamento/);
      assert.equal($('.nj-module>.nw-check input').prop('disabled'), true);
      assert.match($('.nj-module').text(), /Aguardando sua revisão/);
    });
  } finally { await server.close(); }
});
