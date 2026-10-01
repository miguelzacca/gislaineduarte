import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { getNutritionStore } from '../../server/nutrition/store.js';
import { handleAdminNutritionRequest } from '../../api/admin/nutrition.js';
import { adminCookie } from '../../server/recipes/admin.js';
import { analyzeWithNim } from '../../server/nutrition/ai.js';

test('professional library persists edited models and curated content with conflict protection', async t => {
  const pg = await PGlite.create();
  const store = { query: (...args) => pg.query(...args), connect: async () => ({ query: (...args) => pg.query(...args), release() {} }) };
  const env = { NUTRITION_DATA_KEY: randomBytes(32).toString('base64'), RECIPES_ADMIN_USERNAME: 'library-test', RECIPES_ADMIN_PASSWORD: 'test-only-password', RECIPES_ADMIN_SESSION_SECRET: randomBytes(40).toString('hex'), DATABASE_URL: 'isolated-only', RECIPES_SITE_URL: 'https://nutrition.example', NODE_ENV: 'test' };
  await getNutritionStore(env, store);
  const cookie = adminCookie(new Request('https://nutrition.example/api/admin/session'), env).split(';')[0];
  const request = (action, body, query = '', headers = {}) => handleAdminNutritionRequest(new Request(`https://nutrition.example/api/admin/nutrition?action=${action}${query}`, {
    method: body ? 'POST' : 'GET', headers: { origin: 'https://nutrition.example', cookie, ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
  }), { env, store });
  try {
    await t.test('authentication and origin are required even without a patient record', async () => {
      assert.equal((await request('library', null, '', { cookie: '' })).status, 401);
      assert.equal((await request('library-save', { revision: 0, modules: [] }, '', { origin: 'https://other.example' })).status, 403);
      assert.equal((await request('template-detail', null, '&templateId=not-a-template')).status, 404);
    });
    await t.test('personal model create, edit, duplicate and delete do not overwrite another revision', async () => {
      const builtin = await (await request('template-detail', null, '&templateId=balanced-pratica')).json();
      assert.equal(builtin.builtin, true);
      builtin.plan.days[0].meals[0].name = 'Café da manhã da biblioteca';
      builtin.plan.days[0].meals[0].items[0].grams = 110;
      builtin.plan.assessment = { summary: 'A avaliação pertence à pessoa', criteria: '', calculationInput: null };
      builtin.plan.clinicalNotes = 'Registro privado';
      const input = { title: 'Rotina editada', profile: 'balanced', goals: ['wellbeing'], plan: builtin.plan };
      const create = await request('template-save', input); assert.equal(create.status, 200);
      const saved = await create.json(); assert.equal(saved.builtin, false); assert.equal(saved.revision, 1); assert.ok(saved.kcal > 0); assert.ok(saved.images.length > 0);
      assert.equal(saved.plan.days[0].meals[0].items[0].grams, 110); assert.equal(saved.plan.days[0].meals[0].name, 'Café da manhã da biblioteca');
      assert.equal(saved.plan.clinicalNotes, ''); assert.equal(saved.plan.assessment.summary, ''); assert.equal(saved.plan.targets.energy, null);
      const edit = await request('template-save', { ...input, id: saved.id, revision: 1, title: 'Rotina atualizada' }); assert.equal(edit.status, 200); assert.equal((await edit.json()).revision, 2);
      assert.equal((await request('template-save', { ...input, id: saved.id, revision: 1 })).status, 409);
      const copy = await (await request('template-save', { ...input, title: 'Cópia independente' })).json(); assert.notEqual(copy.id, saved.id);
      assert.equal((await request('template-delete', { templateId: saved.id, revision: 1 })).status, 409);
      assert.equal((await request('template-delete', { templateId: saved.id, revision: 2 })).status, 200);
      assert.equal((await request('template-detail', null, `&templateId=${copy.id}`)).status, 200);
    });
    await t.test('tea content persists photographs and requires its own subsequent clinical review', async () => {
      const initial = await (await request('library')).json(); const tea = initial.modules.find(item => item.type === 'tea');
      assert.ok(tea.image.startsWith('/images/teas/'));
      const modules = initial.modules.map(item => item.id === tea.id ? { ...item, title: 'Chá para avaliação profissional', reviewed: true } : item);
      const save = await request('library-save', { revision: initial.revision, modules }); assert.equal(save.status, 200);
      const saved = await save.json(); assert.equal(saved.revision, initial.revision + 1); assert.equal(saved.modules.find(item => item.id === tea.id).reviewed, false);
      const reload = await (await request('library')).json(); assert.equal(reload.modules.find(item => item.id === tea.id).title, 'Chá para avaliação profissional');
      assert.equal((await request('library-save', { revision: initial.revision, modules })).status, 409);
      assert.equal((await request('library-save', { revision: saved.revision, modules: [{ ...tea, image: 'https://127.0.0.1/private.png' }] })).status, 400);
    });
  } finally { await pg.close(); }
});

test('NIM can recommend a saved model without receiving patient identity or free-text history', async () => {
  let payload;
  const analysis = await analyzeWithNim({ name: 'Nome privado', email: 'private@example.com', phone: '47999990000', aiConsent: true, conditions: [], allergies: [], symptoms: [], diet: 'omnivore', goal: 'wellbeing', teaPreferences: 'Texto particular' }, {
    env: { NVIDIA_NIM_API_KEY: 'test-key' }, customTemplates: [{ id: 'saved-model', title: 'Rotina salva', profile: 'balanced', goals: ['wellbeing'] }], fetcher: async (_url, options) => {
      payload = options.body;
      return Response.json({ choices: [{ message: { content: JSON.stringify({ summary: 'Base de organização para revisar.', templateIds: ['saved-model'], questions: [], actions: [] }) } }] });
    },
  });
  assert.deepEqual(analysis.templateIds, ['saved-model']); assert.ok(payload.includes('saved-model')); assert.ok(!payload.includes('Nome privado')); assert.ok(!payload.includes('private@example.com')); assert.ok(!payload.includes('Texto particular'));
});
