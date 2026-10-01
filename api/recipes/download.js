import { requestedRecipeProduct } from '../../src/data/recipes-product.js';
import { productAccessHeaders, verifyProductEntitlement } from '../../server/recipes/access.js';
import { getStore } from '../../server/recipes/store.js';
import { readRecipeProduct } from '../../server/recipes/content.js';
import { buildRecipeHtml, buildRecipePdf } from '../../server/recipes/export.js';

const downloads = {
  html: {
    file: 'livro-de-receitas.html',
    type: 'text/html; charset=utf-8',
  },
  pdf: {
    file: 'livro-de-receitas.pdf',
    type: 'application/pdf',
  },
};

export async function handleDownloadRequest(request, {
  env = process.env,
  store,
  loadArtifact,
} = {}) {
  const product = requestedRecipeProduct(request);
  if (!product) return Response.json({ error: 'Produto não encontrado.' }, { status: 404, headers: productAccessHeaders() });
  const entitlement = await verifyProductEntitlement(request, { env, store });
  if (!entitlement.granted) {
    return Response.json(
      { error: 'Acesso não autorizado.', reason: entitlement.reason },
      { status: 401, headers: productAccessHeaders() },
    );
  }
  const format = new URL(request.url).searchParams.get('format');
  const download = downloads[format];
  if (!download) {
    return Response.json({ error: 'Formato de download inválido.' }, { status: 400, headers: productAccessHeaders() });
  }
  try {
    const data = loadArtifact ? null : await readRecipeProduct(store || await getStore(env), product.id);
    const body = loadArtifact ? await loadArtifact(format) : format === 'pdf' ? await buildRecipePdf(data) : Buffer.from(await buildRecipeHtml(data), 'utf8');
    const file = product.id === 'receitas-glp1' ? `receitas-glp1.${format}` : download.file;
    return new Response(body, {
      status: 200,
      headers: productAccessHeaders({
        'Content-Type': download.type,
        'Content-Disposition': `attachment; filename="${file}"`,
        'Content-Length': String(body.byteLength),
      }),
    });
  } catch {
    return Response.json(
      { error: 'Arquivo temporariamente indisponível.', product: product.id },
      { status: 503, headers: productAccessHeaders({ 'Retry-After': '300' }) },
    );
  }
}

export function GET(request) {
  return handleDownloadRequest(request);
}
