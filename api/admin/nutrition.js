import { randomUUID } from 'node:crypto';
import { adminMutationAllowed, readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { productAccessHeaders, randomToken, tokenHash } from '../../server/recipes/access.js';
import { readCommerceConfig } from '../../server/recipes/config.js';
import { transaction } from '../../server/recipes/store.js';
import { clinicalProfiles } from '../../src/data/nutrition.js';
import { clinicalAlerts, generatePlan, validatePlan } from '../../src/lib/nutrition.js';
import { assessmentApprovalErrors, buildAssessment } from '../../src/lib/nutrition-journey.js';
import { commerceReady, followupStatus, NutritionError, readBody, readOffer, validOffer } from '../../server/nutrition/service.js';
import { archivePlan, event, getNutritionStore, seal, unseal } from '../../server/nutrition/store.js';
import { analyzeWithNim, suggestWithNim } from '../../server/nutrition/ai.js';
import { buildPlanHtml, buildPlanPdf } from '../../server/nutrition/export.js';
import { plateReferenceForPlan } from '../../server/nutrition/plate-reference.js';
import { readContentLibrary, readTemplates, reusablePlan, saveContentLibrary, saveTemplate, templateDetail } from '../../server/nutrition/library.js';

const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: productAccessHeaders(headers) });
const isId = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value || '');

