import { readAdminSession } from '../../server/recipes/admin.js';
import { productAccessHeaders } from '../../server/recipes/access.js';

export function handleAdminSessionRequest(request, { env = process.env } = {}) {
  return Response.json({ authenticated: readAdminSession(request, env) }, { headers: productAccessHeaders() });
}

export function GET(request) { return handleAdminSessionRequest(request); }
