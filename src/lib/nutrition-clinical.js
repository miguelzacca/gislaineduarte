// Shared clinical display and validation. Classification uses unrounded values;
// presentation rounding never moves a person across a clinical threshold.
export const clinicalSources = {
  bmi: { title: 'Ministério da Saúde · PCDT de Sobrepeso e Obesidade em Adultos', url: 'https://www.gov.br/saude/pt-br/assuntos/pcdt/s/sobrepeso-e-obesidade-em-adultos/view' },
  olderBmi: { title: 'Ministério da Saúde · Guia de Vigilância Alimentar e Nutricional, quadro 30', url: 'https://bvsms.saude.gov.br/bvs/publicacoes/guia_organizacao_vigilancia_alimentar_nutricional.pdf' },
  mifflin: { title: 'Mifflin et al., 1990 · equação de gasto em repouso', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
  femaleSkinfold: { title: 'Jackson, Pollock & Ward, 1980', url: 'https://pubmed.ncbi.nlm.nih.gov/7402053/' },
  maleSkinfold: { title: 'Jackson & Pollock, 1978', url: 'https://pubmed.ncbi.nlm.nih.gov/718832/' },
  siri: { title: 'Siri · conversão de densidade corporal em percentual de gordura', url: 'https://pubmed.ncbi.nlm.nih.gov/8286893/' },
};
const present = value => value !== '' && value !== null && value !== undefined;
const valid = (value, min, max) => present(value) && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
const rounded = (value, decimals = 1) => Math.round(value * 10 ** decimals) / 10 ** decimals;

export function validMeasurementDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function bmiInterpretation(input = {}) {
  if (!valid(input.weight, 25, 350) || !valid(input.height, 120, 230)) return null;
  const value = Number(input.weight) / (Number(input.height) / 100) ** 2;
  const base = { value, note: 'O IMC é um indicador de triagem. Não mede gordura corporal nem define sozinho um diagnóstico.', source: clinicalSources.bmi };
  if (input.pregnant === true) return { ...base, label: 'Interpretação individual na gestação/amamentação', bands: [], activeIndex: -1, note: 'Este cadastro sinaliza gestação ou amamentação. A classificação geral de IMC não é aplicada; a nutricionista interpreta o contexto individual.' };
  if (!valid(input.age, 20, 100)) return { ...base, label: 'Classificação depende da avaliação por idade', bands: [], activeIndex: -1, note: 'Para menores de 20 anos, a interpretação requer IMC por idade e sexo. A classificação adulta não é aplicada.' };
  const older = Number(input.age) >= 60;
  const bands = older
    ? [{ label: 'Baixo peso', range: '≤ 22', max: 22 }, { label: 'Adequado', range: '> 22 a < 27', max: 27 }, { label: 'Sobrepeso', range: '≥ 27', max: Infinity }]
    : [{ label: 'Baixo peso', range: '< 18,5', max: 18.5 }, { label: 'Faixa adequada', range: '18,5 a < 25', max: 25 }, { label: 'Sobrepeso', range: '25 a < 30', max: 30 }, { label: 'Obesidade grau I', range: '30 a < 35', max: 35 }, { label: 'Obesidade grau II', range: '35 a < 40', max: 40 }, { label: 'Obesidade grau III', range: '≥ 40', max: Infinity }];
  const activeIndex = older ? value <= 22 ? 0 : value < 27 ? 1 : 2 : bands.findIndex(band => value < band.max);
  return { ...base, label: bands[activeIndex].label, bands, activeIndex, source: older ? clinicalSources.olderBmi : base.source, note: `${older ? 'Referência específica para pessoas com 60 anos ou mais (SISVAN). ' : 'Referência para adultos de 20 a 59 anos. '}${base.note}` };
}

export const skinfoldLabels = { triceps: 'Tríceps', suprailiac: 'Supra-ilíaca', thigh: 'Coxa', chest: 'Peitoral', abdomen: 'Abdominal' };
export function skinfoldInputErrors(input = {}) {
  if (!input.skinfoldMethod) return [];
  const errors = [];
  if (input.skinfoldMethod !== 'jackson-pollock-3') errors.push('Selecione o método Jackson–Pollock de 3 dobras.');
  if (!['female', 'male'].includes(input.sex)) errors.push('Informe o parâmetro sexual da equação de dobras.');
  if (!valid(input.age, 18, input.sex === 'female' ? 55 : 61)) errors.push('O método de 3 dobras admite mulheres de 18 a 55 anos e homens de 18 a 61 anos.');
  if (input.pregnant === true) errors.push('A equação de dobras não será aplicada na gestação/amamentação.');
  if (!validMeasurementDate(input.measurementDate)) errors.push('Registre uma data válida da avaliação de dobras.');
  const sites = input.sex === 'female' ? ['triceps', 'suprailiac', 'thigh'] : ['chest', 'abdomen', 'thigh'];
  for (const site of sites) if (!valid(input.skinfolds?.[site], 1, 80)) errors.push(`Registre a média das leituras de ${skinfoldLabels[site]} entre 1 e 80 mm.`);
  return errors;
}

export function skinfoldEvaluation(input = {}) {
  if (!input.skinfoldMethod || skinfoldInputErrors(input).length) return null;
  const sites = input.sex === 'female' ? ['triceps', 'suprailiac', 'thigh'] : ['chest', 'abdomen', 'thigh'];
  const sum = sites.reduce((total, site) => total + Number(input.skinfolds[site]), 0);
  const female = input.sex === 'female';
  const density = female ? 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * Number(input.age) : 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * Number(input.age);
  const bodyFat = 495 / density - 450;
  if (!Number.isFinite(bodyFat) || bodyFat <= 0 || bodyFat >= 70) return null;
  const fatMass = valid(input.weight, 25, 350) ? Number(input.weight) * bodyFat / 100 : null;
  return { sum: rounded(sum), density, bodyFat: rounded(bodyFat), fatMass: fatMass === null ? null : rounded(fatMass), leanMass: fatMass === null ? null : rounded(Number(input.weight) - fatMass), sites,
    formula: female ? '1,0994921 − 0,0009929 × soma + 0,0000023 × soma² − 0,0001392 × idade' : '1,10938 − 0,0008267 × soma + 0,0000016 × soma² − 0,0002574 × idade',
    source: female ? clinicalSources.femaleSkinfold : clinicalSources.maleSkinfold,
    note: 'Estimativa por Jackson–Pollock (3 dobras) e Siri. Depende da técnica, do adipômetro e da população avaliada; não equivale à medida de massa muscular. Conferir adequação do método em consulta.' };
}

export function plateGuideErrors(guide) {
  if (guide === undefined || guide === null) return [];
  if (typeof guide !== 'object' || Array.isArray(guide) || ['protein', 'carbs', 'vegetables'].some(key => typeof guide[key] !== 'number' || !valid(guide[key], 0, 100)) || Math.abs(guide.protein + guide.carbs + guide.vegetables - 100) > 0.01) return ['Os grupos do prato devem conter percentuais de 0 a 100 e somar 100%.'];
  return [];
}

export function curatedImageAllowed(value) {
  if (!value) return true;
  if (typeof value !== 'string' || value.length > 500) return false;
  if (/^\/images\/[a-zA-Z0-9_/-]+\.(?:jpe?g|png|webp)$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && ['images.unsplash.com', 'images.pexels.com'].includes(url.hostname) && !url.username && !url.password && !url.port; } catch { return false; }
}

// Culinary food groups are distinct from macronutrients. Beans contain both
// carbohydrate and protein; the guide never labels their mass as pure protein.
export function plateFoodGroup(food) {
  const group = food?.group || '';
  if (/hortali|vegetai|verdura|legume/i.test(group)) return 'vegetables';
  if (/proteína|proteina|carne|ovo|pescado|peixe|leguminosa/i.test(group)) return 'protein';
  if (/cerea|tubér|raíz|raiz|pães|paes/i.test(group)) return 'carbs';
  return 'other';
}
