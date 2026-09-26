import { randomUUID } from 'node:crypto';
import { adminMutationAllowed, readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { productAccessHeaders, randomToken, tokenHash } from '../../server/recipes/access.js';
import { readCommerceConfig } from '../../server/recipes/config.js';
import { transaction } from '../../server/recipes/store.js';
import { clinicalProfiles } from '../../src/data/nutrition.js';
import { clinicalAlerts, generatePlan, validatePlan } from '../../src/lib/nutrition.js';
import { commerceReady, followupStatus, NutritionError, readBody, readOffer, validOffer } from '../../server/nutrition/service.js';
import { event, getNutritionStore, seal, unseal } from '../../server/nutrition/store.js';
import { analyzeWithNim, suggestWithNim } from '../../server/nutrition/ai.js';
import { buildPlanHtml, buildPlanPdf } from '../../server/nutrition/export.js';

const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: productAccessHeaders(headers) });
const isId = value => /^[a-f0-9-]{36}$/i.test(value || '');

async function savePlan(db, row, plan, env, expectedRevision, type) {
  const intake = unseal(row.intake_encrypted, env);
  const errors = validatePlan(plan, intake);
  if (errors.length) throw new NutritionError(errors.join(' '), 422);
  if (row.stage === 'approved') throw new NutritionError('Reabra o plano antes de editar a versão aprovada.', 409);
  // Only allow known fields; metadata from either AI or the browser is never trusted.
  const clean = { title: plan.title, templateId: String(plan.templateId || ''), days: plan.days.map(day => ({ label: day.label, meals: day.meals.map(meal => ({ name: meal.name, time: meal.time, note: meal.note, items: meal.items.map(item => ({ foodId: item.foodId, grams: item.grams, alternatives: item.alternatives.map(alt => ({ foodId: alt.foodId, grams: alt.grams })) })) })) })), targets: plan.targets, guidance: plan.guidance, clinicalNotes: plan.clinicalNotes, review: {}, version: 1 };
  return transaction(db, async client => {
    const updated = await client.query(`UPDATE nutrition_requests SET plan_encrypted=$1, revision=revision+1, stage='draft', approved_at=NULL, approved_by=NULL, updated_at=now()
      WHERE id=$2 AND revision=$3 AND stage <> 'approved' RETURNING revision`, [seal(clean, env), row.id, expectedRevision]);
    if (!updated.rowCount) throw new NutritionError('Este atendimento mudou em outra aba. Recarregue antes de salvar.', 409);
    await event(client, row.id, type);
    return { plan: clean, revision: updated.rows[0].revision, stage: 'draft' };
  });
}

