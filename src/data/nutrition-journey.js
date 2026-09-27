// Editorial draft: the professional must review the Portuguese text and the
// illustrations before enabling Bristol in the public intake form.
export const bristolSource = {
  title: 'Bristol Stool Chart · NHS England',
  url: 'https://www.england.nhs.uk/wp-content/uploads/2023/07/Bristol-stool-chart-for-people-with-a-learning-disability-print-version.pdf',
  reviewed: false,
};
export const bristolTypes = [
  [1, 'Pequenos pedaços duros', 'Pedaços separados e endurecidos, parecidos com bolinhas.', 'pellets'],
  [2, 'Formato alongado e irregular', 'Fezes alongadas, formadas por partes endurecidas unidas.', 'lumpy'],
  [3, 'Formato alongado com rachaduras', 'Fezes alongadas, com pequenas rachaduras na superfície.', 'cracked'],
  [4, 'Formato alongado, liso e macio', 'Fezes contínuas, lisas e macias.', 'smooth'],
  [5, 'Pedaços macios bem definidos', 'Pedaços separados, macios e com bordas definidas.', 'blobs'],
  [6, 'Pedaços pastosos e irregulares', 'Fezes pastosas, com bordas irregulares e pouco definidas.', 'mushy'],
  [7, 'Líquidas, sem pedaços sólidos', 'Fezes aquosas, sem partes sólidas visíveis.', 'liquid'],
].map(([type, label, description, shape]) => ({ type, label, description, shape }));

export const intolerances = [
  { id: 'lactose', label: 'Intolerância à lactose' },
  { id: 'other', label: 'Outra intolerância' },
];
export const goalOptions = [
  { id: 'wellbeing', label: 'Bem-estar e rotina' },
  { id: 'weight-management', label: 'Emagrecimento e controle de peso' },
  { id: 'muscle', label: 'Hipertrofia e ganho de massa muscular' },
  { id: 'clinical', label: 'Cuidado clínico individualizado' },
];
export const curatedModuleTypes = [
  { id: 'recipe', label: 'Receita' }, { id: 'food', label: 'Sugestão de alimento' },
  { id: 'seasoning', label: 'Temperos' }, { id: 'tea', label: 'Chás' },
  { id: 'supplement', label: 'Suplementos' },
];

// Ideas from the product notes, deliberately without doses, clinical claims or
// nutritional values for ingredients absent from the reviewed food catalogue.
export const contentIdeas = [
  { id: 'fruit-ideas', type: 'food', title: 'Frutas para conversar em consulta', content: 'Mirtilo, damasco seco, uva-passa e ameixa seca: conferir preferência, porção e compatibilidade individual antes de incluir.', foodIds: [], allergens: [], requiresIngredientReview: true },
  { id: 'seed-ideas', type: 'food', title: 'Sementes e castanhas', content: 'Selecionar ingredientes e porções individualmente. Conferir alergias, rótulos e possibilidade de contaminação cruzada.', foodIds: ['walnut', 'brazil-nut'], allergens: ['nuts'], requiresIngredientReview: true },
  { id: 'herb-ideas', type: 'seasoning', title: 'Ervas e temperos da cozinha', content: 'Ideias para avaliar: orégano, cúrcuma, ervas finas e manjericão. Conferir ingredientes de misturas, restrições e a preferência por evitar temperos prontos com conservantes.', foodIds: [], allergens: [], requiresIngredientReview: true },
  { id: 'recipe-bowl', type: 'recipe', title: 'Iogurte com aveia e fruta', content: 'Usar os ingredientes e as quantidades da refeição aprovada. Misturar a aveia ao iogurte e acrescentar a fruta higienizada; conferir alternativas e restrições antes de preparar.', foodIds: ['yogurt', 'oats', 'strawberry'], allergens: ['milk', 'lactose', 'gluten'], requiresIngredientReview: false },
  { id: 'tea-review', type: 'tea', title: 'Módulo de chás', content: 'Preencher somente após avaliação individual da nutricionista, identificando a planta ou produto, finalidade e orientação validada para esta pessoa.', foodIds: [], allergens: [], requiresIngredientReview: true },
  { id: 'supplement-review', type: 'supplement', title: 'Módulo de suplementos', content: 'Preencher somente após avaliação individual da nutricionista, identificando o produto, composição e orientação validada para esta pessoa.', foodIds: [], allergens: [], requiresIngredientReview: true },
];
export const curatedContentIdeas = contentIdeas.map(idea => ({ ...idea, reviewed: false }));
