import catalogue from './nutrition-foods.json' with { type: 'json' };
import { goalOptions } from './nutrition-journey.js';

export const foods = catalogue.foods;
export const foodSource = { title: catalogue.edition, url: catalogue.source, notes: catalogue.notes };
export const foodById = Object.fromEntries(foods.map(food => [food.id, food]));
export const nutrients = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'potassium', 'phosphorus'];
export const conditions = [
  ['diabetes', 'Diabetes'], ['cardiovascular', 'Doença cardiovascular'], ['hypertension', 'Hipertensão'],
  ['renal', 'Doença renal'], ['oncology', 'Tratamento oncológico'], ['ibs', 'Síndrome do intestino irritável'],
  ['gastric', 'Gastrite ou refluxo'], ['hpylori', 'H. pylori'], ['lactose', 'Intolerância à lactose'],
  ['celiac', 'Doença celíaca'], ['glp1', 'Uso de GLP-1'], ['other', 'Outra condição'],
].map(([id, label]) => ({ id, label }));
export const allergies = [
  ['milk', 'Proteína do leite'], ['egg', 'Ovo'], ['fish', 'Peixe'], ['shellfish', 'Frutos do mar'],
  ['nuts', 'Castanhas / nozes'], ['peanut', 'Amendoim'], ['soy', 'Soja'], ['gluten', 'Trigo / glúten'], ['other', 'Outra alergia'],
].map(([id, label]) => ({ id, label }));
export const symptoms = [
  ['nausea', 'Náusea'], ['early-satiety', 'Saciedade precoce'], ['reflux', 'Refluxo'], ['constipation', 'Constipação'],
  ['diarrhea', 'Diarreia'], ['bloating', 'Estufamento'], ['swallowing', 'Dificuldade para engolir'],
  ['persistent-vomiting', 'Vômitos persistentes'], ['severe-pain', 'Dor abdominal forte'], ['dehydration', 'Dificuldade para se hidratar'],
].map(([id, label]) => ({ id, label }));
export const activityLevels = [
  { value: 1.2, label: 'Pouco ativa' }, { value: 1.375, label: 'Levemente ativa' },
  { value: 1.55, label: 'Moderadamente ativa' }, { value: 1.725, label: 'Muito ativa' },
];
export const clinicalProfiles = [
  { id: 'balanced', name: 'Rotina equilibrada', subtitle: 'Comida de verdade, no seu ritmo', color: 'sage', focus: 'Organizar horários, preferências e refeições possíveis.', review: 'Ajustar energia, porções e variedade à avaliação individual.' },
  { id: 'diabetes', name: 'Diabetes', subtitle: 'Distribuição e consistência', color: 'gold', focus: 'Visualizar carboidratos em cada refeição e compatibilidade com a rotina.', review: 'Conferir medicação, episódios de hipoglicemia e metas definidas com a equipe. Não ajustar insulina pelo aplicativo.' },
  { id: 'cardiovascular', name: 'Saúde cardiovascular', subtitle: 'Qualidade alimentar e rotina', color: 'rose', focus: 'Organizar fontes de fibras e gorduras e monitorar sódio.', review: 'Revisar insuficiência cardíaca, medicamentos e necessidade individual de restrição hídrica.' },
  { id: 'hypertension', name: 'Hipertensão', subtitle: 'Atenção ao sódio', color: 'sage', focus: 'Revisar temperos, produtos industrializados e sódio total.', review: 'Os valores da tabela não incluem sal acrescentado. Ajustar sódio e potássio conforme avaliação; não sugerir sal de potássio automaticamente.' },
  { id: 'renal', name: 'Cuidado renal', subtitle: 'Planejamento com parâmetros clínicos', color: 'gold', focus: 'Revisar proteína, sódio, potássio, fósforo e líquidos.', review: 'Informar estágio, diálise, exames e metas individualizadas. Não há uma dieta renal única; a base é apenas um rascunho para avaliação.' },
  { id: 'oncology', name: 'Suporte oncológico', subtitle: 'Ingestão, tolerância e cuidado', color: 'rose', focus: 'Considerar apetite, perda de peso, consistência e tratamento atual.', review: 'Revisar tratamento, mucosite, disfagia, imunossupressão e suporte necessário com a equipe. Não aplicar déficit calórico automático.' },
  { id: 'ibs', name: 'Saúde intestinal', subtitle: 'A rotina encontra a tolerância', color: 'sage', focus: 'Registrar sintomas e adaptar refeições à resposta individual.', review: 'A base não é um protocolo low-FODMAP. Restrições e reintroduções exigem avaliação; evitar eliminações amplas automáticas.' },
  { id: 'gastric', name: 'Conforto gástrico', subtitle: 'Pequenos ajustes, escuta atenta', color: 'gold', focus: 'Adaptar volume, horários, preparo e alimentos percebidos como gatilhos.', review: 'Revisar sinais de alarme, refluxo e tolerância individual antes de excluir alimentos.' },
  { id: 'hpylori', name: 'Acompanhamento de H. pylori', subtitle: 'Suporte à alimentação', color: 'rose', focus: 'Organizar alimentação compatível com a tolerância durante o cuidado médico.', review: 'Alimentação não erradica H. pylori. Tratamento e medicamentos pertencem ao médico; conferir acompanhamento e exames.' },
  { id: 'lactose', name: 'Sem lactose na seleção', subtitle: 'Substituições com cuidado', color: 'sage', focus: 'Filtrar alimentos com lactose e revisar adequação nutricional.', review: 'Intolerância à lactose difere de alergia ao leite. Conferir rótulos e tolerância; alimentos zero lactose podem conter proteína do leite.' },
  { id: 'celiac', name: 'Cuidado na doença celíaca', subtitle: 'Seleção sem glúten', color: 'gold', focus: 'Excluir fontes de glúten da seleção de alimentos.', review: 'Revisar rótulos, certificação e contaminação cruzada em compras, preparo e utensílios. Aveia comum é excluída da seleção.' },
  { id: 'glp1', name: 'Suporte ao GLP-1', subtitle: 'Antes, durante e na manutenção', color: 'sage', focus: 'Considerar apetite, tolerância gastrointestinal, ingestão proteica e hidratação.', review: 'Conferir prescrição e sintomas. Não iniciar, alterar doses ou suspender medicação pelo plano; metas de proteína e líquidos são individuais.' },
];
const variants = [
  { id: 'pratica', name: 'Rotina prática', description: 'Preparos simples e ingredientes do dia a dia.', pattern: 0 },
  { id: 'variada', name: 'Mesa variada', description: 'Outras combinações para ampliar o repertório.', pattern: 1 },
  { id: 'fracionada', name: 'Refeições menores', description: 'Mais momentos no dia; volumes a revisar.', pattern: 2 },
  { id: 'vegetal', name: 'Mesa vegetal', description: 'Combinações com leguminosas, cereais e hortaliças, sem ingredientes de origem animal.', pattern: 3, diet: 'vegan' },
  { id: 'caseira', name: 'Cozinha de casa', description: 'Cuscuz, raízes, preparos cozidos e combinações brasileiras para a semana.', pattern: 4 },
];
export const planTemplates = clinicalProfiles.flatMap(profile => variants.map(variant => ({
  id: `${profile.id}-${variant.id}`, profile: profile.id, name: `${profile.name} · ${variant.name}`,
  description: `${variant.description} ${profile.focus}`, pattern: variant.pattern, diet: variant.diet, meals: variant.pattern === 2 ? 6 : 5,
  goals: ['balanced', 'diabetes', 'glp1'].includes(profile.id) ? goalOptions.map(goal => goal.id) : ['renal', 'oncology'].includes(profile.id) ? ['clinical'] : ['clinical', 'wellbeing', 'weight-management'],
  tags: [profile.name, variant.name, ...(profile.id === 'balanced' ? goalOptions.filter(goal => goal.id !== 'clinical').map(goal => goal.label) : ['Contexto clínico', profile.id === 'glp1' ? 'GLP-1' : profile.name])],
})));

