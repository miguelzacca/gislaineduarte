import { clinicalProfiles } from '../data/nutrition.js';
import { goalOptions } from '../data/nutrition-journey.js';

const stopWords = new Set('a o as os um uma uns umas de do da dos das em no na nos nas ao aos com e ou para pra por que quero queria preciso gostaria encontrar buscar achar modelo modelos plano planos alimentar alimentares alimentacao dieta dietas paciente pessoa meu minha seu sua'.split(' '));
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const singular = word => word.length > 4 ? word.replace(/oes$/, 'ao').replace(/ais$/, 'al').replace(/s$/, '') : word;
const tokens = value => (normalize(value).match(/[a-z0-9]+/g) || []).filter(word => !stopWords.has(word)).map(singular);

const definitions = [
  ['goal', 'muscle', 'Hipertrofia e ganho de massa muscular', ['hipertrofia', 'hipertrofico', 'ganhar massa', 'ganho de massa', 'aumentar massa', 'massa muscular', 'ganho muscular', 'ganhar musculo', 'musculos', 'musculacao', 'treino de forca']],
  ['goal', 'weight-management', 'Emagrecimento e controle de peso', ['emagrecimento', 'emagrecer', 'perder peso', 'perda de peso', 'reduzir peso', 'controle de peso', 'perder gordura', 'perda de gordura', 'reduzir gordura', 'secar', 'definicao corporal']],
  ['goal', 'weight-gain', 'Ganho de peso', ['ganho de peso', 'ganhar peso', 'aumentar peso', 'engordar', 'baixo peso']],
  ['goal', 'wellbeing', 'Bem-estar e rotina', ['bem estar', 'bemestar', 'rotina equilibrada', 'equilibrar alimentacao']],
  ['goal', 'clinical', 'Cuidado clínico individualizado', ['cuidado clinico', 'condicao clinica', 'acompanhamento clinico', 'clinico', 'clinica']],
  ['profile', 'diabetes', 'Diabetes', ['diabetes', 'diabetico', 'glicemia', 'controle glicemico']],
  ['profile', 'hypertension', 'Hipertensão', ['hipertensao', 'hipertenso', 'pressao alta']],
  ['profile', 'cardiovascular', 'Saúde cardiovascular', ['cardiovascular', 'cardiaco', 'coracao']],
  ['profile', 'renal', 'Cuidado renal', ['renal', 'rim', 'rins', 'doenca renal']],
  ['profile', 'oncology', 'Suporte oncológico', ['oncologia', 'oncologico', 'cancer']],
  ['profile', 'ibs', 'Saúde intestinal', ['saude intestinal', 'intestino irritavel', 'intestinal']],
  ['profile', 'gastric', 'Conforto gástrico', ['gastrite', 'refluxo', 'gastrico', 'estomago']],
  ['profile', 'hpylori', 'Acompanhamento de H. pylori', ['h pylori', 'hpylori', 'helicobacter pylori']],
  ['profile', 'lactose', 'Sem lactose', ['sem lactose', 'zero lactose', 'intolerancia a lactose', 'lactose']],
  ['profile', 'celiac', 'Seleção sem glúten', ['sem gluten', 'celiaco', 'doenca celiaca', 'celiac']],
  ['profile', 'glp1', 'Suporte ao GLP-1', ['glp 1', 'glp1', 'glp']],
  ['diet', 'vegan', 'Mesa vegetal', ['vegano', 'vegana', 'vegetal', 'sem ingredientes de origem animal']],
  ['diet', 'vegetarian', 'Sem carne', ['vegetariano', 'vegetariana', 'sem carne']],
  ['pattern', 0, 'Rotina prática', ['pratico', 'pratica', 'rapido', 'rapida', 'simples', 'correria', 'sem tempo', 'marmita', 'facil de preparar']],
  ['pattern', 1, 'Mesa variada', ['variado', 'variada', 'variedade', 'variar refeicoes']],
  ['pattern', 2, 'Refeições menores', ['fracionado', 'fracionada', 'refeicoes menores', 'pequenas porcoes', 'pouca fome', 'baixo apetite']],
  ['pattern', 4, 'Cozinha de casa', ['caseiro', 'caseira', 'comida de casa', 'comida brasileira', 'cozinha de casa']],
];
const concepts = definitions.map(([type, id, label, aliases], order) => ({ type, id, label, order, aliases: aliases.map(tokens) }));

