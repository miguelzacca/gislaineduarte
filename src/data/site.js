const env = import.meta.env ?? (typeof process !== 'undefined' ? process.env : {});
const phoneDigits = (env.PUBLIC_WHATSAPP?.trim() || '5547991913588').replace(/[\s()+.-]/g, '');
const whatsapp = /^\d{10,11}$/.test(phoneDigits) ? `55${phoneDigits}` : phoneDigits;
const email = env.PUBLIC_EMAIL?.trim() || 'duartegisarte@gmail.com';
const instagram = env.PUBLIC_INSTAGRAM?.trim() || null;

if (!/^[1-9]\d{7,14}$/.test(whatsapp)) {
  throw new Error('PUBLIC_WHATSAPP deve conter um número brasileiro com DDD ou um número internacional completo.');
}
if (!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
  throw new Error('PUBLIC_EMAIL deve conter um endereço de e-mail válido.');
}
if (instagram) {
  const profile = new URL(instagram);
  if (profile.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(profile.hostname)) {
    throw new Error('PUBLIC_INSTAGRAM deve conter a URL HTTPS do perfil oficial no Instagram.');
  }
}

export const site = {
  name: 'Gislaine Duarte',
  familiarName: 'Nutri Gi',
  profession: 'Nutricionista',
  url: 'https://gislaineduarte.com.br',
  language: 'pt-BR',
  locale: 'pt_BR',
  title: 'Gislaine Duarte | Nutricionista para mulheres e famílias',
  description:
    'Conheça Gislaine Duarte, nutricionista com foco em qualidade de vida, saúde intestinal e hábitos saudáveis. Saiba mais sobre consultas e acompanhamentos.',
  tagline: 'Meu foco é ajudar você a viver com qualidade de vida.',
  heroDescription:
    'Nutrição com ciência, escuta e cuidado individualizado para mulheres e famílias. Um olhar para a sua alimentação, sua rotina e o que qualidade de vida significa para você.',
  registration: null,
  portrait: '/images/gislaine-duarte-960.webp',
  socialImage: {
    src: '/images/og-gislaine-duarte.jpg',
    width: 1200,
    height: 630,
    alt: 'Gislaine Duarte, nutricionista. Cuidado de dentro para fora.',
  },
  contact: {
    whatsapp,
    whatsappDisplay: /^55\d{11}$/.test(whatsapp)
      ? whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, '+55 ($1) $2-$3')
      : `+${whatsapp}`,
    email,
    instagram,
  },
  editorialNotice:
    'Os conteúdos deste site têm finalidade educativa e não substituem avaliação individualizada. As orientações nutricionais devem considerar as necessidades de cada pessoa.',
};

export const hero = {
  title: site.tagline,
  description: site.heroDescription,
  secondaryLabel: 'Conhecer os atendimentos',
  secondaryHref: '/atendimentos/',
};

export const biography = {
  title: 'Antes de ser minha profissão, a nutrição fez parte da minha própria busca por saúde.',
  short:
    'Sou Gislaine Duarte, nutricionista, gaúcha, cristã, esposa e empreendedora no segmento de produtos naturais. Minha busca pessoal por saúde me aproximou da ciência e se tornou uma missão profissional: orientar mulheres e famílias na construção de hábitos mais saudáveis.',
  education:
    'Sou bacharel em Nutrição e estou cursando pós-graduação em Nutrição Estética e Nutrição Aplicada à Saúde da Mulher.',
  paragraphs: [
    'Sou Gislaine Duarte, gaúcha, cristã, esposa, empreendedora e nutricionista. Minha jornada na nutrição começou com uma busca pessoal por saúde, equilíbrio e sentido de vida. Ao buscar respostas para o meu próprio cuidado, encontrei na ciência um caminho de aprendizado que, com o tempo, se tornou também meu propósito profissional.',
    'Essa história ajuda a explicar a forma como vejo a nutrição hoje: um cuidado que precisa conhecer a pessoa antes de orientar suas escolhas. Cada rotina tem seus desafios, cada família tem seus costumes e cada mudança acontece dentro de uma realidade que merece ser respeitada.',
    'Sou apaixonada pela fitoterapia, pelos hábitos saudáveis e pelo universo dos produtos naturais. Também sou empreendedora, com uma loja nesse segmento — uma parte da minha trajetória que se conecta ao meu interesse pela alimentação e pelo cuidado cotidiano.',
    'Meu trabalho é voltado a mulheres e famílias que desejam construir uma relação mais consciente com a alimentação e buscar mais qualidade de vida. Acredito em orientações práticas, em escuta atenta e em um acompanhamento que ajude cada pessoa a desenvolver autonomia, sem transformar o cuidado com a saúde em mais uma fonte de cobrança.',
  ],
};