// Culinary modules are draft assemblies, not disease prescriptions. All weights refer
// to the preparation named in the TACO catalogue. Clinical goals stay unset.
const module = (id, type, name, items, tags = [], note = '') => ({ id, type, name, items, tags, note });
export const mealModules = [
  module('breakfast-bread', 'breakfast', 'Pão, ovo e fruta', [['bread', 50], ['egg', 50], ['papaya', 150]], ['practical', 'wholegrain']),
  module('breakfast-corn', 'breakfast', 'Cuscuz com ovo e melão', [['couscous', 100], ['egg', 50], ['melon', 120]], ['practical', 'cooked']),
  module('breakfast-yogurt', 'breakfast', 'Bowl de iogurte, aveia e morango', [['yogurt', 170], ['oats', 30], ['strawberry', 100]], ['wholegrain', 'soft'], 'Misture a aveia ao iogurte e finalize com a fruta higienizada.'),
  module('breakfast-sweet-potato', 'breakfast', 'Batata-doce, ovo e mamão', [['sweet-potato', 130], ['egg', 50], ['papaya', 120]], ['practical', 'cooked']),
  module('breakfast-porridge', 'breakfast', 'Aveia com bebida de soja e banana', [['oats', 35], ['soy-milk', 200], ['banana', 80]], ['plant', 'wholegrain', 'soft'], 'Aqueça a aveia com a bebida de soja até a consistência combinada; acrescente a fruta.'),
  module('breakfast-cassava', 'breakfast', 'Mandioca, abacate e fruta', [['cassava', 100], ['avocado', 70], ['pear', 100]], ['plant', 'cooked']),
  module('breakfast-corn-lentils', 'breakfast', 'Cuscuz com lentilha e fruta', [['couscous', 90], ['lentils', 100], ['melon', 100]], ['plant', 'practical', 'cooked'], 'Sirva a lentilha cozida junto do cuscuz; a fruta pode ser consumida separadamente.'),
  module('breakfast-sandwich', 'breakfast', 'Pão com frango e tomate', [['bread', 60], ['chicken', 60], ['tomato', 50], ['orange', 100]], ['wholegrain']),
  module('breakfast-fruit-bowl', 'breakfast', 'Aveia, frutas e nozes', [['oats', 35], ['papaya', 160], ['walnut', 15]], ['plant', 'wholegrain'], 'Sirva a fruta cortada com a aveia e as nozes.'),
  module('snack-banana-nuts', 'snack', 'Banana e nozes', [['banana', 80], ['walnut', 10]], ['plant', 'practical']),
  module('snack-apple-yogurt', 'snack', 'Maçã e iogurte', [['apple', 130], ['yogurt', 120]], ['practical']),
  module('snack-pear-nuts', 'snack', 'Pera e castanha-do-Brasil', [['pear', 120], ['brazil-nut', 10]], ['plant', 'practical']),
  module('snack-papaya-yogurt', 'snack', 'Mamão com iogurte', [['papaya', 120], ['skim-yogurt', 150]], ['soft', 'practical']),
  module('snack-soy-mango', 'snack', 'Bebida de soja e manga', [['soy-milk', 180], ['mango', 90]], ['plant', 'soft']),
  module('snack-corn-egg', 'snack', 'Cuscuz com ovo', [['couscous', 70], ['egg', 50]], ['cooked', 'soft']),
  module('snack-avocado-fruit', 'snack', 'Abacate e morangos', [['avocado', 70], ['strawberry', 120]], ['plant', 'soft']),
  module('snack-lentil-toast', 'snack', 'Pão com lentilha', [['bread', 40], ['lentils', 80], ['tomato', 40]], ['plant', 'wholegrain'], 'Amasse a lentilha cozida e monte o pão com o tomate higienizado.'),
  module('snack-root-fruit', 'snack', 'Batata-doce e tangerina', [['sweet-potato', 80], ['tangerine', 100]], ['plant', 'practical']),
  module('snack-egg-fruit', 'snack', 'Ovo e fruta', [['egg', 50], ['melon', 150]], ['practical']),
  module('lunch-classic', 'lunch', 'Arroz integral, feijão e frango', [['brown-rice', 120], ['beans', 80], ['chicken', 100], ['broccoli', 80], ['olive-oil', 8]], ['practical', 'wholegrain', 'cooked']),
  module('lunch-fish', 'lunch', 'Arroz, lentilha e peixe', [['rice', 120], ['lentils', 90], ['white-fish', 120], ['zucchini', 100], ['olive-oil', 8]], ['fish', 'cooked']),
  module('lunch-beef', 'lunch', 'Arroz, feijão preto e patinho', [['rice', 120], ['black-beans', 80], ['beef', 90], ['carrot', 90], ['olive-oil', 8]], ['practical', 'cooked']),
  module('lunch-salmon', 'lunch', 'Batata com salmão e brócolis', [['potato', 180], ['salmon', 100], ['broccoli', 100], ['olive-oil', 5]], ['fish', 'cooked']),
  module('lunch-chicken-roots', 'lunch', 'Mandioca com frango e abóbora', [['cassava', 120], ['grilled-chicken', 100], ['pumpkin', 100], ['lettuce', 40], ['olive-oil', 8]], ['practical']),
  module('lunch-polenta', 'lunch', 'Polenta com carne e legumes', [['polenta', 160], ['ground-beef', 100], ['zucchini', 80], ['carrot', 70], ['olive-oil', 5]], ['soft', 'cooked'], 'Sirva a carne moída e os legumes cozidos sobre a polenta.'),
  module('lunch-lentil-bowl', 'lunch', 'Arroz integral com lentilha e legumes', [['brown-rice', 120], ['lentils', 200], ['carrot', 80], ['broccoli', 80], ['olive-oil', 8]], ['plant', 'wholegrain', 'cooked']),
  module('lunch-bean-bowl', 'lunch', 'Arroz com feijão-fradinho e abóbora', [['rice', 120], ['cowpea', 190], ['pumpkin', 100], ['cucumber', 60], ['olive-oil', 8]], ['plant', 'practical']),
  module('lunch-black-beans', 'lunch', 'Arroz integral com feijão preto e legumes', [['brown-rice', 120], ['black-beans', 200], ['chayote', 100], ['beet', 60], ['olive-oil', 8]], ['plant', 'practical', 'wholegrain', 'cooked']),
  module('dinner-fish-potato', 'dinner', 'Batata com peixe e cenoura', [['potato', 160], ['white-fish', 120], ['carrot', 90], ['olive-oil', 8]], ['fish', 'soft', 'cooked']),
  module('dinner-chicken-sweet-potato', 'dinner', 'Batata-doce com frango e abobrinha', [['sweet-potato', 150], ['grilled-chicken', 100], ['zucchini', 100], ['olive-oil', 8]], ['practical', 'cooked']),
  module('dinner-rice-beef', 'dinner', 'Arroz com patinho e berinjela', [['rice', 120], ['beef', 90], ['eggplant', 100], ['tomato', 60], ['olive-oil', 8]], ['practical']),
  module('dinner-arracacha', 'dinner', 'Mandioquinha com frango e legumes', [['arracacha', 180], ['chicken', 100], ['zucchini', 80], ['carrot', 60], ['olive-oil', 8]], ['soft', 'cooked'], 'Sirva a mandioquinha amassada com o frango desfiado e os legumes cozidos.'),
  module('dinner-salmon-rice', 'dinner', 'Arroz integral com salmão e couve-flor', [['brown-rice', 120], ['salmon', 100], ['cauliflower', 100], ['olive-oil', 5]], ['fish', 'wholegrain', 'cooked']),
  module('dinner-eggs-corn', 'dinner', 'Cuscuz com ovos e legumes', [['couscous', 120], ['egg', 100], ['zucchini', 80], ['carrot', 80], ['olive-oil', 5]], ['practical', 'cooked']),
  module('dinner-plant-lentils', 'dinner', 'Arroz com lentilha e abobrinha', [['rice', 120], ['lentils', 210], ['zucchini', 100], ['olive-oil', 8]], ['plant', 'soft', 'cooked']),
  module('dinner-plant-beans', 'dinner', 'Arroz integral com feijão e legumes', [['brown-rice', 120], ['beans', 210], ['pumpkin', 100], ['carrot', 70], ['olive-oil', 8]], ['plant', 'practical', 'wholegrain', 'cooked']),
  module('dinner-plant-cowpea', 'dinner', 'Cuscuz com feijão-fradinho e legumes', [['couscous', 120], ['cowpea', 200], ['zucchini', 80], ['beet', 60], ['olive-oil', 8]], ['plant', 'cooked']),
  module('supper-yogurt', 'supper', 'Iogurte com pera', [['yogurt', 150], ['pear', 80]], ['soft', 'practical']),
  module('supper-soy', 'supper', 'Bebida de soja com aveia', [['soy-milk', 180], ['oats', 20]], ['plant', 'wholegrain', 'soft']),
  module('supper-papaya', 'supper', 'Mamão com nozes', [['papaya', 150], ['walnut', 15]], ['plant', 'practical']),
  module('supper-banana', 'supper', 'Banana e iogurte', [['banana', 70], ['skim-yogurt', 120]], ['soft']),
  module('supper-avocado', 'supper', 'Abacate e melão', [['avocado', 70], ['melon', 100]], ['plant', 'soft']),
  module('supper-corn', 'supper', 'Cuscuz com lentilha', [['couscous', 60], ['lentils', 80]], ['plant', 'cooked']),
];
export const defaultOffer = {
  title: 'Seu plano, do seu jeito.', description: 'Plano alimentar personalizado com avaliação e acompanhamento de Gislaine Duarte.',
  priceCents: null, deliveryDays: null, followupDays: null, published: false,
  bristolReviewed: false,
};
export const consentVersion = 'nutrition-2026-09-v2';
