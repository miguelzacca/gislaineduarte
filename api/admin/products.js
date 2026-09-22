import { randomUUID } from 'node:crypto';
import { adminMutationAllowed, readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';
import { getStore } from '../../server/recipes/store.js';
import { recipesProduct } from '../../src/data/recipes-product.js';

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
    const body = await request.json();
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
      const existing = await db.query('SELECT kind FROM recipe_products WHERE id = $1', [id]);
      if (!existing.rowCount) return Response.json({ error: 'Produto não encontrado.' }, { status: 404, headers: productAccessHeaders() });
      if (existing.rows[0].kind === 'recipes' && (title !== recipesProduct.title || description !== recipesProduct.description)) {
        return Response.json({ error: 'O texto da coleção deve acompanhar a revisão editorial do site.' }, { status: 400, headers: productAccessHeaders() });
      }
      if (published && (existing.rows[0].kind !== 'recipes' || priceCents === null)) {
        return Response.json({ error: 'É necessário definir o preço e a entrega digital antes de publicar.' }, { status: 400, headers: productAccessHeaders() });
      }
      await db.query(`UPDATE recipe_products SET title = $1, description = $2, price_cents = $3,
        published = $4, updated_at = now() WHERE id = $5`, [title, description, priceCents, published, id]);
      return Response.json({ ok: true }, { headers: productAccessHeaders() });
    }
    return new Response(null, { status: 405, headers: productAccessHeaders({ Allow: 'GET, POST, PATCH' }) });
  } catch (error) {
    console.error('Falha ao gerenciar produtos:', error);
    return Response.json({ error: 'Não foi possível salvar o produto.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function GET(request) { return handleAdminProductsRequest(request); }
export function POST(request) { return handleAdminProductsRequest(request); }
export function PATCH(request) { return handleAdminProductsRequest(request); }
