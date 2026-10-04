import { site, services, faqs } from './site.js';
import { recipesProductPreview, glpRecipesProductPreview } from '../generated/recipes-product-preview.js';

const initial = { name: 'Início', href: '/' };
const attendance = { name: 'Atendimentos', href: '/atendimentos' };
export const routes = [
  { path: '/plano-alimentar', page: 'nutrition-landing', className: 'nutrition-page', title: 'Plano alimentar personalizado | Gislaine Duarte', description: 'Conte sobre sua saúde, gostos e rotina. Receba um plano alimentar personalizado, revisado por Gislaine Duarte, em PDF e HTML interativo offline.', crumbs: [initial, { name: 'Seu plano', href: '/plano-alimentar' }] },
  { path: '/meu-plano', page: 'nutrition-status', className: 'nutrition-page', title: 'Meu plano e acompanhamento | Gislaine Duarte', description: 'Acesso privado ao seu plano alimentar e acompanhamento.', noindex: true, crumbs: [initial, { name: 'Meu plano', href: '/meu-plano' }] },
  { path: '/', page: 'home', className: 'home-page', title: site.title, description: site.description, faqs },
  { path: '/sobre', page: 'about', className: 'about-page', title: 'Sobre Gislaine Duarte | História, formação e cuidado', description: `Conheça ${site.fullName}, nutricionista ${site.registration}: história, formação e cuidado com mulheres e famílias orientado pela ciência e pela escuta.`, crumbs: [initial, { name: 'Sobre a Gi', href: '/sobre' }] },
  { path: '/atendimentos', page: 'services', title: 'Consulta e acompanhamento nutricional | Gislaine Duarte', description: 'Conheça os atendimentos de Gislaine Duarte: consulta nutricional individual e ciclos de acompanhamento para mulheres e famílias. Entenda cada proposta.', faqs, crumbs: [initial, attendance] },
  ...services.map((service, index) => ({ path: service.href, page: 'service', title: service.seoTitle, description: service.seoDescription, service, index, crumbs: [initial, attendance, { name: service.shortTitle, href: service.href }] })),
  { path: '/contato', page: 'contact', title: 'Contato e orçamento | Gislaine Duarte, nutricionista', description: 'Fale com Gislaine Duarte pelo WhatsApp ou e-mail para conhecer a consulta nutricional individual, os ciclos de acompanhamento e solicitar orçamento.', crumbs: [initial, { name: 'Contato', href: '/contato' }] },
  {
    path: recipesProductPreview.publicPath,
    page: 'recipe-product',
    className: 'recipe-product-page',
    title: recipesProductPreview.title,
    description: recipesProductPreview.subtitle,
    product: recipesProductPreview,
    faqs: recipesProductPreview.faqs,
    socialImage: {
      src: recipesProductPreview.hero.socialImage,
      width: 1200,
      height: 630,
      alt: 'Livro digital de receitas por Gislaine Duarte.',
    },
    crumbs: [initial, { name: 'Livro de receitas', href: recipesProductPreview.publicPath }],
  },
  {
    path: '/receitas-glp-1',
    page: 'recipe-product',
    className: 'recipe-product-page',
    title: 'À mesa com GLP-1 | Receitas, bebidas e guia | Gislaine Duarte',
    description: 'Receitas, bebidas e guia educativo de alimentação durante o uso de GLP-1. Conheça o livro À mesa com GLP-1, de Gislaine Duarte, e consulte sua disponibilidade.',
    product: glpRecipesProductPreview,
    crumbs: [initial, { name: 'Receitas GLP-1', href: '/receitas-glp-1' }],
  },
  {
    path: recipesProductPreview.experiencePath,
    page: 'recipe-experience',
    className: 'recipe-experience-page',
    title: 'Seu livro de receitas',
    description: 'Área reservada da coleção digital de receitas de Gislaine Duarte.',
    noindex: true,
    crumbs: [initial, { name: 'Livro de receitas', href: recipesProductPreview.publicPath }, { name: 'Sua coleção', href: recipesProductPreview.experiencePath }],
  },
  { path: '/privacidade', page: 'privacy', title: 'Política de privacidade | Gislaine Duarte', description: 'Entenda a navegação, os links de contato, o uso de armazenamento temporário e o tratamento de informações no site de Gislaine Duarte.', crumbs: [initial, { name: 'Privacidade', href: '/privacidade' }] },
  { path: '/painel', page: 'admin', className: 'admin-page', title: 'Painel de gestão | Gislaine Duarte', description: 'Acesso reservado para acompanhar anamneses, preparar planos alimentares e administrar produtos e atendimentos.', noindex: true, crumbs: [initial, { name: 'Painel', href: '/painel' }] },
  { path: '/404.html', page: 'not-found', title: 'Página não encontrada | Gislaine Duarte', description: 'A página não foi encontrada. Volte ao início e conheça Gislaine Duarte, sua abordagem e seus atendimentos nutricionais.', noindex: true },
];

export function resolveRoute(path) {
  const normalized = path.replace(/\/+$/, '') || '/';
  return routes.find(route => route.path === normalized) || routes.at(-1);
}
