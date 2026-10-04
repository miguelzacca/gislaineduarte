import { transaction } from '../recipes/store.js';
import { event } from './store.js';
import { NutritionError } from './service.js';
import { nimRequestsPerMinute } from './ai.js';

function limited(seconds) {
  const error = new NutritionError(`A assistente chegou ao limite de ${nimRequestsPerMinute} solicitações por minuto. Aguarde ${seconds} segundos.`, 429);
  error.retryAfter = seconds;
  return error;
}

export async function reserveNimRequest(db, requestId) {
  // Share the quota across tabs, users and serverless instances using DB time.
  // Reservations are committed before contacting NVIDIA.
  await transaction(db, async client => {
    await client.query('SELECT pg_advisory_xact_lock(71020260927)');
    const blocked = await client.query('SELECT ceil(extract(epoch FROM blocked_until-now()))::integer AS seconds FROM nutrition_ai_limit WHERE id=1');
    if (blocked.rows[0]?.seconds > 0) throw limited(blocked.rows[0].seconds);
    const recent = await client.query("SELECT count(*)::integer AS count, ceil(extract(epoch FROM min(created_at)+interval '1 minute'-now()))::integer AS seconds FROM nutrition_events WHERE type='ai_requested' AND created_at > now()-interval '1 minute'");
    if (recent.rows[0].count >= nimRequestsPerMinute) throw limited(Math.max(1, recent.rows[0].seconds));
    await event(client, requestId, 'ai_requested');
  });
}

export async function blockNimRequests(db, seconds) {
  await db.query("UPDATE nutrition_ai_limit SET blocked_until=greatest(blocked_until, now()+$1*interval '1 second') WHERE id=1", [seconds]);
}
