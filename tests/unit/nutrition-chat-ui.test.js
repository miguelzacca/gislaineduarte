import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, act } from 'react';
import { parseHTML } from 'linkedom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

test('floating assistant opens, uses current page context, exposes explicit actions and resets between patients', async t => {
  const { window, document } = parseHTML('<html><body><div id="root"></div></body></html>'); document.oninput = null;
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT', 'fetch'];
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries({ window, document, navigator: { userAgent: 'unit-test' }, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const { createRoot } = await import('react-dom/client');
  const server = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, logLevel: 'error' });
  const root = createRoot(document.getElementById('root'));
  const click = async element => { assert.ok(element); await act(async () => element.dispatchEvent(new window.Event('click', { bubbles: true }))); };
  const submit = async () => { await act(async () => document.querySelector('.nutrition-copilot__form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))); };
  const type = async value => { const element = document.querySelector('#nutrition-copilot-input'); await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new window.Event('input', { bubbles: true })); }); };
  try {
    const { NutritionCopilotProvider, useNutritionAssistantPage } = await server.ssrLoadModule('/src/components/NutritionCopilot.jsx');
    let builds = 0; let payload; let calls = 0;
    function Page({ requestId = 'patient-one', scope = 'professional', step = 2, visible = true }) {
      useNutritionAssistantPage({ scope, requestId: scope === 'professional' ? requestId : undefined, view: scope === 'professional' ? 'plan' : 'intake', label: scope === 'professional' ? 'Plano em edição' : 'Anamnese · Saúde', goal: 'muscle', revision: 0, step, visible }, scope === 'professional' ? { 'build-week': () => { builds++; } } : {}, 10);
      return createElement('p', null, 'Página do atendimento');
    }
    const render = props => act(async () => root.render(createElement(NutritionCopilotProvider, { initialPage: { scope: 'intake', visible: false } }, createElement(Page, props))));
    globalThis.fetch = async (url, init) => { calls++; payload = JSON.parse(init.body); assert.equal(url, '/api/admin/nutrition-assistant'); return Response.json({ reply: 'Vamos distribuir as **fontes de proteína** na semana. <script>neverExecute()</script>', actions: ['build-week'], model: 'nvidia/nemotron-3-ultra-550b-a55b' }); };
    await t.test('opening performs no provider call; sending carries current context and a reviewable action', async () => {
      await render({}); assert.match(document.querySelector('.nutrition-copilot__launcher').textContent, /Seu assistente/);
      await click(document.querySelector('.nutrition-copilot__launcher'));
      assert.equal(document.querySelector('[role=dialog]').getAttribute('aria-modal'), 'false'); assert.equal(calls, 0);
      await type('Me ajude a montar a semana.'); await submit();
      assert.equal(calls, 1); assert.equal(payload.page.requestId, 'patient-one'); assert.equal(payload.page.goal, 'muscle'); assert.equal(payload.messages.at(-1).content, 'Me ajude a montar a semana.');
      assert.match(document.querySelector('[role=log]').textContent, /NVIDIA.*fontes de proteína/); assert.match(document.querySelector('.nutrition-copilot__model').textContent, /ultra/);
      assert.equal(document.querySelector('.nutrition-copilot__message--assistant strong').textContent, 'fontes de proteína'); assert.equal(document.querySelector('.nutrition-copilot__message script'), null);
      assert.equal(builds, 0); await click(document.querySelector('.nutrition-copilot__actions button')); assert.equal(builds, 1);
    });
    await t.test('another patient starts a fresh conversation instead of retaining the previous case', async () => {
      await render({ requestId: 'patient-two' }); assert.equal(document.querySelectorAll('.nutrition-copilot__message').length, 0);
      assert.match(document.querySelector('[role=dialog]').textContent, /Vamos preparar/);
    });
    await t.test('pending send is deduplicated and history is forwarded without provider metadata', async () => {
      let finish; globalThis.fetch = async (_url, init) => { calls++; payload = JSON.parse(init.body); return new Promise(resolve => { finish = resolve; }); };
      await type('Analise este objetivo.'); const before = calls;
      await submit(); assert.equal(calls, before + 1); assert.equal(document.querySelector('button[aria-label="Enviar mensagem"]').disabled, true);
      await act(async () => finish(Response.json({ reply: 'O objetivo é hipertrofia.', actions: [], model: 'nvidia/test' })));
      globalThis.fetch = async (_url, init) => { payload = JSON.parse(init.body); return Response.json({ reply: 'Confira a meta profissional.', actions: [], model: 'nvidia/test' }); };
      await type('E as metas?'); await submit();
      assert.equal(payload.messages.length, 3); assert.equal(payload.messages[1].role, 'assistant'); assert.equal('model' in payload.messages[1], false);
    });
    await t.test('intake help uses the public endpoint, explains the step and offers no plan actions', async () => {
      await render({ scope: 'intake', step: 2 });
      globalThis.fetch = async (url, init) => { assert.equal(url, '/api/nutrition/assistant'); payload = JSON.parse(init.body); return Response.json({ reply: 'Informe alergias que você conhece e descreva as reações à Gi.', actions: [], model: 'nvidia/test' }); };
      await type('Como preencher a saúde?'); await submit();
      assert.equal(payload.page.step, 2); assert.equal(payload.page.requestId, undefined); assert.match(document.querySelector('.nutrition-copilot__context').textContent, /Saúde/); assert.equal(document.querySelectorAll('.nutrition-copilot__actions button').length, 0);
      await render({ visible: false }); assert.equal(document.querySelector('.nutrition-copilot'), null);
    });
  } finally {
    await act(async () => root.unmount()); await server.close();
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
