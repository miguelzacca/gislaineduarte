import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { recipesProduct } from '../../src/data/recipes-product.js';
import { productAccessHeaders, verifyProductEntitlement } from '../../server/recipes/access.js';

const artifactRoot = resolve(process.cwd(), 'artifacts/recipes');
const downloads = {
  html: {
    file: '7-receitas-para-ajudar-voce-a-desinflamar-offline.html',
    type: 'text/html; charset=utf-8',
  },
  pdf: {
    file: '7-receitas-para-ajudar-voce-a-desinflamar.pdf',
    type: 'application/pdf',
  },
};

async function loadProductArtifact(format) {
  return readFile(resolve(artifactRoot, downloads[format].file));
}

export async function handleDownloadRequest(request, {
  env = process.env,
  now = Date.now(),
  loadArtifact = loadProductArtifact,
} = {}) {
  const entitlement = await verifyProductEntitlement(request, { env, now });
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
    const body = await loadArtifact(format);
    return new Response(body, {
      status: 200,
      headers: productAccessHeaders({
        'Content-Type': download.type,
        'Content-Disposition': `attachment; filename="${download.file}"`,
        'Content-Length': String(body.byteLength),
      }),
    });
  } catch {
    return Response.json(
      { error: 'Arquivo temporariamente indisponível.', product: recipesProduct.id },
      { status: 503, headers: productAccessHeaders({ 'Retry-After': '300' }) },
    );
  }
}

export function GET(request) {
  return handleDownloadRequest(request);
}

