import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import { formatIngredient, consolidateShoppingList } from '../../src/data/recipes-product.js';
import { buildOfflineHtml } from '../../scripts/lib/build-offline-recipes.mjs';
import { curatedImageBuffer } from '../nutrition/assets.js';
import { site } from '../../src/data/site.js';

async function photograph(image) {
  return curatedImageBuffer(image.src);
}
const attribution = image => {
  if (image.generated) return 'Imagem ilustrativa gerada com IA. A aparência final pode variar conforme o preparo.';
  const credit = image.credit;
  return [image.reference ? 'Ingrediente de referência; não representa o prato pronto.' : '', credit?.author, credit?.license, credit?.sourceUrl, credit?.licenseUrl].filter(Boolean).join(' · ');
};

export async function buildRecipeHtml(data) {
  const imageData = {};
  for (const recipe of data.recipes) {
    const buffer = await photograph(recipe.image);
    imageData[recipe.slug] = buffer ? `data:image/jpeg;base64,${buffer.toString('base64')}` : '';
  }
  const [editorial, editorialItalic, body, brandSvg] = await Promise.all([
    readFile(resolve('public/fonts/editorial.woff2')), readFile(resolve('public/fonts/editorial-italic.woff2')),
    readFile(resolve('public/fonts/body.woff2')), readFile(resolve('public/images/brand-mark.svg'), 'utf8'),
  ]);
  return buildOfflineHtml({ data, imageData, heroData: imageData[data.recipes[0]?.slug] || '', fonts: { editorial: editorial.toString('base64'), editorialItalic: editorialItalic.toString('base64'), body: body.toString('base64') }, brandSvg });
}

