import { Readable } from 'node:stream';
import { handleCheckoutRequest } from '../../api/recipes/checkout.js';
import { handleContentRequest } from '../../api/recipes/content.js';
import { handleDownloadRequest } from '../../api/recipes/download.js';
import { handleWebhookRequest } from '../../api/recipes/webhook.js';
import { handleReturnRequest } from '../../api/recipes/return.js';
import { handleLoginRequest } from '../../api/recipes/login.js';
import { handleLogoutRequest } from '../../api/recipes/logout.js';
import { handleStatusRequest } from '../../api/recipes/status.js';
import { handleCatalogRequest } from '../../api/recipes/catalog.js';
import { handleVerifyRequest, GET as verifyPage } from '../../api/recipes/verify.js';
import { handleAdminSessionRequest } from '../../api/admin/session.js';
import { handleAdminLoginRequest } from '../../api/admin/login.js';
import { handleAdminLogoutRequest } from '../../api/admin/logout.js';
import { handleAdminProductsRequest } from '../../api/admin/products.js';
import { handleAdminOrdersRequest } from '../../api/admin/orders.js';

const routes = {
  '/api/recipes/checkout': { method: 'POST', handle: handleCheckoutRequest },
  '/api/recipes/content': { method: 'GET', handle: handleContentRequest },
  '/api/recipes/download': { method: 'GET', handle: handleDownloadRequest },
  '/api/recipes/webhook': { method: 'POST', handle: handleWebhookRequest },
  '/api/recipes/return': { method: 'GET', handle: handleReturnRequest },
  '/api/recipes/login': { method: 'POST', handle: handleLoginRequest },
  '/api/recipes/logout': { method: 'POST', handle: handleLogoutRequest },
  '/api/recipes/status': { method: 'GET', handle: handleStatusRequest },
  '/api/recipes/catalog': { method: 'GET', handle: handleCatalogRequest },
  '/api/recipes/verify': { method: ['GET', 'POST'], handle: (req, opts) => req.method === 'GET' ? verifyPage(req) : handleVerifyRequest(req, opts) },
  '/api/admin/session': { method: 'GET', handle: handleAdminSessionRequest },
  '/api/admin/login': { method: 'POST', handle: handleAdminLoginRequest },
  '/api/admin/logout': { method: 'POST', handle: handleAdminLogoutRequest },
  '/api/admin/products': { method: ['GET', 'POST', 'PATCH'], handle: handleAdminProductsRequest },
  '/api/admin/orders': { method: 'GET', handle: handleAdminOrdersRequest },
};

export async function sendWebResponse(webResponse, response) {
  const headers = Object.fromEntries(webResponse.headers);
  const cookies = webResponse.headers.getSetCookie?.() || [];
  if (cookies.length) headers['set-cookie'] = cookies;
  response.writeHead(webResponse.status, headers);
  if (!webResponse.body) return response.end();
  for await (const chunk of Readable.fromWeb(webResponse.body)) response.write(chunk);
  response.end();
}

export async function handleProductApiRequest(request, response, { env } = {}) {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const route = routes[url.pathname.replace(/\/+$/, '')];
  if (!route) return false;

  const allowed = Array.isArray(route.method) ? route.method : [route.method];
  if (!allowed.includes(request.method)) {
    await sendWebResponse(new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: allowed.join(', '), 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    }), response);
    return true;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 16_384) {
        await sendWebResponse(new Response('Payload Too Large', { status: 413 }), response);
        return true;
      }
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  const webRequest = new Request(url, { method: request.method, headers, body });
  await sendWebResponse(await route.handle(webRequest, env ? { env } : undefined), response);
  return true;
}
