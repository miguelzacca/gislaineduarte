import { adminMutationAllowed, readAdminSession, unauthorizedAdminResponse } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';
import { getStore } from '../../server/recipes/store.js';
import { editableRecipe, normalizeRecipeEdit, readRecipeRecords } from '../../server/recipes/content.js';
import { recipeProducts } from '../../src/data/recipes-product.js';

export async function handleAdminRecipesRequest(request, { env = process.env, store } = {}) {
  if (!readAdminSession(request, env)) return unauthorizedAdminResponse();
  if (request.method !== 'GET' && !adminMutationAllowed(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  try {
    const db = store || await getStore(env);
    if (request.method === 'GET') {
      const metadata = await db.query('SELECT id, title FROM recipe_products WHERE id = ANY($1::text[])', [recipeProducts.map(product => product.id)]);
      return Response.json({ products: metadata.rows, recipes: (await readRecipeRecords(db)).map(editableRecipe) }, { headers: productAccessHeaders() });
    }
    if (!['POST', 'PATCH'].includes(request.method)) return new Response(null, { status: 405, headers: productAccessHeaders({ Allow: 'GET, POST, PATCH' }) });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 50000) return Response.json({ error: 'Receita muito longa.' }, { status: 413, headers: productAccessHeaders() });
    const parsed = JSON.parse(raw), input = parsed.recipe || parsed;
    const record = request.method === 'PATCH' ? (await db.query('SELECT data, revision FROM recipe_content WHERE id = $1', [String(input.id || '')])).rows[0] : null;
    const previous = record?.data;
    if (request.method === 'PATCH' && !previous) return Response.json({ error: 'Receita não encontrada.' }, { status: 404, headers: productAccessHeaders() });
    if (record && input.revision !== record.revision) return Response.json({ error: 'Esta receita foi alterada em outra aba. Recarregue o livro antes de salvar.' }, { status: 409, headers: productAccessHeaders() });
    const recipe = normalizeRecipeEdit(input, previous);
    if (request.method === 'POST') { await db.query('INSERT INTO recipe_content (id, data) VALUES ($1, $2::jsonb)', [recipe.id, JSON.stringify(recipe)]); recipe.revision = 1; }
    else {
      const updated = await db.query('UPDATE recipe_content SET data = $2::jsonb, revision = revision + 1, updated_at = now() WHERE id = $1 AND revision = $3 RETURNING revision', [recipe.id, JSON.stringify(recipe), input.revision]);
      if (!updated.rows.length) return Response.json({ error: 'Esta receita foi alterada em outra aba. Recarregue o livro antes de salvar.' }, { status: 409, headers: productAccessHeaders() });
      recipe.revision = updated.rows[0].revision;
    }
    return Response.json({ ok: true, recipe: editableRecipe(recipe) }, { status: request.method === 'POST' ? 201 : 200, headers: productAccessHeaders() });
  } catch (error) {
    const inputError = error instanceof SyntaxError || !(error.code || /database|connect|relation/i.test(error.message));
    if (!inputError) console.error('Falha ao salvar receita:', error.message);
    return Response.json({ error: inputError ? error.message : 'Não foi possível salvar a receita.' }, { status: inputError ? 400 : 503, headers: productAccessHeaders() });
  }
}
export function GET(request) { return handleAdminRecipesRequest(request); }
export function POST(request) { return handleAdminRecipesRequest(request); }
export function PATCH(request) { return handleAdminRecipesRequest(request); }
