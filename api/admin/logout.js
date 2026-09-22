import { adminMutationAllowed, clearAdminCookie } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';

export function handleAdminLogoutRequest(request, { env = process.env } = {}) {
  if (!adminMutationAllowed(request)) return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: productAccessHeaders() });
  return Response.json({ authenticated: false }, { headers: productAccessHeaders({ 'Set-Cookie': clearAdminCookie(request, env) }) });
}

export function POST(request) { return handleAdminLogoutRequest(request); }
