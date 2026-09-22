import { adminCookie, adminMutationAllowed, verifyAdminCredentials } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';

export async function handleAdminLoginRequest(request, options = {}) {
  const env = options.env || process.env;
  if (!adminMutationAllowed(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  if (Number(request.headers.get('content-length') || 0) > 4096) return Response.json({ error: 'Solicitação muito grande.' }, { status: 413, headers: productAccessHeaders() });
  try {
    const form = await request.formData();
    const valid = await verifyAdminCredentials(form.get('username'), form.get('password'), request, options);
    if (!valid) return Response.json({ error: 'Credenciais inválidas ou limite de tentativas atingido.' }, { status: 401, headers: productAccessHeaders() });
    return Response.json({ authenticated: true }, { headers: productAccessHeaders({ 'Set-Cookie': adminCookie(request, env) }) });
  } catch (error) {
    console.error('Falha no login administrativo:', error);
    return Response.json({ error: 'Painel temporariamente indisponível.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function POST(request) { return handleAdminLoginRequest(request); }
