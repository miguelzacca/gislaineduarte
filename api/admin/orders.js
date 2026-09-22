import { readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';
import { getStore } from '../../server/recipes/store.js';

export async function handleAdminOrdersRequest(request, { env = process.env, store } = {}) {
  if (!readAdminSession(request, env)) return unauthorizedAdminResponse();
  try {
    const db = store || await getStore(env);
    const [stats, recent] = await Promise.all([
      db.query(`SELECT count(*) FILTER (WHERE status = 'paid')::integer AS paid,
        count(*) FILTER (WHERE status = 'pending')::integer AS pending,
        coalesce(sum(amount_cents) FILTER (WHERE status = 'paid'), 0)::integer AS "grossCents" FROM recipe_orders`),
      db.query(`SELECT id, email, amount_cents AS "amountCents", status,
        created_at AS "createdAt", paid_at AS "paidAt" FROM recipe_orders ORDER BY created_at DESC LIMIT 20`),
    ]);
    return Response.json({ stats: stats.rows[0], orders: recent.rows }, { headers: productAccessHeaders() });
  } catch (error) {
    console.error('Falha ao carregar pedidos:', error);
    return Response.json({ error: 'Pedidos indisponíveis.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function GET(request) { return handleAdminOrdersRequest(request); }
