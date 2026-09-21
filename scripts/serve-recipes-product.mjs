import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { handleCheckoutRequest } from '../api/recipes/checkout.js';
import { handleContentRequest } from '../api/recipes/content.js';
import { handleDownloadRequest } from '../api/recipes/download.js';

const root = resolve('dist');
const port = Number(process.env.RECIPES_PRODUCT_DEV_PORT || '4325');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

async function sendWebResponse(webResponse, response) {
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
  if (!webResponse.body) return response.end();
  for await (const chunk of Readable.fromWeb(webResponse.body)) response.write(chunk);
  response.end();
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    const webRequest = new Request(url, { method: request.method, headers });
    if (url.pathname === '/api/recipes/checkout') {
      if (request.method !== 'POST') return sendWebResponse(new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } }), response);
      return sendWebResponse(await handleCheckoutRequest(webRequest), response);
    }
    if (url.pathname === '/api/recipes/content') return sendWebResponse(await handleContentRequest(webRequest), response);
    if (url.pathname === '/api/recipes/download') return sendWebResponse(await handleDownloadRequest(webRequest), response);

    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const target = resolve(root, relative);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const candidate = (await stat(target).catch(() => null))?.isDirectory() ? resolve(target, 'index.html') : target;
    const content = await readFile(candidate).catch(async () => readFile(resolve(root, '404.html')));
    const exists = await stat(candidate).catch(() => null);
    response.writeHead(exists?.isFile() ? 200 : 404, {
      'Content-Type': types[extname(candidate)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      ...(url.pathname === '/minhas-receitas/' ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
    });
    response.end(content);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Erro no servidor local do produto: ${error.message}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Produto local: http://127.0.0.1:${port} (build de dist/)`);
});