export const approachIntroduction = {
  title: 'Cuidar da alimentação começa por entender a sua vida.',
  paragraphs: [
    'Minha abordagem une ciência, modulação intestinal, nutrição funcional e estratégias baseadas em evidências para orientar um cuidado de dentro para fora. Isso significa olhar para além de uma lista de alimentos: conhecer seus hábitos, respeitar suas preferências e compreender os desafios que fazem parte do seu dia a dia.',
    'O objetivo é construir um caminho alimentar que tenha fundamento e seja possível de colocar em prática. Um cuidado que considere sua individualidade e ajude você a fazer escolhas com mais clareza, confiança e autonomia.',
  ],
};

export const approach = [
  {
    title: 'Ciência para orientar as escolhas',
    body: 'Conhecimento técnico como base para um cuidado criterioso, atento às necessidades e aos objetivos de cada pessoa.',
  },
  {
    title: 'Atenção à saúde intestinal',
    body: 'Um olhar para a alimentação, os hábitos e o funcionamento intestinal dentro da avaliação nutricional individual.',
  },
  {
    title: 'Respeito à sua realidade',
    body: 'Estratégias pensadas para dialogar com sua rotina, suas preferências e suas possibilidades.',
  },
  {
    title: 'Autonomia no dia a dia',
    body: 'Orientação para compreender melhor suas escolhas e desenvolver hábitos que possam fazer parte da sua vida com continuidade.',
  },
];

export const services = [
  {
    slug: 'consulta-nutricional',
    title: 'Consulta nutricional individual',
    shortTitle: 'Consulta individual',
    eyebrow: 'Um primeiro passo',
    summary: 'Avaliação individualizada para conhecer sua rotina e orientar os próximos passos do seu cuidado nutricional.',
    intro: 'Um espaço para olhar com atenção para você e para a sua alimentação.',
    paragraphs: [
      'A consulta nutricional individual é o primeiro passo para uma avaliação aprofundada e personalizada. É o momento de conversar sobre sua rotina, seus hábitos alimentares, suas preferências, seus objetivos e os desafios que você encontra para cuidar da saúde.',
      'A partir dessa compreensão, o cuidado nutricional ganha direção: as orientações passam a considerar quem você é e o que precisa, com atenção à sua realidade e às possibilidades do seu dia a dia.',
    ],
    steps: [
      {
        title: 'Conhecer sua rotina',
        body: 'Conversar sobre seus hábitos alimentares, suas preferências e os desafios do dia a dia.',
      },
      {
        title: 'Compreender seus objetivos',
        body: 'Olhar para suas necessidades e para o que você busca no cuidado com a alimentação.',
      },
      {
        title: 'Orientar os próximos passos',
        body: 'Pensar o cuidado nutricional a partir da sua individualidade e das possibilidades da sua rotina.',
      },
    ],
    confirmedDeliverables: [],
    audience: 'Mulheres e famílias que desejam compreender melhor sua alimentação e seus objetivos de cuidado.',
    seoTitle: 'Consulta nutricional individual | Gislaine Duarte',
    seoDescription: 'Conheça a consulta nutricional individual com Gislaine Duarte: um olhar para sua alimentação, rotina e objetivos. Solicite informações e orçamento.',
    href: '/atendimentos/consulta-nutricional/',
  },
  {
    slug: 'ciclos-de-acompanhamento',
    title: 'Ciclos de acompanhamento',
    shortTitle: 'Ciclos de acompanhamento',
    eyebrow: 'Cuidado com continuidade',
    summary: 'Continuidade no cuidado nutricional para apoiar a construção de hábitos duradouros.',
    intro: 'Porque construir novos hábitos também exige tempo, prática e continuidade.',
    paragraphs: [
      'Os ciclos de acompanhamento são voltados a mulheres e famílias que buscam dar continuidade ao cuidado nutricional. Mais do que um encontro pontual, a proposta é acompanhar a construção de hábitos ao longo do tempo, considerando as dificuldades, os aprendizados e as necessidades que surgem no processo.',
      'Os ciclos oferecem um percurso de cuidado para quem deseja colocar as orientações em prática com maior constância e desenvolver escolhas que possam permanecer na rotina.',
    ],
    steps: [
      {
        title: 'Dar continuidade ao cuidado',
        body: 'Acompanhar a construção de hábitos alimentares ao longo do tempo.',
      },
      {
        title: 'Considerar o seu processo',
        body: 'Olhar para as dificuldades, os aprendizados e as necessidades que surgem na sua rotina.',
      },
      {
        title: 'Levar as escolhas para a vida',
        body: 'Apoiar a prática das orientações e a construção de hábitos com mais constância e autonomia.',
      },
    ],
    confirmedDeliverables: [],
    audience: 'Mulheres e famílias que buscam dar continuidade ao cuidado nutricional.',
    seoTitle: 'Ciclos de acompanhamento nutricional | Gislaine Duarte',
    seoDescription: 'Conheça os ciclos de acompanhamento com Gislaine Duarte, voltados à continuidade do cuidado nutricional e à construção de hábitos. Solicite orçamento.',
    href: '/atendimentos/ciclos-de-acompanhamento/',
  },
];

