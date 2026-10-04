import { createHmac } from 'node:crypto';
import { readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { isAllowedCheckoutRequest, productAccessHeaders } from '../../server/recipes/access.js';
import { getNutritionStore, unseal } from '../../server/nutrition/store.js';
import { NutritionError, readBody } from '../../server/nutrition/service.js';
import { readTemplates } from '../../server/nutrition/library.js';
import { chatWithNim } from '../../server/nutrition/ai.js';
import { chatMessages, chatPageContext } from '../../server/nutrition/chat.js';
import { blockNimRequests, reserveNimRequest } from '../../server/nutrition/ai-rate-limit.js';

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: productAccessHeaders(headers) });
export async function handleNutritionAssistantRequest(request, { env = process.env, store, fetcher = fetch, scope = 'intake' } = {}) {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, { Allow: 'POST' });
  if (scope === 'professional' && !readAdminSession(request, env)) return unauthorizedAdminResponse();
  if (!isAllowedCheckoutRequest(request)) return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const body = await readBody(request, 80000);
    const messages = chatMessages(body.messages);
    const page = body.page && typeof body.page === 'object' && !Array.isArray(body.page) ? body.page : {};
    if (scope !== 'professional' && (page.requestId || page.plan || page.professionalRequest || page.actions?.length)) throw new NutritionError('O contexto profissional exige acesso ao painel.', 403);
    if (!env.NVIDIA_NIM_API_KEY) throw new NutritionError('A chave NVIDIA NIM precisa estar configurada no servidor.', 503);
    const db = await getNutritionStore(env, store);
    let row;
    let intake;
    let plan;
    if (scope === 'professional' && page.requestId) {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(page.requestId)) throw new NutritionError('Atendimento inválido.');
      row = (await db.query('SELECT id,intake_encrypted,plan_encrypted,revision,stage FROM nutrition_requests WHERE id=$1', [page.requestId])).rows[0];
      if (!row) throw new NutritionError('Atendimento não encontrado.', 404);
      if (page.revision !== row.revision) throw new NutritionError('O atendimento mudou. Atualize antes de conversar sobre o plano.', 409);
      intake = unseal(row.intake_encrypted, env);
      plan = page.plan || unseal(row.plan_encrypted, env);
    }
    const context = chatPageContext(page, { scope, intake, plan, customTemplates: scope === 'professional' ? await readTemplates(db, env) : [] });
    if (row?.stage === 'approved') context.availableActions = context.availableActions.filter(id => !['analyze', 'build-week', 'swaps'].includes(id));
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
    const actorHash = createHmac('sha256', env.NUTRITION_DATA_KEY).update(scope === 'professional' ? `admin:${env.RECIPES_ADMIN_USERNAME}` : `intake:${ip}`).digest('hex');
    const result = await chatWithNim(context, messages, { env, fetcher, beforeRequest: () => reserveNimRequest(db, null, { actorHash, scope }), onRateLimited: seconds => blockNimRequests(db, seconds) });
    if (row) {
      const current = (await db.query('SELECT revision,intake_encrypted,stage FROM nutrition_requests WHERE id=$1', [row.id])).rows[0];
      if (!current || current.revision !== row.revision || current.intake_encrypted !== row.intake_encrypted || current.stage !== row.stage) throw new NutritionError('O atendimento mudou durante a conversa. Atualize para consultar o plano atual.', 409);
    }
    return json(result);
  } catch (error) {
    if (!(error instanceof NutritionError)) console.error('nutrition_chat_failed', { code: error.code || error.name });
    return json({ error: error instanceof NutritionError ? error.message : 'Não foi possível conversar com a assistente agora. Tente novamente.', ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) }, error.status || 503, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
  }
}
export function POST(request) { return handleNutritionAssistantRequest(request); }