async function savePlan(db, row, plan, env, expectedRevision, type) {
  const intake = unseal(row.intake_encrypted, env);
  const errors = validatePlan(plan, intake);
  if (errors.length) throw new NutritionError(errors.join(' '), 422);
  if (row.stage === 'approved') throw new NutritionError('Reabra o plano antes de editar a versão aprovada.', 409);
  // Only allow known fields; metadata from either AI or the browser is never trusted.
  const clean = { title: plan.title, templateId: String(plan.templateId || ''), days: plan.days.map(day => ({ label: day.label, meals: day.meals.map(meal => ({ name: meal.name, time: meal.time, note: meal.note, items: meal.items.map(item => ({ foodId: item.foodId, grams: item.grams, alternatives: item.alternatives.map(alt => ({ foodId: alt.foodId, grams: alt.grams })) })) })) })), targets: plan.targets, guidance: plan.guidance, clinicalNotes: plan.clinicalNotes, assessment: buildAssessment(intake, plan, new Date().toISOString()), ...(plan.plateGuide ? { plateGuide: { protein: plan.plateGuide.protein, carbs: plan.plateGuide.carbs, vegetables: plan.plateGuide.vegetables } } : {}), curatedModules: (plan.curatedModules || []).map(({ id, type, title, content, image, foodIds, allergens, requiresIngredientReview, reviewed }) => ({ id, type, title, content, image: image || '', foodIds: [...foodIds], allergens: [...(allergens || [])], requiresIngredientReview: requiresIngredientReview === true, reviewed: reviewed === true })), review: {}, version: 2 };
  return transaction(db, async client => {
    const updated = await client.query(`UPDATE nutrition_requests SET plan_encrypted=$1, revision=revision+1, stage='draft', approved_at=NULL, approved_by=NULL, updated_at=now()
      WHERE id=$2 AND revision=$3 AND stage <> 'approved' RETURNING revision`, [seal(clean, env), row.id, expectedRevision]);
    if (!updated.rowCount) throw new NutritionError('Este atendimento mudou em outra aba. Recarregue antes de salvar.', 409);
    await archivePlan(client, row, 'plan_saved');
    await archivePlan(client, { id: row.id, revision: updated.rows[0].revision, stage: 'draft', plan_encrypted: seal(clean, env) }, type);
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
      if (action === 'library') return json(await readContentLibrary(db));
      if (action === 'template-detail') {
        const id = url.searchParams.get('templateId');
        if (!id || id.length > 80 || !/^[a-z0-9-]+$/.test(id)) throw new NutritionError('Modelo inválido.');
        return json(await templateDetail(db, id, env));
      }
      if (action === 'list') {
        const page = Math.max(0, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0));
        const result = await db.query(`SELECT id, intake_encrypted, payment_status, stage, amount_cents, revision, created_at, updated_at,
          (SELECT count(*)::integer FROM nutrition_checkins c WHERE c.request_id=nutrition_requests.id) AS checkins
          FROM nutrition_requests ORDER BY created_at DESC LIMIT 40 OFFSET $1`, [page * 40]);
        const stats = await db.query(`SELECT count(*)::integer AS total, count(*) FILTER (WHERE payment_status='paid')::integer AS paid,
          count(*) FILTER (WHERE payment_status='paid' AND stage<>'approved')::integer AS waiting,
          count(*) FILTER (WHERE stage='approved')::integer AS approved,
          COALESCE(sum(amount_cents) FILTER (WHERE payment_status='paid'),0)::bigint AS revenue FROM nutrition_requests`);
        const templates = await readTemplates(db, env);
        return json({ patients: result.rows.map(row => { const intake = unseal(row.intake_encrypted, env); return { id: row.id, name: intake.name, conditions: intake.conditions, payment: row.payment_status, stage: row.stage, amountCents: row.amount_cents, createdAt: row.created_at, revision: row.revision, checkins: row.checkins }; }), stats: stats.rows[0], offer: await readOffer(db), templates, page,
          integrations: { checkout: commerceReady(env), ai: Boolean(env.NVIDIA_NIM_API_KEY), model: env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-super-120b-a12b' } });
      }
      const id = url.searchParams.get('id'); if (!isId(id)) throw new NutritionError('Atendimento inválido.');
      const row = (await db.query('SELECT * FROM nutrition_requests WHERE id=$1', [id])).rows[0];
      if (!row) throw new NutritionError('Atendimento não encontrado.', 404);
      const intake = unseal(row.intake_encrypted, env); const plan = unseal(row.plan_encrypted, env);
      if (action === 'detail') {
        const events = await db.query('SELECT type,actor,created_at AS "createdAt" FROM nutrition_events WHERE request_id=$1 ORDER BY created_at DESC LIMIT 30', [id]);
        const checkins = await db.query('SELECT body_encrypted, created_at AS "createdAt" FROM nutrition_checkins WHERE request_id=$1 ORDER BY created_at DESC LIMIT 20', [id]);
        const versions = await db.query('SELECT revision,stage,reason,created_at AS "createdAt" FROM nutrition_plan_versions WHERE request_id=$1 ORDER BY revision DESC,created_at DESC LIMIT 40', [id]);
        const deliveryWarnings = !plan ? [] : !plan.plateGuide ? ['As proporções do prato ainda não foram definidas. Configure e salve o guia para conferir a fotografia na entrega.'] : !(await plateReferenceForPlan(plan).catch(() => null)) ? ['A biblioteca ainda não tem uma fotografia de prato pronto compatível com esta seleção e suas restrições. A entrega usará os grupos e percentuais escritos, sem fotografia do prato. Confira a prévia antes de liberar.'] : [];
        return json({ id, intake, plan, deliveryWarnings, analysis: intake.aiConsent ? unseal(row.analysis_encrypted, env) : null, revision: row.revision, stage: row.stage, payment: row.payment_status, offer: row.offer_snapshot, createdAt: row.created_at, approvedAt: row.approved_at, ...followupStatus(row), events: events.rows, versions: versions.rows, checkins: checkins.rows.map(item => ({ ...unseal(item.body_encrypted, env), createdAt: item.createdAt })) });
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
    const body = await readBody(request, action === 'library-save' ? 800000 : 180000);
    if (action === 'library-save') return json(await saveContentLibrary(db, body));
    if (action === 'template-save') {
      if (body.id !== undefined && !isId(body.id)) throw new NutritionError('Modelo inválido.');
      return json(await saveTemplate(db, body, env));
    }
    if (action === 'template-delete') {
      if (!isId(body.templateId) || !Number.isInteger(body.revision)) throw new NutritionError('Modelo inválido.');
      const removed = await db.query('DELETE FROM nutrition_templates WHERE id=$1 AND revision=$2 RETURNING id', [body.templateId, body.revision]);
      if (!removed.rowCount) throw new NutritionError('O modelo mudou ou já foi removido. Atualize a biblioteca.', 409);
      return json({ ok: true });
    }
    if (action === 'settings') {
      if (!validOffer(body.offer)) throw new NutritionError('Confira título, preço, prazo e acompanhamento. Preencha todos antes de disponibilizar a oferta.');
      if (body.offer.published && !commerceReady(env)) throw new NutritionError('Configure a integração de pagamento e a chave de proteção de dados antes de disponibilizar a oferta.', 422);
      const { title, description, priceCents, deliveryDays, followupDays, published } = body.offer;
      const previousOffer = await readOffer(db);
      if (!Number.isInteger(body.revision) || body.revision !== previousOffer.revision) throw new NutritionError('A oferta mudou em outra aba. Reabra “Minha oferta” para conferir as condições atuais antes de salvar.', 409);
      const bristolReviewed = body.offer.bristolReviewed === true;
      const saved = await db.query('UPDATE nutrition_settings SET offer=$1, offer_revision=offer_revision+1, updated_at=now() WHERE id=1 AND offer_revision=$2 RETURNING offer_revision', [JSON.stringify({ title: title.trim(), description: description.trim(), priceCents, deliveryDays, followupDays, published, bristolReviewed,
        bristolReviewedAt: bristolReviewed ? previousOffer.bristolReviewedAt || new Date().toISOString() : null,
        bristolReviewedBy: bristolReviewed ? env.RECIPES_ADMIN_USERNAME : null }), body.revision]);
      if (!saved.rowCount) throw new NutritionError('A oferta mudou em outra aba. Suas alterações não foram salvas; confira as condições atuais antes de tentar novamente.', 409);
      return json({ ok: true, revision: saved.rows[0].offer_revision });
    }
    if (!isId(body.id)) throw new NutritionError('Atendimento inválido.');
    const row = (await db.query('SELECT * FROM nutrition_requests WHERE id=$1', [body.id])).rows[0];
    if (!row) throw new NutritionError('Atendimento não encontrado.', 404);
    const intake = unseal(row.intake_encrypted, env); const plan = unseal(row.plan_encrypted, env);
    if (!Number.isInteger(body.revision) || body.revision !== row.revision) throw new NutritionError('O atendimento mudou. Recarregue para usar a versão atual.', 409);
    if (['generate', 'save', 'ai', 'analyze', 'restore'].includes(action) && row.stage === 'approved') throw new NutritionError('Reabra o plano para iniciar uma nova revisão.', 409);
    if (action === 'restore') {
      if (!Number.isInteger(body.sourceRevision) || !['draft', 'approved'].includes(body.sourceStage)) throw new NutritionError('Escolha uma versão salva deste atendimento.');
      const previous = (await db.query('SELECT plan_encrypted FROM nutrition_plan_versions WHERE request_id=$1 AND revision=$2 AND stage=$3', [row.id, body.sourceRevision, body.sourceStage])).rows[0];
      if (!previous) throw new NutritionError('Versão não encontrada neste atendimento.', 404);
      return json(await savePlan(db, row, unseal(previous.plan_encrypted, env), env, body.revision, 'plan_restored'));
    }
    if (action === 'generate') {
      let candidate;
      if (isId(body.templateId)) {
        const saved = (await db.query('SELECT plan_encrypted FROM nutrition_templates WHERE id=$1', [body.templateId])).rows[0];
        if (!saved) throw new NutritionError('Modelo não encontrado.', 404);
        candidate = { ...unseal(saved.plan_encrypted, env), assessment: undefined, curatedModules: [], review: {}, clinicalNotes: '' };
      } else candidate = generatePlan(intake, body.templateId, Number.isInteger(body.variation) ? Math.abs(body.variation % 97) : 0);
      if (body.preserveAssessment === true && plan && candidate.templateId === plan.templateId) {
        candidate.targets = structuredClone(plan.targets);
        candidate.clinicalNotes = plan.clinicalNotes;
        candidate.guidance = plan.guidance;
        candidate.assessment = plan.assessment;
        candidate.curatedModules = plan.curatedModules || [];
        candidate.plateGuide = plan.plateGuide ? structuredClone(plan.plateGuide) : undefined;
      }
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
      if (action === 'analyze') {
        const analysis = await analyzeWithNim(intake, { env, fetcher, customTemplates: await readTemplates(db, env) });
        const cached = await db.query('UPDATE nutrition_requests SET analysis_encrypted=$1 WHERE id=$2 AND intake_encrypted=$3 RETURNING id', [seal(analysis, env), row.id, row.intake_encrypted]);
        if (!cached.rowCount) throw new NutritionError('A anamnese ou a autorização mudou. Recarregue o atendimento.', 409);
        return json({ analysis });
      }
      const candidate = await suggestWithNim(intake, plan, { env, fetcher });
      // Suggestions are reviewable before replacing any saved draft.
      return json({ suggestion: candidate, revision: row.revision });
    }
    if (action === 'approve') {
      if (!plan || row.payment_status !== 'paid') throw new NutritionError('A liberação exige plano salvo e pagamento confirmado.', 422);
      const errors = validatePlan(plan, intake);
      if (errors.length) throw new NutritionError(errors.join(' '), 422);
      const assessmentErrors = assessmentApprovalErrors(plan, intake);
      if (assessmentErrors.length) throw new NutritionError(assessmentErrors.join(' '), 422);
      const alerts = clinicalAlerts(intake, plan);
      if (!Array.isArray(body.reviewed) || alerts.some(alert => !body.reviewed.includes(alert.id))) throw new NutritionError('Revise e confirme todos os itens clínicos antes da liberação.', 422);
      if (!plan.targets.energy || !plan.targets.protein || !plan.clinicalNotes?.trim()) throw new NutritionError('Defina as metas de energia e proteína e registre a avaliação clínica antes da entrega.', 422);
      if (!plan.assessment?.summary?.trim() || !plan.assessment?.criteria?.trim()) throw new NutritionError('Escreva o resumo para o cliente e os critérios que fundamentaram a escolha e as metas antes da entrega.', 422);
      if ((plan.curatedModules || []).some(module => module.reviewed !== true)) throw new NutritionError('Revise individualmente todos os conteúdos adicionais antes da entrega.', 422);
      const approvedPlan = { ...plan, assessment: buildAssessment(intake, plan, plan.assessment.recordedAt || new Date().toISOString()), review: { ids: alerts.map(alert => alert.id), at: new Date().toISOString() } };
      if (Object.entries(plan.targets).some(([key, value]) => value != null && !approvedPlan.assessment.targetSources?.[key])) throw new NutritionError('Registre a origem de todas as metas antes da entrega.', 422);
      await transaction(db, async client => {
        const updated = await client.query(`UPDATE nutrition_requests SET stage='approved', approved_at=now(), first_delivered_at=COALESCE(first_delivered_at,now()), approved_by=$1, plan_encrypted=$2, updated_at=now()
          WHERE id=$3 AND revision=$4 AND stage='draft' RETURNING id`, [env.RECIPES_ADMIN_USERNAME, seal(approvedPlan, env), row.id, body.revision]);
        if (!updated.rowCount) throw new NutritionError('O plano mudou ou já foi aprovado. Recarregue o atendimento.', 409);
        await archivePlan(client, row, 'plan_saved');
        await archivePlan(client, { ...row, stage: 'approved', plan_encrypted: seal(approvedPlan, env) }, 'plan_approved');
        await event(client, row.id, 'plan_approved');
      });
      return json({ ok: true });
    }
    if (action === 'reopen') {
      if (row.stage !== 'approved') throw new NutritionError('Este plano já está em edição.', 409);
      await transaction(db, async client => {
        const updated = await client.query(`UPDATE nutrition_requests SET stage='draft', revision=revision+1, approved_at=NULL, approved_by=NULL, share_hash=NULL, updated_at=now() WHERE id=$1 AND revision=$2 AND stage='approved' RETURNING id`, [row.id, body.revision]);
        if (!updated.rowCount) throw new NutritionError('O plano mudou. Recarregue o atendimento.', 409);
        await archivePlan(client, row, 'plan_approved');
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
      const goals = body.goals || []; const tags = body.tags || [];
      if (!Array.isArray(goals) || goals.length > 4 || goals.some(goal => !['wellbeing', 'weight-management', 'muscle', 'clinical'].includes(goal)) || !Array.isArray(tags) || tags.length > 12 || tags.some(tag => typeof tag !== 'string' || tag.length > 60)) throw new NutritionError('Confira objetivos e palavras-chave do modelo.');
      const template = reusablePlan(plan, body.profile, { fromPatient: true });
      const templateErrors = validatePlan(template, intake);
      if (templateErrors.length) throw new NutritionError(`Revise o modelo para a categoria escolhida: ${templateErrors[0]}`, 422);
      await db.query('INSERT INTO nutrition_templates (id,title,profile,plan_encrypted,goals,tags) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), body.title.trim(), body.profile, seal(template, env), JSON.stringify([...new Set(goals)]), JSON.stringify([...new Set(tags.map(tag => tag.trim()).filter(Boolean))])]);
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
