import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { foodById, foodSource } from '../../src/data/nutrition.js';
import { dayTotals, shoppingList, sumItems } from '../../src/lib/nutrition.js';
import { site } from '../../src/data/site.js';
import { formatFoodPortion } from '../../src/lib/nutrition-journey.js';
import { assessmentHighlights, assessmentSections, mealVisualData, plateGroupLabels, targetLabels } from './presentation.js';
import { curatedImageBuffer, curatedImageCredit } from './assets.js';
import { patientVisuals } from './patient-visuals.js';
import { createPdfLayout, pdfColors as color } from './pdf-layout.js';
import { plateReferenceForPlan } from './plate-reference.js';
import { patientSwapExamples } from './swap-comparisons.js';

export { buildPlanHtml } from './html.js';
const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const precise = value => typeof value === 'number' ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 15 }).format(value) : String(value ?? '');
const household = (foodId, grams) => formatFoodPortion(foodId, grams).split(' · Medida caseira: ')[1]?.replace('≈', 'Aprox.').replace(/ \(1 [^)]+\)$/, '') || '';
const imageCache = new Map();
async function imageBuffer(foodId) {
  if (!foodById[foodId]) throw new Error('Alimento desconhecido.');
  if (!imageCache.has(foodId)) imageCache.set(foodId, readFile(resolve('public', `.${foodById[foodId].image}`)));
  return imageCache.get(foodId);
}

