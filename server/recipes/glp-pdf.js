import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import { formatIngredient, consolidateShoppingList } from '../../src/data/recipes-product.js';
import { curatedImageBuffer } from '../nutrition/assets.js';
import { site } from '../../src/data/site.js';

const C = { forest: '#173f35', leaf: '#496b56', gold: '#806624', paleGold: '#d9bf85', ivory: '#f5f1e8', paper: '#edece2', white: '#fffdf7', rust: '#925538' };
const W = 595.28, H = 841.89, L = 46, CW = W - L * 2, BOTTOM = 766;

/** A entrega do servidor e o arquivo de revisão usam exatamente este renderer. */
export async function buildGlpPdf(data) {
  const guide = data.guide;
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, info: { Title: data.title, Author: site.fullName, Subject: 'Receitas, bebidas e educação alimentar durante o uso de GLP-1', Keywords: 'GLP-1, receitas, bebidas, alimentação, educação' } });
  const chunks = [];
  const result = new Promise((accept, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => accept(Buffer.concat(chunks))); doc.on('error', reject); });
  const [body, editorial] = await Promise.all(['body', 'editorial'].map(font => readFile(resolve('server/nutrition/fonts', `${font}.ttf`))));
  doc.registerFont('Body', body); doc.registerFont('Editorial', editorial);
  const photos = new Map();
  for (const recipe of data.recipes) photos.set(recipe.slug, await curatedImageBuffer(recipe.image.src));
  const photo = (buffer, x, y, width, height) => {
    doc.save().rect(x, y, width, height).clip().image(buffer, x, y, { cover: [width, height] }).restore();
  };
  const pageMap = new Map();
  let currentLabel = data.title;
  const pageIndex = () => doc.bufferedPageRange().count - 1;
  const start = (label, destination) => {
    doc.addPage(); currentLabel = label;
    doc.rect(0, 0, W, H).fill(C.ivory);
    doc.rect(L, 32, 30, 2).fill(C.paleGold);
    doc.font('Body').fontSize(8).fillColor(C.leaf).text('GISLAINE DUARTE · NUTRIÇÃO & CUIDADO', L + 42, 28, { width: CW - 42, lineBreak: false });
    doc.x = L; doc.y = 66;
    if (destination) { doc.addNamedDestination(destination); pageMap.set(destination, pageIndex() + 1); }
  };
  const ensure = height => { if (doc.y + height > BOTTOM) { const label = currentLabel; start(label); doc.font('Body').fontSize(8).fillColor(C.gold).text(`${label} · continuação`, L, 58, { width: CW }); doc.y = 84; } };
  const block = (value, { size = 10.5, color = C.forest, font = 'Body', gap = 10, width = CW, x = L, link, destination } = {}) => {
    const text = String(value ?? '');
    doc.font(font).fontSize(size);
    const height = doc.heightOfString(text, { width, lineGap: 2.8 });
    ensure(height + gap);
    doc.font(font).fontSize(size).fillColor(color).text(text, x, doc.y, { width, lineGap: 2.8, ...(link ? { link } : {}), ...(destination ? { goTo: destination } : {}) });
    doc.y += gap;
  };
  const title = (value, size = 34) => block(value, { font: 'Editorial', size, gap: 17 });
  const eyebrow = value => block(value.toLocaleUpperCase('pt-BR'), { size: 8.5, color: C.gold, gap: 10 });
  const heading = value => { ensure(50); block(value, { font: 'Editorial', size: 23, gap: 9 }); };
  const bullets = (values, gap = 8) => { for (const value of values) block(`• ${value}`, { size: 10.2, x: L + 8, width: CW - 8, gap }); };
  const section = (label, mainTitle, copy, image) => {
    start(mainTitle); doc.rect(0, 0, W, 342).fill(C.forest);
    doc.font('Body').fontSize(9).fillColor(C.paleGold).text(label.toLocaleUpperCase('pt-BR'), L, 66, { width: CW });
    doc.font('Editorial').fontSize(48).fillColor(C.white).text(mainTitle, L, 107, { width: CW, lineGap: 0 });
    doc.font('Body').fontSize(11).fillColor(C.ivory).text(copy, L, Math.max(222, doc.y + 12), { width: CW, lineGap: 4 });
    if (image) photo(image, L, 375, CW, 280);
    doc.y = 694; block('Imagens ilustrativas geradas com IA. A apresentação e o resultado do preparo podem variar.', { size: 8, color: C.leaf });
  };

  // Capa.
  doc.rect(0, 0, W, H).fill(C.forest);
  doc.font('Body').fontSize(10).fillColor(C.paleGold).text('GISLAINE DUARTE · NUTRIÇÃO & CUIDADO', L, 50, { width: CW });
  doc.font('Editorial').fontSize(70).fillColor(C.white).text('À mesa\ncom GLP-1', L, 101, { width: CW, lineGap: -7 });
  doc.font('Body').fontSize(12).fillColor(C.ivory).text(guide.subtitle, L, 275, { width: 420, lineGap: 4 });
  const hero = photos.get('glp-creme-abobora-frango') || photos.values().next().value;
  if (hero) photo(hero, L, 350, CW, 292);
  doc.font('Body').fontSize(10).fillColor(C.paleGold).text(`${data.recipes.length} receitas · ${data.recipes.filter(recipe => recipe.category === 'bebida').length} bebidas · guia prático`, L, 673, { width: CW });
  doc.font('Body').fontSize(9).fillColor(C.ivory).text(`${site.fullName}\n${site.profession} · ${site.registration}\n${guide.edition}`, L, 710, { width: CW, lineGap: 4 });

  // Reservas preenchidas depois, com números reais de página e links internos.
  start('Sumário do guia'); const guideTocPage = pageIndex();
  start('Índice das receitas'); const recipeTocPage = pageIndex();

  const guideOutline = doc.outline.addItem('Guia de alimentação', { expanded: true });
  for (const chapter of guide.chapters) {
    start(chapter.title, `chapter-${chapter.id}`); guideOutline.addItem(chapter.title);
    eyebrow(chapter.kicker); title(chapter.title);
    block(chapter.intro, { size: 12, gap: 16 });
    for (const item of chapter.sections) { heading(item.title); for (const text of item.paragraphs || []) block(text, { gap: 8 }); if (item.bullets) bullets(item.bullets, 6); doc.y += 4; }
    if (chapter.sourceIds.length) {
      ensure(30); block(`Fontes: ${chapter.sourceIds.map(id => `[${guide.sources.findIndex(source => source.id === id) + 1}]`).join(' ')}. Referências e links ao final do livro.`, { size: 8, color: C.leaf, destination: 'references' });
    }
  }
  start('Escolha suas possibilidades', 'quick-choices'); eyebrow('Um mapa de consulta'); title('Escolha suas possibilidades');
  block('Estas sugestões organizam o repertório. A escolha por textura ou ingrediente não equivale a uma liberação clínica.');
  for (const choice of guide.quickChoices) {
    heading(choice.title); block(choice.text, { size: 10, gap: 5 });
    for (const slug of choice.slugs) { const recipe = data.recipes.find(item => item.slug === slug); if (recipe) block(`• ${recipe.name}`, { size: 10, destination: `recipe-${slug}`, gap: 3 }); }
    doc.y += 4;
  }
  section('Seu repertório culinário', 'Receitas para\na vida real', 'Doces e salgadas, com ingredientes, porções culinárias, preparo e cuidados. Ajuste as escolhas com sua equipe.', photos.get('bowl-frango-quinoa'));
  const recipeOutline = doc.outline.addItem('Receitas e bebidas', { expanded: false });
  let beverageSection = false;
  for (const [index, recipe] of data.recipes.entries()) {
    if (recipe.category === 'bebida' && !beverageSection) { beverageSection = true; section('Além do prato', 'Beber também\nfaz parte', 'Águas aromatizadas, infusão e lanches líquidos. Observe a função de cada bebida e a sua tolerância.', photos.get('vitamina-mamao')); }
    start(recipe.name, `recipe-${recipe.slug}`); recipeOutline.addItem(recipe.name);
    eyebrow(`Receita ${String(index + 1).padStart(2, '0')} · ${recipe.category}`);
    const headerTop = doc.y;
    doc.font('Editorial').fontSize(29).fillColor(C.forest).text(recipe.name, L, headerTop, { width: 304, lineGap: 0 });
    doc.y += 9;
    doc.font('Body').fontSize(9.2).fillColor(C.forest).text(recipe.introduction, L, doc.y, { width: 304, lineGap: 2.5 });
    const recipePhoto = photos.get(recipe.slug);
    if (recipePhoto) photo(recipePhoto, L + CW - 177, headerTop, 177, 150);
    doc.y = Math.max(doc.y + 10, headerTop + 162);
    block('Imagem ilustrativa gerada com IA; o resultado real pode variar.', { size: 7.2, color: C.leaf, gap: 10 });
    block(`${recipe.time.label} · ${recipe.yield}`, { size: 9.1, color: C.gold, gap: 8 });
    block(`Equipamentos: ${recipe.equipment.join(' · ')}`, { size: 8.3, color: C.leaf, gap: 18 });
    const columnY = doc.y;
    const drawColumn = (label, items, x, width, numbered = false) => {
      doc.y = columnY; doc.font('Editorial').fontSize(22).fillColor(C.forest).text(label, x, doc.y, { width }); doc.y += 8;
      for (const [itemIndex, item] of items.entries()) block(`${numbered ? `${itemIndex + 1}.` : '•'} ${item}`, { size: 9.1, width, x, gap: numbered ? 9 : 7 });
      return doc.y;
    };
    const ingredientsBottom = drawColumn('Ingredientes', recipe.ingredients.map(item => formatIngredient(item)), L, 210);
    const methodBottom = drawColumn('Modo de preparo', recipe.preparation, L + 235, CW - 235, true);
    doc.y = Math.max(ingredientsBottom, methodBottom) + 9;
    heading('Na sua rotina');
    for (const note of recipe.notes) block(note, { size: 8.6, gap: 7 });
    for (const substitution of recipe.substitutions) block(`Alternativa: ${substitution}`, { size: 8.6, gap: 7 });
    if (recipe.nutrition) block(`Por porção: ${recipe.nutrition.kcal} kcal · Proteínas ${recipe.nutrition.protein} g · Carboidratos ${recipe.nutrition.carbs} g · Gorduras ${recipe.nutrition.fat} g. Fonte: ${recipe.nutrition.source}`, { size: 8.6 });
    if (recipe.allergens.length) block(`Alergênicos e cuidados: ${recipe.allergens.map(item => item.label).join('; ')}. Confira os detalhes nas orientações ao final do livro.`, { size: 8.3, color: C.rust, gap: 8 });
    block(recipe.editorialContext, { size: 7.4, color: C.leaf, gap: 3 });
  }

  start('Roteiro da semana', 'week'); eyebrow('Material de apoio'); title('Uma semana de possibilidades');
  block('Repertório de combinações, sem representar toda a alimentação do dia. Quantidades, acompanhamentos, horários e outras refeições serão definidos no seu plano individual.');
  for (const day of guide.week) {
    ensure(95); heading(day.day);
    for (const [key, label] of [['morning', 'Manhã'], ['meal', 'Refeição'], ['snack', 'Lanche possível'], ['evening', 'Outra refeição']]) {
      const recipe = data.recipes.find(item => item.slug === day[key]);
      if (recipe) block(`${label}: ${recipe.name}`, { size: 9.5, destination: `recipe-${recipe.slug}`, gap: 5 });
    }
    doc.y += 6;
  }
  start('Meu roteiro da semana', 'planner'); eyebrow('Imprima e personalize'); title('Meu roteiro da semana');
  block('Preencha com suas escolhas e com o plano combinado na consulta. O quadro não determina uma meta alimentar.');
  let rowY = Math.max(195, doc.y + 22);
  for (const day of guide.week) {
    doc.font('Editorial').fontSize(20).fillColor(C.forest).text(day.day, L, rowY);
    doc.font('Body').fontSize(8).fillColor(C.leaf).text('Preparações / compras / organização', L + 130, rowY, { width: CW - 130 });
    doc.moveTo(L + 130, rowY + 30).lineTo(L + CW, rowY + 30).strokeColor(C.leaf).lineWidth(.3).stroke();
    doc.moveTo(L + 130, rowY + 55).lineTo(L + CW, rowY + 55).stroke(); rowY += 78;
  }
  for (let copy = 0; copy < 2; copy++) {
    start('Registro para a consulta', copy === 0 ? 'journal' : undefined); eyebrow('Imprima e use quando precisar'); title('Um registro para a consulta');
    block('Observações pessoais, sem envio de dados pelo livro. Registre apenas o que ajuda a explicar sua experiência à equipe.');
    let y = Math.max(205, doc.y + 25);
    for (const field of guide.journalFields) {
      doc.font('Body').fontSize(10).fillColor(C.forest).text(field, L, y, { width: CW });
      for (const offset of [33, 58]) doc.moveTo(L, y + offset).lineTo(L + CW, y + offset).strokeColor(C.leaf).lineWidth(.3).stroke();
      y += 90;
    }
  }
  start('Perguntas frequentes', 'faq'); eyebrow('Para consultar'); title('Perguntas frequentes');
  for (const faq of guide.faqs) {
    doc.font('Editorial').fontSize(23);
    const questionHeight = doc.heightOfString(faq.question, { width: CW, lineGap: 2.8 });
    doc.font('Body').fontSize(10.5);
    const answerHeight = doc.heightOfString(faq.answer, { width: CW, lineGap: 2.8 });
    ensure(questionHeight + answerHeight + 30);
    heading(faq.question); block(faq.answer); doc.y += 5;
  }
  start('Alergênicos e cuidados', 'allergens'); eyebrow('Confira também os rótulos'); title('Alergênicos e cuidados');
  block('Os alertas consideram a receita e as substituições descritas. Acompanhamentos escolhidos separadamente podem trazer outros alergênicos. Sem lactose não significa sem proteínas do leite.');
  const allergens = [...new Map(data.recipes.flatMap(recipe => recipe.allergens).map(item => [item.id, item])).values()];
  for (const allergen of allergens) { heading(allergen.label); block(allergen.detail); }
  start('Lista de compras', 'shopping'); eyebrow('Selecione antes de comprar'); title('Sua lista de compras');
  block('A lista reúne uma preparação de cada ficha, não uma compra recomendada para uma semana. Medidas de alimentos crus e cozidos permanecem separadas. No HTML e no site, selecione somente o que pretende preparar.');
  const shopping = consolidateShoppingList(data.recipes);
  for (const sectionName of [...new Set(shopping.map(item => item.section))]) { heading(sectionName); bullets(shopping.filter(item => item.section === sectionName).map(item => `${formatIngredient(item)}${item.optional ? ' (opcional)' : ''}`)); }
  start('Referências', 'references'); eyebrow('Fontes e transparência'); title('Referências'); block(guide.sourceDate, { size: 9.5 });
  for (const [index, source] of guide.sources.entries()) { ensure(90); block(`[${index + 1}] ${source.title}`, { size: 10, gap: 5 }); block(source.use, { size: 8.7, color: C.leaf, gap: 5 }); block(source.url, { size: 7.7, color: C.gold, link: source.url, gap: 16 }); }
  start('Um cuidado que continua', 'closing'); eyebrow('Gislaine Duarte'); title('Sua rotina merece\nescuta e cuidado.', 44);
  block('Receitas oferecem possibilidades. O acompanhamento individual ajuda a encontrar o que funciona para você, respeitando sua história, suas necessidades e seu momento.', { size: 12, gap: 25 });
  block(`${site.fullName}\n${site.profession} · ${site.registration}`, { size: 11, gap: 22 });
  block('Conheça o acompanhamento nutricional', { size: 11, color: C.gold, link: `${site.url}/atendimentos` });
  block(guide.notice, { size: 10, gap: 25 });
  block('Edição editorial com receitas originais e imagens geradas com IA. Não declara teste culinário, análise nutricional ou aprovação clínica registrada. Consulte sua equipe para as adaptações individuais.', { size: 9, color: C.leaf });

  // Preenche os índices sem depender de contagens estimadas.
  doc.switchToPage(guideTocPage); doc.x = L; doc.y = 66;
  eyebrow('Navegue pelo livro'); title('Guia e materiais de apoio');
  for (const chapter of guide.chapters) block(`${chapter.kicker.slice(0, 2)}  ${chapter.title}  ·  ${pageMap.get(`chapter-${chapter.id}`)}`, { size: 10.5, gap: 13, destination: `chapter-${chapter.id}` });
  heading('Para consultar e usar');
  for (const [destination, label] of [['quick-choices', 'Mapa de consulta'], ['week', 'Roteiro da semana'], ['planner', 'Meu roteiro da semana'], ['journal', 'Registro para a consulta'], ['faq', 'Perguntas frequentes'], ['allergens', 'Alergênicos e cuidados'], ['shopping', 'Lista de compras'], ['references', 'Referências']]) block(`${label}  ·  ${pageMap.get(destination)}`, { size: 9.5, gap: 7, destination });
  doc.switchToPage(recipeTocPage); doc.x = L; doc.y = 66; eyebrow('Seu repertório'); title('Índice de receitas e bebidas');
  block('Clique no nome para abrir a ficha. As porções são culinárias e podem ser ajustadas ao seu plano individual.', { size: 10, gap: 22 });
  const tocY = doc.y;
  for (let column = 0; column < 2; column++) {
    doc.y = tocY;
    for (const [index, recipe] of data.recipes.entries()) {
      if (Math.floor(index / 15) !== column) continue;
      block(`${String(index + 1).padStart(2, '0')}  ${recipe.name}  ·  ${pageMap.get(`recipe-${recipe.slug}`)}`, { size: 9.3, gap: 13, width: 235, x: L + column * 268, destination: `recipe-${recipe.slug}` });
    }
  }
  const count = doc.bufferedPageRange().count;
  for (let page = 0; page < count; page++) {
    doc.switchToPage(page);
    doc.font('Body').fontSize(7.2).fillColor(page === 0 ? C.paleGold : C.leaf).text('Gislaine Duarte · À mesa com GLP-1', L, 790, { width: 390, lineBreak: false });
    doc.text(`${page + 1} / ${count}`, W - L - 55, 790, { width: 55, align: 'right', lineBreak: false });
  }
  doc.end(); return result;
}
