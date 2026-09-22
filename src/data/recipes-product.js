/**
 * Fonte canônica do produto "7 receitas para ajudar você a desinflamar!".
 *
 * Este módulo é server/build-only. Nunca o importe em componentes enviados ao
 * navegador. A landing usa `src/generated/recipes-product-preview.js`, gerado a
 * partir destes dados; a área adquirida recebe o conteúdo por endpoint protegido.
 */

/** @typedef {{ singular: string, plural: string }} RecipeUnit */
/** @typedef {{ id: string, quantity: number | null, unit?: RecipeUnit, name?: string, display?: string, shoppingKey: string, section: string, optional?: boolean }} RecipeIngredient */
/** @typedef {{ label: string, totalMinutes: number, approximate: boolean, inferred: boolean }} RecipeTime */
/** @typedef {{ status: string, source: string, inferredFields: string[] }} EditorialValidation */
/**
 * @typedef {object} CanonicalRecipe
 * @property {string} id
 * @property {string} slug
 * @property {string} name
 * @property {'doce' | 'salgada'} category
 * @property {string} introduction
 * @property {string} editorialContext
 * @property {RecipeIngredient[]} ingredients
 * @property {string[]} preparation
 * @property {RecipeTime} time
 * @property {null} yield
 * @property {string[]} equipment
 * @property {string[]} notes
 * @property {string[]} substitutions
 * @property {string[]} allergenIds
 * @property {string[]} tags
 * @property {{ src: string, srcSet: string, avifSrcSet: string, width: number, height: number, alt: string, original: string, pdf: string }} image
 * @property {EditorialValidation} validation
 */

export const RECIPES_PRODUCT_ID = '7-receitas-desinflamar';

export const recipeAllergens = {
  eggs: {
    id: 'eggs',
    label: 'Ovos',
    detail: 'A receita contém ovos.',
  },
  milk: {
    id: 'milk',
    label: 'Leite e derivados',
    detail: 'A receita contém leite e/ou derivados lácteos.',
  },
  whey: {
    id: 'whey',
    label: 'Whey protein',
    detail: 'Whey é derivado do leite. Confira também os demais ingredientes e alergênicos declarados no rótulo do produto escolhido.',
  },
  oats: {
    id: 'oats',
    label: 'Aveia e possível contato com glúten',
    detail: 'A aveia pode sofrer contaminação cruzada. Para uma preparação sem glúten, use aveia certificada e controle o contato com utensílios e superfícies.',
  },
  almonds: {
    id: 'almonds',
    label: 'Amêndoas (na alternativa low carb)',
    detail: 'A farinha de amêndoas é uma oleaginosa e aparece somente na substituição low carb.',
  },
  cheese: {
    id: 'cheese',
    label: 'Queijos',
    detail: 'A receita contém queijo ou oferece queijo como ingrediente opcional.',
  },
  certifiedGlutenFree: {
    id: 'certifiedGlutenFree',
    label: 'Atenção à certificação sem glúten',
    detail: 'Use ingredientes certificados e evite contaminação cruzada para sustentar a alegação sem glúten.',
  },
};

const image = (slug, alt) => ({
  src: `/images/recipes/${slug}-800.webp`,
  srcSet: [480, 800, 1024].map((width) => `/images/recipes/${slug}-${width}.webp ${width}w`).join(', '),
  avifSrcSet: [480, 800, 1024].map((width) => `/images/recipes/${slug}-${width}.avif ${width}w`).join(', '),
  width: 1024,
  height: 1536,
  alt,
  original: `src/assets/recipes/original/${slug}.png`,
  pdf: `artifacts/recipes/assets/${slug}.jpg`,
});

const unit = (singular, plural = `${singular}s`) => ({ singular, plural });

