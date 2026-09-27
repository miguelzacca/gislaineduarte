import { randomUUID } from 'node:crypto';
import { isAllowedCheckoutRequest, productAccessHeaders, randomToken, tokenHash } from '../../server/recipes/access.js';
import { transaction } from '../../server/recipes/store.js';
import { readCommerceConfig } from '../../server/recipes/config.js';
import { site } from '../../src/data/site.js';
import { accessCookie, checkout, commerceReady, confirmNutritionPayment, createIntake, followupStatus, nutritionIntakeBodyLimit, NutritionError, publicOffer, readBody, readOffer, readPatient } from '../../server/nutrition/service.js';
import { event, getNutritionStore, seal, unseal } from '../../server/nutrition/store.js';
import { buildPlanHtml, buildPlanPdf } from '../../server/nutrition/export.js';

const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: productAccessHeaders(headers) });
const methods = { offer: 'GET', intake: 'POST', checkout: 'POST', status: 'GET', return: 'GET', webhook: 'POST', redeem: 'POST', download: 'GET', checkin: 'POST', 'revoke-ai': 'POST', logout: 'POST' };

export async function handleNutritionRequest(request, { env = process.env, store, fetcher = fetch } = {}) {
  const url = new URL(request.url); const action = url.searchParams.get('action') || 'offer';
  if (methods[action] !== request.method) return json({ error: 'Método não permitido.' }, 405, { Allow: methods[action] || 'GET, POST' });
  if (request.method === 'POST' && action !== 'webhook' && !isAllowedCheckoutRequest(request)) return json({ error: 'Origem não autorizada.' }, 403);
  try {
    if (action === 'offer' && !commerceReady(env)) return json({ available: false });
    const db = store || await getNutritionStore(env);
    if (action === 'offer') { const offer = await readOffer(db); return json({ available: offer.published && commerceReady(env), offer: offer.published ? publicOffer(offer) : null }); }
    if (action === 'intake') {
      const result = await createIntake(await readBody(request, nutritionIntakeBodyLimit), request, { db, env });
      return json({ id: result.id }, 201, result.cookie ? { 'Set-Cookie': result.cookie } : {});
    }
    if (action === 'webhook') {
      const payload = await readBody(request, 20000);
      if (payload.order_nsu !== url.searchParams.get('order')) throw new NutritionError('Pedido divergente.');
      await confirmNutritionPayment({ orderId: payload.order_nsu, transactionNsu: payload.transaction_nsu, slug: payload.invoice_slug, webhookKey: url.searchParams.get('key') || '' }, { db, env, fetcher });
      return json({ ok: true });
    }
    if (action === 'return') {
      try { await confirmNutritionPayment({ orderId: url.searchParams.get('order_nsu'), transactionNsu: url.searchParams.get('transaction_nsu'), slug: url.searchParams.get('slug') }, { db, env, fetcher }); } catch { /* Status is always read from the database after returning. */ }
      return new Response(null, { status: 303, headers: productAccessHeaders({ Location: `${readCommerceConfig(env).origin || url.origin}/meu-plano#pagamento=retorno` }) });
    }
    if (action === 'redeem') {
      const body = await readBody(request, 1000);
      if (!/^[A-Za-z0-9_-]{43}$/.test(body.token || '')) throw new NutritionError('Link inválido ou expirado.', 401);
      const token = randomToken();
      const found = await db.query(`UPDATE nutrition_requests SET access_hash=$1, access_expires_at=now()+interval '90 days', share_hash=NULL, share_expires_at=NULL
        WHERE share_hash=$2 AND share_expires_at>now() AND payment_status='paid' RETURNING id`, [tokenHash(token), tokenHash(body.token)]);
      if (!found.rowCount) throw new NutritionError('Link inválido ou expirado. Solicite um novo link a Gislaine.', 401);
      await event(db, found.rows[0].id, 'access_recovered', 'patient');
      return json({ ok: true }, 200, { 'Set-Cookie': accessCookie(token, request, env) });
    }
    const patient = await readPatient(request, db);
    if (!patient) throw new NutritionError('Abra o link privado recebido ou retorne ao dispositivo em que preencheu a anamnese.', 401);
    if (action === 'revoke-ai') {
      await transaction(db, async client => {
        const row = (await client.query('SELECT intake_encrypted FROM nutrition_requests WHERE id=$1 FOR UPDATE', [patient.id])).rows[0];
        const intake = unseal(row.intake_encrypted, env);
        if (intake.aiConsent) {
          await client.query('UPDATE nutrition_requests SET intake_encrypted=$1, updated_at=now() WHERE id=$2', [seal({ ...intake, aiConsent: false }, env), patient.id]);
          await event(client, patient.id, 'ai_consent_revoked', 'patient');
        }
      });
      return json({ ok: true });
    }
    if (action === 'logout') {
      await db.query('UPDATE nutrition_requests SET access_expires_at=now() WHERE id=$1', [patient.id]);
      return json({ ok: true }, 200, { 'Set-Cookie': accessCookie('', request, env).replace('Max-Age=7776000', 'Max-Age=0') });
    }
    if (action === 'checkout') return json(await checkout(patient, { db, env, fetcher }));
    if (action === 'status') {
      const paid = patient.payment_status === 'paid';
      const ready = paid && patient.stage === 'approved';
      return json({ id: patient.id, payment: patient.payment_status, stage: patient.stage, ready, amountCents: patient.amount_cents,
        offer: publicOffer(patient.offer_snapshot), createdAt: patient.created_at, paidAt: patient.paid_at, approvedAt: patient.approved_at, aiConsent: unseal(patient.intake_encrypted, env).aiConsent, ...followupStatus(patient),
        checkoutUrl: !paid ? patient.checkout_url : null,
        whatsappUrl: paid ? `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Olá, Gislaine! Preenchi minha anamnese e meu pagamento foi confirmado. Pedido ${patient.id.slice(0, 8)}. Gostaria de combinar os próximos passos.`)}` : null,
      });
    }
    if (action === 'download') {
      if (patient.payment_status !== 'paid' || patient.stage !== 'approved') throw new NutritionError('Seu plano ainda está sendo preparado e revisado.', 403);
      const payload = { plan: unseal(patient.plan_encrypted, env), patientName: unseal(patient.intake_encrypted, env).name, id: patient.id, revision: patient.revision, approvedAt: patient.approved_at };
      const pdf = url.searchParams.get('format') === 'pdf';
      const file = pdf ? await buildPlanPdf(payload) : await buildPlanHtml(payload);
      return new Response(file, { headers: productAccessHeaders({ 'Content-Type': pdf ? 'application/pdf' : 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="meu-plano-gislaine-duarte.${pdf ? 'pdf' : 'html'}"` }) });
    }
    if (action === 'checkin') {
      if (!followupStatus(patient).followupAvailable) throw new NutritionError('O envio de relatos fica disponível durante o período de acompanhamento contratado, a partir da primeira entrega. Converse com Gislaine para combinar seu atendimento.', 403);
      const body = await readBody(request, 8000);
      if (typeof body.note !== 'string' || body.note.trim().length < 5 || body.note.length > 3000 || !Number.isInteger(body.adherence) || body.adherence < 1 || body.adherence > 5) throw new NutritionError('Descreva sua semana e selecione como foi seguir o plano.');
      await transaction(db, async client => {
        await client.query('SELECT id FROM nutrition_requests WHERE id=$1 FOR UPDATE', [patient.id]);
        const recent = await client.query("SELECT count(*)::integer AS count FROM nutrition_checkins WHERE request_id=$1 AND created_at > now()-interval '24 hours'", [patient.id]);
        if (recent.rows[0].count >= 3) throw new NutritionError('Seu relato já chegou. Você pode enviar outro amanhã.', 429);
        await client.query('INSERT INTO nutrition_checkins (id, request_id, body_encrypted) VALUES ($1,$2,$3)', [randomUUID(), patient.id, seal({ note: body.note.trim(), adherence: body.adherence }, env)]);
        await event(client, patient.id, 'checkin_received', 'patient');
      });
      return json({ ok: true });
    }
    return json({ error: 'Ação não encontrada.' }, 404);
  } catch (error) {
    if (!(error instanceof NutritionError)) console.error('nutrition_request_failed', { action, code: error.code || error.name });
    return json({ error: error instanceof NutritionError ? error.message : 'Não foi possível concluir agora. Seus dados já enviados permanecem salvos. Tente novamente.', ...(error.fields ? { fields: error.fields } : {}), ...(error.offer ? { offer: error.offer } : {}) }, error.status || 503);
  }
}
export function GET(request) { return handleNutritionRequest(request); }
export function POST(request) { return handleNutritionRequest(request); }
