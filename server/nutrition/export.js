import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { foodById, foodSource } from '../../src/data/nutrition.js';
import { dayTotals, shoppingList, sumItems } from '../../src/lib/nutrition.js';
import { site } from '../../src/data/site.js';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const decimal = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const htmlText = value => escapeHtml(value).replace(/\n/g, '<br>');
const imageCache = new Map();
async function imageBuffer(foodId) {
  if (!foodById[foodId]) throw new Error('Alimento desconhecido.');
  if (!imageCache.has(foodId)) imageCache.set(foodId, readFile(resolve('public', `.${foodById[foodId].image}`)));
  return imageCache.get(foodId);
}
const exportStyles = `
@font-face{font-family:Editorial;src:url(FONT_SERIF) format('woff2')}@font-face{font-family:Body;src:url(FONT_BODY) format('woff2')}
:root{--forest:#173f35;--ivory:#f5f1e8;--gold:#806624;--line:#d9dfd0}*{box-sizing:border-box}body{margin:0;background:var(--ivory);color:var(--forest);font:14px/1.65 Body,Arial,sans-serif}button,input,textarea{font:inherit}button{cursor:pointer;min-height:44px;border:1px solid var(--line);border-radius:24px;background:transparent;color:var(--forest);padding:10px 20px}button:hover{background:#e3e9dc}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible,textarea:focus-visible{outline:3px solid #b69a58;outline-offset:4px}a{color:inherit}header{background:var(--forest);color:var(--ivory);padding:50px max(6vw,20px)}header .brand{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d9bf85}h1,h2,h3{font-family:Editorial,Georgia,serif;font-weight:500;line-height:1.05}h1{font-size:clamp(46px,7vw,85px);margin:28px 0 16px;max-width:950px}h2{font-size:38px;margin:0 0 14px}h3{font-size:28px;margin:0}p{margin:8px 0}header p{max-width:630px}.header-line{display:flex;gap:20px;justify-content:space-between;align-items:center;flex-wrap:wrap}header button{color:var(--ivory);border-color:#ffffff50}header button:hover{background:#ffffff18}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:var(--gold)}.draft{background:#ffebbb;color:#674621;padding:14px;text-align:center}.wrap{max-width:1150px;margin:0 auto;padding:32px 22px}.intro{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}.panel{border:1px solid var(--line);background:#fffdf7;border-radius:20px;padding:26px}.stats{display:flex;gap:24px;flex-wrap:wrap}.stats strong{display:block;font-size:26px;font-family:Editorial,Georgia,serif}.stats span{font-size:11px}.tabs{display:flex;gap:7px;overflow:auto;margin:22px 0;padding:5px 1px 12px}.tabs [aria-pressed=true]{background:var(--forest);color:var(--ivory)}.day{margin:0 0 30px}.day[hidden]{display:none}.day-heading{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:14px 0 22px}.meal{background:#fffdf7;border:1px solid var(--line);border-radius:20px;padding:24px;margin:15px 0;animation:appear .35s ease both}.meal-top{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px}.time{font-size:12px;letter-spacing:.05em;color:var(--gold)}.foods{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px}.food{min-width:0}.food-image{width:100%;height:120px;object-fit:cover;border-radius:12px}.food strong{display:block;font-size:13px;margin-top:8px}.food small{display:block;color:#496b56;font-size:11px}.food details{font-size:12px;margin-top:9px}.food summary{cursor:pointer}.food li{margin:6px 0}.swap-image{width:48px;height:36px;vertical-align:middle;border-radius:6px;margin-right:7px}.complete{display:flex;align-items:center;gap:8px;font-size:12px;white-space:nowrap}.complete input,.shopping input{width:20px;height:20px;accent-color:var(--forest)}.complete:has(input:checked){color:#658056}.note{border-top:1px solid var(--line);margin-top:20px;padding-top:15px}.progress{height:7px;background:#dce3d5;border-radius:10px;overflow:hidden;margin:10px 0}.progress span{display:block;background:#648b60;height:100%;transition:width .3s}.shopping{columns:2;column-gap:30px;padding:0;list-style:none}.shopping li{break-inside:avoid;padding:12px 0;border-bottom:1px solid var(--line)}.shopping label{display:flex;align-items:center;gap:10px}.shopping small{display:block;color:#496b56}.shopping label:has(input:checked) span{text-decoration:line-through;opacity:.6}textarea{width:100%;min-height:130px;border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--ivory);color:var(--forest);resize:vertical}.privacy-note,.fine{font-size:11px;color:#496b56}footer{border-top:1px solid var(--line);padding:30px 22px;max-width:1150px;margin:auto;font-size:11px}details.panel{margin-bottom:20px}details.panel>summary{cursor:pointer;font-size:20px}label[for=checkdate]{font-size:12px}#checkdate{border:1px solid var(--line);border-radius:8px;padding:9px;color:var(--forest);background:var(--ivory);max-width:100%}.tools{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.no-script{padding:20px;background:#ffebbb}.water{margin-top:10px}.water strong{font-size:18px}.water button{padding:8px 14px}@keyframes appear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}@media(max-width:650px){.intro{grid-template-columns:1fr}.wrap{padding:22px 14px}.meal{padding:18px}.foods{grid-template-columns:repeat(2,minmax(0,1fr))}.food-image{height:100px}.shopping{columns:1}.day-heading{align-items:flex-start;flex-direction:column}.complete{white-space:normal}.panel{padding:20px}}@media print{body{background:white}header{background:white;color:#173f35;padding:20px 0}header .brand{color:#806624}.wrap{padding:10px 0}h1{font-size:42px}.tabs,.tools,button,.complete,.progress,.privacy-note,.diary{display:none!important}.day[hidden]{display:block!important}.meal{break-inside:avoid;animation:none}.day{break-before:page}.food-image{height:90px}.panel{box-shadow:none}details>div{display:block!important}footer{font-size:9px}}
`;

