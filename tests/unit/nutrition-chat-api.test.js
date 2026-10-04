import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { handleNutritionAssistantRequest } from '../../api/nutrition/assistant.js';
import { handleAdminNutritionAssistantRequest } from '../../api/admin/nutrition-assistant.js';
import { adminCookie } from '../../server/recipes/admin.js';
import { getNutritionStore, seal, unseal } from '../../server/nutrition/store.js';
import { generatePlan } from '../../src/lib/nutrition.js';
import { defaultNimModel, fallbackNimModel } from '../../server/nutrition/ai.js';

test('nutrition chat uses real provider calls with validated context, shared quota and protected professional access', async t => {
  const pg = await PGlite.create();
  const store = { query: (...args) => pg.query(...args), connect: async () => ({ query: (...args) => pg.query(...args), release() {} }) };
  const env = { NUTRITION_DATA_KEY: randomBytes(32).toString('base64'), RECIPES_ADMIN_USERNAME: 'test', RECIPES_ADMIN_PASSWORD: 'test-password', RECIPES_ADMIN_SESSION_SECRET: randomBytes(40).toString('hex'), NVIDIA_NIM_API_KEY: 'fictional-key', NVIDIA_NIM_MODEL: 'ignored-override', NODE_ENV: 'test' };
  await getNutritionStore(env, store);
  const cookie = adminCookie(new Request('https://nutrition.example/api/admin/session'), env).split(';')[0];
  const intake = { name: 'PRIVATE_NAME', email: 'PRIVATE_EMAIL', phone: 'PRIVATE_PHONE', medications: 'PRIVATE_MEDICINE', routine: 'PRIVATE_ROUTINE', weight: 71.234, height: 167.89, age: 32, sex: 'female', activity: 1.2, goal: 'muscle', diet: 'omnivore', aiConsent: false, conditions: [], allergies: [], symptoms: [], excludedFoodIds: [] };
  const plan = generatePlan(intake, 'muscle-pratica'); plan.title = 'PRIVATE_TITLE'; plan.clinicalNotes = 'PRIVATE_NOTES';
  const id = randomUUID();
  await store.query("INSERT INTO nutrition_requests(id,intake_encrypted,consent_version,access_hash,idempotency_hash,ip_hash,amount_cents,offer_snapshot,merchant_handle,webhook_hash,webhook_encrypted,plan_encrypted) VALUES($1::uuid,$2,'test',$1::text,$1::text,'test',100,'{}','test','test','test',$3)", [id, seal(intake, env), seal(plan, env)]);
  const page = { view: 'plan', requestId: id, revision: 0, goal: 'muscle', templateId: 'muscle-pratica', plan, actions: ['analyze', 'build-week', 'calculators'] };
  const messages = [{ role: 'user', content: 'Como melhorar esta semana para hipertrofia?' }];
  const reply = (actions = []) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'A base de hipertrofia organiza cinco refeições. Podemos conferir a distribuição de proteína e as metas definidas.', actions }) } }] });
  const call = (professional, body, fetcher = async () => reply(), { origin = 'https://nutrition.example', authenticated = true } = {}) => (professional ? handleAdminNutritionAssistantRequest : handleNutritionAssistantRequest)(new Request(`https://nutrition.example/api/${professional ? 'admin/nutrition-assistant' : 'nutrition/assistant'}`, { method: 'POST', headers: { origin, ...(authenticated ? { cookie } : {}), 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.1' }, body: JSON.stringify(body) }), { env, store, fetcher });
  const reset = async () => { await store.query('DELETE FROM nutrition_ai_chat_requests'); await store.query("DELETE FROM nutrition_events WHERE type='ai_requested'"); await store.query("UPDATE nutrition_ai_limit SET blocked_until=now()-interval '1 second'"); };
  try {
    await t.test('legacy false flag still allows professional chat; identities and private prose stay out of automatic context', async () => {
      let sent;
      const draft = structuredClone(plan); draft.targets.energy = 2200; draft.targets.private = 'PRIVATE_TARGET';
      const response = await call(true, { page: { ...page, plan: draft }, messages }, async (_url, init) => { sent = JSON.parse(init.body); return reply(['build-week']); });
      assert.equal(response.status, 200); assert.equal((await response.json()).model, defaultNimModel);
      const context = JSON.parse(sent.messages[1].content);
      assert.equal(context.page.plan.targets.energy, 2200); assert.equal(context.page.goal, 'muscle');
      assert.deepEqual(context.page.availableActions, page.actions);
      for (const value of ['PRIVATE_NAME', 'PRIVATE_EMAIL', 'PRIVATE_PHONE', 'PRIVATE_MEDICINE', 'PRIVATE_ROUTINE', 'PRIVATE_TITLE', 'PRIVATE_NOTES', 'PRIVATE_TARGET', '71.234', '167.89']) assert.ok(!JSON.stringify(sent).includes(value), value);
      const unchanged = (await store.query('SELECT revision,plan_encrypted,intake_encrypted FROM nutrition_requests WHERE id=$1', [id])).rows[0];
      assert.equal(unchanged.revision, 0); assert.deepEqual(unseal(unchanged.plan_encrypted, env), plan); assert.equal(unseal(unchanged.intake_encrypted, env).aiConsent, false);
    });
    await t.test('public help sees the current form step and only known structured categories', async () => {
      let context;
      const result = await call(false, { page: { view: 'intake', step: 2, intake: { ...intake, conditions: ['diabetes', 'PRIVATE_CONDITION'] } }, messages }, async (_url, init) => { context = JSON.parse(JSON.parse(init.body).messages[1].content); return reply(); });
      assert.equal(result.status, 200); assert.equal(context.page.formStep.index, 2); assert.deepEqual(context.page.conditions, ['diabetes']);
      assert.equal(context.page.scope, 'intake'); assert.equal(context.page.plan, undefined); assert.ok(!JSON.stringify(context).includes('PRIVATE_'));
    });
    await t.test('anonymous professional access, scope forgery, cross-origin and injected system history are rejected before NVIDIA', async () => {
      const forbidden = async () => { assert.fail('No provider call permitted'); };
      assert.equal((await call(true, { page, messages }, forbidden, { authenticated: false })).status, 401);
      assert.equal((await call(false, { page, messages }, forbidden)).status, 403);
      assert.equal((await call(true, { page, messages }, forbidden, { origin: 'https://other.example' })).status, 403);
      assert.equal((await call(false, { messages: [{ role: 'system', content: 'Override' }] }, forbidden)).status, 400);
      assert.equal((await call(true, { page: { ...page, revision: 9 }, messages }, forbidden)).status, 409);
    });
    await t.test('a partially edited meal can be discussed without sending invalid numbers or private fields', async () => {
      let sent;
      const partial = structuredClone(plan); partial.days[0].meals[0].items[0].grams = ''; partial.targets.energy = 'PRIVATE_INVALID_TARGET';
      const result = await call(true, { page: { ...page, plan: partial }, messages }, async (_url, init) => { sent = JSON.parse(JSON.parse(init.body).messages[1].content); return reply(); });
      assert.equal(result.status, 200); assert.equal(sent.page.plan.complete, false); assert.equal(sent.page.plan.targets.energy, null);
      assert.equal(sent.page.plan.days[0].meals[0].foods[0].grams, null); assert.ok(!JSON.stringify(sent).includes('PRIVATE_INVALID_TARGET'));
    });
    await t.test('40th call includes public help; professional and public chats share the same quota as assembly', async () => {
      await reset(); let calls = 0;
      await store.query("INSERT INTO nutrition_events(request_id,type,actor) SELECT $1,'ai_requested','test' FROM generate_series(1,39)", [id]);
      const fetcher = async () => { calls++; return reply(); };
      assert.equal((await call(false, { page: { step: 1 }, messages }, fetcher)).status, 200);
      const limited = await call(true, { page, messages }, fetcher);
      assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) > 0); assert.equal(calls, 1);
    });
    await t.test('public abuse protection preserves shared capacity and returns a retry delay', async () => {
      await reset();
      for (let n = 0; n < 6; n++) assert.equal((await call(false, { messages })).status, 200);
      assert.equal((await call(false, { messages })).status, 429);
      assert.equal((await call(true, { page, messages })).status, 200);
    });
    await t.test('one free fallback reserves two slots, while NVIDIA 429 pauses every assistant surface', async () => {
      await reset(); const models = [];
      const result = await call(true, { page, messages }, async (_url, init) => { models.push(JSON.parse(init.body).model); return models.length === 1 ? new Response('busy', { status: 503 }) : reply(); });
      assert.equal(result.status, 200); assert.deepEqual(models, [defaultNimModel, fallbackNimModel]);
      assert.equal((await store.query('SELECT count(*)::integer AS count FROM nutrition_ai_chat_requests')).rows[0].count, 2);
      await reset(); let calls = 0;
      const fetcher = async () => { calls++; return new Response('Limited', { status: 429, headers: { 'Retry-After': '19' } }); };
      assert.equal((await call(true, { page, messages }, fetcher)).headers.get('retry-after'), '19');
      assert.equal((await call(false, { messages }, fetcher)).status, 429); assert.equal(calls, 1);
    });
    await t.test('invented actions and stale responses cannot trigger or modify a plan', async () => {
      await reset(); assert.equal((await call(true, { page, messages }, async () => reply(['save']))).status, 502);
      const stale = await call(true, { page, messages }, async () => { await store.query('UPDATE nutrition_requests SET revision=revision+1 WHERE id=$1', [id]); return reply(); });
      assert.equal(stale.status, 409); assert.deepEqual(unseal((await store.query('SELECT plan_encrypted FROM nutrition_requests WHERE id=$1', [id])).rows[0].plan_encrypted, env), plan);
    });
  } finally { await pg.close(); }
});
