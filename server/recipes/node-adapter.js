import { Readable } from 'node:stream';
import { handleCheckoutRequest } from '../../api/recipes/checkout.js';
import { handleContentRequest } from '../../api/recipes/content.js';
import { handleDownloadRequest } from '../../api/recipes/download.js';

const routes = {
  '/api/recipes/checkout': { method: 'POST', handle: handleCheckoutRequest },
  '/api/recipes/content': { method: 'GET', handle: handleContentRequest },
  '/api/recipes/download': { method: 'GET', handle: handleDownloadRequest },
};

export async function sendWebResponse(webResponse, response) {
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
  if (!webResponse.body) return response.end();
  for await (const chunk of Readable.fromWeb(webResponse.body)) response.write(chunk);
  response.end();
}

export async function handleProductApiRequest(request, response, { env } = {}) {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const route = routes[url.pathname];
  if (!route) return false;

  if (request.method !== route.method) {
    await sendWebResponse(new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: route.method, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    }), response);
    return true;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const webRequest = new Request(url, { method: request.method, headers });
  await sendWebResponse(await route.handle(webRequest, env ? { env } : undefined), response);
  return true;
}
