import { foodById } from '../../src/data/nutrition.js';
import { dayTotals, sumItems } from '../../src/lib/nutrition.js';
import { formatFoodPortion } from '../../src/lib/nutrition-journey.js';
import { assessmentHighlights, assessmentSections, targetLabels } from './presentation.js';
import { patientVisuals } from './patient-visuals.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const paragraphs = value => escape(value).replace(/\n/g, '<br>');
const nutrients = [['kcal', 'Energia', 'kcal'], ['protein', 'Proteínas', 'g'], ['carbs', 'Carboidratos', 'g'], ['fat', 'Gorduras', 'g'], ['fiber', 'Fibras', 'g']];
const targetUnits = { energy: 'kcal/dia', protein: 'g/dia', carbs: 'g/dia', fat: 'g/dia', water: 'ml/dia', sodium: 'mg/dia', potassium: 'mg/dia', phosphorus: 'mg/dia' };

function linkedParagraph(value, references) {
  let remaining = String(value ?? '');
  let markup = '';
  while (remaining) {
    const next = references.map(url => ({ url, index: remaining.indexOf(url) })).filter(match => match.index >= 0).sort((a, b) => a.index - b.index || b.url.length - a.url.length)[0];
    if (!next) return markup + paragraphs(remaining);
    markup += paragraphs(remaining.slice(0, next.index)) + `<a href="${escape(next.url)}" target="_blank" rel="noreferrer">${escape(next.url)}</a>`;
    remaining = remaining.slice(next.index + next.url.length);
  }
  return markup;
}

