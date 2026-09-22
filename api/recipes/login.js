import { isAllowedCheckoutRequest, productAccessHeaders } from '../../server/recipes/access.js';
import { requestLogin } from '../../server/recipes/flow.js';

export async function handleLoginRequest(request, options = {}) {
  if (!isAllowedCheckoutRequest(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  if (Number(request.headers.get('content-length') || 0) > 4096) return Response.json({ error: 'Solicitação muito grande.' }, { status: 413, headers: productAccessHeaders() });
  try {
    const form = await request.formData();
    const result = await requestLogin(form.get('email'), request, options);
    if (result.error) return Response.json({ error: result.error }, { status: result.status, headers: productAccessHeaders() });
    if (result.ready) return Response.json({ ok: true, ready: true }, { headers: productAccessHeaders() });
    return Response.json({ ok: true, message: 'Se este e-mail possui acesso, enviamos um link para entrar.' }, {
      headers: productAccessHeaders(result.cookie ? { 'Set-Cookie': result.cookie } : {}),
    });
  } catch (error) {
    console.error('Falha ao enviar link de acesso:', error);
    return Response.json({ error: 'Não foi possível enviar o link agora.' }, { status: 503, headers: productAccessHeaders() });
  }
}

export function POST(request) { return handleLoginRequest(request); }
