import catalogue from './nutrition-foods.json' with { type: 'json' };

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
];
export const planTemplates = clinicalProfiles.flatMap(profile => variants.map(variant => ({
  id: `${profile.id}-${variant.id}`, profile: profile.id, name: `${profile.name} · ${variant.name}`,
  description: variant.description, pattern: variant.pattern, meals: variant.pattern === 2 ? 6 : 5,
})));
export const defaultOffer = {
  title: 'Seu plano, do seu jeito.', description: 'Plano alimentar personalizado com avaliação e acompanhamento de Gislaine Duarte.',
  priceCents: null, deliveryDays: null, followupDays: null, published: false,
};
export const consentVersion = 'nutrition-2026-09-v1';
