import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';

const root = process.cwd();
const generated = resolve(root, '.site');
async function htmlEntries(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(files.map(entry => entry.isDirectory() ? htmlEntries(resolve(dir, entry.name)) : entry.name.endsWith('.html') ? [resolve(dir, entry.name)] : []))).flat();
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
  build: { outDir: resolve(root, 'dist'), emptyOutDir: true, assetsInlineLimit: 0, rolldownOptions: { input: existsSync(generated) ? await htmlEntries(generated) : [], output: { codeSplitting: { groups: [{ name: 'three-core', test: /three[\\/]build[\\/]three\.core\.js$/, priority: 20 }, { name: 'three-renderer', test: /three[\\/]build[\\/]three\.module\.js$/, priority: 10 }] } } } },
  plugins: [react(), {
    name: 'static-pages',
    configureServer(server) {
      if (server.config.server.middlewareMode) return;
      let regenerating = false;
      server.watcher.add([resolve(root, 'src/views'), resolve(root, 'src/data'), resolve(root, 'src/components'), resolve(root, 'src/lib')]);
      server.watcher.on('change', file => {
        if (!/[\\/]src[\\/](views|data|components|lib)[\\/]/.test(file) || regenerating) return;
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