export async function buildPlanPdf({ plan, patientName, revision, approvedAt, draft = false }) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 42, left: 42, right: 42, bottom: 82 }, bufferPages: true,
    info: { Title: `${plan.title} · ${patientName}`, Author: site.fullName, Subject: 'Plano alimentar e avaliação individual' } });
  const chunks = [];
  const finished = new Promise((resolvePromise, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolvePromise(Buffer.concat(chunks))); doc.on('error', reject); });
  const fonts = await Promise.all(['body-medium', 'body-semibold', 'editorial'].map(font => readFile(resolve('server/nutrition/fonts', `${font}.ttf`))));
  ['Body', 'Strong', 'Editorial'].forEach((name, index) => doc.registerFont(name, fonts[index]));
  const layout = createPdfLayout(doc);
  const { left, width, at, measure } = layout;
  const embeddedImages = new Map();
  const pdfImage = async foodId => {
    if (!embeddedImages.has(foodId)) embeddedImages.set(foodId, doc.openImage(await imageBuffer(foodId)));
    return embeddedImages.get(foodId);
  };
  const allIds = [...new Set(plan.days.flatMap(day => day.meals.flatMap(meal => meal.items.flatMap(item => [item.foodId, ...(item.alternatives || []).map(option => option.foodId)]))))];
  const mainIds = new Set(plan.days.flatMap(day => day.meals.flatMap(meal => meal.items.map(item => item.foodId))));
  const modules = (plan.curatedModules || []).filter(module => module.reviewed === true);
  const sections = assessmentSections(plan);
  const clinical = assessmentHighlights(plan);
  const visuals = patientVisuals(plan);
  const moduleCredits = [];

  // The contents page is filled after final pagination. Its links and the PDF
  // outline make the full record easy to navigate without shrinking the type.
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(color.ivory);
  doc.rect(0, 0, doc.page.width, 330).fill(color.forest);
  at('GISLAINE DUARTE', left, 45, { size: 12, font: 'Strong', color: '#e7c98b' });
  at('NUTRIÇÃO & CUIDADO', left, 65, { size: 10.5, color: '#e7c98b' });
  const titleEnd = at(plan.title, left, 113, { size: 43, font: 'Editorial', color: '#fffdf7', lineGap: 1 });
  at(`Preparado para ${patientName}`, left, Math.max(247, titleEnd + 20), { size: 16, color: '#fffdf7', lineGap: 3 });
  const coverIds = [...mainIds].slice(0, 3);
  const photoWidth = (width - 20) / 3;
  for (const [index, foodId] of coverIds.entries()) layout.image(await pdfImage(foodId), left + index * (photoWidth + 10), 360, photoWidth, 144, 14);
  layout.y = 536;
  layout.heading('Seu plano. Seu ritmo.', { size: 28 });
  layout.paragraph('Um guia para consultar, escolher e colocar em prática. As quantidades e as trocas foram organizadas para acompanhar a sua rotina.', { size: 13 });
  layout.paragraph(`${site.fullName} · ${site.registration}\nVersão ${revision}${approvedAt ? ` · ${new Date(approvedAt).toLocaleDateString('pt-BR')}` : ''}`, { size: 11.5, color: color.muted });
  if (draft) layout.paragraph('PRÉVIA EM REVISÃO PROFISSIONAL\nEste exemplo ainda não é uma prescrição liberada.', { size: 12, font: 'Strong', color: '#8b5527' });
  layout.page('Encontre o que precisa', { eyebrow: 'Seu guia de cuidado', anchor: 'contents' });
  const contentsPage = doc.bufferedPageRange().count - 1;

  layout.page('O cuidado começa com você', { eyebrow: '01 · Suas prioridades', toc: true, anchor: 'priorities' });
  layout.heading('O que orientou seu plano');
  for (const line of sections.find(section => section.title === 'O que orientou seu plano')?.lines || ['A avaliação individual acompanha este plano.']) layout.paragraph(line);
  layout.heading('Para o seu dia a dia');
  layout.paragraph(plan.guidance);
  layout.heading('Como usar este guia', { size: 21 });
  for (const value of ['1. Encontre o dia e a refeição no sumário.', '2. Leia a quantidade em gramas e a medida caseira aproximada.', '3. Use o código de troca do alimento para consultar suas alternativas aprovadas.', '4. Use a lista de compras e leve suas dúvidas ao acompanhamento.']) layout.paragraph(value, { gap: 10 });
  layout.paragraph('As fotografias ajudam a reconhecer os alimentos; as porções estão nos números. Os valores de composição são estimativas. No HTML complementar, você pode escolher trocas, marcar refeições e guardar seu progresso offline.', { size: 11.5, color: color.muted });

  const visualBlock = async figure => {
    if (!figure) return;
    const imageHeight = width * figure.height / figure.width;
    layout.ensure(imageHeight + 95);
    layout.heading(figure.title, { size: 24, keep: imageHeight + 30 });
    const pixels = await sharp(Buffer.from(figure.svg), { density: 160 }).png().toBuffer();
    doc.image(pixels, left, layout.y, { width, height: imageHeight }); layout.y += imageHeight + 15;
    // Values remain selectable text as well as pixels in the shared chart.
    layout.paragraph(figure.description, { size: 12, color: color.muted });
  };
  layout.page('Seu corpo, com contexto', { eyebrow: '02 · Sua avaliação', toc: true, anchor: 'assessment' });
  await visualBlock(visuals.composition);
  const recordedMeasures = plan.assessment?.calculationInput || {};
  const measureCards = [['weight', 'Peso', 'kg'], ['height', 'Altura', 'cm'], ['waist', 'Cintura', 'cm'], ['hip', 'Quadril', 'cm']]
    .filter(([key]) => recordedMeasures[key] !== '' && recordedMeasures[key] != null && Number.isFinite(Number(recordedMeasures[key])))
    .map(([key, label, unit]) => `${label}\n${decimal(Number(recordedMeasures[key]))} ${unit}`);
  if (measureCards.length) { layout.heading('Medidas registradas', { size: 20 }); layout.chips(measureCards, { size: 12 }); }
  if (visuals.bmi) {
    layout.page('Entendendo o seu IMC', { eyebrow: '02 · Sua avaliação' });
    await visualBlock(visuals.bmi);
    if (clinical.bmi) layout.paragraph(`Resultado registrado: ${decimal(clinical.bmi.value)} kg/m² · ${clinical.bmi.label}.`, { font: 'Strong' });
  }
  if (visuals.energy || visuals.hydration) {
    layout.page('Energia e hidratação', { eyebrow: '02 · Sua avaliação', toc: true, anchor: 'energy' });
    await visualBlock(visuals.energy);
    await visualBlock(visuals.hydration);
  }
  const targetUnits = { energy: 'kcal/dia', protein: 'g/dia', carbs: 'g/dia', fat: 'g/dia', water: 'ml/dia', sodium: 'mg/dia', potassium: 'mg/dia', phosphorus: 'mg/dia' };
  const targets = Object.entries(plan.targets || {}).filter(([key, value]) => targetUnits[key] && typeof value === 'number' && Number.isFinite(value));
  if (targets.length) {
    layout.heading('Suas metas combinadas', { size: 24 });
    for (let start = 0; start < targets.length; start += 2) layout.chips(targets.slice(start, start + 2).map(([key, value]) => `${targetLabels[key] || key}\n${decimal(value)} ${targetUnits[key]}`), { size: 12.5, fill: color.sand });
  }
  if (clinical.bristol) {
    layout.heading('Seu relato intestinal', { size: 24 });
    layout.chips([`Bristol tipo ${clinical.bristol.type}`, clinical.bristol.label], { size: 12 });
    layout.paragraph(clinical.bristol.description);
    layout.paragraph('A escala descreve o aspecto das fezes. Frequência, desconforto e mudanças também fazem parte da conversa; o tipo informado isoladamente não define diagnóstico.', { size: 11.5, color: color.muted });
    layout.paragraph('Referência: Bristol Stool Chart · NHS England', { size: 11.5, link: clinical.bristolSource.url, underline: true });
  }

  const swapExamples = patientSwapExamples(plan, 4);
  if (swapExamples.length) {
    layout.page('Substituições inteligentes', { eyebrow: '03 · Escolhas para o seu dia', toc: true, anchor: 'smart-swaps' });
    layout.paragraph('Exemplos das trocas registradas. Substituem a opção principal; não são acréscimos. Valem apenas para a refeição indicada.', { size: 12, gap: 16 });
    const pairGap = 22, pairWidth = (width - pairGap) / 2;
    const headers = () => {
      at('OPÇÃO PRINCIPAL', left + 10, layout.y, { size: 10.5, font: 'Strong', color: color.gold, area: pairWidth - 20, lineGap: 1 });
      at('UMA TROCA APROVADA', left + pairWidth + pairGap + 10, layout.y, { size: 10.5, font: 'Strong', color: color.gold, area: pairWidth - 20, lineGap: 1 });
      layout.y += 24;
    };
    headers();
    for (const example of swapExamples) {
      const options = [example.from, example.to].map(item => {
        const name = foodById[item.foodId].name;
        const detailHeight = measure(name, 12, pairWidth - 80, 'Strong', 1) + measure(`${decimal(item.grams)} g`, 16, pairWidth - 80, 'Strong', 0) + 5;
        const portion = household(item.foodId, item.grams);
        return { ...item, name, portion, mainHeight: Math.max(52, detailHeight), portionHeight: measure(portion, 11.5, pairWidth - 20, 'Body', 1) };
      });
      const cardHeight = Math.max(...options.map(option => option.mainHeight + option.portionHeight + 25));
      const origin = `${example.dayLabel} · ${example.mealName} · Ver refeição`;
      const originHeight = measure(origin, 11.5, width - 20, 'Body', 1);
      if (layout.ensure(cardHeight + originHeight + 27)) headers();
      const top = layout.y;
      for (const [index, option] of options.entries()) {
        const x = left + index * (pairWidth + pairGap);
        doc.roundedRect(x, top, pairWidth, cardHeight, 10).fill(index ? color.sage : color.white);
        layout.image(await pdfImage(option.foodId), x + 10, top + 10, 52, 52, 7);
        const nameEnd = at(option.name, x + 70, top + 10, { size: 12, font: 'Strong', area: pairWidth - 80, lineGap: 1 });
        at(`${decimal(option.grams)} g`, x + 70, nameEnd + 5, { size: 16, font: 'Strong', area: pairWidth - 80, lineGap: 0 });
        at(option.portion, x + 10, top + option.mainHeight + 17, { size: 11.5, area: pairWidth - 20, lineGap: 1 });
      }
      const arrowX = left + pairWidth + pairGap / 2, arrowY = top + cardHeight / 2;
      doc.moveTo(arrowX - 6, arrowY).lineTo(arrowX + 6, arrowY).lineWidth(1.5).strokeColor(color.gold).stroke();
      doc.moveTo(arrowX + 2, arrowY - 4).lineTo(arrowX + 6, arrowY).lineTo(arrowX + 2, arrowY + 4).stroke();
      at(origin, left + 10, top + cardHeight + 5, { size: 11.5, area: width - 20, color: color.muted, lineGap: 1, underline: true });
      doc.goTo(left, top + cardHeight + 2, width, originHeight + 9, `meal-${example.dayIndex}-${example.mealIndex}`);
      layout.y = top + cardHeight + originHeight + 21;
    }
  }

  layout.page('Sua semana em um olhar', { eyebrow: '03 · Organização das refeições', toc: true, anchor: 'week' });
  layout.paragraph('Os totais abaixo consideram as opções principais. As trocas aprovadas podem alterar a composição da refeição.');
  layout.paragraph('P: proteínas · C: carboidratos · G: gorduras · Fibras. Todos em gramas.', { size: 12, gap: 10 });
  for (const day of plan.days) {
    const total = dayTotals(day);
    const summary = `P ${decimal(total.protein)} g · C ${decimal(total.carbs)} g · G ${decimal(total.fat)} g · Fibras ${decimal(total.fiber)} g`;
    const labelHeight = measure(day.label, 13, width - 160, 'Strong', 1);
    const rowHeight = labelHeight + measure(summary, 12, width - 28, 'Body', 0) + 11;
    layout.ensure(rowHeight + 5);
    const y = layout.y;
    doc.roundedRect(left, y, width, rowHeight, 9).fill(color.white);
    at(day.label, left + 14, y + 4, { size: 13, font: 'Strong', area: width - 160, lineGap: 1 });
    at(`${decimal(total.kcal)} kcal`, left + width - 142, y + 4, { size: 13, font: 'Strong', area: 128, align: 'right', lineGap: 1 });
    at(summary, left + 14, y + labelHeight + 7, { size: 12, area: width - 28, lineGap: 0 });
    layout.y += rowHeight + 5;
  }
  if (plan.days.length) {
    const averages = plan.days.reduce((sum, day) => { const totals = dayTotals(day); for (const key of ['kcal', 'protein', 'carbs', 'fat', 'fiber']) sum[key] = (sum[key] || 0) + totals[key] / plan.days.length; return sum; }, {});
    layout.heading('Média diária da semana', { size: 21 });
    layout.chips([`${decimal(averages.kcal)} kcal`, `P ${decimal(averages.protein)} g`, `C ${decimal(averages.carbs)} g`, `G ${decimal(averages.fat)} g`, `Fibras ${decimal(averages.fiber)} g`], { size: 11.5 });
  }
  if (plan.plateGuide) {
    layout.page('Como montar seu prato', { eyebrow: '03 · Organização das refeições', toc: true, anchor: 'plate' });
    const reference = await plateReferenceForPlan(plan);
    if (reference?.photo) {
      const { photo } = reference;
      const photoTop = layout.y, photoWidth = width * .53, photoHeight = 350;
      doc.image(photo.buffer, left, photoTop, { fit: [photoWidth, photoHeight], align: 'center', valign: 'center' });
      const groups = reference.groups || [];
      if (groups.length) {
        const groupX = left + photoWidth + 20, groupWidth = width - photoWidth - 20;
        let groupY = at('Reconheça os grupos\nna fotografia', groupX, photoTop + 10, { size: 18, font: 'Strong', area: groupWidth, lineGap: 2 }) + 18;
        for (const [index, group] of groups.entries()) {
          const examples = Array.isArray(group.examples) ? group.examples.join(', ') : group.examples;
          const groupHeight = measure(group.label, 13, groupWidth - 26, 'Strong', 1) + measure(examples, 12, groupWidth - 26, 'Body', 1) + 37;
          doc.roundedRect(groupX, groupY, groupWidth, groupHeight, 9).fill(index === 2 ? color.sage : color.white);
          const end = at(group.label, groupX + 13, groupY + 14, { size: 13, font: 'Strong', area: groupWidth - 26, lineGap: 1 });
          at(examples, groupX + 13, end + 9, { size: 12, area: groupWidth - 26, lineGap: 1 });
          groupY += groupHeight + 12;
        }
        layout.y = Math.max(photoTop + photoHeight, groupY) + 18;
      } else {
        layout.y = photoTop + photoHeight + 18;
      }
      if (reference.note) layout.paragraph(reference.note, { size: 11.5, color: color.muted, gap: 11 });
      moduleCredits.push({ title: 'Fotografia do prato de referência', author: photo.author, sourceUrl: photo.sourceUrl, license: photo.license, licenseUrl: photo.licenseUrl, caption: 'Fotografia preservada inteira, redimensionada para este guia.' });
    }
    layout.heading('A orientação combinada para você', { size: 21 });
    layout.chips(Object.entries(plateGroupLabels).map(([key, label]) => `${decimal(plan.plateGuide[key])}%\n${label}`), { size: 12, fill: color.sand });
    layout.paragraph('Esses percentuais orientam grupos de alimentos. Não representam percentuais de macronutrientes nem substituem os pesos prescritos.', { size: 11.5, color: color.muted });
  }

  const swaps = new Map();
  for (const [dayIndex, day] of plan.days.entries()) for (const [mealIndex, meal] of day.meals.entries()) for (const item of meal.items) {
    if (!item.alternatives?.length) continue;
    const key = JSON.stringify([item.foodId, item.grams, item.alternatives]);
    if (!swaps.has(key)) swaps.set(key, { code: `T${String(swaps.size + 1).padStart(2, '0')}`, item, occurrences: [] });
    const swap = swaps.get(key); swap.occurrences.push({ label: `${day.label} · ${meal.name}`, destination: `meal-${dayIndex}-${mealIndex}` });
  }
  const swapFor = item => swaps.get(JSON.stringify([item.foodId, item.grams, item.alternatives]));
  const cardWidth = (width - 12) / 2;
  const foodCardMetrics = item => {
    const food = foodById[item.foodId], values = sumItems([item]);
    const textWidth = cardWidth - 104;
    const foodHeight = measure(food.name, 12, textWidth, 'Strong', 1);
    const portionHeight = measure(household(item.foodId, item.grams), 11.5, cardWidth - 24, 'Body', 1);
    const nutrients = `${decimal(values.kcal)} kcal · P ${decimal(values.protein)} · C ${decimal(values.carbs)} · G ${decimal(values.fat)}`;
    const nutrientsHeight = measure(nutrients, 12, cardWidth - 24, 'Body', 1);
    const swap = swapFor(item);
    const mainHeight = Math.max(80, foodHeight + measure(`${decimal(item.grams)} g`, 20, textWidth, 'Strong', 0) + 6);
    const height = mainHeight + portionHeight + nutrientsHeight + 28 + (swap ? 20 : 0);
    return { food, textWidth, nutrients, height, swap, mainHeight };
  };
  const foodRow = async (items, continuation) => {
    const metrics = items.map(foodCardMetrics), height = Math.max(...metrics.map(item => item.height));
    if (layout.ensure(height + 12)) continuation();
    const y = layout.y;
    for (const [index, item] of items.entries()) {
      const { food, textWidth, nutrients, swap, mainHeight } = metrics[index];
      const x = left + index * (cardWidth + 12);
      doc.roundedRect(x, y, cardWidth, height, 11).fill(color.white);
      layout.image(await pdfImage(item.foodId), x + 12, y + 10, 80, 80, 9);
      let ty = at(food.name, x + 100, y + 10, { size: 12, font: 'Strong', area: textWidth, lineGap: 1 });
      at(`${decimal(item.grams)} g`, x + 100, ty + 6, { size: 20, font: 'Strong', area: textWidth, lineGap: 0 });
      ty = at(household(item.foodId, item.grams), x + 12, y + mainHeight + 17, { size: 11.5, area: cardWidth - 24, lineGap: 1 }) + 4;
      ty = at(nutrients, x + 12, ty, { size: 12, area: cardWidth - 24, color: color.muted, lineGap: 1 });
      if (swap) { at(`Ver trocas ${swap.code}`, x + 12, ty + 5, { size: 11.5, font: 'Strong', area: cardWidth - 24, color: color.gold, lineGap: 1 }); doc.goTo(x + 8, ty + 3, cardWidth - 16, 22, `swap-${swap.code}`); }
    }
    layout.y = y + height + 12;
  };

  for (const [dayIndex, day] of plan.days.entries()) {
    layout.page(day.label, { eyebrow: '04 · Suas refeições', toc: true, anchor: `day-${dayIndex}` });
    const total = dayTotals(day);
    layout.chips([`${decimal(total.kcal)} kcal`, `P ${decimal(total.protein)} g`, `C ${decimal(total.carbs)} g`, `G ${decimal(total.fat)} g`, `Fibras ${decimal(total.fiber)} g`], { size: 11.5 });
    for (const [mealIndex, meal] of day.meals.entries()) {
      const values = sumItems(meal.items);
      const mealHeading = (continued = false) => layout.heading(`${meal.time} · ${meal.name}${continued ? ' · continuação' : ''}`, { size: continued ? 18 : 22, keep: 10 });
      const rows = []; for (let start = 0; start < meal.items.length; start += 2) rows.push(meal.items.slice(start, start + 2));
      const cardsHeight = rows.reduce((sum, row) => sum + Math.max(...row.map(item => foodCardMetrics(item).height)) + 12, 0);
      const noteHeight = meal.note ? measure(meal.note, 12, width, 'Body', 3) + 22 : 0;
      const headingHeight = measure(`${meal.time} · ${meal.name}`, 22, width, 'Strong', 1) + 12;
      const mealHeight = cardsHeight + noteHeight + headingHeight + 68;
      let mealInTitle = false;
      if (mealIndex && layout.y + Math.min(mealHeight, 610) > layout.bottom) { layout.page(`${day.label} · ${meal.name}`, { eyebrow: `04 · Suas refeições · ${meal.time}` }); mealInTitle = true; }
      else layout.ensure(headingHeight + 70 + Math.max(...rows[0].map(item => foodCardMetrics(item).height)));
      doc.addNamedDestination(`meal-${dayIndex}-${mealIndex}`, 'XYZ', left, mealInTitle ? 40 : layout.y - 8, null);
      if (!mealInTitle) mealHeading();
      layout.chips([`${decimal(values.kcal)} kcal`, `P ${decimal(values.protein)} g`, `C ${decimal(values.carbs)} g`, `G ${decimal(values.fat)} g`], { size: 11.5, height: 32 });
      for (const row of rows) await foodRow(row, () => mealHeading(true));
      const guide = mealVisualData(meal.items, plan.plateGuide).plateGuide;
      if (guide) layout.paragraph(Object.entries(plateGroupLabels).map(([key, label]) => `${decimal(guide[key])}% ${label}`).join(' · '), { size: 11.5, color: color.gold, gap: 8 });
      if (meal.note) layout.paragraph(meal.note, { size: 12, gap: 9, lineGap: 3 });
      layout.y += 9;
    }
  }

  if (modules.length) {
    layout.page('Conteúdos para você', { eyebrow: '05 · Escolhas revisadas em consulta', toc: true, anchor: 'contents-for-you' });
    layout.paragraph('Receitas, alimentos e orientações selecionados pela nutricionista para este plano.');
    for (const [index, module] of modules.entries()) {
      if (index) layout.page(module.title, { eyebrow: '05 · Escolhas revisadas em consulta' });
      else layout.heading(module.title, { size: 27, keep: 190 });
      const photo = await curatedImageBuffer(module.image);
      if (photo) {
        const photoWidth = Math.min(width, 360), photoHeight = 270;
        layout.ensure(photoHeight + 20);
        doc.image(photo, left + (width - photoWidth) / 2, layout.y, { fit: [photoWidth, photoHeight], align: 'center', valign: 'center' });
        layout.y += photoHeight + 20;
      }
      for (const paragraph of module.content.split(/\n\s*\n/)) layout.paragraph(paragraph, { size: 12.5, gap: 16 });
      if (module.foodIds.length) layout.paragraph(`Alimentos deste conteúdo: ${module.foodIds.map(id => foodById[id].name).join(', ')}.`, { size: 11.5, color: color.muted });
      const credit = await curatedImageCredit(module.image); if (credit) moduleCredits.push({ title: module.title, ...credit });
    }
  }

  layout.page('Sua lista de compras', { eyebrow: '06 · Preparar a semana', toc: true, anchor: 'shopping' });
  layout.paragraph('Quantidades dos alimentos na forma descrita, cozida ou crua, sem correção de rendimento. A lista considera as opções principais. Ajuste as compras se escolher substituições.');
  let group = '';
  for (const item of shoppingList(plan)) {
    if (item.food.group !== group) { group = item.food.group; layout.heading(group, { size: 20, keep: 50 }); }
    const rowHeight = Math.max(38, measure(item.food.name, 12, width - 135, 'Body', 3) + 16);
    layout.ensure(rowHeight); const y = layout.y;
    doc.roundedRect(left, y + 4, 13, 13, 3).lineWidth(.8).strokeColor(color.line).stroke();
    at(item.food.name, left + 26, y + 2, { size: 12, area: width - 135 });
    at(`${decimal(item.grams)} g`, left + width - 102, y + 2, { size: 13, font: 'Strong', area: 102, align: 'right' });
    doc.moveTo(left + 26, y + rowHeight - 9).lineTo(left + width, y + rowHeight - 9).lineWidth(.5).strokeColor(color.line).stroke();
    layout.y += rowHeight;
  }

  if (swaps.size) {
    layout.page('Suas trocas aprovadas', { eyebrow: '07 · Escolhas para variar', toc: true, anchor: 'swaps' });
    layout.paragraph('Encontre o código indicado no cartão do alimento e escolha uma das alternativas abaixo. Use a quantidade da alternativa escolhida. Os totais podem mudar com a troca.');
    for (const { code, item, occurrences } of swaps.values()) {
      const title = `${code} · ${foodById[item.foodId].name} · ${decimal(item.grams)} g`;
      const headerHeight = measure(title, 13, width - 28, 'Strong', 2);
      const cellWidth = (width - 28 - (item.alternatives.length - 1) * 14) / item.alternatives.length;
      const optionHeight = Math.max(...item.alternatives.map(option => measure(foodById[option.foodId].name, 12, cellWidth, 'Strong', 2) + measure(`${decimal(option.grams)} g · ${household(option.foodId, option.grams)}`, 12, cellWidth, 'Body', 2) + 6));
      const returns = occurrences.map(occurrence => ({ ...occurrence, text: `Voltar: ${occurrence.label}`, height: measure(`Voltar: ${occurrence.label}`, 11.5, width - 28, 'Body', 1) + 4 }));
      const returnsHeight = returns.reduce((sum, occurrence) => sum + occurrence.height, 0);
      const height = headerHeight + optionHeight + 46 + returnsHeight;
      layout.ensure(height + 13); const top = layout.y;
      doc.addNamedDestination(`swap-${code}`, 'XYZ', left, top - 8, null);
      doc.roundedRect(left, top, width, height, 10).fill(color.sand);
      at(title, left + 14, top + 12, { size: 13, font: 'Strong', area: width - 28, lineGap: 2 });
      item.alternatives.forEach((option, index) => {
        const x = left + 14 + index * (cellWidth + 14);
        const end = at(foodById[option.foodId].name, x, top + headerHeight + 25, { size: 12, font: 'Strong', area: cellWidth, lineGap: 2 });
        at(`${decimal(option.grams)} g · ${household(option.foodId, option.grams)}`, x, end + 6, { size: 12, area: cellWidth, lineGap: 2 });
      });
      let returnY = top + headerHeight + optionHeight + 34;
      for (const occurrence of returns) {
        at(occurrence.text, left + 14, returnY, { size: 11.5, area: width - 28, color: color.muted, lineGap: 1, underline: true });
        doc.goTo(left + 12, returnY - 1, width - 24, occurrence.height, occurrence.destination);
        returnY += occurrence.height;
      }
      layout.y += height + 13;
    }
  }

  const extraIds = allIds.filter(foodId => !mainIds.has(foodId));
  if (extraIds.length) {
    layout.page('Conheça suas opções de troca', { eyebrow: '07 · Fotografias de referência', toc: true, anchor: 'food-gallery' });
    layout.paragraph('Estas opções aparecem nas trocas aprovadas. Consulte as quantidades pelo código indicado no cartão da refeição.');
    const cardWidth = (width - 24) / 3;
    for (let start = 0; start < extraIds.length; start += 3) {
      const row = extraIds.slice(start, start + 3);
      const h = 115 + Math.max(...row.map(foodId => measure(foodById[foodId].name, 12, cardWidth - 20, 'Strong', 2))) + 18;
      layout.ensure(h + 12); const y = layout.y;
      for (const [index, foodId] of row.entries()) {
        const x = left + index * (cardWidth + 12);
        doc.roundedRect(x, y, cardWidth, h, 10).fill(color.white);
        layout.image(await pdfImage(foodId), x, y, cardWidth, 105, 10);
        at(foodById[foodId].name, x + 10, y + 117, { size: 12, font: 'Strong', area: cardWidth - 20, lineGap: 2 });
      }
      layout.y += h + 13;
    }
  }

  layout.page('Os detalhes da sua avaliação', { eyebrow: '08 · Apêndice clínico', toc: true, anchor: 'clinical-details' });
  layout.paragraph('Aqui você encontra os dados registrados, a origem das metas e a memória de cada cálculo. Os resultados são estimativas para interpretar no acompanhamento.');
  for (const section of sections.filter(item => !['O que orientou seu plano', 'Cálculos registrados'].includes(item.title))) {
    layout.heading(section.title, { size: 23 });
    for (const line of section.lines) layout.paragraph(line, { size: 12, gap: 11 });
  }
  layout.heading('Memória de cálculo', { size: 25 });
  const calculations = plan.assessment?.calculations || [];
  if (!calculations.length) layout.paragraph('Nenhum cálculo selecionado nesta avaliação. As metas foram definidas pela nutricionista e justificadas nos critérios.');
  const calculationSources = new Map();
  for (const calculation of calculations) {
    const inputs = (calculation.inputs || []).map(input => `${input.label} ${precise(input.value)}${input.unit ? ` ${input.unit}` : ''}`);
    const source = calculation.source?.title || calculation.source || 'Dados registrados na avaliação';
    if (calculation.source?.url) calculationSources.set(calculation.source.url, source);
    const fields = [['Método', calculation.method], ['Fórmula', calculation.formula], ['Dados', inputs.join('; ')], ['Fonte', source]];
    const texts = fields.map(([label, value]) => `${label} · ${value}`);
    const headerHeight = measure(calculation.label, 15, width - 28, 'Strong', 1);
    const valueHeight = measure(`${precise(calculation.value)} ${calculation.unit}`, 19, width - 28, 'Strong', 1);
    const fieldsHeight = texts.reduce((height, value) => height + measure(value, 12, width - 28, 'Body', 2) + 7, 0);
    const height = fieldsHeight + headerHeight + valueHeight + 39;
    layout.ensure(Math.min(height + 12, 600));
    if (height < 610 && layout.y + height <= layout.bottom) {
      const top = layout.y; doc.roundedRect(left, top, width, height, 12).fill(color.white);
      let y = at(calculation.label, left + 14, top + 12, { size: 15, font: 'Strong', area: width - 28, lineGap: 1 });
      y = at(`${precise(calculation.value)} ${calculation.unit}`, left + 14, y + 5, { size: 19, font: 'Strong', area: width - 28, color: color.gold, lineGap: 1 }) + 12;
      for (const [index, value] of texts.entries()) y = at(value, left + 14, y, { size: 12, area: width - 28, lineGap: 2, ...(index === 3 && calculation.source?.url ? { link: calculation.source.url, underline: true } : {}) }) + 7;
      layout.y = Math.max(top + height, y) + 12;
    } else {
      layout.heading(calculation.label, { size: 20 });
      layout.paragraph(`${precise(calculation.value)} ${calculation.unit}`, { size: 19, font: 'Strong', color: color.gold });
      for (const value of texts) layout.paragraph(value, { size: 12, gap: 8 });
    }
  }
  if (calculationSources.size) {
    layout.heading('Fontes dos cálculos', { size: 21 });
    for (const [url, title] of calculationSources) { layout.paragraph(title, { size: 12, font: 'Strong', gap: 4 }); layout.paragraph(url, { size: 11.5, gap: 14, link: url, underline: true }); }
  }

  if (clinical.metrics.some(item => ['resting', 'expenditure'].includes(item.id))) { layout.heading('Como interpretar o gasto energético', { size: 19 }); layout.paragraph(clinical.energyNote); }
  layout.heading('Como interpretar a composição corporal', { size: 19 }); layout.paragraph(clinical.compositionNote);
  if (clinical.bmi?.source) layout.paragraph(clinical.bmi.source.title, { link: clinical.bmi.source.url, underline: true, size: 11.5 });

  layout.page('Fontes e fotografias', { eyebrow: '09 · Referências deste material', toc: true, anchor: 'sources' });
  layout.heading('Composição dos alimentos', { size: 23 });
  layout.paragraph(`${foodSource.title}. Valores estimados por 100 g de parte comestível. Preparos, marcas e sal acrescentado alteram os resultados. P: proteínas; C: carboidratos; G: gorduras. As medidas caseiras são aproximações e as substituições podem alterar os totais.`, { size: 12 });
  layout.paragraph('As fotos ilustram os alimentos; não representam suas porções e podem mostrar outro preparo. As imagens foram recortadas e redimensionadas. Os links abaixo abrem as fontes e as licenças.', { size: 12 });
  const photoCredits = allIds.filter(foodId => foodById[foodId].photo).map(foodId => ({ title: foodById[foodId].name, ...foodById[foodId].photo })).concat(moduleCredits);
  const creditWidth = (width - 20) / 2;
  for (let start = 0; start < photoCredits.length; start += 2) {
    const row = photoCredits.slice(start, start + 2).map(credit => ({ ...credit, name: `${credit.title} · ${credit.author === 'Иван' ? 'Ivan (nome original na fonte)' : credit.author}` }));
    const height = Math.max(...row.map(credit => measure(credit.name, 12, creditWidth, 'Strong', 2) + measure(credit.license, 11.5, creditWidth, 'Body', 2) + (credit.caption ? measure(credit.caption, 11.5, creditWidth, 'Body', 2) + 4 : 0) + 17));
    layout.ensure(height + 9); const top = layout.y;
    for (const [index, credit] of row.entries()) {
      const x = left + index * (creditWidth + 20);
      let y = at(credit.name, x, top, { size: 12, font: 'Strong', area: creditWidth, lineGap: 2, ...(credit.sourceUrl ? { link: credit.sourceUrl, underline: true } : {}) }) + 4;
      y = at(credit.license, x, y, { size: 11.5, area: creditWidth, lineGap: 2, ...(credit.licenseUrl ? { link: credit.licenseUrl, underline: true } : {}) }) + 4;
      if (credit.caption) at(credit.caption, x, y, { size: 11.5, color: color.muted, area: creditWidth, lineGap: 2 });
    }
    layout.y += height + 9;
  }

  layout.heading('Seu material, seu cuidado', { size: 23 });
  layout.paragraph('Este arquivo é pessoal e confidencial. O HTML complementar funciona offline e suas marcações ficam no dispositivo. Compartilhe no acompanhamento apenas o que desejar.');

  const range = doc.bufferedPageRange();
  doc.switchToPage(contentsPage);
  let contentsY = 134;
  at('Toque em um capítulo para ir direto à página.', left, contentsY, { size: 12, color: color.muted }); contentsY += 40;
  for (const entry of layout.entries) {
    const h = Math.max(29, measure(entry.label, 12, width - 55, 'Body', 2) + 10);
    at(entry.label, left, contentsY, { size: 12, area: width - 55, lineGap: 2 });
    at(entry.page, left + width - 40, contentsY, { size: 12, font: 'Strong', area: 40, align: 'right' });
    doc.goTo(left, contentsY - 3, width, h, entry.destination);
    doc.moveTo(left, contentsY + h - 6).lineTo(left + width, contentsY + h - 6).lineWidth(.5).strokeColor(color.line).stroke();
    contentsY += h;
  }
  for (let page = 0; page < range.count; page++) {
    doc.switchToPage(page);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.moveTo(left, 785).lineTo(left + width, 785).lineWidth(.6).strokeColor(color.line).stroke();
    at('Gislaine Duarte · Nutricionista', left, 795, { size: 9.5, area: 235, color: color.muted, lineGap: 0, lineBreak: false });
    if (page !== contentsPage) { at('Sumário', 310, 795, { size: 9.5, area: 65, color: color.muted, lineGap: 0, lineBreak: false }); doc.goTo(305, 790, 75, 22, 'contents'); }
    at(`${page + 1} / ${range.count}`, left + width - 70, 795, { size: 9.5, area: 70, align: 'right', color: color.muted, lineGap: 0, lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }
  doc.end(); return finished;
}
