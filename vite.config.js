import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { handleProductApiRequest } from './server/recipes/node-adapter.js';

const root = process.cwd();
const generated = resolve(root, '.site');
async function htmlEntries(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(files.map(entry => entry.isDirectory() ? htmlEntries(resolve(dir, entry.name)) : entry.name.endsWith('.html') ? [resolve(dir, entry.name)] : []))).flat();
}

function cleanPageUrls(directory) {
  return (request, response, next) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      response.writeHead(308, { Location: `${url.pathname.replace(/\/+$/, '') || '/'}${url.search}` });
      response.end();
      return;
    }
    if (!url.pathname.startsWith('/api/') && existsSync(resolve(directory, `.${url.pathname}`, 'index.html'))) {
      request.url = `${url.pathname === '/' ? '' : url.pathname}/index.html${url.search}`;
    }
    next();
  };
}

export default defineConfig({
  root: generated,
  envDir: root,
  publicDir: resolve(root, 'public'),
  appType: 'mpa',
  envPrefix: ['VITE_', 'PUBLIC_'],
  resolve: { alias: { '/src': resolve(root, 'src') } },
  server: { port: 4321, strictPort: true, fs: { allow: [root] } },
  preview: { port: 4323, strictPort: true },
  worker: { format: 'es' },
  build: { outDir: resolve(root, 'dist'), emptyOutDir: true, assetsInlineLimit: 0, rolldownOptions: { input: existsSync(generated) ? await htmlEntries(generated) : [], output: { codeSplitting: { groups: [{ name: 'three-core', test: /three[\\/]build[\\/]three\.core\.js$/, priority: 20 }, { name: 'three-renderer', test: /three[\\/]build[\\/]three\.module\.js$/, priority: 10 }] } } } },
  plugins: [react(), {
    name: 'static-pages',
    configureServer(server) {
      if (server.config.server.middlewareMode) return;
      server.middlewares.use(cleanPageUrls(generated));
      const productEnv = { ...process.env, ...loadEnv(server.config.mode, root, 'RECIPES_PRODUCT_') };
      server.middlewares.use((request, response, next) => {
        handleProductApiRequest(request, response, { env: productEnv })
          .then(handled => { if (!handled) next(); })
          .catch(next);
      });
      let regenerating = false;
      server.watcher.add(['src/views', 'src/data', 'src/components', 'src/lib', 'src/motion', 'src/intro', 'src/entry-server.jsx'].map(directory => resolve(root, directory)));
      server.watcher.on('change', file => {
        if (!/[\\/]src[\\/](?:(views|data|components|lib|intro)[\\/]|entry-server\.jsx$)/.test(file) || regenerating) return;
        regenerating = true;
        execFile(process.execPath, ['--env-file-if-exists=.env', 'scripts/generate-pages.mjs'], { cwd: root }, error => { regenerating = false; if (error) console.error(error); else server.ws.send({ type: 'full-reload' }); });
      });
      return () => server.middlewares.use(async (req, res, next) => {
        if (!req.headers.accept?.includes('text/html')) return next();
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (existsSync(resolve(generated, `.${pathname}`, 'index.html')) || existsSync(resolve(generated, `.${pathname}`))) return next();
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(await server.transformIndexHtml('/404.html', await readFile(resolve(generated, '404.html'), 'utf8')));
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(cleanPageUrls(resolve(root, 'dist')));
      return () => server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (existsSync(resolve(root, 'dist', `.${pathname}`, 'index.html')) || existsSync(resolve(root, 'dist', `.${pathname}`))) return next();
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(await readFile(resolve(root, 'dist/404.html'), 'utf8'));
      });
    },
  }],
});