export const faqs = [
  {
    question: 'Qual é a diferença entre a consulta individual e o ciclo de acompanhamento?',
    answer: 'A consulta individual é um ponto de partida para avaliar sua alimentação e conversar sobre seus objetivos. Os ciclos propõem continuidade no cuidado nutricional. Para conhecer a duração e as condições de cada opção, entre em contato com a Nutri Gi.',
  },
  {
    question: 'O atendimento é voltado apenas ao emagrecimento?',
    answer: 'O foco do meu trabalho é a qualidade de vida, com atenção à alimentação, à saúde intestinal e à construção de hábitos. O emagrecimento pode ser um dos objetivos de quem procura atendimento, mas não resume minha proposta de cuidado.',
  },
  {
    question: 'Posso procurar orientação para a alimentação da minha família?',
    answer: 'Mulheres e famílias fazem parte do público do meu trabalho. Ao entrar em contato, conte quem precisa do atendimento para confirmar a possibilidade e a forma de acompanhamento mais adequada.',
  },
  {
    question: 'Como saber qual atendimento escolher?',
    answer: 'Entre em contato para conhecer a consulta individual e os ciclos de acompanhamento. A escolha pode ser conversada a partir do que você busca e das condições de cada serviço.',
  },
];

export const navigation = [
  { label: 'Abordagem', href: '/#abordagem' },
  { label: 'Sobre a Gi', href: '/sobre/' },
  { label: 'Atendimentos', href: '/atendimentos/' },
  { label: 'Contato', href: '/contato/' },
];

export const publicRoutes = [
  '/',
  '/sobre/',
  '/atendimentos/',
  ...services.map((service) => service.href),
  '/contato/',
  '/privacidade/',
];

/**
 * Publicar apenas com approved:true, slug, title, description, cover (src, alt,
 * width, height), href, format e free verificados.
 */
export const materials = [];

/**
 * Publicar apenas com approved:true, slug, title, description, author,
 * publishedAt, reviewedAt, reviewedBy e references (title, url) verificados.
 */
export const articles = [];

export const contactLabel = 'Falar com a Nutri Gi';

export function contactLink(service) {
  const selected = typeof service === 'string'
    ? services.find((item) => item.slug === service || item.title === service)
    : service;
  const message = selected
    ? `Olá, Gislaine! Conheci seu trabalho pelo site e gostaria de solicitar um orçamento para ${selected.slug === 'consulta-nutricional' ? 'a consulta nutricional individual' : 'os ciclos de acompanhamento'}.`
    : 'Olá, Gislaine! Conheci seu trabalho pelo site e gostaria de saber mais sobre a consulta nutricional e os ciclos de acompanhamento.';

  if (site.contact.whatsapp) {
    return `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(message)}`;
  }
  if (site.contact.email) {
    const subject = selected ? `Informações sobre ${selected.title.toLocaleLowerCase('pt-BR')}` : 'Informações sobre atendimento nutricional';
    return `mailto:${site.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  }
  return null;
}
