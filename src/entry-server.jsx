import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import { routes } from './data/routes.js';
import { buildMetadata, buildJsonLd, serializeJsonLd } from './lib/seo.js';
import { INTRO_BOOTSTRAP } from './intro/session.js';
import { INTRO_TIMING } from './intro/timeline.js';
import { NATIVE_TRANSITIONS_BOOTSTRAP } from './motion/native-transitions.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function renderPages() {
  return routes.map(route => {
    const meta = buildMetadata(route.path, route.title, route.description, route.noindex, route.socialImage);
    const structured = serializeJsonLd(buildJsonLd(route.path, route.title, route.description, { service: route.service, product: route.product, faqs: route.faqs, breadcrumbs: route.crumbs }));
    const markup = renderToString(<App path={route.path} />);
    const productStyles = route.page.startsWith('recipe-') ? '<link rel="stylesheet" href="/src/styles/recipes-product.css">' : route.page === 'admin' ? '<link rel="stylesheet" href="/src/styles/admin.css">' : '';
    const html = `<!doctype html><html lang="pt-BR" class="no-js"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#173F35"><title>${escapeHtml(meta.title)}</title><meta name="description" content="${escapeHtml(meta.description)}"><meta name="robots" content="${escapeHtml(meta.robots)}"><link rel="canonical" href="${meta.canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Gislaine Duarte · Nutricionista"><meta property="og:locale" content="pt_BR"><meta property="og:title" content="${escapeHtml(meta.title)}"><meta property="og:description" content="${escapeHtml(meta.description)}"><meta property="og:url" content="${meta.canonical}"><meta property="og:image" content="${meta.ogImage}"><meta property="og:image:width" content="${meta.ogImageWidth}"><meta property="og:image:height" content="${meta.ogImageHeight}"><meta property="og:image:alt" content="${escapeHtml(meta.ogImageAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(meta.title)}"><meta name="twitter:description" content="${escapeHtml(meta.description)}"><meta name="twitter:image" content="${meta.ogImage}"><meta name="twitter:image:alt" content="${escapeHtml(meta.ogImageAlt)}"><link rel="icon" href="/images/brand-mark.svg" type="image/svg+xml"><link rel="icon" href="/images/icon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/images/icon-180.png"><link rel="manifest" href="/site.webmanifest"><link rel="preload" href="/fonts/editorial.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/body.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/src/styles/global.css"><link rel="stylesheet" href="/src/styles/motion.css">${productStyles}<script>document.documentElement.classList.replace('no-js','js');</script><script type="application/ld+json">${structured}</script></head><body class="${route.className || ''}" data-route="${route.path}"><div id="root">${markup}</div><script type="module" src="/src/entry-client.jsx"></script></body></html>`;
    const introHead = `<link rel="stylesheet" href="/src/styles/intro.css"><script>${NATIVE_TRANSITIONS_BOOTSTRAP}${INTRO_BOOTSTRAP}if(window.__gislaineIntroBoot.shouldPlay)window.__gislaineIntroWatchdog=setTimeout(()=>window.__gislaineIntroSessionV1.cancelBootstrap(),${INTRO_TIMING.bootstrapTimeout});</script>`;
    return { path: route.path, html: html.replace('</head>', `${introHead}</head>`) };
  });
}