export function clinicalMarkup(plan) {
  const clinical = assessmentHighlights(plan);
  const visuals = patientVisuals(plan);
  const sections = assessmentSections(plan);
  const overview = sections.find(section => section.title === 'O que orientou seu plano');
  const input = plan.assessment?.calculationInput || {};
  const measurements = [['weight', 'Peso', 'kg'], ['height', 'Altura', 'cm'], ['waist', 'Cintura', 'cm'], ['hip', 'Quadril', 'cm']].filter(([key]) => input[key] !== null && input[key] !== undefined && input[key] !== '' && Number.isFinite(Number(input[key])) && Number(input[key]) > 0).map(([key, label, unit]) => `${label}: ${decimal(input[key])} ${unit}`).join(' · ');
  const references = [...new Set((plan.assessment?.calculations || []).map(calculation => calculation.source?.url).filter(url => {
    if (typeof url !== 'string') return false;
    try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch { return false; }
  }))];
  const figures = Object.entries(visuals).filter(([, figure]) => figure).map(([key, figure]) => `<figure class="patient-figure patient-figure--${key}" id="assessment-${key}"><figcaption><span class="eyebrow">${{ composition: 'Composição corporal', bmi: 'Antropometria', energy: 'Gasto e meta de energia', hydration: 'Hidratação' }[key]}</span><h3>${escape(figure.title)}</h3></figcaption><div class="patient-chart visual-wide${figure.compactSvg ? '' : ' visual-only'}">${figure.svg}</div>${figure.compactSvg ? `<div class="patient-chart visual-compact">${figure.compactSvg}</div>` : ''}<p class="figure-description">${escape(figure.description)}</p>${key === 'composition' ? `${measurements ? `<p class="fine"><strong>Medidas consideradas:</strong> ${escape(measurements)}.</p>` : ''}<p class="fine">${escape(clinical.compositionNote)}</p>` : ''}${key === 'energy' ? `<p class="fine">${escape(clinical.energyNote)}</p>` : ''}${key === 'bmi' && clinical.bmi ? `<a class="fine" href="${escape(clinical.bmi.source.url)}" target="_blank" rel="noreferrer">Referência: ${escape(clinical.bmi.source.title)}</a>` : ''}</figure>`).join('');
  const metrics = clinical.metrics.map(item => `<article><span>${escape(item.label)}</span><strong>${decimal(item.value)} <small>${escape(item.unit)}</small></strong><p>${escape(item.method)}</p></article>`).join('');
  const bristol = clinical.bristol ? `<section class="clinical-context bristol-context" id="assessment-bristol"><span class="bristol-type" aria-hidden="true">${clinical.bristol.type}</span><div><p class="eyebrow">Escala de Bristol · seu relato</p><h3>${escape(clinical.bristol.label)}</h3><p><strong>Tipo ${clinical.bristol.type}.</strong> ${escape(clinical.bristol.description)}</p><p class="fine">A escala descreve o aspecto das fezes. Frequência, desconforto e mudanças também fazem parte da conversa; o tipo informado isoladamente não define diagnóstico.</p><a class="fine" href="${escape(clinical.bristolSource.url)}" target="_blank" rel="noreferrer">Referência: Bristol Stool Chart · NHS England</a></div></section>` : '';
  const targets = Object.entries(targetLabels).filter(([key]) => plan.targets?.[key] !== null && plan.targets?.[key] !== undefined && Number.isFinite(Number(plan.targets[key]))).map(([key, label]) => {
    const origin = plan.assessment?.targetSources?.[key];
    return `<article><span>${label}</span><strong>${decimal(plan.targets[key])} <small>${targetUnits[key]}</small></strong><p>${escape(origin?.method || 'Definida pela nutricionista no plano.')}</p></article>`;
  }).join('');
  // The shared sections are also the PDF's source of truth. Preserve the full
  // numerical precision, formula, input values and references in the appendix.
  const technical = sections.filter(section => section !== overview).map((section, index) => `<details class="technical-section" id="assessment-detail-${index}"><summary>${escape(section.title)}</summary><div>${section.lines.map(line => `<p>${linkedParagraph(line, references)}</p>`).join('')}</div></details>`).join('');
  return `${overview ? `<div class="assessment-overview"><h3>${escape(overview.title)}</h3>${overview.lines.map(line => `<p>${paragraphs(line)}</p>`).join('')}</div>` : ''}<div class="patient-figures">${figures}</div>${metrics ? `<details class="technical-section metric-details"><summary>Valores registrados, em números</summary><div class="clinical-metrics">${metrics}</div></details>` : ''}${bristol}<section class="individual-targets" id="targets"><p class="eyebrow">Referências para o seu cuidado</p><h3>Suas metas individuais</h3>${targets ? `<div class="target-grid">${targets}</div><p class="fine">As metas foram definidas pela nutricionista. Os totais das refeições são estimativas de composição dos alimentos; pequenas diferenças dependem dos preparos e das escolhas aprovadas.</p>` : '<p>Nenhuma meta numérica foi registrada nesta versão.</p>'}</section><section class="calculation-details" id="calculation-memory"><p class="eyebrow">Para consultar quando quiser</p><h3>Dados e memória de cálculo</h3><p>Abra cada bloco para ver os dados considerados, os métodos, as fórmulas e as fontes. Todo este conteúdo está guardado no arquivo e acompanha a impressão.</p>${technical}</section>`;
}

