import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { handleAdminNutritionRequest } from '../../api/admin/nutrition.js';
import { adminCookie } from '../../server/recipes/admin.js';
import { getNutritionStore, seal, unseal } from '../../server/nutrition/store.js';
import { defaultNimModel, fallbackNimModel } from '../../server/nutrition/ai.js';
import { generatePlan, validatePlan } from '../../src/lib/nutrition.js';

test('assistant API: reviewable drafts, always-on AI, provider fallback and shared 40/min quota in an isolated database', async t => {
  const pg = await PGlite.create();
  const store = { query: (...args) => pg.query(...args), connect: async () => ({ query: (...args) => pg.query(...args), release() {} }) };
  const env = { NUTRITION_DATA_KEY: randomBytes(32).toString('base64'), RECIPES_ADMIN_USERNAME: 'test-only', RECIPES_ADMIN_PASSWORD: 'test-only-password', RECIPES_ADMIN_SESSION_SECRET: randomBytes(40).toString('hex'), NVIDIA_NIM_API_KEY: 'test-only-key', NODE_ENV: 'test' };
  await getNutritionStore(env, store);
  const admin = adminCookie(new Request('https://nutrition.example/api/admin/session'), env).split(';')[0];
  const intake = { name: 'Pessoa fictícia', age: 30, weight: 70, height: 170, sex: 'female', activity: 1.2, goal: 'muscle', diet: 'omnivore', aiConsent: true, conditions: [], allergies: [], symptoms: [], excludedFoodIds: [], pregnant: false };
  const seed = async ({ consent = true, plan = null, stage = 'received' } = {}) => {
    const id = randomUUID();
    await store.query("INSERT INTO nutrition_requests (id,intake_encrypted,consent_version,access_hash,idempotency_hash,ip_hash,amount_cents,offer_snapshot,merchant_handle,webhook_hash,webhook_encrypted,plan_encrypted,stage) VALUES ($1,$2,'test',$5,$5,'test',100,'{}','test','test','test',$3,$4)", [id, seal({ ...intake, aiConsent: consent }, env), plan ? seal(plan, env) : null, stage, id]);
    return id;
  };
  const defaultReply = async (_url, init) => {
    const context = JSON.parse(JSON.parse(init.body).messages[1].content);
    const content = context.days ? { summary: 'Semana organizada para revisão.', questions: [], actions: [], meals: context.days.flatMap(day => day.meals.map(meal => ({ day: day.day, meal: meal.meal, moduleId: meal.options[1] || 'current' }))) } : { summary: 'Hipertrofia com organização prática.', templateIds: ['muscle-pratica'], recommendations: [{ templateId: 'muscle-pratica', reason: 'Base por objetivo.' }], questions: [], actions: [] };
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] });
  };
  const request = (action, body, fetcher = defaultReply) => handleAdminNutritionRequest(new Request(`https://nutrition.example/api/admin/nutrition?action=${action}`, { method: 'POST', headers: { origin: 'https://nutrition.example', cookie: admin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { env, store, fetcher });
  const resetQuota = async () => { await store.query("DELETE FROM nutrition_events WHERE type='ai_requested'"); await store.query("UPDATE nutrition_ai_limit SET blocked_until=now()-interval '1 second'"); };
  try {
    await t.test('first complete assembly remains a suggestion until an explicit save', async () => {
      const id = await seed(); const result = await request('ai-draft', { id, revision: 0, templateId: 'muscle-pratica' });
      assert.equal(result.status, 200); const body = await result.json();
      assert.equal(body.suggestion.days.length, 7); assert.deepEqual(validatePlan(body.suggestion, intake), []);
      const untouched = (await store.query('SELECT plan_encrypted,revision,stage FROM nutrition_requests WHERE id=$1', [id])).rows[0];
      assert.equal(untouched.plan_encrypted, null); assert.equal(untouched.revision, 0); assert.equal(untouched.stage, 'received');
      const saved = await request('save', { id, revision: 0, plan: body.suggestion });
      assert.equal(saved.status, 200); assert.equal((await saved.json()).revision, 1);
    });
    await t.test('unsaved edits and professional targets survive choosing a new base', async () => {
      const current = generatePlan(intake, 'balanced-pratica'); const id = await seed({ plan: current });
      const draft = structuredClone(current); draft.title = 'Título em edição'; draft.targets.energy = 2100; draft.targets.protein = 110; draft.clinicalNotes = 'Registro privado em edição';
      const result = await request('ai-draft', { id, revision: 0, templateId: 'muscle-pratica', plan: draft });
      assert.equal(result.status, 200); const body = await result.json();
      assert.equal(body.suggestion.title, draft.title); assert.deepEqual(body.suggestion.targets, draft.targets); assert.equal(body.suggestion.clinicalNotes, draft.clinicalNotes);
      const stored = unseal((await store.query('SELECT plan_encrypted FROM nutrition_requests WHERE id=$1', [id])).rows[0].plan_encrypted, env);
      assert.deepEqual(stored, current);
    });
    await t.test('legacy AI switch is ignored; approval, bad goal and invalid draft still block changes', async () => {
      const forbidden = await seed({ consent: false }); const approved = await seed({ plan: generatePlan(intake), stage: 'approved' }); const id = await seed();
      const fetcher = async () => { throw new Error('Provider must not be called'); };
      assert.equal((await request('ai-draft', { id: forbidden, revision: 0, templateId: 'muscle-pratica' })).status, 200);
      assert.equal((await request('ai-draft', { id: approved, revision: 0, templateId: 'muscle-pratica' }, fetcher)).status, 409);
      assert.equal((await request('analyze', { id, revision: 0, goal: 'invented' }, fetcher)).status, 400);
      assert.equal((await request('ai-draft', { id, revision: 0, templateId: 'muscle-pratica', plan: {} }, fetcher)).status, 422);
    });
    await t.test('overload uses only the free fallback and counts both HTTP attempts', async () => {
      await resetQuota(); const id = await seed(); const models = [];
      const result = await request('analyze', { id, revision: 0 }, async (url, init) => {
        models.push(JSON.parse(init.body).model);
        return models.length === 1 ? new Response('Overloaded', { status: 503 }) : defaultReply(url, init);
      });
      assert.equal(result.status, 200); assert.deepEqual(models, [defaultNimModel, fallbackNimModel]);
      assert.equal((await result.json()).analysis.model, fallbackNimModel);
      assert.equal((await store.query("SELECT count(*)::integer AS count FROM nutrition_events WHERE type='ai_requested'")).rows[0].count, 2);
    });
    await t.test('40th call is admitted and 41st is rejected across different patients and actions', async () => {
      await resetQuota(); const first = await seed(); const second = await seed(); let calls = 0;
      await store.query("INSERT INTO nutrition_events (request_id,type,actor) SELECT $1,'ai_requested','test' FROM generate_series(1,39)", [first]);
      const fetcher = (...args) => { calls++; return defaultReply(...args); };
      assert.equal((await request('analyze', { id: first, revision: 0 }, fetcher)).status, 200); assert.equal(calls, 1);
      const limited = await request('ai-draft', { id: second, revision: 0, templateId: 'muscle-pratica' }, fetcher);
      assert.equal(limited.status, 429); assert.equal(calls, 1); assert.ok(Number(limited.headers.get('retry-after')) > 0);
      await store.query("UPDATE nutrition_events SET created_at=now()-interval '61 seconds' WHERE type='ai_requested'");
      assert.equal((await request('analyze', { id: second, revision: 0 }, fetcher)).status, 200); assert.equal(calls, 2);
    });
    await t.test('NVIDIA Retry-After pauses the shared quota without retrying or touching the plan', async () => {
      await resetQuota(); const id = await seed({ plan: generatePlan(intake) }); let calls = 0;
      const fetcher = async () => { calls++; return new Response('Limited', { status: 429, headers: { 'Retry-After': '17' } }); };
      const limited = await request('analyze', { id, revision: 0 }, fetcher);
      assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '17'); assert.equal((await limited.json()).retryAfter, 17);
      assert.equal((await request('analyze', { id, revision: 0 }, fetcher)).status, 429); assert.equal(calls, 1);
      assert.equal((await store.query('SELECT revision FROM nutrition_requests WHERE id=$1', [id])).rows[0].revision, 0);
    });
    await t.test('changing intake during generation discards the stale response', async () => {
      await resetQuota(); const id = await seed();
      const result = await request('ai-draft', { id, revision: 0, templateId: 'muscle-pratica' }, async (url, init) => {
        await store.query('UPDATE nutrition_requests SET intake_encrypted=$1 WHERE id=$2', [seal({ ...intake, goal: 'weight-management' }, env), id]);
        return defaultReply(url, init);
      });
      assert.equal(result.status, 409);
      assert.equal((await store.query('SELECT plan_encrypted FROM nutrition_requests WHERE id=$1', [id])).rows[0].plan_encrypted, null);
    });
  } finally { await pg.close(); }
});
