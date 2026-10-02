import { assessmentHighlights } from './presentation.js';

const palette = { forest: '#173f35', sage: '#6b8b75', gold: '#ba8b42', pale: '#eef2e9', sand: '#f5ecdd', ink: '#24453b', muted: '#557064', line: '#d4ded1' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const humanBody = 'M78 66 C66 67 57 72 53 84 L30 145 Q25 158 36 162 Q46 165 51 153 L64 120 L62 157 Q61 167 66 175 L67 248 Q67 261 80 261 Q92 261 92 248 L98 194 L102 194 L108 248 Q108 261 120 261 Q133 261 133 248 L134 175 Q139 167 138 157 L136 120 L149 153 Q154 165 164 162 Q175 158 170 145 L147 84 C143 72 134 67 122 66 Q100 77 78 66Z';
const human = (fill, transform = '') => `<g${transform ? ` transform="${transform}"` : ''} fill="${fill}"><circle cx="100" cy="35" r="23"/><path d="${humanBody}"/></g>`;
const compositionAvatar = (percent, x, y) => {
  const circumference = 2 * Math.PI * 116;
  return `<circle cx="${x}" cy="${y}" r="116" fill="${palette.pale}" stroke="${palette.forest}" stroke-width="16"/>${percent !== null ? `<circle cx="${x}" cy="${y}" r="116" fill="none" stroke="${palette.gold}" stroke-width="16" stroke-dasharray="${circumference * percent / 100} ${circumference}" transform="rotate(-90 ${x} ${y})"/>` : ''}${human(percent !== null ? palette.forest : palette.line, `translate(${x - 80} ${y - 110}) scale(.8)`)}`;
};
const label = (value, x, y, size = 22, fill = palette.ink, weight = 400, extra = '') => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${escape(value)}</text>`;
const rect = (x, y, width, height, fill, radius = 16, stroke = '') => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ''}/>`;
function figure(key, title, description, width, height, content) {
  return { title, description, width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="pv-${key}-title pv-${key}-description"><title id="pv-${key}-title">${escape(title)}</title><desc id="pv-${key}-description">${escape(description)}</desc>${content}</svg>` };
}

function compositionFigure(plan, clinical) {
  const records = plan.assessment?.calculations || [];
  const get = id => records.find(record => record.id === id);
  const measured = get('skinfoldBodyFat');
  const fat = get(measured ? 'skinfoldFatMass' : 'fatMass');
  const lean = get(measured ? 'skinfoldLeanMass' : 'leanMass');
  const total = numeric(fat?.value) && numeric(lean?.value) ? Number(fat.value) + Number(lean.value) : null;
  // Never infer body-fat percentage from BMI or a body shape. A recorded
  // composition calculation is required; the silhouette is a symbolic key.
  const percent = numeric(measured?.value) ? Number(measured.value) : total > 0 ? Number(fat.value) / total * 100 : null;
  const available = percent !== null && percent > 0 && percent < 70;
  const title = 'Seu corpo em perspectiva';
  const description = available ? `Gordura corporal estimada: ${decimal(percent)}%. Massa de gordura: ${numeric(fat?.value) ? `${decimal(fat.value)} kg` : 'não registrada'}. Massa livre de gordura: ${numeric(lean?.value) ? `${decimal(lean.value)} kg` : 'não registrada'}. A figura é simbólica; não reproduz a aparência nem a localização da gordura.` : 'Figura humana simbólica. Não há composição corporal calculada nesta avaliação. O IMC não informa o percentual de gordura.';
  let svg = rect(0, 0, 840, 410, '#ffffff');
  svg += compositionAvatar(available ? percent : null, 137, 192);
  svg += label('Figura ilustrativa', 137, 350, 20, palette.muted, 400, 'text-anchor="middle"');
  if (available) {
    // A ring and a bar convey the proportion without mapping fat to anatomy.
    svg += label('COMPOSIÇÃO ESTIMADA', 290, 38, 18, palette.muted, 700);
    svg += label(`${decimal(percent)}%`, 286, 111, 66, palette.forest, 700);
    svg += label('de gordura corporal', 290, 148, 25, palette.muted);
    const x = 290, y = 179, w = 510;
    svg += rect(x, y, w, 24, palette.forest, 8);
    svg += rect(x, y, w * percent / 100, 24, palette.gold, 8);
    svg += rect(290, 226, 245, 92, palette.sand, 12) + rect(552, 226, 248, 92, palette.pale, 12);
    svg += label(numeric(fat?.value) ? `${decimal(fat.value)} kg` : `${decimal(percent)}%`, 310, 267, 33, palette.ink, 700);
    svg += label('Massa de gordura', 310, 299, 21, palette.ink);
    svg += label(numeric(lean?.value) ? `${decimal(lean.value)} kg` : `${decimal(100 - percent)}%`, 572, 267, 33, palette.ink, 700);
    svg += label('Massa livre de gordura', 572, 299, 19, palette.ink);
    svg += label(measured ? 'Método: dobras cutâneas + Siri' : 'Método registrado na avaliação', 290, 351, 20, palette.muted);
    svg += label('Água, ossos, órgãos e músculos compõem a massa livre.', 290, 380, 18, palette.muted);
  } else {
    svg += label('COMPOSIÇÃO CORPORAL', 290, 63, 20, palette.muted, 700);
    svg += label('Ainda não registrada', 290, 129, 35, palette.forest, 700);
    svg += label('A avaliação pode incluir dobras cutâneas', 290, 192, 24);
    svg += label('ou outro método informado pela nutricionista.', 290, 227, 24);
    svg += rect(290, 270, 510, 70, palette.pale, 12);
    svg += label('IMC não mede percentual de gordura.', 310, 312, 24, palette.forest, 700);
  }
  const result = figure('composition', title, description, 840, 410, svg);
  let compact = compositionAvatar(available ? percent : null, 200, 132);
  if (available) {
    compact += label(`${decimal(percent)}%`, 200, 325, 58, palette.forest, 700, 'text-anchor="middle"');
    compact += label('de gordura corporal', 200, 362, 25, palette.muted, 400, 'text-anchor="middle"');
    compact += rect(0, 392, 400, 22, palette.forest, 7) + rect(0, 392, 400 * percent / 100, 22, palette.gold, 7);
    compact += rect(0, 442, 192, 121, palette.sand, 12) + rect(208, 442, 192, 121, palette.pale, 12);
    compact += label(numeric(fat?.value) ? `${decimal(fat.value)} kg` : `${decimal(percent)}%`, 17, 485, 32, palette.ink, 700);
    compact += label('Massa de', 17, 520, 22) + label('gordura', 17, 547, 22);
    compact += label(numeric(lean?.value) ? `${decimal(lean.value)} kg` : `${decimal(100 - percent)}%`, 225, 485, 32, palette.ink, 700);
    compact += label('Massa livre', 225, 520, 22) + label('de gordura', 225, 547, 22);
    compact += label(measured ? 'Dobras cutâneas + Siri' : 'Método registrado na avaliação', 200, 602, 22, palette.muted, 400, 'text-anchor="middle"');
  } else {
    compact += label('Ainda não registrada', 200, 318, 29, palette.forest, 700, 'text-anchor="middle"');
    compact += label('IMC não mede percentual', 200, 368, 23, palette.muted, 400, 'text-anchor="middle"');
    compact += label('de gordura.', 200, 401, 23, palette.muted, 400, 'text-anchor="middle"');
  }
  result.compactSvg = figure('composition-compact', title, description, 400, available ? 620 : 422, compact).svg;
  result.note = clinical.compositionNote;
  return result;
}

function bmiFigure(clinical) {
  const bmi = clinical.bmi;
  if (!bmi) return null;
  let svg = label(`${decimal(bmi.value)} kg/m²`, 6, 48, 44, palette.forest, 700) + label(bmi.bands.length ? bmi.label : 'Interpretação individual', 830, 43, 27, palette.muted, 600, 'text-anchor="end"');
  if (!bmi.bands.length) {
    svg += rect(0, 78, 840, 110, palette.pale) + label('A interpretação depende do seu contexto.', 28, 127, 28, palette.forest, 700) + label('A faixa geral de adultos não foi aplicada.', 28, 165, 24, palette.muted);
    const result = figure('bmi', 'Seu IMC, com contexto', bmi.note, 840, 210, svg);
    result.compactSvg = figure('bmi-compact', result.title, result.description, 400, 222, label(`${decimal(bmi.value)} kg/m²`, 0, 48, 42, palette.forest, 700) + label('Interpretação individual', 0, 91, 27, palette.muted) + label('A interpretação depende', 0, 147, 24) + label('do seu contexto.', 0, 182, 24)).svg;
    return result;
  }
  const columns = 3, rows = Math.ceil(bmi.bands.length / columns), cellWidth = 268, cellHeight = 206;
  bmi.bands.forEach((band, index) => {
    const active = index === bmi.activeIndex;
    const x = index % columns * 286, y = 80 + Math.floor(index / columns) * 222;
    svg += rect(x, y, cellWidth, cellHeight, active ? palette.forest : palette.pale, 16, active ? palette.gold : '');
    const f = active ? '#fffdf7' : palette.forest;
    const widthScale = bmi.bands.length === 3 ? [.8, 1, 1.2][index] : [.78, .95, 1.1, 1.25, 1.38, 1.5][index];
    svg += human(active ? '#e7c98b' : '#809885', `translate(${x + 134 - 100 * .38 * widthScale} ${y + 13}) scale(${.38 * widthScale} .38)`);
    const lines = band.label.startsWith('Obesidade') ? ['Obesidade', band.label.replace('Obesidade ', '')] : [band.label];
    lines.forEach((line, lineIndex) => { svg += label(line, x + 134, y + 133 + lineIndex * 25, 23, f, active ? 700 : 500, 'text-anchor="middle"'); });
    svg += label(band.range, x + 134, y + 189, 20, active ? '#e7c98b' : palette.muted, 400, 'text-anchor="middle"');
    if (active) svg += `<circle cx="${x + 238}" cy="${y + 26}" r="13" fill="#e7c98b"/><path d="M${x + 232} ${y + 26}l4 4 8-9" fill="none" stroke="${palette.forest}" stroke-width="3"/>`;
  });
  const result = figure('bmi', 'Seu IMC, com contexto', `${bmi.note} Silhuetas esquemáticas representam faixas do indicador; não reproduzem a aparência da pessoa. Faixa registrada: ${bmi.label}.`, 840, 80 + rows * 222, svg);
  let compact = label(`${decimal(bmi.value)} kg/m²`, 0, 48, 42, palette.forest, 700) + label(bmi.label, 0, 91, 27, palette.muted, 600);
  bmi.bands.forEach((band, index) => {
    const active = index === bmi.activeIndex;
    const x = index % 2 * 208, y = 118 + Math.floor(index / 2) * 220;
    const f = active ? '#fffdf7' : palette.forest;
    const widthScale = bmi.bands.length === 3 ? [.8, 1, 1.2][index] : [.78, .95, 1.1, 1.25, 1.38, 1.5][index];
    compact += rect(x, y, 192, 204, active ? palette.forest : palette.pale, 14, active ? palette.gold : '');
    compact += human(active ? '#e7c98b' : '#809885', `translate(${x + 96 - 100 * .38 * widthScale} ${y + 8}) scale(${.38 * widthScale} .38)`);
    const lines = band.label.startsWith('Obesidade') ? ['Obesidade', band.label.replace('Obesidade ', '')] : [band.label];
    lines.forEach((line, lineIndex) => { compact += label(line, x + 96, y + 130 + lineIndex * 25, 22, f, active ? 700 : 500, 'text-anchor="middle"'); });
    compact += label(band.range, x + 96, y + 187, 20, active ? '#e7c98b' : palette.muted, 400, 'text-anchor="middle"');
    if (active) compact += `<circle cx="${x + 171}" cy="${y + 23}" r="12" fill="#e7c98b"/><path d="M${x + 165} ${y + 23}l4 4 8-9" fill="none" stroke="${palette.forest}" stroke-width="3"/>`;
  });
  result.compactSvg = figure('bmi-compact', result.title, result.description, 400, 118 + Math.ceil(bmi.bands.length / 2) * 220, compact).svg;
  return result;
}

function energyFigure(plan) {
  const records = plan.assessment?.calculations || [];
  const get = id => records.find(record => record.id === id)?.value;
  const rows = [
    ['Em repouso', get('resting'), palette.sage, 'Estimativa de gasto em repouso'],
    ['No seu dia', get('expenditure'), palette.gold, 'Estimativa com o fator de atividade'],
    ['Meta do plano', plan.targets?.energy, palette.forest, 'Definida pela nutricionista'],
  ].filter(([, value]) => numeric(value) && Number(value) > 0);
  if (!rows.length) return null;
  const max = Math.ceil(Math.max(...rows.map(([, value]) => Number(value))) / 500) * 500;
  let svg = '';
  rows.forEach(([name, value, color, note], index) => {
    const y = index * 120;
    svg += label(name, 0, y + 26, 26, palette.forest, 700) + label(`${decimal(value)} kcal/dia`, 840, y + 26, 26, color, 700, 'text-anchor="end"');
    svg += rect(0, y + 45, 840, 24, palette.pale, 9) + rect(0, y + 45, Number(value) / max * 840, 24, color, 9);
    svg += label(note, 0, y + 101, 21, palette.muted);
  });
  svg += label(`Comparação na mesma escala: 0 a ${decimal(max)} kcal/dia`, 0, rows.length * 120 + 20, 20, palette.muted);
  const result = figure('energy', 'Como a energia se organiza', rows.map(([name, value, , note]) => `${name}: ${decimal(value)} kcal/dia. ${note}.`).join(' ') + ' A meta não é um déficit calculado automaticamente.', 840, rows.length * 120 + 35, svg);
  let compact = '';
  rows.forEach(([name, value, color, note], index) => {
    const y = index * 158;
    compact += label(name, 0, y + 24, 24, palette.forest, 700) + label(`${decimal(value)} kcal/dia`, 0, y + 64, 32, color, 700);
    compact += rect(0, y + 82, 400, 22, palette.pale, 7) + rect(0, y + 82, Number(value) / max * 400, 22, color, 7);
    compact += label(note, 0, y + 137, 21, palette.muted);
  });
  compact += label(`Escala: 0 a ${decimal(max)} kcal/dia`, 0, rows.length * 158 + 21, 21, palette.muted);
  result.compactSvg = figure('energy-compact', result.title, result.description, 400, rows.length * 158 + 42, compact).svg;
  return result;
}

function hydrationFigure(plan) {
  const ml = Number(plan.targets?.water);
  if (!(ml > 0 && Number.isFinite(ml))) return null;
  const count = 8;
  let svg = label(`${decimal(ml / 1000)} L`, 0, 58, 55, palette.forest, 700) + label(`${decimal(ml)} ml ao longo do dia`, 0, 99, 26, palette.muted);
  for (let index = 0; index < count; index++) {
    const x = 310 + index * 65;
    svg += `<path d="M${x} 26 C${x - 10} 44 ${x - 22} 54 ${x - 22} 71 a22 22 0 0 0 44 0 C${x + 22} 54 ${x + 10} 44 ${x} 26Z" fill="${index % 2 ? '#7ea299' : palette.forest}"/>`;
  }
  svg += label('Meta individual. As gotas são ilustrativas; não são um registro de consumo.', 0, 155, 21, palette.muted);
  const result = figure('hydration', 'Seu cuidado com a hidratação', `Meta individual de ${decimal(ml)} ml por dia, definida no plano. Os ícones são ilustrativos, não representam consumo realizado.`, 840, 178, svg);
  let compact = label(`${decimal(ml / 1000)} L`, 200, 57, 55, palette.forest, 700, 'text-anchor="middle"') + label(`${decimal(ml)} ml ao longo do dia`, 200, 98, 26, palette.muted, 400, 'text-anchor="middle"');
  for (let index = 0; index < count; index++) {
    const x = 40 + index * 45;
    compact += `<path d="M${x} 123 C${x - 8} 136 ${x - 16} 143 ${x - 16} 155 a16 16 0 0 0 32 0 C${x + 16} 143 ${x + 8} 136 ${x} 123Z" fill="${index % 2 ? '#7ea299' : palette.forest}"/>`;
  }
  compact += label('Gotas ilustrativas, não representam', 200, 215, 21, palette.muted, 400, 'text-anchor="middle"') + label('consumo realizado.', 200, 245, 21, palette.muted, 400, 'text-anchor="middle"');
  result.compactSvg = figure('hydration-compact', result.title, result.description, 400, 264, compact).svg;
  return result;
}

// A shared, deterministic visual layer keeps both patient deliverables equal.
// These charts use recorded values only and contain no private intake fields.
export function patientVisuals(plan) {
  const clinical = assessmentHighlights(plan);
  return { composition: compositionFigure(plan, clinical), bmi: bmiFigure(clinical), energy: energyFigure(plan), hydration: hydrationFigure(plan) };
}
