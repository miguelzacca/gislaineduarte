import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import { foodById, foodSource } from '../../src/data/nutrition.js';
import { dayTotals, shoppingList, sumItems } from '../../src/lib/nutrition.js';
import { site } from '../../src/data/site.js';

export { buildPlanHtml } from './html.js';
const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const imageCache = new Map();
async function imageBuffer(foodId) {
  if (!foodById[foodId]) throw new Error('Alimento desconhecido.');
  if (!imageCache.has(foodId)) imageCache.set(foodId, readFile(resolve('public', `.${foodById[foodId].image}`)));
  return imageCache.get(foodId);
}
export async function buildPlanPdf({ plan, patientName, revision, approvedAt, draft = false }) {
  const doc = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true, info: { Title: `${plan.title} · ${patientName}`, Author: site.fullName } });
  const chunks = []; const finished = new Promise((resolvePromise, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolvePromise(Buffer.concat(chunks))); doc.on('error', reject); });
  const [body, serif] = await Promise.all(['body', 'editorial'].map(font => readFile(resolve('server/nutrition/fonts', `${font}.ttf`))));
  doc.registerFont('Body', body); doc.registerFont('Editorial', serif);
  const embeddedImages = new Map();
  const pdfImage = async foodId => {
    if (!embeddedImages.has(foodId)) embeddedImages.set(foodId, doc.openImage(await imageBuffer(foodId)));
    return embeddedImages.get(foodId);
  };
  const width = doc.page.width - 88;
  const text = (value, size = 10, options = {}) => doc.font('Body').fontSize(size).fillColor('#173f35').text(String(value), options);
  const title = (value, size = 32) => doc.font('Editorial').fontSize(size).fillColor('#173f35').text(value);
  const ensure = height => { if (doc.y + height > 762) { doc.addPage(); doc.y = 44; } };
  const section = name => { ensure(70); doc.moveDown(0.7); title(name, 28); doc.moveDown(0.3); };
  const coverTitleHeight = doc.font('Editorial').fontSize(40).heightOfString(plan.title, { width });
  const coverNameHeight = doc.font('Body').fontSize(12).heightOfString(`Preparado para ${patientName}`, { width });
  const coverHeight = Math.max(240, 91 + coverTitleHeight + coverNameHeight + 70);
  doc.rect(0, 0, doc.page.width, coverHeight).fill('#173f35');
  doc.fillColor('#d9bf85').font('Body').fontSize(10).text('GISLAINE DUARTE · NUTRIÇÃO & CUIDADO', 44, 43);
  doc.fillColor('#fffdf7').font('Editorial').fontSize(40).text(plan.title, 44, 91, { width });
  doc.fillColor('#f5f1e8').font('Body').fontSize(12).text(`Preparado para ${patientName}`, 44, 108 + coverTitleHeight, { width });
  doc.fillColor('#d9bf85').fontSize(9).text(`${site.registration} · Versão ${revision}${approvedAt ? ` · ${new Date(approvedAt).toLocaleDateString('pt-BR')}` : ''}`, 44, coverHeight - 26);
  doc.y = coverHeight + 30;
  if (draft) { text('PRÉVIA - RASCUNHO EM REVISÃO. Não utilizar como prescrição.', 11); doc.moveDown(); }
  title('Um cuidado que acompanha você.', 30); doc.moveDown(0.5);
  text(plan.guidance, 11, { width, lineGap: 4 });
  if (plan.targets.water) { doc.moveDown(); text(`Meta hídrica individual: ${decimal(plan.targets.water)} ml/dia.`, 11); }
  doc.moveDown(1.5); text('Nas próximas páginas: suas refeições, porções, opções de troca e uma lista de compras da semana. O arquivo HTML complementar permite acompanhar o dia a dia, mesmo sem internet.', 10, { lineGap: 3 });
  const coverFoods = [...new Set(plan.days[0].meals.flatMap(meal => meal.items.map(item => item.foodId)))].slice(0, 3);
  if (coverFoods.length === 3 && doc.y < 580) {
    const imageY = Math.max(530, doc.y + 30); const imageWidth = (width - 24) / 3;
    for (let i = 0; i < coverFoods.length; i++) doc.image(await pdfImage(coverFoods[i]), 44 + i * (imageWidth + 12), imageY, { width: imageWidth });
    doc.x = 44; doc.y = imageY + imageWidth * .75 + 12;
    text('Alimentos simples. Escolhas possíveis. Cuidado todos os dias.', 9);
  }
  for (const day of plan.days) {
    doc.addPage(); title(day.label, 34); doc.moveDown(0.3);
    const startingPage = doc.bufferedPageRange().count;
    const total = dayTotals(day);
    text(`${decimal(total.kcal)} kcal · Proteínas ${decimal(total.protein)} g · Carboidratos ${decimal(total.carbs)} g · Gorduras ${decimal(total.fat)} g`, 9); doc.moveDown(0.5);
    for (let mealIndex = 0; mealIndex < day.meals.length; mealIndex++) {
      const meal = day.meals[mealIndex];
      // A deliberate daily spread keeps dinner from becoming a nearly empty page.
      if (day.meals.length >= 5 && mealIndex === Math.ceil(day.meals.length / 2) && doc.bufferedPageRange().count === startingPage) {
        doc.addPage(); doc.x = 44; title(`${day.label} · continuação`, 30); doc.moveDown(.4);
      }
      const columnWidth = (width - 16) / 2; const textWidth = columnWidth - 69;
      const cells = meal.items.map(item => {
        const food = foodById[item.foodId]; const values = sumItems([item]);
        const lines = [food.name, `${decimal(item.grams)} g · aprox. ${decimal(item.grams / food.portionGrams)} × ${food.portionLabel}`,
          `${decimal(values.kcal)} kcal · P ${decimal(values.protein)} · C ${decimal(values.carbs)} · G ${decimal(values.fat)} g`];
        if (item.alternatives.length) lines.push(`Troca: ${item.alternatives.map(alt => `${foodById[alt.foodId].name} (${decimal(alt.grams)} g)`).join(' ou ')}`);
        const heights = lines.map((line, i) => doc.font('Body').fontSize(i === 0 ? 10 : 8.3).heightOfString(line, { width: textWidth, lineGap: 1 }));
        return { item, lines, heights, height: Math.max(51, heights.reduce((a,b) => a+b, 0) + 8) };
      });
      const rowHeights = cells.filter((_,i)=>i%2===0).map((cell,i)=>Math.max(cell.height,cells[i*2+1]?.height || 0));
      const noteHeight = meal.note ? doc.font('Body').fontSize(8).heightOfString(meal.note, { width: width - 16, lineGap: 2 }) + 12 : 0;
      const headingHeight = Math.max(24, doc.font('Editorial').fontSize(18).heightOfString(`${meal.time}  ${meal.name}`, { width: width - 20 }) + 8);
      const mealHeight = headingHeight + 5 + rowHeights.reduce((a,b)=>a+b,0) + noteHeight + 5;
      if (mealHeight <= 668 && doc.y + mealHeight > 768) { doc.addPage(); doc.x=44; title(`${day.label} · continuação`, 28); doc.moveDown(.4); }
      const drawMealHeading = () => {
        const top = doc.y;
        doc.rect(44, top, width, headingHeight).fill('#e8eddf');
        doc.fillColor('#173f35').font('Editorial').fontSize(18).text(`${meal.time}  ${meal.name}`, 52, top+4, {width:width-20});
        return top + headingHeight + 5;
      };
      let y=drawMealHeading();
      for (let i=0;i<cells.length;i+=2) {
        if (y + rowHeights[i/2] > 768) {
          doc.addPage(); doc.x=44; title(`${day.label} · continuação`, 28); doc.moveDown(.4); y=drawMealHeading();
        }
        for (let col=0;col<2;col++) {
          const cell=cells[i+col]; if(!cell)continue;
          const x=44+col*(columnWidth+16);
          doc.image(await pdfImage(cell.item.foodId),x,y+2,{fit:[60,45]});
          let lineY=y+1;
          cell.lines.forEach((line,index)=>{
            doc.font('Body').fontSize(index===0?10:8.3).fillColor(index===0?'#173f35':'#496b56').text(line,x+68,lineY,{width:textWidth,lineGap:1});
            lineY+=cell.heights[index]+1;
          });
        }
        y+=rowHeights[i/2];
      }
      doc.x=44;doc.y=y;
      if(meal.note){ensure(noteHeight);y=doc.y;doc.font('Body').fontSize(8).fillColor('#496b56').text(meal.note,52,y+3,{width:width-16,lineGap:2});doc.y=y+noteHeight;}
      doc.x=44;doc.y+=5;
    }
    const journalTop = doc.y + 20;
    const journalHeight = Math.min(180, 752 - journalTop);
    if (journalHeight >= 100) {
      doc.roundedRect(44, journalTop, width, journalHeight, 10).fill('#f2f4eb');
      doc.font('Editorial').fontSize(23).fillColor('#173f35').text('Como foi o seu dia?', 58, journalTop + 14, { width: width - 28 });
      doc.font('Body').fontSize(9).fillColor('#496b56').text('O que funcionou bem? O que você quer ajustar ou conversar no acompanhamento?', 58, journalTop + 45, { width: width - 28, lineGap: 2 });
      for (let lineY = journalTop + 88; lineY < journalTop + journalHeight - 12; lineY += 25) doc.moveTo(58, lineY).lineTo(doc.page.width - 58, lineY).lineWidth(.5).strokeColor('#c9d4bd').stroke();
      doc.x = 44; doc.y = journalTop + journalHeight;
    }
  }
  doc.addPage(); title('Sua lista de compras', 36); doc.moveDown();
  text('Quantidades na forma descrita (cozida ou crua), sem correção de rendimento. A lista considera as opções principais. Ajuste as compras se escolher substituições.', 10, { lineGap: 3 });
  let group = '';
  for (const item of shoppingList(plan)) {
    if (item.food.group !== group) {
      group = item.food.group;
      const groupItems = shoppingList(plan).filter(entry => entry.food.group === group);
      const groupHeight = groupItems.reduce((height, entry) => height + doc.font('Body').fontSize(10).heightOfString(`${entry.food.name} · ${decimal(entry.grams)} g`, { width }) + 5, 60);
      ensure(Math.min(groupHeight, 400)); section(group);
    }
    ensure(30); text(`${item.food.name}  ·  ${decimal(item.grams)} g`, 10); doc.moveDown(0.3);
  }
  section('Sobre este material');
  text(`${foodSource.title}. Valores estimados por 100 g de parte comestível. Preparos, marcas e sal acrescentado alteram os resultados. P: proteínas; C: carboidratos; G: gorduras. Medidas caseiras aproximadas. Fotografias ilustram o alimento; não representam a porção prescrita e podem mostrar outro preparo. As substituições podem alterar os totais.`, 9, { lineGap: 3 });
  doc.moveDown(); text('Material pessoal e confidencial. As marcações feitas no HTML ficam somente no seu dispositivo e podem ser compartilhadas com Gislaine durante o acompanhamento.', 9, { lineGap: 3 });
  const mainIds = new Set(plan.days.flatMap(day => day.meals.flatMap(meal => meal.items.map(item => item.foodId))));
  const allIds = [...new Set(plan.days.flatMap(day => day.meals.flatMap(meal => meal.items.flatMap(item => [item.foodId, ...item.alternatives.map(option => option.foodId)]))))];
  const extraIds = allIds.filter(foodId => !mainIds.has(foodId));
  if (extraIds.length) {
    doc.addPage(); title('Suas possibilidades de troca', 34); doc.moveDown(.5);
    text('Conheça os alimentos que aparecem nas opções de substituição. As quantidades de cada troca estão escritas na respectiva refeição. A fotografia ajuda a reconhecer o alimento, sem indicar uma porção.', 10, { lineGap: 3 }); doc.moveDown(1.3);
    const cardWidth = (width - 24) / 3; const imageHeight = cardWidth * .75;
    for (let start = 0; start < extraIds.length; start += 3) {
      const row = extraIds.slice(start, start + 3);
      const nameHeights = row.map(foodId => doc.font('Body').fontSize(9).heightOfString(foodById[foodId].name, { width: cardWidth - 16, lineGap: 2 }));
      const rowHeight = imageHeight + Math.max(...nameHeights) + 24;
      if (doc.y + rowHeight > 762) { doc.addPage(); doc.x = 44; title('Possibilidades de troca · continuação', 28); doc.moveDown(.6); }
      const top = doc.y;
      for (let index = 0; index < row.length; index++) {
        const foodId = row[index]; const left = 44 + index * (cardWidth + 12);
        doc.roundedRect(left, top, cardWidth, rowHeight, 8).fill('#edf1e5');
        doc.save().roundedRect(left, top, cardWidth, imageHeight, 8).clip();
        doc.image(await pdfImage(foodId), left, top, { width: cardWidth, height: imageHeight }); doc.restore();
        doc.font('Body').fontSize(9).fillColor('#173f35').text(foodById[foodId].name, left + 8, top + imageHeight + 10, { width: cardWidth - 16, lineGap: 2 });
      }
      doc.x = 44; doc.y = top + rowHeight + 14;
    }
  }
  const photoIds = allIds.filter(foodId => foodById[foodId].photo);
  if (photoIds.length) {
    doc.addPage(); title('Créditos das fotografias', 34); doc.moveDown(.5);
    text('Fotografias reais para reconhecer os alimentos. Os preparos e as porções podem ser diferentes dos indicados no plano. Imagens recortadas e redimensionadas para este material. Os créditos e as licenças seguem abaixo.', 9, { lineGap: 3 }); doc.moveDown(1);
    for (const foodId of photoIds) {
      const food = foodById[foodId]; const photo = food.photo;
      const credit = `${food.name} · ${photo.author} · ${photo.license}`;
      const source = String(photo.sourceUrl || ''); const license = String(photo.licenseUrl || '');
      const caption = String(photo.caption || '');
      const creditHeight = doc.font('Body').fontSize(9).heightOfString(credit, { width, lineGap: 2 });
      const sourceHeight = doc.fontSize(7).heightOfString(source, { width, lineGap: 1 });
      const captionHeight = caption ? doc.fontSize(8).heightOfString(caption, { width, lineGap: 1 }) : 0;
      ensure(creditHeight + sourceHeight + captionHeight + 32);
      text(credit, 9, { width, lineGap: 2 });
      if (caption) text(caption, 8, { width, lineGap: 1 });
      if (/^https?:\/\//.test(source)) text(source, 7, { width, link: source, underline: true, lineGap: 1 });
      if (/^https?:\/\//.test(license)) text(license, 7, { width, link: license, underline: true, lineGap: 1 });
      doc.moveDown(1);
    }
  }
  const range = doc.bufferedPageRange();
  for (let page = 0; page < range.count; page++) {
    doc.switchToPage(page); doc.save(); doc.font('Body').fontSize(8).fillColor('#496b56');
    doc.text(`${site.fullName} · ${site.registration}`, 44, 794, { lineBreak: false });
    doc.text(`${page + 1} / ${range.count}`, 503, 794, { lineBreak: false }); doc.restore();
  }
  doc.end(); return finished;
}