export async function buildPlanHtml({ plan, patientName, id, revision, approvedAt, draft = false }) {
  const uniqueIds = [...new Set(plan.days.flatMap(day => day.meals.flatMap(meal => meal.items.flatMap(item => [item.foodId, ...item.alternatives.map(alt => alt.foodId)]))))];
  const assets = Object.fromEntries(await Promise.all(uniqueIds.map(async foodId => [foodId, `data:image/jpeg;base64,${(await imageBuffer(foodId)).toString('base64')}`])));
  const [serif, body] = await Promise.all(['editorial', 'body'].map(font => readFile(resolve('public/fonts', `${font}.woff2`))));
  const style = exportStyles.replace('FONT_SERIF', `data:font/woff2;base64,${serif.toString('base64')}`).replace('FONT_BODY', `data:font/woff2;base64,${body.toString('base64')}`);
  const key = `gd-plan-${id}-${revision}`;
  const imageDefinitions = '<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs>' + uniqueIds.map(foodId => `<symbol id="food-${foodId}" viewBox="0 0 384 288"><image href="${assets[foodId]}" width="384" height="288"/></symbol>`).join('') + '</defs></svg>';
  const foodImage = (foodId, className = 'food-image') => `<svg class="${className}" width="384" height="288" viewBox="0 0 384 288" role="img" aria-label="Ilustração de ${escapeHtml(foodById[foodId].name)}"><use href="#food-${foodId}"/></svg>`;
  const dayMarkup = plan.days.map((day, d) => {
    const total = dayTotals(day);
    return `<section class="day" id="day-${d}" aria-labelledby="title-${d}"><div class="day-heading"><div><p class="eyebrow">Seu ritmo, um dia de cada vez</p><h2 id="title-${d}">${escapeHtml(day.label)}</h2></div><div class="stats"><span><strong>${decimal(total.kcal)}</strong>kcal estimadas</span><span><strong>${decimal(total.protein)} g</strong>proteínas</span><span><strong>${decimal(total.carbs)} g</strong>carboidratos</span><span><strong>${decimal(total.fat)} g</strong>gorduras</span></div></div>${day.meals.map((meal, m) => `<article class="meal"><div class="meal-top"><div><span class="time">${escapeHtml(meal.time)}</span><h3>${escapeHtml(meal.name)}</h3></div><label class="complete"><input type="checkbox" data-meal="${d}-${m}">Refeição feita</label></div><div class="foods">${meal.items.map(item => {
      const food = foodById[item.foodId]; const values = sumItems([item]);
      return `<div class="food">${foodImage(item.foodId)}<strong>${escapeHtml(food.name)}</strong><p>${decimal(item.grams)} g</p><small>≈ ${decimal(item.grams / food.portionGrams)} × ${escapeHtml(food.portionLabel)}</small><small>${decimal(values.kcal)} kcal · P ${decimal(values.protein)} g · C ${decimal(values.carbs)} g · G ${decimal(values.fat)} g</small>${item.alternatives.length ? `<details><summary>Posso trocar por…</summary><ul>${item.alternatives.map(alt => `<li>${foodImage(alt.foodId, 'swap-image')}${escapeHtml(foodById[alt.foodId].name)} · ${decimal(alt.grams)} g</li>`).join('')}</ul><small>Escolha uma opção. As substituições foram revisadas pela nutricionista; os totais exibidos correspondem à opção principal.</small></details>` : ''}</div>`;
    }).join('')}</div>${meal.note ? `<p class="note">${htmlText(meal.note)}</p>` : ''}</article>`).join('')}</section>`;
  }).join('');
  const shopping = shoppingList(plan).map((item, index) => `<li><label><input type="checkbox" data-shop="${index}"><span>${escapeHtml(item.food.name)}<small>${decimal(item.grams)} g na semana</small></span></label></li>`).join('');
  const script = `(() => { 'use strict'; const key=${JSON.stringify(key)}; let saved={}; let persistent=true; try {saved=JSON.parse(localStorage.getItem(key)||'{}');if(!saved||Array.isArray(saved)||typeof saved!=='object')saved={};} catch {saved={};persistent=false;} const state={day:0,checks:{},shopping:{},notes:'',water:{},...saved};const now=new Date();const today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');const date=document.getElementById('checkdate');date.value=today;const save=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{persistent=false;}document.getElementById('storage').textContent=persistent?'Suas marcações ficam somente neste dispositivo. Elas não são enviadas à nutricionista.':'Este navegador não permitiu salvar. As marcações ficam disponíveis enquanto o arquivo estiver aberto.';};const mealKey=el=>date.value+'-'+el.dataset.meal;const progress=()=>{const all=[...document.querySelectorAll('#day-'+state.day+' [data-meal]')];const done=all.filter(el=>el.checked).length;document.getElementById('progress').style.width=(all.length?done/all.length*100:0)+'%';document.getElementById('progress-label').textContent=done+' de '+all.length+' refeições marcadas';document.getElementById('water-value').textContent=(state.water[date.value]||0)+' ml';};const refresh=()=>{document.querySelectorAll('[data-meal]').forEach(el=>{el.checked=state.checks[mealKey(el)]===true;});progress();};const select=day=>{state.day=day;document.querySelectorAll('.day').forEach((el,i)=>el.hidden=i!==day);document.querySelectorAll('[data-day]').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===day)));refresh();save();};document.querySelectorAll('[data-day]').forEach(el=>el.addEventListener('click',()=>select(Number(el.dataset.day))));document.querySelectorAll('[data-meal]').forEach(el=>el.addEventListener('change',()=>{state.checks[mealKey(el)]=el.checked;progress();save();}));document.querySelectorAll('[data-shop]').forEach(el=>{el.checked=state.shopping[el.dataset.shop]===true;el.addEventListener('change',()=>{state.shopping[el.dataset.shop]=el.checked;save();});});date.addEventListener('change',refresh);const notes=document.getElementById('notes');notes.value=String(state.notes||'').slice(0,6000);notes.addEventListener('input',()=>{state.notes=notes.value;save();});document.getElementById('water-add').addEventListener('click',()=>{state.water[date.value]=Math.min(10000,(Number(state.water[date.value])||0)+200);progress();save();});document.getElementById('water-subtract').addEventListener('click',()=>{state.water[date.value]=Math.max(0,(Number(state.water[date.value])||0)-200);progress();save();});document.getElementById('print').addEventListener('click',()=>{document.querySelectorAll('details').forEach(el=>el.open=true);window.print();});document.getElementById('clear').addEventListener('click',()=>{if(!window.confirm('Apagar marcações, compras e anotações deste plano neste dispositivo?'))return;try{localStorage.removeItem(key);}catch{}location.reload();});select(Number.isInteger(state.day)&&state.day>=0&&state.day<7?state.day:0);})();`;
  const scriptHash = createHash('sha256').update(script).digest('base64');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(plan.title)} · ${escapeHtml(patientName)}</title><style>${style}</style></head><body>${imageDefinitions}${draft ? '<div class="draft">PRÉVIA · Rascunho em revisão profissional. Não utilizar como prescrição.</div>' : ''}<header><div class="header-line"><span class="brand">Gislaine Duarte · Nutrição & cuidado</span><button id="print" type="button">Imprimir / salvar em PDF</button></div><p class="eyebrow" style="color:#d9bf85">Preparado para ${escapeHtml(patientName)}</p><h1>${escapeHtml(plan.title)}</h1><p>Um cuidado que acompanha a sua vida. Seu plano, suas escolhas e pequenos passos, todos os dias.</p><p class="fine" style="color:#d9bf85">${escapeHtml(site.fullName)} · ${escapeHtml(site.registration)} · Versão ${revision}${approvedAt ? ` · ${new Date(approvedAt).toLocaleDateString('pt-BR')}` : ''}</p></header><noscript><p class="no-script">Todas as refeições estão disponíveis abaixo. Abra este arquivo em um navegador com JavaScript para usar as marcações e a navegação por dias.</p></noscript><main class="wrap"><div class="intro"><section class="panel"><p class="eyebrow">Um plano para você</p><h2>O cuidado está nos detalhes.</h2><p>${htmlText(plan.guidance)}</p></section><section class="panel"><p class="eyebrow">Seu acompanhamento pessoal</p><label for="checkdate">Data das marcações</label> <input id="checkdate" type="date"><p id="progress-label" aria-live="polite">Suas refeições</p><div class="progress" aria-hidden="true"><span id="progress"></span></div><div class="water"><div class="tools"><strong id="water-value">0 ml</strong><button type="button" id="water-subtract" aria-label="Retirar 200 ml do registro">− 200 ml</button><button type="button" id="water-add">+ 200 ml</button></div><p class="fine">${plan.targets.water ? `Meta individual combinada: ${decimal(plan.targets.water)} ml por dia.` : 'Registre líquidos conforme a orientação recebida. Não há meta hídrica definida neste arquivo.'}</p></div><p class="privacy-note" id="storage"></p></section></div><nav class="tabs" aria-label="Dias do plano">${plan.days.map((day,i)=>`<button type="button" data-day="${i}" aria-controls="day-${i}" aria-pressed="${i===0}">${escapeHtml(day.label)}</button>`).join('')}</nav>${dayMarkup}<details class="panel" open><summary>Lista de compras da semana</summary><div><p class="fine">Quantidades do alimento como descrito (cozido ou cru), sem fator de correção ou rendimento. Some o que falta em casa. A lista considera as opções principais; ajuste se escolher substituições.</p><ul class="shopping">${shopping}</ul></div></details><section class="panel diary"><h2>Como foi a sua semana?</h2><label for="notes">Anote dúvidas, sensações e o que funcionou para conversar no acompanhamento.</label><textarea id="notes" maxlength="6000" placeholder="Um espaço para escutar o seu corpo…"></textarea><p class="privacy-note">Anotações privadas neste dispositivo. Para compartilhar, converse com Gislaine pelos canais habituais.</p><button type="button" id="clear">Apagar minhas marcações</button></section></main><footer><p>${escapeHtml(site.fullName)} · ${escapeHtml(site.registration)}</p><p>Composição: ${escapeHtml(foodSource.title)}. Valores estimados; preparos, marcas e sal acrescentado alteram os resultados. P: proteínas · C: carboidratos · G: gorduras. Medidas caseiras são aproximações. Ilustrações não representam o tamanho da porção.</p><p>Arquivo pessoal e confidencial. Funciona offline; não contém rastreamento nem conexões externas. Guarde em um local privado e compartilhe apenas se desejar.</p></footer><script>${script}</script></body></html>`;
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
    const total = dayTotals(day);
    text(`${decimal(total.kcal)} kcal · Proteínas ${decimal(total.protein)} g · Carboidratos ${decimal(total.carbs)} g · Gorduras ${decimal(total.fat)} g`, 9); doc.moveDown(0.5);
    for (const meal of day.meals) {
      const columnWidth = (width - 16) / 2; const textWidth = columnWidth - 53;
      const cells = meal.items.map(item => {
        const food = foodById[item.foodId]; const values = sumItems([item]);
        const lines = [food.name, `${decimal(item.grams)} g · ≈ ${decimal(item.grams / food.portionGrams)} × ${food.portionLabel}`,
          `${decimal(values.kcal)} kcal · P ${decimal(values.protein)} · C ${decimal(values.carbs)} · G ${decimal(values.fat)} g`];
        if (item.alternatives.length) lines.push(`Troca: ${item.alternatives.map(alt => `${foodById[alt.foodId].name} (${decimal(alt.grams)} g)`).join(' ou ')}`);
        const heights = lines.map((line, i) => doc.font('Body').fontSize(i === 0 ? 9 : 7.4).heightOfString(line, { width: textWidth, lineGap: 1 }));
        return { item, lines, heights, height: Math.max(38, heights.reduce((a,b) => a+b, 0) + 5) };
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
          doc.image(await pdfImage(cell.item.foodId),x,y+2,{fit:[44,34]});
          let lineY=y+1;
          cell.lines.forEach((line,index)=>{
            doc.font('Body').fontSize(index===0?9:7.4).fillColor(index===0?'#173f35':'#496b56').text(line,x+52,lineY,{width:textWidth,lineGap:1});
            lineY+=cell.heights[index]+1;
          });
        }
        y+=rowHeights[i/2];
      }
      doc.x=44;doc.y=y;
      if(meal.note){ensure(noteHeight);y=doc.y;doc.font('Body').fontSize(8).fillColor('#496b56').text(meal.note,52,y+3,{width:width-16,lineGap:2});doc.y=y+noteHeight;}
      doc.x=44;doc.y+=5;
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
  text(`${foodSource.title}. Valores estimados por 100 g de parte comestível. Preparos, marcas e sal acrescentado alteram os resultados. P: proteínas; C: carboidratos; G: gorduras. Medidas caseiras aproximadas. Ilustrações não representam a porção prescrita. As substituições podem alterar os totais.`, 9, { lineGap: 3 });
  doc.moveDown(); text('Material pessoal e confidencial. As marcações feitas no HTML ficam somente no seu dispositivo e podem ser compartilhadas com Gislaine durante o acompanhamento.', 9, { lineGap: 3 });
  const range = doc.bufferedPageRange();
  for (let page = 0; page < range.count; page++) {
    doc.switchToPage(page); doc.save(); doc.font('Body').fontSize(8).fillColor('#496b56');
    doc.text(`${site.fullName} · ${site.registration}`, 44, 794, { lineBreak: false });
    doc.text(`${page + 1} / ${range.count}`, 503, 794, { lineBreak: false }); doc.restore();
  }
  doc.end(); return finished;
}