// Bounded edit distance also accepts a neighbouring-letter transposition.
function distance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index); let beforePrevious;
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) current[column] = Math.min(current[column], beforePrevious[column - 2] + 1);
    }
    beforePrevious = previous; previous = current;
  }
  return previous[right.length];
}

function wordMatch(word, target, partial = false) {
  if (word === target) return 1;
  if (partial && word.length >= 3 && target.startsWith(word)) return 0.85;
  if (word.length < 4 || target.length < 4) return 0;
  const limit = Math.min(word.length, target.length) >= 7 ? 2 : 1;
  return distance(word, target, limit) <= limit ? 0.65 : 0;
}

function contains(words, aliases) {
  return aliases.some(alias => words.some((_, start) => alias.every((word, index) => words[start + index] === word)));
}

function interpret(query) {
  const words = tokens(query).slice(0, 40); const candidates = [];
  for (const concept of concepts) for (const alias of concept.aliases) {
    for (let start = 0; start <= words.length - alias.length; start++) {
      const qualities = alias.map((word, index) => wordMatch(words[start + index], word, start + index === words.length - 1));
      if (qualities.every(Boolean)) candidates.push({ ...concept, start, length: alias.length, quality: qualities.reduce((sum, value) => sum + value, 0) / qualities.length });
    }
  }
  candidates.sort((a, b) => b.quality - a.quality || b.length - a.length || a.order - b.order);
  const covered = new Set(); const intents = new Map();
  for (const candidate of candidates) {
    const positions = Array.from({ length: candidate.length }, (_, index) => candidate.start + index);
    if (positions.some(position => covered.has(position))) continue;
    const preceding = words[candidate.start - 1];
    const excluded = candidate.type === 'profile' && (preceding === 'nao' || (preceding === 'sem' && !['lactose', 'celiac'].includes(candidate.id)));
    if (excluded) positions.push(candidate.start - 1);
    positions.forEach(position => covered.add(position));
    const key = `${candidate.type}:${candidate.id}:${excluded}`;
    if (!intents.has(key)) intents.set(key, { ...candidate, excluded });
  }
  return { intents: [...intents.values()], remaining: words.flatMap((word, index) => covered.has(index) ? [] : [{ word, partial: index === words.length - 1 }]) };
}

function documentFor(template) {
  const context = clinicalProfiles.find(item => item.id === template.profile);
  const declaredGoals = template.goal ? [template.goal] : (template.goals || []).length < goalOptions.length ? template.goals || [] : [];
  const fields = [
    ['Título', [template.name, template.title].join(' '), 12],
    ['Descrição', template.description, 7],
    ['Palavras-chave', (template.tags || []).join(' '), 9],
    ['Contexto', [template.profile, context?.name, context?.subtitle, context?.focus].join(' '), 8],
    ['Revisão do contexto', context?.review, 3],
    ['Objetivo', goalOptions.filter(item => declaredGoals.includes(item.id)).map(item => item.label).join(' '), 10],
    ['Refeições', template.meals ? `${template.meals} refeicoes` : '', 6],
  ].map(([label, text, weight]) => ({ label, words: tokens(text), weight }));
  return { template, fields, declaredGoals, title: fields[0].words, description: fields[1].words, tags: fields[2].words };
}