export async function buildRecipePdf(data) {
  const doc = new PDFDocument({ size: 'A4', margin: 46, bufferPages: true, info: { Title: data.title, Author: site.fullName, Subject: 'Receitas educativas, preparo e organização da cozinha' } });
  const chunks = [];
  const result = new Promise((resolvePromise, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolvePromise(Buffer.concat(chunks))); doc.on('error', reject); });
  const [body, editorial] = await Promise.all(['body', 'editorial'].map(font => readFile(resolve('server/nutrition/fonts', `${font}.ttf`))));
  doc.registerFont('Body', body); doc.registerFont('Editorial', editorial);
  const width = 503, left = 46;
  let continuedTitle = '';
  let compactRecipe = false;
  const ensure = height => {
    if (doc.y + height > 752) {
      doc.addPage(); doc.x = left; doc.y = 52;
      if (continuedTitle) { doc.font('Body').fontSize(8).fillColor('#806624').text(`${continuedTitle} · continuação`, left, 42, { width }); doc.y = 72; }
    }
  };
  const text = (value, size = 10, color = '#173f35', gap = 3) => {
    if (compactRecipe) { size = Math.min(size, 9.5); gap = Math.min(gap, 2); }
    const str = String(value || '');
    doc.font('Body').fontSize(size);
    ensure(Math.min(660, doc.heightOfString(str, { width, lineGap: gap }) + 8));
    doc.font('Body').fontSize(size).fillColor(color).text(str, left, doc.y, { width, lineGap: gap });
  };
  const heading = value => { ensure(compactRecipe ? 42 : 50); doc.moveDown(compactRecipe ? .2 : .4); doc.font('Editorial').fontSize(compactRecipe ? 20 : 22).fillColor('#173f35').text(value, left, doc.y, { width }); doc.moveDown(.25); };
  doc.rect(0, 0, 595.28, 330).fill('#173f35');
  doc.font('Body').fontSize(10).fillColor('#d9bf85').text('GISLAINE DUARTE · NUTRIÇÃO & CUIDADO', left, 50);
  let titleSize = 48;
  doc.font('Editorial').fontSize(titleSize);
  while (titleSize > 26 && doc.heightOfString(data.title, { width: 480 }) > 120) doc.fontSize(titleSize -= 2);
  doc.fillColor('#fffdf7').text(data.title, left, 95, { width: 480 });
  const subtitleY = doc.y + 18;
  doc.font('Body').fontSize(11).fillColor('#fffdf7').text(data.subtitle, left, subtitleY, { width: 450, lineGap: 3 });
  doc.y = 360;
  text(`${data.recipes.length} receitas${data.recipeCounts?.variations ? ` · ${data.recipeCounts.preparations} preparações + ${data.recipeCounts.variations} variação com ficha própria` : ''}`, 10);
  text(`Edição consultada em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, 9);
  heading('Cozinhar também é cuidar.');
  text(data.description, 11);
  doc.moveDown(); text(data.educationalNotice, 10);
  const firstPhoto = data.recipes[0] && await photograph(data.recipes[0].image);
  if (firstPhoto) { ensure(185); const y = doc.y + 14; doc.image(firstPhoto, left, y, { fit: [width, 145], align: 'left' }); doc.y = y + 154; text(attribution(data.recipes[0].image), 7, '#496b56', 1); }
  doc.addPage(); heading('Neste livro');
  for (const [index, recipe] of data.recipes.entries()) text(`${String(index + 1).padStart(2, '0')}  ${recipe.name}`, 11);
  for (const [index, recipe] of data.recipes.entries()) {
    doc.addPage();
    compactRecipe = recipe.ingredients.length >= 10 || recipe.preparation.length >= 8;
    continuedTitle = recipe.name;
    text(`RECEITA ${String(index + 1).padStart(2, '0')} · ${recipe.category.toLocaleUpperCase('pt-BR')}${recipe.variantOf ? ' · VARIAÇÃO' : ''}`, 9, '#806624');
    const photo = await photograph(recipe.image);
    const headerY = doc.y + 10;
    doc.font('Editorial').fontSize(28).fillColor('#173f35').text(recipe.name, left, headerY, { width: photo ? 315 : width });
    doc.moveDown(.4); doc.font('Body').fontSize(9).fillColor('#173f35').text(recipe.introduction, left, doc.y, { width: photo ? 315 : width, lineGap: 3 });
    const headerBottom = doc.y;
    if (photo) {
      doc.image(photo, left + width - 170, headerY, { fit: [170, 145], align: 'right' });
      doc.y = Math.max(headerBottom, headerY + 145) + 8;
      text(attribution(recipe.image), 7, '#496b56', 1);
    }
    doc.moveDown(.5); text([recipe.time.label, recipe.yield].filter(Boolean).join(' · '), 9, '#806624');
    if (recipe.equipment.length) text(`Equipamentos: ${recipe.equipment.join(' · ')}`, 9);
    heading('Ingredientes');
    for (const item of recipe.ingredients) text(`• ${formatIngredient(item)}`, 10);
    heading('Modo de preparo');
    for (const [step, instruction] of recipe.preparation.entries()) { text(`${step + 1}. ${instruction}`, 10); doc.moveDown(.3); }
    if (recipe.nutrition) { heading('Informações por porção'); text(`${recipe.nutrition.kcal} kcal · Proteínas ${recipe.nutrition.protein} g · Carboidratos ${recipe.nutrition.carbs} g · Gorduras ${recipe.nutrition.fat} g`, 10); text(`Fonte do cálculo: ${recipe.nutrition.source}`, 8); }
    if (recipe.notes.length) { heading('Na sua cozinha'); for (const note of recipe.notes) text(note, 9); }
    if (recipe.substitutions.length) { heading('Alternativas da receita'); for (const substitution of recipe.substitutions) text(substitution, 9); }
    if (recipe.allergens.length) { doc.moveDown(.5); text(`Alergênicos e cuidados: ${recipe.allergens.map(allergen => allergen.label).join('; ')}. Consulte as orientações ao final do livro.`, 9); }
    doc.moveDown(); text(recipe.editorialContext, 8, '#496b56');
  }
  compactRecipe = false;
  continuedTitle = 'Alergênicos e cuidados';
  const allergens = [...new Map(data.recipes.flatMap(recipe => recipe.allergens).map(allergen => [allergen.id, allergen])).values()];
  if (allergens.length) {
    doc.addPage(); heading('Alergênicos e cuidados');
    text('Os alertas indicados em cada receita se referem aos ingredientes e às substituições descritas. Confira também os rótulos e o contato com utensílios e superfícies.', 10);
    for (const allergen of allergens) { heading(allergen.label); text(allergen.detail, 10); }
  }
  continuedTitle = 'Lista de compras';
  doc.addPage(); heading('Lista de compras');
  text('Seleção completa para uma receita de cada preparo. Ingredientes com medidas livres aparecem como na fonte. Na versão digital, selecione apenas as receitas que deseja preparar.', 10);
  for (const item of consolidateShoppingList(data.recipes)) text(`• ${formatIngredient(item)}`, 9);
  continuedTitle = '';
  doc.addPage(); heading('Nutrição com escuta e cuidado');
  text(`${site.fullName} · ${site.profession} · ${site.registration}`, 12);
  text(data.educationalNotice, 10);
  doc.moveDown(); doc.font('Body').fontSize(11).fillColor('#173f35').text('Conheça o acompanhamento nutricional', left, doc.y, { width, link: `${site.url}/atendimentos` });
  doc.moveDown(); text('As imagens ilustrativas das preparações foram geradas com IA. O resultado real pode variar conforme ingredientes, utensílios e preparo. Complementos editoriais estão identificados nas receitas.', 9);
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index++) {
    doc.switchToPage(index); doc.font('Body').fontSize(7).fillColor('#496b56');
    doc.text(`Gislaine Duarte · ${data.title}`, 46, 782, { width: 430, lineBreak: false });
    doc.text(`${index + 1} / ${range.count}`, 498, 782, { width: 51, align: 'right', lineBreak: false });
  }
  doc.end(); return result;
}
