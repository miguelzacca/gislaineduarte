import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, act } from 'react';
import { parseHTML } from 'linkedom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { generatePlan } from '../../src/lib/nutrition.js';

test('workspace preserves unrecorded calculations across tabs and guards commercial edits', async t => {
  const { window, document } = parseHTML('<html><body><div id="root"></div></body></html>');
  // A DOM unit harness: no browser, Playwright, HTTP server or patient record is used.
  document.oninput = null;
  const previous = new Map(['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries({ window, document, navigator: { userAgent: 'unit-test' }, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  window.confirm = () => false;
  globalThis.fetch = async () => { throw new Error('Unexpected external request in isolated UI test'); };
  const { createRoot } = await import('react-dom/client');
  const server = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, logLevel: 'error' });
  const root = createRoot(document.getElementById('root'));
  const click = async element => { assert.ok(element, 'control exists'); await act(async () => { element.dispatchEvent(new window.Event('click', { bubbles: true })); }); };
  const button = text => [...document.querySelectorAll('button')].find(item => item.textContent === text);
  const field = text => [...document.querySelectorAll('label')].find(item => item.textContent.startsWith(text))?.querySelector('input');
  const input = async (element, value) => {
    assert.ok(element, 'input exists');
    await act(async () => {
      if (!element.type) element.type = 'text'; // Match the browser default absent in linkedom.
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value);
      element.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
  };
  try {
    const { PlanWorkspace, OfferSettings } = await server.ssrLoadModule('/src/components/NutritionWorkspace.jsx');
    await t.test('measurements survive opening the intake and returning; leaving prompts before losing them', async () => {
      const intake = { name: 'Pessoa de demonstração', age: 34, weight: 70, height: 165, sex: 'female', activity: 1.2, conditions: [], allergies: [], excludedFoodIds: [], symptoms: [], diet: 'omnivore', aiConsent: false };
      let editing; let leaves = 0;
      const initial = { id: 'demo', intake, plan: generatePlan(intake), revision: 1, stage: 'draft', payment: 'paid', offer: { followupDays: 30 }, versions: [], events: [], checkins: [] };
      await act(async () => { root.render(createElement(PlanWorkspace, { initial, data: { templates: [], integrations: { ai: false } }, onEditingStateChange: state => { editing = state; }, onBack: () => { leaves++; } })); });
      await click(button('Cálculos'));
      await input(field('Peso (kg)'), '73.5');
      await input(field('Fator de atividade'), '1.42');
      assert.equal(editing.dirty, true);
      await click(button('Anamnese'));
      assert.match(document.body.textContent, /Cálculos em edição preservados/);
      await click(button('Cálculos'));
      assert.equal(field('Peso (kg)').value, '73.5'); assert.equal(field('Fator de atividade').value, '1.42');
      await click(button('← Todos os atendimentos')); assert.equal(leaves, 0);
      const unload = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); assert.equal(unload.defaultPrevented, true);
      await click(button('Registrar estes cálculos sem alterar as metas'));
      assert.doesNotMatch(document.body.textContent, /Cálculos em edição preservados/);
      assert.match(document.body.textContent, /Peso: 73,5 kg/);
      assert.equal(editing.dirty, true, 'recording the input still requires saving the plan');
    });
    await t.test('assistant uses the objective directly, keeps unsaved edits and applies only after review', async () => {
      const intake = { name: 'Pessoa de demonstração', age: 34, weight: 70, height: 165, sex: 'female', activity: 1.2, conditions: [], allergies: [], excludedFoodIds: [], symptoms: [], diet: 'omnivore', goal: 'muscle', aiConsent: true };
      const plan = generatePlan(intake, 'balanced-pratica'); const calls = []; let editing;
      const analysis = { contextVersion: 2, goal: 'muscle', summary: 'Base pelo objetivo.', templateIds: ['muscle-pratica'], recommendations: [{ templateId: 'muscle-pratica', reason: 'Distribuir refeições para a rotina de treino.' }], questions: [], actions: [] };
      const initial = { id: 'assistant-demo', intake, plan, analysis, revision: 1, stage: 'draft', payment: 'paid', versions: [], events: [], checkins: [] };
      globalThis.fetch = async (url, options) => {
        const action = new URL(url, 'https://nutrition.example').searchParams.get('action'); calls.push(action);
        const body = JSON.parse(options.body);
        assert.equal(action, 'ai-draft'); assert.equal(body.goal, 'muscle'); assert.equal(body.templateId, 'muscle-pratica'); assert.equal(body.plan.title, 'Rascunho ainda em edição');
        return Response.json({ suggestion: { ...generatePlan(intake, 'muscle-pratica'), title: 'Sugestão pronta para comparar' }, assistant: { summary: 'Toda a semana organizada.', questions: [], actions: [] }, selectedTemplateId: 'muscle-pratica' });
      };
      await act(async () => { root.render(createElement(PlanWorkspace, { key: 'assistant-demo', initial, data: { templates: [], integrations: { ai: true } }, onEditingStateChange: state => { editing = state; } })); });
      assert.equal(document.querySelector('.nj-template-finder select').value, 'muscle');
      assert.doesNotMatch(document.querySelector('.nw-assistant-templates').textContent, /GLP-1/);
      await input(field('Título do plano'), 'Rascunho ainda em edição');
      await act(async () => { const control = button('Montar semana com IA'); control.dispatchEvent(new window.Event('click', { bubbles: true })); control.dispatchEvent(new window.Event('click', { bubbles: true })); });
      assert.deepEqual(calls, ['ai-draft']);
      assert.equal(field('Título do plano').value, 'Rascunho ainda em edição');
      assert.match(document.querySelector('.nw-suggestion').textContent, /Toda a semana organizada/);
      await click(button('Aplicar ao rascunho para editar'));
      assert.equal(field('Título do plano').value, 'Sugestão pronta para comparar'); assert.equal(editing.dirty, true);
      assert.equal(document.querySelector('.nw-suggestion'), null); assert.deepEqual(calls, ['ai-draft'], 'applying does not save or publish');
    });
    await t.test('first AI draft can be compared, applied, undone and redone without saving', async () => {
      const intake = { name: 'Pessoa de demonstração', goal: 'muscle', conditions: [], allergies: [], excludedFoodIds: [], symptoms: [], diet: 'omnivore', aiConsent: true };
      const analysis = { contextVersion: 2, goal: 'muscle', professionalRequest: 'Preparos simples.', summary: 'Base pelo objetivo.', templateIds: ['muscle-pratica'], recommendations: [], questions: [], actions: [] };
      const initial = { id: 'first-draft-demo', intake, plan: null, analysis, revision: 0, stage: 'received', payment: 'pending', versions: [], events: [], checkins: [] };
      let calls = 0; globalThis.fetch = async (_url, options) => { calls++; assert.equal(JSON.parse(options.body).professionalRequest, 'Preparos simples.'); return Response.json({ suggestion: generatePlan(intake), assistant: { summary: 'Primeira semana pronta.', questions: [], actions: [] }, selectedTemplateId: 'muscle-pratica' }); };
      await act(async () => { root.render(createElement(PlanWorkspace, { key: 'first-draft-demo', initial, data: { templates: [], integrations: { ai: true } } })); });
      // linkedom does not mirror textarea.defaultValue into its initial value.
      assert.equal(document.querySelector('.nw-assistant-inputs textarea').defaultValue, 'Preparos simples.');
      await click(button('Montar semana com IA')); assert.ok(document.querySelector('.nw-suggestion'));
      assert.equal(field('Título do plano'), undefined);
      await click(button('Aplicar ao rascunho para editar')); assert.ok(field('Título do plano'));
      await click(button('↶ Desfazer')); assert.equal(field('Título do plano'), undefined);
      await click(button('↷ Refazer')); assert.ok(field('Título do plano')); assert.equal(calls, 1);
    });
    await t.test('assistant honors Retry-After while leaving local editing available', async () => {
      const intake = { name: 'Pessoa de demonstração', goal: 'muscle', conditions: [], allergies: [], excludedFoodIds: [], symptoms: [], diet: 'omnivore', aiConsent: true };
      const analysis = { contextVersion: 2, goal: 'muscle', summary: 'Base pelo objetivo.', templateIds: ['muscle-pratica'], recommendations: [], questions: [], actions: [] };
      const initial = { id: 'cooldown-demo', intake, plan: generatePlan(intake), analysis, revision: 1, stage: 'draft', payment: 'paid', versions: [], events: [], checkins: [] };
      let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({ error: 'Aguarde a cota.', retryAfter: 17 }, { status: 429 }); };
      await act(async () => { root.render(createElement(PlanWorkspace, { key: 'cooldown-demo', initial, data: { templates: [], integrations: { ai: true } } })); });
      await click(button('Indicar modelos com IA'));
      assert.equal(calls, 1); assert.equal(button('Montar semana com IA').hasAttribute('disabled'), true);
      assert.match(document.querySelector('.nw-assistant-panel').textContent, /Aguarde 17 s/);
      assert.equal(field('Título do plano').hasAttribute('disabled'), false);
    });
    await t.test('offer fields notify the enclosing panel and protect refresh while unsaved', async () => {
      let editing;
      const offer = { title: 'Oferta de exemplo', description: '', priceCents: 25000, deliveryDays: 3, followupDays: 30, published: false, revision: 2 };
      await act(async () => { root.render(createElement(OfferSettings, { offer, integrations: { ai: false, checkout: false }, onSaved: async () => ({ offer }), onEditingStateChange: state => { editing = state; } })); });
      await input(field('Preço (R$)'), '275,00');
      assert.equal(editing.dirty, true);
      assert.match(document.body.textContent, /Alterações na oferta ainda não salvas/);
      const unload = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(unload); assert.equal(unload.defaultPrevented, true);
      globalThis.fetch = async (_url, options) => { assert.equal(JSON.parse(options.body).revision, 2); return Response.json({ error: 'A oferta mudou em outra aba.' }, { status: 409 }); };
      await act(async () => { document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
      assert.match(document.body.textContent, /A oferta mudou em outra aba/); assert.equal(field('Preço (R$)').value, '275,00'); assert.equal(editing.dirty, true);
      window.confirm = () => true;
      await click(button('Conferir oferta salva'));
      assert.equal(field('Preço (R$)').value, '250.00'); assert.equal(editing.dirty, false);
    });
  } finally {
    await act(async () => { root.unmount(); });
    await server.close();
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
