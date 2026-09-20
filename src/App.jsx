import { useEffect } from 'react';
import { Header, Footer, Breadcrumbs } from './components/Layout.jsx';
import { HomePage, AboutPage, ServicesPage, ServicePage, ContactPage, PrivacyPage, NotFoundPage } from './components/Pages.jsx';
import { resolveRoute } from './data/routes.js';
import { initializeMotion } from './scripts/site.js';

const pages = { home: HomePage, about: AboutPage, services: ServicesPage, service: ServicePage, contact: ContactPage, privacy: PrivacyPage, 'not-found': NotFoundPage };

export default function App({ path }) {
  const route = resolveRoute(path);
  const Page = pages[route.page];
  useEffect(() => {
    let cleanup = initializeMotion();
    const hide = () => { cleanup?.(); cleanup = null; };
    const show = event => { if (event.persisted && !cleanup) cleanup = initializeMotion(); };
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => { hide(); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show); };
  }, [path]);
  return <><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><div className="load-signal" aria-hidden="true" /><Header path={route.path} /><main id="conteudo" tabIndex={-1}>{route.crumbs ? <Breadcrumbs items={route.crumbs} /> : null}<Page service={route.service} index={route.index} /></main><Footer /></>;
}
