import { randomUUID } from 'node:crypto';
import { adminMutationAllowed, readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';
import { getStore } from '../../server/recipes/store.js';
import { recipeProductById } from '../../src/data/recipes-product.js';

const productQuery = `SELECT id, kind, title, description, price_cents AS "priceCents",
  published, created_at AS "createdAt", updated_at AS "updatedAt"
  FROM recipe_products ORDER BY created_at`;

function validPrice(value) {
  return value === null || (Number.isSafeInteger(value) && value >= 100 && value <= 10_000_000);
}

export async function handleAdminProductsRequest(request, { env = process.env, store } = {}) {
  if (!readAdminSession(request, env)) return unauthorizedAdminResponse();
  if (request.method !== 'GET' && !adminMutationAllowed(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  if (Number(request.headers.get('content-length') || 0) > 8192) return Response.json({ error: 'Solicitação muito grande.' }, { status: 413, headers: productAccessHeaders() });
  try {
    const db = store || await getStore(env);
    if (request.method === 'GET') {
      const result = await db.query(productQuery);
      return Response.json({ products: result.rows }, { headers: productAccessHeaders() });
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 8192) return Response.json({ error: 'Solicitação muito grande.' }, { status: 413, headers: productAccessHeaders() });
    const body = JSON.parse(raw);
    if (request.method === 'POST') {
      const title = String(body.title || '').trim();
      if (title.length < 3 || title.length > 120) return Response.json({ error: 'Informe um título de 3 a 120 caracteres.' }, { status: 400, headers: productAccessHeaders() });
      const id = randomUUID();
      await db.query(`INSERT INTO recipe_products (id, kind, title, description)
        VALUES ($1, 'draft', $2, $3)`, [id, title, String(body.description || '').slice(0, 1000)]);
      return Response.json({ id }, { status: 201, headers: productAccessHeaders() });
    }
    if (request.method === 'PATCH') {
      const id = String(body.id || '');
      const title = String(body.title || '').trim();
      const description = String(body.description || '').trim();
      const priceCents = body.priceCents === '' || body.priceCents === undefined ? null : body.priceCents;
      const published = body.published === true;
      if (!id || title.length < 3 || title.length > 120 || description.length > 1000 || !validPrice(priceCents)) {
        return Response.json({ error: 'Dados do produto inválidos.' }, { status: 400, headers: productAccessHeaders() });
      }
      const existing = await db.query('SELECT kind, updated_at AS "updatedAt" FROM recipe_products WHERE id = $1', [id]);
      if (!existing.rowCount) return Response.json({ error: 'Produto não encontrado.' }, { status: 404, headers: productAccessHeaders() });
      if (!body.updatedAt || Number(new Date(body.updatedAt)) !== Number(new Date(existing.rows[0].updatedAt))) return Response.json({ error: 'Este produto foi alterado. Recarregue a lista antes de salvar.' }, { status: 409, headers: productAccessHeaders() });
      if (published && (!recipeProductById(id) || priceCents === null)) {
        return Response.json({ error: 'É necessário definir o preço e a entrega digital antes de publicar.' }, { status: 400, headers: productAccessHeaders() });
      }
      if (published) {
        const contents = await db.query("SELECT id FROM recipe_content WHERE data->'productIds' ? $1 AND data->>'published' = 'true' LIMIT 1", [id]);
        if (!contents.rows.length) return Response.json({ error: 'Publique pelo menos uma receita completa neste livro antes de oferecê-lo.' }, { status: 400, headers: productAccessHeaders() });
      }
      const saved = await db.query(`UPDATE recipe_products SET title = $1, description = $2, price_cents = $3,
        published = $4, updated_at = now() WHERE id = $5 AND date_trunc('milliseconds', updated_at) = $6::timestamptz RETURNING id`, [title, description, priceCents, published, id, body.updatedAt]);
      if (!saved.rows.length) return Response.json({ error: 'Este produto foi alterado. Recarregue a lista antes de salvar.' }, { status: 409, headers: productAccessHeaders() });
      return Response.json({ ok: true }, { headers: productAccessHeaders() });
    }
    return new Response(null, { status: 405, headers: productAccessHeaders({ Allow: 'GET, POST, PATCH' }) });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: 'Solicitação inválida.' }, { status: 400, headers: productAccessHeaders() });
    console.error('Falha ao gerenciar produtos:', error);
    return Response.json({ error: 'Não foi possível salvar o produto.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function GET(request) { return handleAdminProductsRequest(request); }
export function POST(request) { return handleAdminProductsRequest(request); }
export function PATCH(request) { return handleAdminProductsRequest(request); }