export async function handleAdminNutritionRequest(request, { env = process.env, store, fetcher = fetch } = {}) {
  if (!readAdminSession(request, env)) return unauthorizedAdminResponse();
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json({ error: 'Método não permitido.' }, 405);
  if (request.method !== 'GET' && !adminMutationAllowed(request)) return json({ error: 'Origem não autorizada.' }, 403);
  const url = new URL(request.url); const action = url.searchParams.get('action') || 'list';
  try {
    const db = store || await getNutritionStore(env);
    if (request.method === 'GET') {
      if (action === 'list') {
        const page = Math.max(0, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0));
        const result = await db.query(`SELECT id, intake_encrypted, payment_status, stage, amount_cents, revision, created_at, updated_at,
          (SELECT count(*)::integer FROM nutrition_checkins c WHERE c.request_id=nutrition_requests.id) AS checkins
          FROM nutrition_requests ORDER BY created_at DESC LIMIT 40 OFFSET $1`, [page * 40]);
        const stats = await db.query(`SELECT count(*)::integer AS total, count(*) FILTER (WHERE payment_status='paid')::integer AS paid,
          count(*) FILTER (WHERE payment_status='paid' AND stage<>'approved')::integer AS waiting,
          count(*) FILTER (WHERE stage='approved')::integer AS approved,
          COALESCE(sum(amount_cents) FILTER (WHERE payment_status='paid'),0)::bigint AS revenue FROM nutrition_requests`);
        const templates = await db.query('SELECT id,title,profile FROM nutrition_templates ORDER BY created_at DESC LIMIT 100');
        return json({ patients: result.rows.map(row => { const intake = unseal(row.intake_encrypted, env); return { id: row.id, name: intake.name, conditions: intake.conditions, payment: row.payment_status, stage: row.stage, amountCents: row.amount_cents, createdAt: row.created_at, revision: row.revision, checkins: row.checkins }; }), stats: stats.rows[0], offer: await readOffer(db), templates: templates.rows, page,
          integrations: { checkout: commerceReady(env), ai: Boolean(env.NVIDIA_NIM_API_KEY), model: env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-super-120b-a12b' } });
      }
      const id = url.searchParams.get('id'); if (!isId(id)) throw new NutritionError('Atendimento inválido.');
      const row = (await db.query('SELECT * FROM nutrition_requests WHERE id=$1', [id])).rows[0];
      if (!row) throw new NutritionError('Atendimento não encontrado.', 404);
      const intake = unseal(row.intake_encrypted, env); const plan = unseal(row.plan_encrypted, env);
      if (action === 'detail') {
        const events = await db.query('SELECT type,actor,created_at AS "createdAt" FROM nutrition_events WHERE request_id=$1 ORDER BY created_at DESC LIMIT 30', [id]);
        const checkins = await db.query('SELECT body_encrypted, created_at AS "createdAt" FROM nutrition_checkins WHERE request_id=$1 ORDER BY created_at DESC LIMIT 20', [id]);
        return json({ id, intake, plan, revision: row.revision, stage: row.stage, payment: row.payment_status, offer: row.offer_snapshot, createdAt: row.created_at, approvedAt: row.approved_at, ...followupStatus(row), events: events.rows, checkins: checkins.rows.map(item => ({ ...unseal(item.body_encrypted, env), createdAt: item.createdAt })) });
      }
      if (action === 'download' || action === 'preview') {
        if (!plan) throw new NutritionError('Monte e salve o plano primeiro.');
        if (action === 'download' && (row.stage !== 'approved' || row.payment_status !== 'paid')) throw new NutritionError('A entrega exige pagamento confirmado e revisão concluída.', 403);
        const pdf = url.searchParams.get('format') === 'pdf';
        const payload = { plan, patientName: intake.name, id, revision: row.revision, approvedAt: row.approved_at, draft: action === 'preview' };
        const file = pdf ? await buildPlanPdf(payload) : await buildPlanHtml(payload);
        return new Response(file, { headers: productAccessHeaders({ 'Content-Type': pdf ? 'application/pdf' : 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="${action === 'preview' ? 'previa-' : ''}plano-gislaine-duarte.${pdf ? 'pdf' : 'html'}"` }) });
      }
      throw new NutritionError('Ação não encontrada.', 404);
    }
    const body = await readBody(request);
    if (action === 'settings') {
      if (!validOffer(body.offer)) throw new NutritionError('Confira título, preço, prazo e acompanhamento. Preencha todos antes de disponibilizar a oferta.');
      if (body.offer.published && !commerceReady(env)) throw new NutritionError('Configure a integração de pagamento e a chave de proteção de dados antes de disponibilizar a oferta.', 422);
      const { title, description, priceCents, deliveryDays, followupDays, published } = body.offer;
      await db.query('UPDATE nutrition_settings SET offer=$1, updated_at=now() WHERE id=1', [JSON.stringify({ title: title.trim(), description: description.trim(), priceCents, deliveryDays, followupDays, published })]);
      return json({ ok: true });
    }
    if (!isId(body.id)) throw new NutritionError('Atendimento inválido.');
    const row = (await db.query('SELECT * FROM nutrition_requests WHERE id=$1', [body.id])).rows[0];
    if (!row) throw new NutritionError('Atendimento não encontrado.', 404);
    const intake = unseal(row.intake_encrypted, env); const plan = unseal(row.plan_encrypted, env);
    if (!Number.isInteger(body.revision) || body.revision !== row.revision) throw new NutritionError('O atendimento mudou. Recarregue para usar a versão atual.', 409);
    if (['generate', 'save', 'ai', 'analyze'].includes(action) && row.stage === 'approved') throw new NutritionError('Reabra o plano para iniciar uma nova revisão.', 409);
    if (action === 'generate') {
      let candidate;
      if (isId(body.templateId)) {
        const saved = (await db.query('SELECT plan_encrypted FROM nutrition_templates WHERE id=$1', [body.templateId])).rows[0];
        if (!saved) throw new NutritionError('Modelo não encontrado.', 404);
        candidate = { ...unseal(saved.plan_encrypted, env), review: {}, clinicalNotes: '' };
      } else candidate = generatePlan(intake, body.templateId, Number.isInteger(body.variation) ? Math.abs(body.variation % 2) : 0);
      return json(await savePlan(db, row, candidate, env, body.revision, 'plan_generated'));
    }
    if (action === 'save') return json(await savePlan(db, row, body.plan, env, body.revision, 'plan_saved'));
    if (action === 'ai' || action === 'analyze') {
      if (!intake.aiConsent) throw new NutritionError('Esta pessoa não autorizou o uso opcional de IA.', 403);
      if (!env.NVIDIA_NIM_API_KEY) throw new NutritionError('A chave NVIDIA NIM ainda não foi configurada no servidor.', 503);
      if (action === 'ai' && !plan) throw new NutritionError('Crie um rascunho antes de pedir variações.');
      await transaction(db, async client => {
        await client.query('SELECT pg_advisory_xact_lock(71020260927)');
        const recent = await client.query("SELECT count(*)::integer AS count FROM nutrition_events WHERE type='ai_requested' AND created_at > now()-interval '1 minute'");
        if (recent.rows[0].count >= 4) throw new NutritionError('Aguarde um minuto entre as solicitações de IA.', 429);
        await event(client, row.id, 'ai_requested');
      });
      if (action === 'analyze') return json({ analysis: await analyzeWithNim(intake, { env, fetcher }) });
      const candidate = await suggestWithNim(intake, plan, { env, fetcher });
      // Suggestions are reviewable before replacing any saved draft.
      return json({ suggestion: candidate, revision: row.revision });
    }
    if (action === 'approve') {
      if (!plan || row.payment_status !== 'paid') throw new NutritionError('A liberação exige plano salvo e pagamento confirmado.', 422);
      const errors = validatePlan(plan, intake);
      if (errors.length) throw new NutritionError(errors.join(' '), 422);
      const alerts = clinicalAlerts(intake, plan);
      if (!Array.isArray(body.reviewed) || alerts.some(alert => !body.reviewed.includes(alert.id))) throw new NutritionError('Revise e confirme todos os itens clínicos antes da liberação.', 422);
      if (!plan.targets.energy || !plan.targets.protein || !plan.clinicalNotes?.trim()) throw new NutritionError('Defina as metas de energia e proteína e registre a avaliação clínica antes da entrega.', 422);
      await transaction(db, async client => {
        const updated = await client.query(`UPDATE nutrition_requests SET stage='approved', approved_at=now(), first_delivered_at=COALESCE(first_delivered_at,now()), approved_by=$1, plan_encrypted=$2, updated_at=now()
          WHERE id=$3 AND revision=$4 AND stage='draft' RETURNING id`, [env.RECIPES_ADMIN_USERNAME, seal({ ...plan, review: { ids: alerts.map(alert => alert.id), at: new Date().toISOString() } }, env), row.id, body.revision]);
        if (!updated.rowCount) throw new NutritionError('O plano mudou ou já foi aprovado. Recarregue o atendimento.', 409);
        await event(client, row.id, 'plan_approved');
      });
      return json({ ok: true });
    }
    if (action === 'reopen') {
      if (row.stage !== 'approved') throw new NutritionError('Este plano já está em edição.', 409);
      await transaction(db, async client => {
        const updated = await client.query(`UPDATE nutrition_requests SET stage='draft', revision=revision+1, approved_at=NULL, approved_by=NULL, share_hash=NULL, updated_at=now() WHERE id=$1 AND revision=$2 AND stage='approved' RETURNING id`, [row.id, body.revision]);
        if (!updated.rowCount) throw new NutritionError('O plano mudou. Recarregue o atendimento.', 409);
        await event(client, row.id, 'plan_reopened');
      });
      return json({ ok: true });
    }
    if (action === 'share') {
      if (row.payment_status !== 'paid') throw new NutritionError('A recuperação de acesso exige pagamento confirmado.', 422);
      const token = randomToken();
      await db.query("UPDATE nutrition_requests SET share_hash=$1, share_expires_at=now()+interval '7 days' WHERE id=$2", [tokenHash(token), row.id]);
      await event(db, row.id, 'private_link_created');
      return json({ url: `${readCommerceConfig(env).origin}/meu-plano#acesso=${token}` });
    }
    if (action === 'template') {
      if (!plan || typeof body.title !== 'string' || body.title.trim().length < 3 || body.title.length > 120 || !clinicalProfiles.some(profile => profile.id === body.profile)) throw new NutritionError('Informe nome e categoria para o modelo.');
      const template = { ...plan, clinicalNotes: '', review: {}, title: 'Seu plano alimentar', targets: { ...plan.targets, energy: null, protein: null, carbs: null, fat: null, water: null, sodium: null, potassium: null, phosphorus: null } };
      await db.query('INSERT INTO nutrition_templates (id,title,profile,plan_encrypted) VALUES ($1,$2,$3,$4)', [randomUUID(), body.title.trim(), body.profile, seal(template, env)]);
      await event(db, row.id, 'template_created'); return json({ ok: true });
    }
    throw new NutritionError('Ação não encontrada.', 404);
  } catch (error) {
    if (!(error instanceof NutritionError)) console.error('nutrition_admin_failed', { action, code: error.code || error.name });
    return json({ error: error instanceof NutritionError ? error.message : 'Não foi possível concluir. Confira as configurações e tente novamente.' }, error.status || 503);
  }
}
export function GET(request) { return handleAdminNutritionRequest(request); }
export function POST(request) { return handleAdminNutritionRequest(request); }
export function PATCH(request) { return handleAdminNutritionRequest(request); }
