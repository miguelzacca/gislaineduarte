import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { foodById, foodSource } from '../../src/data/nutrition.js';
import { dayTotals, shoppingList, sumItems } from '../../src/lib/nutrition.js';
import { site } from '../../src/data/site.js';
import { formatFoodPortion } from '../../src/lib/nutrition-journey.js';
import { assessmentHighlights, assessmentSections, plateGroupLabels, targetLabels } from './presentation.js';
import { curatedImageBuffer, curatedImageCredit } from './assets.js';
import { patientVisuals } from './patient-visuals.js';
import { createPdfLayout, pdfColors as color } from './pdf-layout.js';
import { plateReferenceForPlan } from './plate-reference.js';
import { patientSwapExamples } from './swap-comparisons.js';
import { foodPhotoNote } from './photo-labels.js';

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
  let coverTitleSize = 43;
  while (coverTitleSize > 30 && measure(plan.title, coverTitleSize, width, 'Editorial', 1) > 180) coverTitleSize -= 1;
  const titleHeight = measure(plan.title, coverTitleSize, width, 'Editorial', 1);
  const patientLabel = `Preparado para ${patientName}`;
  const patientTop = Math.max(247, 113 + titleHeight + 20);
  const coverBottom = Math.max(330, patientTop + measure(patientLabel, 16, width, 'Body', 3) + 24);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(color.ivory);
  doc.rect(0, 0, doc.page.width, coverBottom).fill(color.forest);
  at('GISLAINE DUARTE', left, 45, { size: 12, font: 'Strong', color: '#e7c98b' });
  at('NUTRIÇÃO & CUIDADO', left, 65, { size: 10.5, color: '#e7c98b' });
  at(plan.title, left, 113, { size: coverTitleSize, font: 'Editorial', color: '#fffdf7', lineGap: 1 });
  at(patientLabel, left, patientTop, { size: 16, color: '#fffdf7', lineGap: 3 });
  const coverIds = [...mainIds].slice(0, 3);
  const photoWidth = (width - 20) / 3;
  const coverPhotoTop = coverBottom + 26;
  const coverPhotoHeight = Math.min(144, Math.max(80, 507 - coverPhotoTop));
  for (const [index, foodId] of coverIds.entries()) layout.image(await pdfImage(foodId), left + index * (photoWidth + 10), coverPhotoTop, photoWidth, coverPhotoHeight, 14);
  layout.y = coverPhotoTop + coverPhotoHeight + 27;
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

  const swapExamples = patientSwapExamples(plan, 3);
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
        const photoNote = foodPhotoNote(foodById[item.foodId]);
        return { ...item, name, portion, photoNote, mainHeight: Math.max(52, detailHeight), portionHeight: measure(portion, 11.5, pairWidth - 20, 'Body', 1) + (photoNote ? measure(photoNote, 10.5, pairWidth - 20, 'Body', 1) + 5 : 0) };
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
        const portionEnd = at(option.portion, x + 10, top + option.mainHeight + 17, { size: 11.5, area: pairWidth - 20, lineGap: 1 });
        if (option.photoNote) at(option.photoNote, x + 10, portionEnd + 5, { size: 10.5, area: pairWidth - 20, color: color.muted, lineGap: 1 });
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
  // One readable row per food lets breakfast/snacks share a page. Previously
  // the two-column cards forced almost every meal onto its own mostly empty page.
  const foodCardMetrics = item => {
    const food = foodById[item.foodId], values = sumItems([item]);
    const textWidth = width - 112;
    const foodHeight = Math.max(measure(food.name, 12.5, textWidth - 156, 'Strong', 1), measure(`${decimal(item.grams)} g`, 15, 78, 'Strong', 0));
    const portionWidth = (textWidth - 12) / 2;
    const portionHeight = measure(household(item.foodId, item.grams), 11.5, portionWidth, 'Body', 1);
    const nutrients = `${decimal(values.kcal)} kcal · P ${decimal(values.protein)} g · C ${decimal(values.carbs)} g · G ${decimal(values.fat)} g`;
    const nutrientsHeight = measure(nutrients, 10.5, portionWidth, 'Body', 1);
    const swap = swapFor(item);
    const note = foodPhotoNote(food, { compact: true });
    const noteHeight = note ? measure(note, 10.5, textWidth, 'Body', 1) + 3 : 0;
    const detailsHeight = Math.max(portionHeight, nutrientsHeight);
    const height = Math.max(52, foodHeight + detailsHeight + noteHeight + 2) + 10;
    return { food, textWidth, portionWidth, foodHeight, detailsHeight, nutrients, height, swap, note };
  };
  const foodRow = async (item, continuation, keep = 0) => {
    const { food, textWidth, portionWidth, foodHeight, detailsHeight, nutrients, height, swap, note } = foodCardMetrics(item);
    if (layout.ensure(height + 6 + keep)) continuation();
    const y = layout.y;
    doc.roundedRect(left, y, width, height, 11).fill(color.white);
    layout.image(await pdfImage(item.foodId), left + 10, y + 5, 72, 52, 9);
    const tx = left + 98;
    at(food.name, tx, y + 5, { size: 12.5, font: 'Strong', area: textWidth - 156, lineGap: 1 });
    at(`${decimal(item.grams)} g`, left + width - 90, y + 5, { size: 15, font: 'Strong', area: 78, align: 'right', lineGap: 0 });
    const ty = y + 5 + foodHeight + 2;
    at(household(item.foodId, item.grams), tx, ty, { size: 11.5, area: portionWidth, lineGap: 1 });
    at(nutrients, tx + portionWidth + 12, ty, { size: 10.5, area: portionWidth, color: color.muted, lineGap: 1 });
    if (note) at(note, tx, ty + detailsHeight + 3, { size: 10.5, area: textWidth, color: color.muted, lineGap: 1 });
    if (swap) { at(`Trocas ${swap.code}`, left + width - 160, y + 8, { size: 10.5, font: 'Strong', area: 64, align: 'right', color: color.gold, lineGap: 1 }); doc.goTo(left + width - 164, y + 4, 68, 22, `swap-${swap.code}`); }
    layout.y = y + height + 6;
  };

  for (const [dayIndex, day] of plan.days.entries()) {
    layout.page(day.label, { eyebrow: '04 · Suas refeições', toc: true, anchor: `day-${dayIndex}` });
    const total = dayTotals(day);
    layout.chips([`${decimal(total.kcal)} kcal`, `P ${decimal(total.protein)} g`, `C ${decimal(total.carbs)} g`, `G ${decimal(total.fat)} g`, `Fibras ${decimal(total.fiber)} g`], { size: 11.5 });
    for (const [mealIndex, meal] of day.meals.entries()) {
      const values = sumItems(meal.items);
      const mealHeading = (continued = false) => layout.heading(`${meal.time} · ${meal.name}${continued ? ' · continuação' : ''}`, { size: continued ? 18 : 20, gap: 8, keep: 10 });
      const headingHeight = measure(`${meal.time} · ${meal.name}`, 20, width, 'Strong', 1) + 8;
      // Keep the heading with the same opening rows that the row renderer keeps
      // together, including a short meal note. This avoids an orphan meal title.
      const tailHeight = meal.note ? Math.min(180, measure(meal.note, 12, width, 'Body', 3) + 9) : 0;
      const firstItemsHeight = meal.items.slice(0, meal.items.length <= 2 ? 2 : 1).reduce((sum, item) => sum + foodCardMetrics(item).height + 6, 0) + (meal.items.length <= 2 ? tailHeight : 0);
      const mealHeight = headingHeight + 27 + meal.items.reduce((sum, item) => sum + foodCardMetrics(item).height + 6, 0) + tailHeight;
      const freshPageStart = 56 + measure(day.label, 32, width, 'Editorial', 1) + 13;
      // A meal that fits on a fresh page stays together. Only unusually long
      // meals continue, with their heading repeated by foodRow.
      const keepMeal = mealHeight <= layout.bottom - freshPageStart && layout.y + mealHeight > layout.bottom;
      if (mealIndex && (keepMeal || layout.y + headingHeight + 27 + firstItemsHeight > layout.bottom)) { layout.page(day.label, { eyebrow: '04 · Suas refeições' }); }
      else layout.ensure(headingHeight + 27 + firstItemsHeight, day.label);
      doc.addNamedDestination(`meal-${dayIndex}-${mealIndex}`, 'XYZ', left, layout.y - 8, null);
      mealHeading();
      layout.paragraph(`${decimal(values.kcal)} kcal · P ${decimal(values.protein)} g · C ${decimal(values.carbs)} g · G ${decimal(values.fat)} g`, { size: 11.5, color: color.muted, lineGap: 1, gap: 6 });
      for (const [index, item] of meal.items.entries()) {
        const remaining = meal.items.length - index - 1;
        const keep = remaining === 0 ? tailHeight : remaining === 1 ? foodCardMetrics(meal.items[index + 1]).height + 6 + tailHeight : 0;
        await foodRow(item, () => mealHeading(true), keep);
      }
      if (meal.note) layout.paragraph(meal.note, { size: 12, gap: 9, lineGap: 3 });
      layout.y += 5;
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
    layout.paragraph('Encontre o código indicado na refeição. Escolha apenas uma alternativa, na quantidade da mesma linha. A troca substitui a opção principal. Os nutrientes podem variar.');
    // Reuse each photographed comparison, preserving distinct portions and links.
    const families = new Map();
    for (const swap of swaps.values()) {
      const key = JSON.stringify([swap.item.foodId, swap.item.alternatives.map(option => option.foodId)]);
      if (!families.has(key)) families.set(key, []);
      families.get(key).push(swap);
    }
    for (const variants of families.values()) {
      const first = variants[0].item;
      const ids = [first.foodId, ...first.alternatives.map(option => option.foodId)];
      const gap = 12, cellWidth = (width - (ids.length - 1) * gap) / ids.length;
      const area = cellWidth - 14, photoSize = Math.min(72, area);
      const nameHeight = Math.max(...ids.map(id => measure(foodById[id].name, 12, area, 'Strong', 1)));
      const notes = ids.map(id => foodPhotoNote(foodById[id], { compact: true }));
      const noteHeight = Math.max(0, ...notes.map(note => note ? measure(note, 10.5, area, 'Body', 1) + 5 : 0));
      const headerHeight = photoSize + nameHeight + noteHeight + 39;
      const optionData = option => {
        const totals = sumItems([option]);
        const portion = household(option.foodId, option.grams);
        const nutrients = `${decimal(totals.kcal)} kcal · P ${decimal(totals.protein)} g · C ${decimal(totals.carbs)} g · G ${decimal(totals.fat)} g`;
        return { ...option, portion, nutrients,
          height: measure(`${decimal(option.grams)} g`, 13, area, 'Strong', 1) + measure(portion, 11.5, area, 'Body', 1) + measure(nutrients, 10.5, area, 'Body', 1) + 17 };
      };
      const rowData = variant => {
        const options = [variant.item, ...variant.item.alternatives].map(optionData);
        const links = variant.occurrences.map(occurrence => ({ ...occurrence,
          text: `${variant.code} · ${occurrence.label}`,
          height: measure(`${variant.code} · ${occurrence.label}`, 11.5, width - 16, 'Strong', 1) + 4 }));
        return { options, links, height: Math.max(...options.map(option => option.height)) + links.reduce((sum, link) => sum + link.height, 0) + 21 };
      };
      const header = async (continued = false) => {
        const top = layout.y;
        for (const [index, id] of ids.entries()) {
          const x = left + index * (cellWidth + gap) + 7;
          at(index ? `ALTERNATIVA ${index}` : 'OPÇÃO DO PLANO', x, top, { size: 9.5, font: 'Strong', area, color: color.gold, lineGap: 1 });
          if (!continued) layout.image(await pdfImage(id), x, top + 20, photoSize, photoSize, 8);
          const y = at(foodById[id].name, x, top + (continued ? 23 : 28 + photoSize), { size: 12, font: 'Strong', area, lineGap: 1 });
          if (!continued && notes[index]) at(notes[index], x, y + 5, { size: 10.5, area, color: color.muted, lineGap: 1 });
        }
        layout.y = top + (continued ? nameHeight + 32 : headerHeight);
      };
      const firstRow = rowData(variants[0]);
      layout.ensure(headerHeight + Math.min(firstRow.height, 280) + 6);
      await header();
      for (const variant of variants) {
        const row = rowData(variant);
        const amountsHeight = Math.max(...row.options.map(option => option.height)) + 8;
        // Keep the first context link with the portions; additional occurrences
        // can continue without allowing a long list to overflow the page.
        if (layout.ensure(amountsHeight + row.links[0].height + 14)) await header(true);
        const top = layout.y;
        doc.addNamedDestination(`swap-${variant.code}`, 'XYZ', left, top - 8, null);
        doc.roundedRect(left, top, width, amountsHeight, 8).fill(color.sand);
        row.options.forEach((option, index) => {
          const x = left + index * (cellWidth + gap) + 7;
          let y = at(`${decimal(option.grams)} g`, x, top + 8, { size: 13, font: 'Strong', area, lineGap: 1 });
          y = at(option.portion, x, y + 4, { size: 11.5, area, lineGap: 1 });
          at(option.nutrients, x, y + 5, { size: 10.5, area, color: color.muted, lineGap: 1 });
        });
        layout.y = top + amountsHeight + 4;
        for (const link of row.links) {
          layout.ensure(link.height + 4);
          at(link.text, left + 7, layout.y, { size: 11.5, font: 'Strong', area: width - 16, color: color.muted, lineGap: 1, underline: true });
          doc.goTo(left, layout.y - 1, width, link.height, link.destination);
          layout.y += link.height;
        }
        layout.y += 9;
      }
      layout.y += 16;
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