export function weeklyMarkup(plan) {
  const totals = plan.days.map(dayTotals);
  const maximum = Math.max(500, Math.ceil(Math.max(...totals.map(total => total.kcal)) / 500) * 500);
  const averages = nutrients.map(([key, label, unit]) => `<article><span>${label}</span><strong id="week-average-${key}">${decimal(totals.reduce((sum, total) => sum + total[key], 0) / totals.length)} <small>${unit}</small></strong></article>`).join('');
  const bars = plan.days.map((day, index) => `<div class="week-chart-row"><a href="#day-${index}" data-plan-anchor>${escape(day.label)}</a><div class="week-track" aria-hidden="true"><i id="week-bar-${index}" style="width:${totals[index].kcal / maximum * 100}%"></i></div><strong id="week-energy-${index}">${decimal(totals[index].kcal)} kcal</strong></div>`).join('');
  const rows = plan.days.map((day, index) => `<tr><th scope="row"><a href="#day-${index}" data-plan-anchor>${escape(day.label)}</a></th>${nutrients.map(([key]) => `<td id="week-${index}-${key}">${decimal(totals[index][key])}</td>`).join('')}</tr>`).join('');
  return `<section class="panel week-overview" id="week"><p class="eyebrow">Os dias vistos em conjunto</p><h2>Sua semana, de perto.</h2><p>Uma visão das refeições planejadas. Ao escolher uma troca nas refeições, este resumo também se atualiza.</p><h3>Média diária planejada</h3><div class="week-averages">${averages}</div><div class="week-chart" role="group" aria-label="Energia planejada por dia">${bars}<p class="fine" id="week-scale">Mesma escala: 0 a ${decimal(maximum)} kcal por dia.</p></div><details class="technical-section"><summary>Comparar todos os nutrientes por dia</summary><div class="table-scroll" role="region" aria-label="Totais planejados por dia" tabindex="0"><table class="week-table"><caption>Composição estimada das opções selecionadas</caption><thead><tr><th scope="col">Dia</th>${nutrients.map(([, label, unit]) => `<th scope="col">${label}<small>${unit}</small></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></details><p class="fine">Este quadro descreve o plano, não o consumo realizado. Marcar uma refeição como feita não muda estes valores.</p></section>`;
}

export function alternativesMarkup(plan, foodImage) {
  const groups = new Map();
  plan.days.forEach((day, d) => day.meals.forEach((meal, m) => meal.items.forEach((item, i) => {
    if (!item.alternatives?.length) return;
    const options = [item, ...item.alternatives].map(({ foodId, grams }) => ({ foodId, grams }));
    const key = JSON.stringify(options);
    if (!groups.has(key)) groups.set(key, { options, occurrences: [] });
    groups.get(key).occurrences.push({ d, m, i, label: day.label, meal: meal.name });
  })));
  if (!groups.size) return '';
  const gallery = [...groups.values()].map(({ options, occurrences }) => `<details class="swap-group"><summary><span>${escape(foodById[options[0].foodId].name)} · ${decimal(options[0].grams)} g</span><small>${options.length - 1} ${options.length === 2 ? 'troca aprovada' : 'trocas aprovadas'}</small></summary><div><div class="swap-gallery">${options.map((item, index) => {
    const values = sumItems([item]);
    return `<article>${foodImage(item.foodId)}<span class="eyebrow">${index === 0 ? 'Opção principal' : `Alternativa ${index}`}</span><h4>${escape(foodById[item.foodId].name)}</h4><p><strong>${decimal(item.grams)} g</strong> · ${escape(formatFoodPortion(item.foodId, item.grams))}</p><p class="fine">${decimal(values.kcal)} kcal · P ${decimal(values.protein)} g · C ${decimal(values.carbs)} g · G ${decimal(values.fat)} g</p></article>`;
  }).join('')}</div><p class="fine">Disponível nestas refeições:</p><div class="swap-occurrences">${occurrences.map(({ d, m, i, label, meal }) => `<a href="#food-${d}-${m}-${i}" data-plan-anchor>${escape(label)} · ${escape(meal)}</a>`).join('')}</div></div></details>`).join('');
  return `<section class="panel alternatives-guide" id="swaps"><p class="eyebrow">Flexibilidade já revisada</p><h2>Uma galeria de possibilidades.</h2><p>Veja as fotografias, as porções e os nutrientes das opções aprovadas. Escolha uma opção por alimento, na refeição correspondente; ela substitui a principal. Os links levam diretamente ao seletor.</p><p class="fine">Cada grupo vale apenas para as refeições indicadas. Alternativas não precisam ter valores nutricionais idênticos; os cálculos se ajustam à sua escolha.</p>${gallery}</section>`;
}