function intentStrength(intent, document, clinicalContext) {
  const { template, declaredGoals, title, description, tags } = document;
  if (intent.type === 'goal') {
    // Compatibility with every goal is not a dedicated hypertrophy/weight-loss base.
    if (template.goal) return template.goal === intent.id ? 4 : 0;
    if (declaredGoals.length) return declaredGoals.includes(intent.id) ? 3 : 0;
    if (intent.id === 'clinical' && template.profile !== 'balanced' && clinicalProfiles.some(item => item.id === template.profile)) return 3;
    if (contains(title, intent.aliases)) return 3;
    const taggedGoals = concepts.filter(item => item.type === 'goal' && contains(tags, item.aliases));
    if ((taggedGoals.length === 1 && taggedGoals[0].id === intent.id) || contains(description, intent.aliases)) return 2;
    return clinicalContext && (template.goals || goalOptions.map(item => item.id)).includes(intent.id) ? 1 : 0;
  }
  if (intent.type === 'profile') return template.profile === intent.id ? 3 : [title, description, tags].some(words => contains(words, intent.aliases)) ? 2 : 0;
  if (intent.type === 'diet') {
    if (template.diet) return template.diet === intent.id || (intent.id === 'vegetarian' && template.diet === 'vegan') ? 3 : 0;
    return [title, description, tags].some(words => contains(words, intent.aliases)) ? 2 : 0;
  }
  return template.pattern === intent.id ? 3 : [title, description, tags].some(words => contains(words, intent.aliases)) ? 2 : 0;
}

export function searchPlanTemplateMatches(templates, { query = '', goal = '', profile = '' } = {}) {
  const { intents, remaining } = interpret(query);
  const goalIntents = intents.filter(intent => intent.type === 'goal' && !intent.excluded);
  const otherIntents = intents.filter(intent => intent.type !== 'goal');
  const searching = tokens(query).length > 0;
  const matches = [];
  for (const [index, template] of templates.entries()) {
    const goals = template.goals || (template.goal ? [template.goal] : goalOptions.map(option => option.id));
    if (goal && goal !== 'all' && !goals.includes(goal)) continue;
    if (profile && profile !== 'all' && template.profile !== profile) continue;
    const document = documentFor(template); const reasons = []; let score = 0;
    const clinicalContext = Boolean(profile && profile !== 'all') || otherIntents.some(intent => intent.type === 'profile' && !intent.excluded && intentStrength(intent, document, false));
    const goalMatches = goalIntents.map(intent => ({ intent, strength: intentStrength(intent, document, clinicalContext) })).filter(match => match.strength);
    if (goalIntents.length && !goalMatches.length) continue;
    for (const { intent, strength } of goalMatches) { score += strength * 45 * intent.quality; reasons.push(`Objetivo: ${intent.label}`); }
    let rejected = false; let positiveContext = false;
    for (const intent of otherIntents) {
      const strength = intentStrength(intent, document, clinicalContext);
      if (intent.excluded ? strength > 0 : !strength) { rejected = true; break; }
      if (!intent.excluded) { positiveContext = true; score += strength * 30 * intent.quality; reasons.push(`${intent.type === 'profile' ? 'Contexto' : 'Rotina'}: ${intent.label}`); }
    }
    if (rejected) continue;
    let matchedWords = 0;
    for (const { word, partial } of remaining) {
      let best;
      for (const field of document.fields) {
        const quality = Math.max(0, ...field.words.map(target => wordMatch(word, target, partial)));
        if (quality && (!best || quality * field.weight > best.score)) best = { score: quality * field.weight, label: field.label };
      }
      if (best) { matchedWords++; score += best.score; reasons.push(best.label); }
    }
    // Natural phrasing may contain words absent from the catalogue. A recognised
    // objective/context still finds related bases; free-text-only queries need
    // meaningful coverage instead of one accidental short-word match.
    if (remaining.length && !goalMatches.length && !positiveContext && matchedWords < Math.ceil(remaining.length / 2)) continue;
    score += matchedWords * 6;
    matches.push({ template, score, reasons: searching ? [...new Set(reasons)].slice(0, 3) : [], index });
  }
  return matches.sort((a, b) => b.score - a.score || a.index - b.index);
}

export function searchPlanTemplates(templates, options) {
  return searchPlanTemplateMatches(templates, options).map(match => match.template);
}
