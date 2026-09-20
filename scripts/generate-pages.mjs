import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';
import { buildRobots, buildSitemap, buildLlms } from '../src/lib/discovery.js';

process.env.NODE_ENV ||= 'production';
const renderer = await createServer({ mode: 'production', logLevel: 'error', server: { middlewareMode: true, watch: null }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
try {
const { renderPages } = await renderer.ssrLoadModule('/src/entry-server.jsx');
for (const page of renderPages()) {
  const relative = page.path.endsWith('.html') ? page.path.slice(1) : `${page.path.slice(1)}index.html`;
  const destination = resolve('.site', relative);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, page.html, 'utf8');
}
} finally { await renderer.close(); }
await Promise.all([
  writeFile('public/robots.txt', buildRobots()),
  writeFile('public/sitemap.xml', buildSitemap()),
  writeFile('public/llms.txt', buildLlms()),
]);
console.log('8 páginas React/JSX pré-renderizadas e arquivos de descoberta gerados.');
