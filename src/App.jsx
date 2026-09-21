import { useEffect } from 'react';
import { Header, Footer, Breadcrumbs } from './components/Layout.jsx';
import { HomePage, AboutPage, ServicesPage, ServicePage, ContactPage, PrivacyPage, NotFoundPage } from './components/Pages.jsx';
import { resolveRoute } from './data/routes.js';
import { initializeMotion } from './motion/controller.js';
import { JourneySvg } from './components/MotionGraphics.jsx';
import { BrandMark } from './components/Brand.jsx';
import { IntroOverlay } from './components/IntroOverlay.jsx';
import { RecipeExperiencePage, RecipeProductLandingPage } from './components/RecipesProduct.jsx';

const pages = { home: HomePage, about: AboutPage, services: ServicesPage, service: ServicePage, contact: ContactPage, privacy: PrivacyPage, 'recipe-product': RecipeProductLandingPage, 'recipe-experience': RecipeExperiencePage, 'not-found': NotFoundPage };

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
  return <>{route.page === 'home' ? <IntroOverlay /> : null}<a className="skip-link" href="#conteudo">Pular para o conteúdo</a><div className="route-veil" aria-hidden="true"><BrandMark mono /></div><Header path={route.path} /><main id="conteudo" tabIndex={-1}>{route.page === 'home' ? <JourneySvg /> : null}{route.crumbs ? <Breadcrumbs items={route.crumbs} /> : null}<Page service={route.service} index={route.index} /></main><Footer /></>;
}
