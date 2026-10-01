import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { getNutritionStore, seal, unseal } from '../../server/nutrition/store.js';
import { handleNutritionRequest } from '../../api/nutrition/index.js';
import { handleNutritionReturnRequest } from '../../api/nutrition/return.js';
import { handleAdminNutritionRequest } from '../../api/admin/nutrition.js';
import { adminCookie } from '../../server/recipes/admin.js';
import { clinicalAlerts, validatePlan } from '../../src/lib/nutrition.js';

test('nutrition flow: isolated PostgreSQL intake → checkout → confirmation → review → protected delivery', async t => {
  const pg = await PGlite.create();
  const store = { query: (...args) => pg.query(...args), connect: async () => ({ query: (...args) => pg.query(...args), release() {} }) };
  const env = { NUTRITION_DATA_KEY: randomBytes(32).toString('base64'), RECIPES_ADMIN_USERNAME: 'nutrition-test', RECIPES_ADMIN_PASSWORD: 'not-a-real-password', RECIPES_ADMIN_SESSION_SECRET: randomBytes(40).toString('hex'), DATABASE_URL: 'isolated-only', RECIPES_SITE_URL: 'https://nutrition.example', INFINITEPAY_HANDLE: 'test-merchant', NODE_ENV: 'test' };
  await getNutritionStore(env, store);
  const admin = adminCookie(new Request('https://nutrition.example/api/admin/session'), env).split(';')[0];
  let cookie = ''; let rowId; let webhookUrl; let checkAmount = 25900; let checkPaid = true; let linkCalls = 0;
  const fetcher = async (url, options) => {
    const payload = JSON.parse(options.body);
    if (url.endsWith('/links')) {
      linkCalls++; webhookUrl = payload.webhook_url;
      assert.equal(payload.items[0].price, 25900); assert.equal(payload.redirect_url, 'https://nutrition.example/api/nutrition/return');
      assert.deepEqual(Object.keys(payload.customer), ['email']); assert.ok(!options.body.includes('conditions'));
      return Response.json({ url: 'https://checkout.infinitepay.io/test-link' });
    }
    assert.equal(payload.handle, 'test-merchant');
    return Response.json({ success: true, paid: checkPaid, amount: checkAmount, paid_amount: checkAmount });
  };
  const request = (action, body, { adminRequest = false, overrideCookie, query = '', origin = 'https://nutrition.example' } = {}) => {
    const req = new Request(`https://nutrition.example/api/${adminRequest ? 'admin/nutrition' : 'nutrition'}?action=${action}${query}`, { method: body ? 'POST' : 'GET', headers: { origin, cookie: overrideCookie ?? (adminRequest ? admin : cookie), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return (adminRequest ? handleAdminNutritionRequest : handleNutritionRequest)(req, { env, store, fetcher });
  };
  const person = { name: 'Pessoa Fictícia', email: 'person@example.com', phone: '47999998888', age: 38, weight: 80, height: 175, sex: 'male', activity: 1.2, goal: 'clinical', diet: 'omnivore', conditions: ['celiac', 'diabetes'], allergies: [], symptoms: [], excludedFoodIds: [], pregnant: false, consent: true, aiConsent: false };
  const offer = { title: 'Plano de teste', description: 'Atendimento fictício', priceCents: 25900, deliveryDays: 4, followupDays: 30, published: true };
  try {
    await t.test('private auth and cross-origin mutations rejected', async () => {
      assert.equal((await request('list', null, { adminRequest: true, overrideCookie: '' })).status, 401);
      assert.equal((await request('settings', { offer }, { adminRequest: true, origin: 'https://evil.example' })).status, 403);
      assert.equal((await request('status')).status, 401);
    });
    await t.test('offer not sold until doctor configures all commercial terms', async () => {
      assert.equal((await (await request('offer')).json()).available, false);
      assert.equal((await request('settings', { offer: { ...offer, priceCents: null } }, { adminRequest: true })).status, 400);
      assert.equal((await request('settings', { offer }, { adminRequest: true })).status, 200);
      assert.equal((await (await request('offer')).json()).offer.priceCents, 25900);
    });
    await t.test('consent required, intake encrypted and cookie bound to one request', async () => {
      const bad = await request('intake', { intake: { ...person, consent: false }, idempotencyKey: randomUUID() }); assert.equal(bad.status, 400);
      const changed = await request('intake', { intake: person, offer: { ...offer, priceCents: 100 }, idempotencyKey: randomUUID() }); assert.equal(changed.status, 409);
      assert.equal((await changed.json()).offer.priceCents, offer.priceCents);
      const response = await request('intake', { intake: person, offer, idempotencyKey: randomUUID() }); assert.equal(response.status, 201);
      cookie = response.headers.get('set-cookie').split(';')[0]; rowId = (await response.json()).id;
      const row = (await store.query('SELECT * FROM nutrition_requests WHERE id=$1', [rowId])).rows[0];
      assert.ok(!row.intake_encrypted.includes(person.email)); assert.equal(unseal(row.intake_encrypted, env).name, person.name);
      assert.ok(response.headers.get('set-cookie').includes('HttpOnly')); assert.ok(response.headers.get('set-cookie').includes('Secure'));
      const status = await (await request('status')).json(); assert.equal(status.ready, false); assert.equal(status.whatsappUrl, null); assert.ok(!JSON.stringify(status).includes(person.email));
    });
    await t.test('checkout retry reuses link and immutable offer snapshot', async () => {
      await request('settings', { offer: { ...offer, priceCents: 50000, deliveryDays: 9 } }, { adminRequest: true });
      assert.equal((await request('checkout', {})).status, 200); assert.equal((await request('checkout', {})).status, 200); assert.equal(linkCalls, 1);
      const status = await (await request('status')).json(); assert.equal(status.amountCents, 25900); assert.equal(status.offer.deliveryDays, 4);
    });
    await t.test('forged webhook, underpayment and client assertions cannot confirm a payment', async () => {
      const query = '&' + webhookUrl.split('&').slice(1).join('&');
      const payment = { order_nsu: rowId, transaction_nsu: 'transaction-123456', invoice_slug: 'invoice-test', paid: true, amount: 25900 };
      assert.equal((await request('webhook', payment, { query: `&order=${rowId}&key=forged` })).status, 403);
      checkAmount = 100; assert.equal((await request('webhook', payment, { query })).status, 400);
      checkAmount = 25900; checkPaid = false; assert.equal((await request('webhook', payment, { query })).status, 400);
      assert.equal((await (await request('status')).json()).payment, 'pending');
      checkPaid = true;
    });
    await t.test('confirmed payment creates exactly one compatible draft, still no patient download', async () => {
      const query = '&' + webhookUrl.split('&').slice(1).join('&');
      const payment = { order_nsu: rowId, transaction_nsu: 'transaction-123456', invoice_slug: 'invoice-test' };
      assert.equal((await request('webhook', payment, { query })).status, 200);
      assert.equal((await request('webhook', payment, { query })).status, 200);
      const status = await (await request('status')).json(); assert.equal(status.payment, 'paid'); assert.ok(status.whatsappUrl.startsWith('https://wa.me/')); assert.equal(status.ready, false);
      assert.equal(status.followupAvailable, false);
      assert.equal((await request('checkin', { note: 'Antes de receber o plano', adherence: 3 })).status, 403);
      assert.equal((await request('download')).status, 403);
      const detail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      assert.equal(detail.revision, 1); assert.equal(detail.stage, 'draft'); assert.deepEqual(validatePlan(detail.plan, detail.intake), []);
    });
    await t.test('clinical review and goal checks cannot be bypassed; stale revision rejected', async () => {
      const detail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      assert.equal((await request('approve', { id: rowId, revision: 1, reviewed: [] }, { adminRequest: true })).status, 422);
      const plan = detail.plan; plan.targets.energy = 1800; plan.targets.protein = 80; plan.clinicalNotes = 'Avaliação fictícia de teste. Metas e restrições conferidas.';
      plan.assessment = { summary: 'Seu plano considera a rotina e as exclusões informadas.', criteria: 'Metas definidas profissionalmente para este exemplo. Conferidos horários e porções.', calculationInput: { weight: 80, height: 175, age: 38, sex: 'male', activity: 1.2, proteinRatio: 1 }, calculations: [{ id: 'protein', value: 999 }], dataSnapshot: { email: 'forged@example.com' } };
      assert.equal((await request('save', { id: rowId, revision: 0, plan }, { adminRequest: true })).status, 409);
      assert.equal((await request('save', { id: rowId, revision: 1, plan }, { adminRequest: true })).status, 200);
      const savedDetail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      assert.equal(savedDetail.plan.assessment.calculations.find(item => item.id === 'protein').value, 80);
      assert.equal(savedDetail.plan.assessment.targetSources.protein.calculationId, 'protein');
      assert.equal(savedDetail.plan.assessment.dataSnapshot.email, undefined);
      assert.ok(savedDetail.plan.assessment.recordedAt);
      assert.equal((await request('approve', { id: rowId, revision: 2, reviewed: clinicalAlerts(detail.intake, plan).map(alert => alert.id) }, { adminRequest: true })).status, 200);
      assert.equal((await (await request('status')).json()).ready, true);
      assert.equal((await request('save', { id: rowId, revision: 2, plan }, { adminRequest: true })).status, 409);
      assert.equal((await request('ai', { id: rowId, revision: 2 }, { adminRequest: true })).status, 409);
    });
    await t.test('provider return uses a clean callback and redirects to the private payment status', async () => {
      const response = await handleNutritionReturnRequest(new Request(`https://test.example/api/nutrition/return?order_nsu=${rowId}&transaction_nsu=transaction-123456&slug=invoice-test`), { env, store, fetcher });
      assert.equal(response.status, 303);
      const location = new URL(response.headers.get('location'));
      assert.equal(location.pathname, '/meu-plano'); assert.equal(location.hash, '#pagamento=retorno');
    });
    await t.test('approved HTML delivery is private, no-cache and excludes clinical record', async () => {
      const response = await request('download', null, { query: '&format=html' }); assert.equal(response.status, 200);
      assert.ok(response.headers.get('cache-control').includes('no-store')); assert.ok(response.headers.get('content-disposition').includes('attachment'));
      const html = await response.text(); assert.ok(html.includes(person.name)); assert.ok(!html.includes('Avaliação fictícia de teste')); assert.ok(!html.includes(person.email));
      assert.equal((await request('download', null, { overrideCookie: '' })).status, 401);
    });
    await t.test('private access link is one-time and rotates the old session', async () => {
      const link = await (await request('share', { id: rowId, revision: 2 }, { adminRequest: true })).json();
      const token = new URLSearchParams(new URL(link.url).hash.slice(1)).get('acesso');
      const response = await request('redeem', { token }, { overrideCookie: '' }); assert.equal(response.status, 200);
      const oldCookie = cookie; cookie = response.headers.get('set-cookie').split(';')[0];
      assert.equal((await request('status', null, { overrideCookie: oldCookie })).status, 401);
      assert.equal((await request('redeem', { token })).status, 401);
      assert.equal((await request('status')).status, 200);
    });
    await t.test('check-in persists encrypted and appears in professional view', async () => {
      const note = 'Meu relato fictício da semana para a profissional.';
      assert.equal((await request('checkin', { note, adherence: 3 })).status, 200);
      const rows = await store.query('SELECT body_encrypted FROM nutrition_checkins WHERE request_id=$1', [rowId]); assert.ok(!rows.rows[0].body_encrypted.includes(note));
      const detail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json(); assert.equal(detail.checkins[0].note, note);
      assert.equal((await request('reopen', { id: rowId, revision: 2 }, { adminRequest: true })).status, 200);
      assert.equal((await request('download')).status, 403);
    });
    await t.test('follow-up keeps the first delivery date and respects the contracted period', async () => {
      const status = await (await request('status')).json(); assert.ok(status.firstDeliveredAt); assert.equal(status.followupAvailable, true);
      const before = status.firstDeliveredAt;
      await store.query("UPDATE nutrition_requests SET first_delivered_at=now()-interval '31 days' WHERE id=$1", [rowId]);
      assert.equal((await (await request('status')).json()).followupAvailable, false);
      assert.equal((await request('checkin', { note: 'Fora do período contratado', adherence: 3 })).status, 403);
      await store.query('UPDATE nutrition_requests SET first_delivered_at=$1 WHERE id=$2', [before, rowId]);
      const detail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      assert.equal((await request('approve', { id: rowId, revision: 3, reviewed: clinicalAlerts(detail.intake, detail.plan).map(alert => alert.id) }, { adminRequest: true })).status, 200);
      assert.equal((await (await request('status')).json()).firstDeliveredAt, before);
    });
    await t.test('logout revokes the stored session as well as clearing the cookie', async () => {
      // A patient can revoke AI permission without losing access to the paid plan.
      const row = (await store.query('SELECT intake_encrypted FROM nutrition_requests WHERE id=$1', [rowId])).rows[0];
      const intake = unseal(row.intake_encrypted, env);
      await store.query('UPDATE nutrition_requests SET intake_encrypted=$1, analysis_encrypted=$3 WHERE id=$2', [seal({ ...intake, aiConsent: true }, env), rowId, seal({ summary: 'Análise em cache' }, env)]);
      assert.equal((await request('revoke-ai', {})).status, 200);
      assert.equal((await store.query('SELECT analysis_encrypted FROM nutrition_requests WHERE id=$1', [rowId])).rows[0].analysis_encrypted, null);
      const status = await (await request('status')).json(); assert.equal(status.aiConsent, false); assert.equal(status.ready, true);
      const response = await request('logout', {}); assert.equal(response.status, 200);
      assert.ok(response.headers.get('set-cookie').includes('Max-Age=0'));
      assert.equal((await request('status')).status, 401);
    });
    await t.test('encrypted version history restores only this patient and requires a fresh review', async () => {
      const detail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      assert.ok(detail.versions.some(version => version.revision === 1 && version.stage === 'draft'));
      assert.ok(detail.versions.some(version => version.revision === 2 && version.stage === 'approved'));
      assert.ok(detail.versions.every(version => !('plan_encrypted' in version)));
      const encrypted = await store.query('SELECT plan_encrypted FROM nutrition_plan_versions WHERE request_id=$1', [rowId]);
      assert.ok(encrypted.rows.every(version => !version.plan_encrypted.includes('Avaliação fictícia')));
      const restore = { id: rowId, revision: 3, sourceRevision: 2, sourceStage: 'approved' };
      assert.equal((await request('restore', restore, { adminRequest: true })).status, 409);
      assert.equal((await request('reopen', { id: rowId, revision: 3 }, { adminRequest: true })).status, 200);
      assert.equal((await request('restore', restore, { adminRequest: true })).status, 409);
      assert.equal((await request('restore', { ...restore, revision: 4, sourceRevision: 999 }, { adminRequest: true })).status, 404);
      const restored = await request('restore', { ...restore, revision: 4 }, { adminRequest: true });
      assert.equal(restored.status, 200);
      const result = await restored.json();
      assert.equal(result.revision, 5); assert.equal(result.stage, 'draft'); assert.deepEqual(result.plan.review, {});
      assert.equal((await request('download', null, { adminRequest: true, query: `&id=${rowId}` })).status, 403);
      const finalDetail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      assert.ok(finalDetail.versions.some(version => version.reason === 'plan_restored' && version.revision === 5));
    });
    await t.test('new culinary rotation preserves professional assessment only for the same base', async () => {
      const before = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      const response = await request('generate', { id: rowId, revision: before.revision, templateId: before.plan.templateId, variation: 12, preserveAssessment: true }, { adminRequest: true });
      assert.equal(response.status, 200); const result = await response.json();
      assert.deepEqual(result.plan.targets, before.plan.targets); assert.equal(result.plan.clinicalNotes, before.plan.clinicalNotes);
      assert.equal(result.plan.guidance, before.plan.guidance); assert.deepEqual(result.plan.review, {}); assert.equal(result.stage, 'draft');
      const changedBase = await request('generate', { id: rowId, revision: result.revision, templateId: 'balanced-variada', variation: 0, preserveAssessment: true }, { adminRequest: true });
      assert.equal(changedBase.status, 200); const changed = await changedBase.json();
      assert.equal(changed.plan.targets.energy, null); assert.equal(changed.plan.clinicalNotes, '');
    });
    await t.test('saved template category determines its clinical review context', async () => {
      const detail = await (await request('detail', null, { adminRequest: true, query: `&id=${rowId}` })).json();
      const personalPlan = structuredClone(detail.plan);
      personalPlan.days[0].label = 'PERSONAL_DAY_NAME'; personalPlan.days[0].meals[0].name = 'PERSONAL_MEAL_NAME';
      personalPlan.days[0].meals[0].note = 'PERSONAL_MEAL_NOTE'; personalPlan.guidance = 'PERSONAL_GUIDANCE';
      await store.query('UPDATE nutrition_requests SET plan_encrypted=$1 WHERE id=$2', [seal(personalPlan, env), rowId]);
      assert.equal((await request('template', { id: rowId, revision: detail.revision, title: 'Modelo renal de teste', profile: 'renal' }, { adminRequest: true })).status, 200);
      const list = await (await request('list', null, { adminRequest: true })).json();
      const template = list.templates.find(template => template.title === 'Modelo renal de teste');
      const savedTemplate = unseal((await store.query('SELECT plan_encrypted FROM nutrition_templates WHERE id=$1', [template.id])).rows[0].plan_encrypted, env);
      assert.ok(!JSON.stringify(savedTemplate).includes('PERSONAL_'));
      assert.equal(savedTemplate.assessment, undefined); assert.deepEqual(savedTemplate.curatedModules, []);
      const response = await request('generate', { id: rowId, revision: detail.revision, templateId: template.id }, { adminRequest: true });
      assert.equal(response.status, 200); const result = await response.json();
      assert.equal(result.plan.templateId, 'renal-pratica');
      assert.ok(clinicalAlerts(detail.intake, result.plan).some(alert => alert.id === 'renal'));
    });
  } finally { await pg.close(); }
});
