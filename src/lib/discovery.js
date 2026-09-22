import { biography, publicRoutes, services, site } from '../data/site.js';
import { canonicalUrl, siteNoindex } from './seo.js';

export function buildRobots() {
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /api/recipes/', 'Disallow: /api/admin/'];
  if (!siteNoindex) lines.push('', `Sitemap: ${site.url}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

export function buildSitemap() {
  const entries = publicRoutes.map((path) => `  <url><loc>${canonicalUrl(path)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function buildLlms() {
  return [
    `# ${site.name} — ${site.profession}`,
    '',
    `> Site institucional de ${site.fullName}, nutricionista (${site.registration}), conhecida como ${site.name} e ${site.familiarName}. Cuidado individualizado para mulheres e famílias, com foco em qualidade de vida.`,
    '',
    '## Informações institucionais',
    '',
    `- [Página inicial](${site.url}/): identidade, abordagem, atendimentos e perguntas frequentes.`,
    `- [Sobre Gislaine](${site.url}/sobre): história e formação. ${biography.education.replace('Sou ', 'É ').replace('estou cursando', 'está cursando')}`,
    `- [Atendimentos](${site.url}/atendimentos): consulta individual e ciclos de acompanhamento.`,
    ...services.map((service) => `- [${service.title}](${site.url}${service.href}): ${service.summary}`),
    `- [Contato](${site.url}/contato): canais oficiais para informações e orçamento.`,
    `- [Privacidade](${site.url}/privacidade): informações sobre o funcionamento deste site.`,
    '',
    '## Escopo',
    '',
    'A abordagem considera ciência, nutrição funcional, saúde intestinal, rotina e preferências individuais. As pós-graduações em Nutrição Estética e Nutrição Aplicada à Saúde da Mulher estão em andamento.',
    '',
    'Os ciclos de acompanhamento são apresentados sem duração fixa. Modalidades, endereço, preços, quantidade de encontros e condições devem ser consultados diretamente pelos canais oficiais.',
    '',
    site.editorialNotice,
    '',
  ].join('\n');
}
