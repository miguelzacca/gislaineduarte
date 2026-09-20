import { site, services, faqs } from './site.js';

const initial = { name: 'Início', href: '/' };
const attendance = { name: 'Atendimentos', href: '/atendimentos/' };
export const routes = [
  { path: '/', page: 'home', className: 'home-page', title: site.title, description: site.description, faqs },
  { path: '/sobre/', page: 'about', className: 'about-page', title: 'Sobre Gislaine Duarte | História, formação e cuidado', description: `Conheça ${site.fullName}, nutricionista ${site.registration}: história, formação e cuidado com mulheres e famílias orientado pela ciência e pela escuta.`, crumbs: [initial, { name: 'Sobre a Gi', href: '/sobre/' }] },
  { path: '/atendimentos/', page: 'services', title: 'Consulta e acompanhamento nutricional | Gislaine Duarte', description: 'Conheça os atendimentos de Gislaine Duarte: consulta nutricional individual e ciclos de acompanhamento para mulheres e famílias. Entenda cada proposta.', faqs, crumbs: [initial, attendance] },
  ...services.map((service, index) => ({ path: service.href, page: 'service', title: service.seoTitle, description: service.seoDescription, service, index, crumbs: [initial, attendance, { name: service.shortTitle, href: service.href }] })),
  { path: '/contato/', page: 'contact', title: 'Contato e orçamento | Gislaine Duarte, nutricionista', description: 'Fale com Gislaine Duarte pelo WhatsApp ou e-mail para conhecer a consulta nutricional individual, os ciclos de acompanhamento e solicitar orçamento.', crumbs: [initial, { name: 'Contato', href: '/contato/' }] },
  { path: '/privacidade/', page: 'privacy', title: 'Política de privacidade | Gislaine Duarte', description: 'Entenda a navegação, os links de contato, o uso de armazenamento temporário e o tratamento de informações no site de Gislaine Duarte.', crumbs: [initial, { name: 'Privacidade', href: '/privacidade/' }] },
  { path: '/404.html', page: 'not-found', title: 'Página não encontrada | Gislaine Duarte', description: 'A página não foi encontrada. Volte ao início e conheça Gislaine Duarte, sua abordagem e seus atendimentos nutricionais.', noindex: true },
];

export function resolveRoute(path) {
  const normalized = path.endsWith('/') || path.endsWith('.html') ? path : `${path}/`;
  return routes.find(route => route.path === normalized) || routes.at(-1);
}