/** @type {{ id: string, title: string, shortTitle: string, subtitle: string, description: string, positioning: string, publicPath: string, experiencePath: string, downloadEndpoint: string, educationalNotice: string, commerce: { currency: string, priceCents: null, showPrice: boolean, note: string }, hero: object, formats: object[], whatYouFind: string[], audience: string[], faqs: { question: string, answer: string }[], recipes: CanonicalRecipe[] }} */
export const recipesProduct = {
  id: RECIPES_PRODUCT_ID,
  title: '7 receitas para ajudar você a desinflamar!',
  shortTitle: 'Jornada de 7 receitas',
  subtitle: 'Uma seleção prática de receitas doces e salgadas para trazer mais variedade, sabor e intenção à sua rotina.',
  description: 'Uma coleção digital interativa criada para apoiar uma alimentação equilibrada com preparações possíveis, organização e cuidado no dia a dia.',
  positioning: 'Coleção digital de receitas',
  publicPath: '/7-receitas-para-ajudar-voce-a-desinflamar',
  experiencePath: '/minhas-receitas',
  downloadEndpoint: '/api/recipes/download',
  educationalNotice: 'Este material possui caráter educativo e não substitui avaliação ou acompanhamento nutricional individualizado. Adapte ingredientes às suas necessidades, alergias e orientações profissionais.',
  commerce: {
    currency: 'BRL',
    priceCents: null,
    showPrice: false,
    note: 'Preço e disponibilidade são definidos no painel de gestão e consultados no momento da compra.',
  },
  hero: {
    image: {
      src: '/images/recipes/colecao-hero-1200.webp',
      srcSet: [720, 1200, 1536].map((width) => `/images/recipes/colecao-hero-${width}.webp ${width}w`).join(', '),
      avifSrcSet: [720, 1200, 1536].map((width) => `/images/recipes/colecao-hero-${width}.avif ${width}w`).join(', '),
      width: 1536,
      height: 1024,
      alt: 'Mesa clara com a seleção das sete receitas: bolinhos, bolo de maçã, pães e torta de frango.',
      original: 'src/assets/recipes/original/colecao-hero.png',
      pdf: 'artifacts/recipes/assets/colecao-hero.jpg',
    },
    socialImage: '/images/og-7-receitas.jpg',
  },
  formats: [
    {
      id: 'interactive',
      title: 'Experiência interativa',
      description: 'Pesquise, filtre, marque favoritas, acompanhe o preparo e organize sua lista de compras.',
    },
    {
      id: 'offline',
      title: 'Versão offline',
      description: 'Leve a jornada com você em um único arquivo que funciona mesmo sem internet.',
    },
    {
      id: 'pdf',
      title: 'PDF para consultar ou imprimir',
      description: 'Uma edição A4 cuidadosamente diagramada para a cozinha, o celular ou o papel.',
    },
  ],
  whatYouFind: [
    'Sete receitas doces e salgadas com ingredientes e preparo organizados.',
    'Alertas claros de alergênicos, substituições e observações importantes.',
    'Checklist por receita e lista de compras consolidada.',
    'Orientações de tempo apenas quando informadas ou marcadas como aproximadas.',
  ],
  audience: [
    'Quem deseja variar preparações simples sem perder sabor.',
    'Quem prefere ter receitas e compras organizadas em um só lugar.',
    'Quem busca um primeiro passo prático antes de um cuidado nutricional individualizado.',
  ],
  faqs: [
    {
      question: 'Este material substitui uma consulta nutricional?',
      answer: 'Não. A coleção tem caráter educativo e oferece receitas para apoiar a rotina. Necessidades clínicas, alergias, objetivos e adaptações pessoais pedem avaliação individualizada.',
    },
    {
      question: 'As receitas são todas sem glúten?',
      answer: 'Não. Algumas usam aveia, que exige certificação e controle de contaminação cruzada, e outras só podem ser apresentadas como sem glúten quando todos os ingredientes forem certificados e o preparo for protegido de contato cruzado.',
    },
    {
      question: 'Posso ajustar a quantidade dos ingredientes?',
      answer: 'A experiência calcula multiplicadores para medidas numéricas. Ingredientes descritos como “a gosto” permanecem assim, e o ponto, a forma e o tempo de cocção ainda precisam ser observados.',
    },
    {
      question: 'Como funcionam o PDF e a versão offline?',
      answer: 'Depois da liberação do acesso, os dois arquivos ficam disponíveis na área da coleção. O HTML abre diretamente no navegador sem internet; o PDF pode ser salvo ou impresso.',
    },
    {
      question: 'As receitas têm calorias ou macronutrientes?',
      answer: 'Não. A coleção não apresenta valores nutricionais estimados, pois não foi realizado um cálculo verificável com marcas, rendimentos e porções padronizadas.',
    },
  ],
  recipes: [
    {
      id: 'recipe-01',
      slug: 'bolinho-cacau-curcuma',
      name: 'Bolinho de cacau com cúrcuma',
      category: 'doce',
      introduction: 'Uma combinação de cacau e cúrcuma em bolinhos de preparo direto, com textura macia e sabor intenso.',
      editorialContext: 'Cacau e cúrcuma são ingredientes associados a compostos antioxidantes. A preparação é apresentada como parte de uma alimentação variada e equilibrada.',
      ingredients: [
        { id: 'eggs', quantity: 2, unit: unit('ovo', 'ovos'), name: '', shoppingKey: 'eggs', section: 'Ovos e laticínios' },
        { id: 'cocoa', quantity: 2, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de cacau 100%', shoppingKey: 'cocoa', section: 'Despensa' },
        { id: 'oats', quantity: 3, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de aveia', shoppingKey: 'oats-tbsp', section: 'Despensa' },
        { id: 'whey-chocolate', quantity: 1, unit: unit('scoop', 'scoops'), name: 'de whey sabor chocolate', shoppingKey: 'whey-chocolate', section: 'Complementos' },
        { id: 'turmeric', quantity: 0.5, unit: unit('colher de chá', 'colheres de chá'), name: 'de cúrcuma', shoppingKey: 'turmeric', section: 'Temperos' },
        { id: 'black-pepper', quantity: 1, unit: unit('pitada', 'pitadas'), name: 'de pimenta-do-reino', optional: true, shoppingKey: 'black-pepper', section: 'Temperos' },
        { id: 'baking-powder', quantity: 1, unit: unit('colher de chá', 'colheres de chá'), name: 'de fermento químico', shoppingKey: 'baking-powder-tsp', section: 'Despensa' },
      ],
      preparation: [
        'Misture todos os ingredientes até obter uma massa uniforme.',
        'Distribua em forminhas.',
        'Asse em forno preaquecido a 180 °C por aproximadamente 20 minutos.',
        'Verifique o ponto antes de retirar, pois o tempo pode variar conforme o forno e o tamanho das formas.',
      ],
      time: { label: 'Aproximadamente 20 minutos de forno', totalMinutes: 20, approximate: true, inferred: false },
      yield: null,
      equipment: ['Tigela', 'Batedor ou garfo', 'Forminhas', 'Forno'],
      notes: ['A pimenta-do-reino é opcional.', 'Observe o centro dos bolinhos antes de retirar do forno.'],
      substitutions: [],
      allergenIds: ['eggs', 'milk', 'whey', 'oats'],
      tags: ['Doce', 'Cacau', 'Aveia', 'Forno'],
      image: image('bolinho-cacau-curcuma', 'Bolinhos de cacau com cúrcuma em prato de cerâmica, com um bolinho aberto mostrando o miolo.'),
      validation: {
        status: 'pending-professional-review',
        source: 'Referência visual image.png e conteúdo canônico aprovado no briefing do produto.',
        inferredFields: ['Orientação para verificar o ponto conforme forno e tamanho das formas.', 'Enquadramento editorial sobre antioxidantes, sem alegação clínica.'],
      },
    },
    {
      id: 'recipe-02',
      slug: 'bolinho-coco-maca',
      name: 'Bolinho de coco com maca peruana',
      category: 'doce',
      introduction: 'Bolinhos de coco, aveia e baunilha com maca peruana, pensados para uma preparação simples e aromática.',
      editorialContext: 'A receita é apresentada como opção de variedade alimentar. Não são feitas promessas sobre energia, menopausa ou equilíbrio hormonal.',
      ingredients: [
        { id: 'eggs', quantity: 2, unit: unit('ovo', 'ovos'), name: '', shoppingKey: 'eggs', section: 'Ovos e laticínios' },
        { id: 'coconut', quantity: 0.5, unit: unit('xícara', 'xícaras'), name: 'de coco ralado sem açúcar', shoppingKey: 'coconut', section: 'Despensa' },
        { id: 'oats', quantity: 3, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de aveia', shoppingKey: 'oats-tbsp', section: 'Despensa' },
        { id: 'whey-vanilla', quantity: 1, unit: unit('scoop', 'scoops'), name: 'de whey sabor baunilha', shoppingKey: 'whey-vanilla', section: 'Complementos' },
        { id: 'maca', quantity: 1, unit: unit('colher de chá', 'colheres de chá'), name: 'de maca peruana', shoppingKey: 'maca', section: 'Complementos' },
        { id: 'baking-powder', quantity: 1, unit: unit('colher de chá', 'colheres de chá'), name: 'de fermento químico', shoppingKey: 'baking-powder-tsp', section: 'Despensa' },
      ],
      preparation: [
        'Preaqueça o forno a 180 °C.',
        'Misture todos os ingredientes até formar uma massa homogênea.',
        'Distribua em forminhas.',
        'Asse por aproximadamente 20 minutos ou até o centro estar firme e levemente dourado.',
      ],
      time: { label: 'Aproximadamente 20 minutos de forno', totalMinutes: 20, approximate: true, inferred: false },
      yield: null,
      equipment: ['Tigela', 'Batedor ou garfo', 'Forminhas', 'Forno'],
      notes: ['A temperatura de 180 °C é uma definição editorial a confirmar.', 'O centro deve estar firme antes de retirar.'],
      substitutions: [],
      allergenIds: ['eggs', 'milk', 'whey', 'oats'],
      tags: ['Doce', 'Coco', 'Aveia', 'Forno'],
      image: image('bolinho-coco-maca', 'Bolinhos de coco e maca peruana em prato de cerâmica, com coco ralado e um bolinho aberto.'),
      validation: {
        status: 'pending-professional-review',
        source: 'Referência visual image copy.png e conteúdo canônico aprovado no briefing do produto.',
        inferredFields: ['Temperatura de forno de 180 °C.', 'Critério de centro firme e levemente dourado.', 'Retirada de alegações sobre energia, vitalidade, perimenopausa e equilíbrio hormonal.'],
      },
    },
    {
      id: 'recipe-03',
      slug: 'bolo-maca',
      name: 'Bolo de maçã com quatro ingredientes',
      category: 'doce',
      introduction: 'Um bolo de maçã e aveia sem adição de açúcar, leite ou óleo, com quatro ingredientes na base.',
      editorialContext: 'A receita pode ser descrita como sem adição de açúcar, sem leite e sem óleo. Não é classificada automaticamente como sem glúten.',
      ingredients: [
        { id: 'eggs', quantity: 3, unit: unit('ovo', 'ovos'), name: '', shoppingKey: 'eggs', section: 'Ovos e laticínios' },
        { id: 'apples', quantity: 2, unit: unit('maçã', 'maçãs'), name: 'picadas com casca', shoppingKey: 'apples', section: 'Hortifruti' },
        { id: 'oats', quantity: 2, unit: unit('xícara', 'xícaras'), name: 'de aveia em flocos finos', shoppingKey: 'oats-cup', section: 'Despensa' },
        { id: 'baking-powder', quantity: 1, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de fermento químico', shoppingKey: 'baking-powder-tbsp', section: 'Despensa' },
      ],
      preparation: [
        'Bata no liquidificador as maçãs e os ovos por aproximadamente 5 minutos.',
        'Transfira para uma tigela.',
        'Acrescente a aveia e misture.',
        'Adicione o fermento por último, incorporando delicadamente.',
        'Coloque em forma untada.',
        'Asse em forno preaquecido a 180 °C por aproximadamente 25 minutos ou até passar no teste do palito.',
      ],
      time: { label: '5 minutos no liquidificador + aproximadamente 25 minutos de forno', totalMinutes: 30, approximate: true, inferred: false },
      yield: null,
      equipment: ['Liquidificador', 'Tigela', 'Espátula', 'Forma', 'Forno'],
      notes: ['Sem adição de açúcar, sem leite e sem óleo na fórmula informada.', 'A condição sem glúten depende de aveia certificada e controle de contaminação cruzada.'],
      substitutions: [],
      allergenIds: ['eggs', 'oats'],
      tags: ['Doce', 'Maçã', 'Quatro ingredientes', 'Sem adição de açúcar'],
      image: image('bolo-maca', 'Bolo rústico de maçã e aveia com uma fatia cortada, sobre prato claro.'),
      validation: {
        status: 'pending-professional-review',
        source: 'Referência visual image copy 2.png e conteúdo canônico aprovado no briefing do produto.',
        inferredFields: ['Teste do palito como verificação de ponto.', 'Redação precisa das alegações sem adição de açúcar, sem leite e sem óleo.'],
      },
    },
    {
      id: 'recipe-04',
      slug: 'paozinho-fitness',
      name: 'Pãozinho fitness rápido',
      category: 'salgada',
      introduction: 'Uma porção pequena e rápida com ovo, leite em pó e aveia, preparada no micro-ondas e opcionalmente dourada depois.',
      editorialContext: 'O preparo não constava na fonte e foi completado de forma conservadora. O cozimento completo do ovo deve ser conferido.',
      ingredients: [
        { id: 'egg', quantity: 1, unit: unit('ovo', 'ovos'), name: '', shoppingKey: 'eggs', section: 'Ovos e laticínios' },
        { id: 'powdered-milk', quantity: 2, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de leite em pó', shoppingKey: 'powdered-milk', section: 'Ovos e laticínios' },
        { id: 'oats', quantity: 1, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de aveia em flocos finos', shoppingKey: 'oats-tbsp', section: 'Despensa' },
        { id: 'baking-powder', quantity: 1, unit: unit('colher de chá', 'colheres de chá'), name: 'de fermento químico', shoppingKey: 'baking-powder-tsp', section: 'Despensa' },
        { id: 'salt', quantity: 1, unit: unit('pitada', 'pitadas'), name: 'de sal', shoppingKey: 'salt', section: 'Temperos' },
      ],
      preparation: [
        'Bata o ovo até clara e gema se integrarem.',
        'Misture o leite em pó, a aveia e o sal.',
        'Incorpore o fermento por último.',
        'Coloque em um recipiente pequeno, untado e apropriado para micro-ondas.',
        'Cozinhe por 60 segundos. Verifique o centro e, se necessário, continue em intervalos de 15 segundos, até o ovo estar completamente cozido; a potência do aparelho altera o tempo.',
        'Se desejar, finalize rapidamente em frigideira ou air fryer apenas para dourar.',
      ],
      time: { label: 'Cerca de 1 a 1½ minuto no micro-ondas', totalMinutes: 2, approximate: true, inferred: true },
      yield: null,
      equipment: ['Tigela pequena', 'Garfo ou batedor', 'Recipiente próprio para micro-ondas', 'Micro-ondas'],
      notes: ['Comece com tempo curto e verifique o centro.', 'A finalização em frigideira ou air fryer é opcional e serve apenas para dourar.'],
      substitutions: [],
      allergenIds: ['eggs', 'milk', 'oats'],
      tags: ['Salgada', 'Rápida', 'Micro-ondas', 'Aveia'],
      image: image('paozinho-fitness', 'Pãozinho rápido de aveia assado em recipiente pequeno, com uma metade aberta mostrando o miolo.'),
      validation: {
        status: 'editorially-completed-pending-review',
        source: 'Referência visual image copy 3.png para ingredientes; preparo ausente na fonte.',
        inferredFields: ['Método no micro-ondas.', 'Tempo inicial de 60 segundos e intervalos de 15 segundos.', 'Finalização opcional para dourar.', 'Orientação de cozimento completo do ovo.'],
      },
    },
    {
      id: 'recipe-05',
      slug: 'pao-abobrinha',
      name: 'Pão de forma de abobrinha, sem glúten e proteico',
      category: 'salgada',
      introduction: 'Um pão de forma úmido e versátil à base de abobrinha, ovos e farinha de mandioca, com alternativa de farinha de amêndoas.',
      editorialContext: 'A alegação sem glúten pressupõe ingredientes certificados e prevenção de contaminação cruzada. “Proteico” é mantido como nome original e precisa de confirmação profissional antes do lançamento.',
      ingredients: [
        { id: 'zucchini', quantity: 1, unit: unit('abobrinha grande', 'abobrinhas grandes'), name: '', shoppingKey: 'zucchini', section: 'Hortifruti' },
        { id: 'eggs', quantity: 4, unit: unit('ovo', 'ovos'), name: '', shoppingKey: 'eggs', section: 'Ovos e laticínios' },
        { id: 'salt', quantity: 0.5, unit: unit('colher de chá', 'colheres de chá'), name: 'de sal', shoppingKey: 'salt-tsp', section: 'Temperos' },
        { id: 'baking-powder', quantity: 1, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de fermento químico', shoppingKey: 'baking-powder-tbsp', section: 'Despensa' },
        { id: 'mozzarella', quantity: 0.5, unit: unit('xícara', 'xícaras'), name: 'de muçarela ralada', optional: true, shoppingKey: 'mozzarella-cup', section: 'Ovos e laticínios' },
        { id: 'cassava-flour', quantity: 1, unit: unit('xícara', 'xícaras'), name: 'de farinha de mandioca', shoppingKey: 'cassava-flour', section: 'Despensa' },
      ],
      preparation: [
        'Rale a abobrinha.',
        'Retire o excesso de líquido para evitar uma massa excessivamente úmida.',
        'Misture a abobrinha com os ovos e o sal.',
        'Acrescente a farinha escolhida e a muçarela, se utilizada.',
        'Incorpore o fermento por último.',
        'Transfira para uma forma untada ou revestida.',
        'Asse em forno preaquecido a 180 °C por aproximadamente 40 minutos.',
        'Como alternativa, asse na air fryer a 160 °C por aproximadamente 30 a 35 minutos.',
        'Verifique o ponto no centro antes de retirar.',
      ],
      time: { label: 'Aproximadamente 40 minutos no forno ou 30 a 35 minutos na air fryer', totalMinutes: 40, approximate: true, inferred: false },
      yield: null,
      equipment: ['Ralador', 'Pano limpo ou peneira', 'Tigela', 'Forma de pão', 'Forno ou air fryer'],
      notes: ['Retirar a água da abobrinha ajuda a controlar a umidade.', 'Use ingredientes certificados e utensílios protegidos de contaminação cruzada para a alegação sem glúten.'],
      substitutions: ['Para a alternativa low carb, substitua 1 xícara de farinha de mandioca por 1 xícara de farinha de amêndoas.'],
      alternativeIngredients: [
        { id: 'almond-flour', quantity: 1, unit: unit('xícara', 'xícaras'), name: 'de farinha de amêndoas', replaces: 'cassava-flour', shoppingKey: 'almond-flour', section: 'Despensa' },
      ],
      allergenIds: ['eggs', 'milk', 'cheese', 'almonds', 'certifiedGlutenFree'],
      tags: ['Salgada', 'Abobrinha', 'Forno', 'Air fryer'],
      image: image('pao-abobrinha', 'Pão de forma de abobrinha fatiado sobre tábua de madeira, com miolo verde e dourado.'),
      validation: {
        status: 'editorially-completed-pending-review',
        source: 'Referência visual image copy 4.png e conteúdo canônico aprovado no briefing do produto.',
        inferredFields: ['Etapas de ralar, retirar líquido, ordem de mistura e verificação do centro.', 'Qualificação da alegação sem glúten.', 'Necessidade de validar o termo proteico.'],
      },
    },
    {
      id: 'recipe-06',
      slug: 'paozinho-tapioca',
      name: 'Pãozinho de tapioca',
      category: 'salgada',
      introduction: 'Pãezinhos macios de tapioca granulada e parmesão, modelados depois da hidratação da massa.',
      editorialContext: 'O preparo, a temperatura e o tempo não constavam na fonte e foram completados de forma culinariamente conservadora.',
      ingredients: [
        { id: 'granulated-tapioca', quantity: 1, unit: unit('xícara', 'xícaras'), name: 'de tapioca granulada (medida de 240 ml)', shoppingKey: 'granulated-tapioca', section: 'Despensa' },
        { id: 'milk', quantity: 400, unit: unit('ml', 'ml'), name: 'de leite morno', shoppingKey: 'milk-ml', section: 'Ovos e laticínios' },
        { id: 'eggs', quantity: 2, unit: unit('ovo', 'ovos'), name: '', shoppingKey: 'eggs', section: 'Ovos e laticínios' },
        { id: 'parmesan', quantity: 3, unit: unit('colher de sopa', 'colheres de sopa'), name: 'de queijo parmesão ralado', shoppingKey: 'parmesan-tbsp', section: 'Ovos e laticínios' },
        { id: 'salt', quantity: 1, unit: unit('pitada', 'pitadas'), name: 'de sal', shoppingKey: 'salt', section: 'Temperos' },
      ],
      preparation: [
        'Coloque a tapioca granulada em uma tigela.',
        'Adicione o leite morno e deixe hidratar por cerca de 15 minutos, ou até absorver boa parte do líquido.',
        'Acrescente os ovos, o parmesão e o sal.',
        'Misture até obter uma massa modelável.',
        'Modele pequenas porções com as mãos levemente untadas.',
        'Disponha em assadeira revestida ou untada.',
        'Asse em forno preaquecido a 180 °C por aproximadamente 25 a 30 minutos, até os pãezinhos ficarem firmes e levemente dourados.',
      ],
      time: { label: 'Cerca de 15 minutos de hidratação + 25 a 30 minutos de forno', totalMinutes: 45, approximate: true, inferred: true },
      yield: null,
      equipment: ['Tigela', 'Espátula', 'Assadeira', 'Forno'],
      notes: ['A absorção e o ponto da massa variam conforme a marca da tapioca.', 'O tempo pode variar de acordo com o forno e o tamanho dos pãezinhos.'],
      substitutions: [],
      allergenIds: ['eggs', 'milk', 'cheese'],
      tags: ['Salgada', 'Tapioca', 'Parmesão', 'Forno'],
      image: image('paozinho-tapioca', 'Pãezinhos ovais de tapioca levemente dourados, com um deles aberto mostrando o interior macio.'),
      validation: {
        status: 'editorially-completed-pending-review',
        source: 'Referência visual image copy 5.png para ingredientes; preparo ausente na fonte.',
        inferredFields: ['Hidratação por cerca de 15 minutos.', 'Temperatura de 180 °C.', 'Tempo de forno de 25 a 30 minutos.', 'Etapas de mistura, modelagem e assamento.'],
      },
    },
    {
      id: 'recipe-07',
      slug: 'torta-frango',
      name: 'Torta de frango sem glúten',
      category: 'salgada',
      introduction: 'Uma torta prática de base de ovos e tapioca, recheada com frango desfiado e finalizada com muçarela.',
      editorialContext: 'A alegação sem glúten requer ingredientes certificados e controle de contaminação cruzada durante todo o preparo.',
      ingredients: [
        { id: 'eggs', quantity: 3, unit: unit('ovo', 'ovos'), name: '', shoppingKey: 'eggs', section: 'Ovos e laticínios' },
        { id: 'milk', quantity: 100, unit: unit('ml', 'ml'), name: 'de leite', shoppingKey: 'milk-ml', section: 'Ovos e laticínios' },
        { id: 'tapioca', quantity: 120, unit: unit('g', 'g'), name: 'de tapioca', shoppingKey: 'tapioca-g', section: 'Despensa' },
        { id: 'salt', quantity: null, display: 'Sal a gosto', shoppingKey: 'salt-to-taste', section: 'Temperos' },
        { id: 'chicken', quantity: null, display: 'Frango cozido e desfiado a gosto', shoppingKey: 'chicken-to-taste', section: 'Proteínas' },
        { id: 'mozzarella', quantity: null, display: 'Muçarela a gosto', shoppingKey: 'mozzarella-to-taste', section: 'Ovos e laticínios' },
      ],
      preparation: [
        'Preaqueça o forno a 180 °C.',
        'Misture os ovos, o leite, a tapioca e o sal até formar uma base homogênea.',
        'Coloque parte da massa em uma forma untada.',
        'Distribua o frango cozido e desfiado.',
        'Cubra com o restante da massa e finalize com a muçarela.',
        'Asse por aproximadamente 30 a 35 minutos, até a massa firmar completamente e a superfície dourar.',
      ],
      time: { label: 'Aproximadamente 30 a 35 minutos de forno', totalMinutes: 35, approximate: true, inferred: true },
      yield: null,
      equipment: ['Tigela', 'Batedor ou garfo', 'Forma', 'Forno'],
      notes: ['Use frango já completamente cozido.', 'Para a alegação sem glúten, confira a certificação de todos os ingredientes e evite contaminação cruzada.'],
      substitutions: [],
      allergenIds: ['eggs', 'milk', 'cheese', 'certifiedGlutenFree'],
      tags: ['Salgada', 'Frango', 'Tapioca', 'Forno'],
      image: image('torta-frango', 'Torta de frango dourada em travessa de cerâmica, com uma fatia servida mostrando o recheio desfiado.'),
      validation: {
        status: 'editorially-completed-pending-review',
        source: 'Referência visual image copy 6.png para ingredientes; preparo ausente na fonte.',
        inferredFields: ['Temperatura de 180 °C.', 'Tempo de forno de 30 a 35 minutos.', 'Ordem de montagem e critério de massa firme e superfície dourada.'],
      },
    },
  ],
};

export function expandRecipeAllergens(recipe) {
  return recipe.allergenIds.map((id) => recipeAllergens[id]);
}

export function buildProtectedProductPayload() {
  const publicImage = ({ src, srcSet, avifSrcSet, width, height, alt }) => ({ src, srcSet, avifSrcSet, width, height, alt });
  return {
    id: recipesProduct.id,
    title: recipesProduct.title,
    shortTitle: recipesProduct.shortTitle,
    subtitle: recipesProduct.subtitle,
    description: recipesProduct.description,
    educationalNotice: recipesProduct.educationalNotice,
    publicPath: recipesProduct.publicPath,
    experiencePath: recipesProduct.experiencePath,
    downloadEndpoint: recipesProduct.downloadEndpoint,
    recipes: recipesProduct.recipes.map(({ validation: _validation, editorialContext, image: recipeImage, ...recipe }) => ({
      ...recipe,
      image: publicImage(recipeImage),
      editorialContext,
      allergens: expandRecipeAllergens(recipe),
    })),
  };
}

export function buildPublicProductPreview() {
  const publicImage = ({ src, srcSet, avifSrcSet, width, height, alt }) => ({
    src, srcSet, avifSrcSet, width, height, alt,
  });
  return {
    id: recipesProduct.id,
    title: recipesProduct.title,
    shortTitle: recipesProduct.shortTitle,
    subtitle: recipesProduct.subtitle,
    description: recipesProduct.description,
    positioning: recipesProduct.positioning,
    publicPath: recipesProduct.publicPath,
    experiencePath: recipesProduct.experiencePath,
    educationalNotice: recipesProduct.educationalNotice,
    commerce: recipesProduct.commerce,
    hero: {
      image: publicImage(recipesProduct.hero.image),
      socialImage: recipesProduct.hero.socialImage,
    },
    formats: recipesProduct.formats,
    whatYouFind: recipesProduct.whatYouFind,
    audience: recipesProduct.audience,
    faqs: recipesProduct.faqs,
    recipes: recipesProduct.recipes.map((recipe, index) => ({
      id: recipe.id,
      slug: recipe.slug,
      number: index + 1,
      name: recipe.name,
      category: recipe.category,
      introduction: recipe.introduction,
      tags: recipe.tags.slice(0, 3),
      image: publicImage(recipe.image),
    })),
  };
}

export function formatScaledQuantity(value) {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 4) / 4;
  const whole = Math.floor(rounded);
  const remainder = Math.round((rounded - whole) * 4);
  const fraction = ['', '¼', '½', '¾'][remainder] || '';
  if (!whole) return fraction || String(rounded);
  return fraction ? `${whole} ${fraction}` : String(whole);
}

export function formatIngredient(ingredient, multiplier = 1) {
  if (ingredient.quantity == null) return ingredient.display;
  const quantity = ingredient.quantity * multiplier;
  const numeric = formatScaledQuantity(quantity);
  const label = quantity <= 1 ? ingredient.unit.singular : ingredient.unit.plural;
  return [numeric, label, ingredient.name].filter(Boolean).join(' ');
}

export function consolidateShoppingList(recipes = recipesProduct.recipes, multiplierByRecipe = {}) {
  const entries = new Map();
  for (const recipe of recipes) {
    const multiplier = Number(multiplierByRecipe[recipe.id]) || 1;
    for (const ingredient of recipe.ingredients) {
      const key = `${ingredient.shoppingKey}:${ingredient.unit?.singular || 'display'}`;
      const existing = entries.get(key);
      if (ingredient.quantity == null) {
        if (!existing) entries.set(key, { ...ingredient, recipeIds: [recipe.id], display: ingredient.display });
        else existing.recipeIds.push(recipe.id);
      } else if (existing) {
        existing.quantity += ingredient.quantity * multiplier;
        existing.recipeIds.push(recipe.id);
        existing.optional = existing.optional && ingredient.optional;
      } else {
        entries.set(key, {
          ...ingredient,
          quantity: ingredient.quantity * multiplier,
          recipeIds: [recipe.id],
        });
      }
    }
  }
  return [...entries.values()].sort((left, right) => left.section.localeCompare(right.section, 'pt-BR'));
}
