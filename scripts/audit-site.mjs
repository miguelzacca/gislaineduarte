import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { load } from 'cheerio';

const root = path.resolve('dist');
const origin = 'https://gislaineduarte.com.br';
const confirmedPhone = '5547991913588';
const confirmedEmail = 'duartegisarte@gmail.com';
const configuredInstagram = process.env.PUBLIC_INSTAGRAM?.trim() || null;
const expectedRoutes = [
  '/', '/sobre/', '/atendimentos/', '/atendimentos/consulta-nutricional/',
  '/atendimentos/ciclos-de-acompanhamento/', '/contato/', '/privacidade/',
];
const errors = [];
const warnings = [];
const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const check = (condition, message) => { if (!condition) errors.push(message); };

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return files.flat();
}

function routeFor(file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/index\.html$/, '')}`;
}

async function resolveLocal(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  const absolute = path.resolve(root, `.${pathname}`);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return null;
  for (const candidate of [absolute, path.join(absolute, 'index.html')]) {
    if ((await stat(candidate).catch(() => null))?.isFile()) return candidate;
  }
  return null;
}

async function inspectReference(raw, base, source, pages) {
  if (!raw || raw.startsWith('data:')) return;
  let url;
  try { url = new URL(raw, base); } catch { errors.push(`${source}: URL inválida ${raw}`); return; }
  if (url.protocol === 'mailto:') {
    check(decodeURIComponent(url.pathname).toLowerCase() === confirmedEmail, `${source}: e-mail não confirmado ${raw}`);
    return;
  }
  if (url.protocol === 'tel:') {
    check(url.pathname.replace(/\D/g, '') === confirmedPhone, `${source}: telefone não confirmado ${raw}`);
    return;
  }
  if (url.hostname === 'wa.me') {
    check(url.pathname === `/${confirmedPhone}`, `${source}: WhatsApp incorreto ${raw}`);
    check(normalize(url.searchParams.get('text')).length > 20, `${source}: WhatsApp sem mensagem contextual`);
    return;
  }
  check(!['javascript:', 'vbscript:'].includes(url.protocol), `${source}: protocolo inseguro ${raw}`);
  if (url.origin !== origin) return;
  const target = await resolveLocal(url);
  check(Boolean(target), `${source}: referência interna quebrada ${raw}`);
  if (target && url.hash && target.endsWith('.html')) {
    const targetPage = pages.get(target);
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { id = ''; }
    check(Boolean(id) && Boolean(targetPage?.ids.has(id)), `${source}: âncora inexistente ${raw}`);
  }
}

function inspectSchema(value, page, trail = 'JSON-LD') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectSchema(item, page, `${trail}[${index}]`));
    return;
  }
  const types = Array.isArray(value['@type']) ? value['@type'] : value['@type'] ? [value['@type']] : [];
  page.schemaTypes.push(...types);
  if (value['@id']) {
    check(String(value['@id']).startsWith(origin), `${page.route}: ID de entidade fora do domínio confirmado em ${trail}`);
  }
  if (types.includes('Person')) {
    check(value.name === 'Gislaine Duarte', `${page.route}: Person com nome divergente`);
    if (value.jobTitle) check(/nutricionista/i.test(value.jobTitle), `${page.route}: profissão divergente`);
  }
  if (types.includes('Service')) {
    check(/consulta nutricional|ciclos de acompanhamento/i.test(value.name ?? ''), `${page.route}: serviço não confirmado no schema`);
    if (value.description) check(!/\b[356]\s*meses\b/i.test(value.description), `${page.route}: duração não confirmada no schema`);
  }
  if (types.includes('FAQPage')) {
    check(Array.isArray(value.mainEntity) && value.mainEntity.length > 0, `${page.route}: FAQ sem perguntas`);
    for (const question of value.mainEntity ?? []) {
      check(question['@type'] === 'Question', `${page.route}: item FAQ não é Question`);
      check(page.bodyText.includes(normalize(question.name)), `${page.route}: pergunta JSON-LD não está no HTML: ${question.name}`);
      const answer = question.acceptedAnswer;
      check(answer?.['@type'] === 'Answer', `${page.route}: FAQ sem Answer`);
      const plainAnswer = normalize(load(`<div>${answer?.text ?? ''}</div>`)('div').text());
      check(plainAnswer.length > 15 && page.bodyText.includes(plainAnswer), `${page.route}: resposta JSON-LD ausente ou diferente do HTML`);
    }
  }
  const unconfirmedKeys = new Set(['aggregateRating', 'review', 'price', 'priceRange', 'address', 'geo', 'openingHours', 'openingHoursSpecification']);
  for (const [key, child] of Object.entries(value)) {
    check(!unconfirmedKeys.has(key), `${page.route}: dado não confirmado no schema: ${key}`);
    if (key === 'telephone') check(String(child).replace(/\D/g, '') === confirmedPhone, `${page.route}: telefone do schema divergente`);
    if (key === 'email') check(String(child).replace(/^mailto:/, '').toLowerCase() === confirmedEmail, `${page.route}: e-mail do schema divergente`);
    if (key === 'sameAs') check(configuredInstagram && Array.isArray(child) && child.length === 1 && child[0] === configuredInstagram && /^https:\/\/(www\.)?instagram\.com\//.test(child[0]), `${page.route}: perfil social não corresponde à configuração oficial`);
    inspectSchema(child, page, `${trail}.${key}`);
  }
}

async function main() {
  const files = await walk(root);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  check(htmlFiles.length >= expectedRoutes.length + 1, 'Build incompleto: faltam páginas HTML ou 404.');
  const pages = new Map();
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const $ = load(html);
    const content = $('body').clone();
    content.find('script, style, template').remove();
    pages.set(file, {
      file, $, route: routeFor(file), html, bodyText: normalize(content.text()),
      ids: new Set($('[id]').map((_, node) => $(node).attr('id')).get()),
      schemaTypes: [],
    });
  }

  const titles = new Set();
  const descriptions = new Set();
  const reportPages = [];
  for (const page of pages.values()) {
    const { $, route } = page;
    const is404 = /\/404(?:\.html|\/)$/.test(route);
    const base = `${origin}${route}`;
    check($('html').attr('lang') === 'pt-BR', `${route}: lang precisa ser pt-BR`);
    check($('main#conteudo').length === 1, `${route}: main#conteudo ausente ou duplicado`);
    check($('h1').length === 1, `${route}: esperado um h1`);
    check($('a[href="#conteudo"]').length > 0, `${route}: skip link ausente`);
    check($('link[rel~="icon"]').length > 0, `${route}: favicon ausente`);
    check($('meta[name="viewport"]').attr('content')?.includes('width=device-width'), `${route}: viewport ausente`);
    check(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\D|$)/i.test($('meta[name="viewport"]').attr('content') ?? ''), `${route}: zoom bloqueado`);

    const title = normalize($('title').text());
    const description = normalize($('meta[name="description"]').attr('content'));
    check(title.length > 12 && title.includes('Gislaine Duarte'), `${route}: título vazio ou sem identidade`);
    check(description.length > 40, `${route}: descrição ausente ou curta demais`);
    check(!titles.has(title), `${route}: título duplicado`);
    check(!descriptions.has(description), `${route}: descrição duplicada`);
    titles.add(title);
    descriptions.add(description);
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!is404 || canonical) check(canonical === base, `${route}: canonical incorreto ${canonical ?? '(ausente)'}`);
    const noindex = /noindex/i.test($('meta[name="robots"]').attr('content') ?? '');
    if (is404) check(noindex, `${route}: 404 precisa de noindex`);
    else if (noindex) warnings.push(`${route}: noindex ativo; confirmar ambiente antes do lançamento.`);
    if (process.env.AUDIT_REQUIRE_INDEXABLE === '1' && !is404) check(!noindex, `${route}: noindex em auditoria de publicação`);

    for (const property of ['og:title', 'og:description', 'og:type', 'og:image', 'og:locale']) {
      check(Boolean($(`meta[property="${property}"]`).attr('content')), `${route}: ${property} ausente`);
    }
    check($('meta[property="og:locale"]').attr('content') === 'pt_BR', `${route}: locale Open Graph incorreto`);
    if (!is404) check($('meta[property="og:url"]').attr('content') === base, `${route}: og:url divergente`);
    check(Boolean($('meta[name="twitter:card"]').attr('content')), `${route}: Twitter Card ausente`);
    check(Boolean($('meta[name="twitter:image"]').attr('content')), `${route}: imagem Twitter ausente`);
    await inspectReference($('meta[property="og:image"]').attr('content'), base, route, pages);

    const idList = $('[id]').map((_, node) => $(node).attr('id')).get();
    check(new Set(idList).size === idList.length, `${route}: IDs HTML duplicados`);
    let previousHeading = 0;
    $('main h1, main h2, main h3, main h4, main h5, main h6').each((_, node) => {
      const level = Number(node.tagName.slice(1));
      check(level <= previousHeading + 1, `${route}: salto de heading h${previousHeading} → h${level}`);
      previousHeading = level;
    });

    for (const node of $('a[href], img[src], script[src], link[href], source[src]').toArray()) {
      const element = $(node);
      const reference = element.attr('href') ?? element.attr('src');
      if (node.tagName === 'a') {
        check(Boolean(reference) && reference !== '#', `${route}: link sem destino`);
        check(normalize(element.text()).length > 0 || Boolean(element.attr('aria-label')) || element.find('img[alt]').length > 0, `${route}: link sem nome acessível`);
        if (element.attr('target') === '_blank') check(/noopener/.test(element.attr('rel') ?? ''), `${route}: target blank sem noopener`);
        check(!/agendar/i.test(element.text()), `${route}: agendamento não confirmado anunciado`);
      }
      if (node.tagName === 'img') {
        check(element.attr('alt') !== undefined, `${route}: imagem sem alt ${reference}`);
        check(Number(element.attr('width')) > 0 && Number(element.attr('height')) > 0, `${route}: imagem sem dimensões explícitas ${reference}`);
      }
      await inspectReference(reference, base, route, pages);
    }
    for (const node of $('[srcset]').toArray()) {
      for (const candidate of ($(node).attr('srcset') ?? '').split(',')) {
        await inspectReference(candidate.trim().split(/\s+/)[0], base, route, pages);
      }
    }

    check(!/lorem ipsum|\bTODO\b|orientação interna|dado pendente|conteúdo em breve/i.test(page.bodyText), `${route}: placeholder ou instrução interna visível`);
    check(!/consultoria\s+(?:nutricional\s+)?sem\s+consulta/i.test(page.bodyText), `${route}: serviço proibido presente`);
    check(!/\b(?:3|5|6|três|cinco|seis)\s*(?:ou\s*(?:3|5|6|três|cinco|seis)\s*)?meses\b/i.test(page.bodyText), `${route}: duração de ciclo não confirmada`);
    check(!/desparasita[çc][ãa]o|resultados? garantidos?|CRN\s*[-–]?\s*[1-9]\s*[-/]/i.test(page.bodyText), `${route}: alegação ou credencial não confirmada`);
    check($('form').length === 0, `${route}: formulário não previsto na coleta real`);

    const schemaNodes = $('script[type="application/ld+json"]').toArray();
    if (!is404) check(schemaNodes.length > 0, `${route}: JSON-LD ausente`);
    for (const node of schemaNodes) {
      try { inspectSchema(JSON.parse($(node).text()), page); }
      catch (error) { errors.push(`${route}: JSON-LD inválido: ${error.message}`); }
    }
    if (!is404) {
      check(page.schemaTypes.includes('Person'), `${route}: entidade Person não encontrada`);
      check(page.schemaTypes.includes('WebSite'), `${route}: entidade WebSite não encontrada`);
      if (route !== '/') check(page.schemaTypes.includes('BreadcrumbList'), `${route}: breadcrumb estruturado ausente`);
      if (route.startsWith('/atendimentos/') && route !== '/atendimentos/') check(page.schemaTypes.includes('Service'), `${route}: Service ausente`);
    }
    const initialScripts = [];
    for (const node of $('script[src], link[rel="modulepreload"]').toArray()) {
      const url = new URL($(node).attr('src') ?? $(node).attr('href'), base);
      if (url.origin !== origin) continue;
      const target = await resolveLocal(url);
      if (target) initialScripts.push(await readFile(target));
    }
    reportPages.push({ route, title, description, canonical, noindex, htmlBytes: Buffer.byteLength(page.html), initialJavaScriptGzipBytes: initialScripts.reduce((total, bytes) => total + gzipSync(bytes).byteLength, 0), schemaTypes: [...new Set(page.schemaTypes)] });
  }

  for (const route of expectedRoutes) check([...pages.values()].some((page) => page.route === route), `Rota obrigatória ausente: ${route}`);
  const homepage = [...pages.values()].find((page) => page.route === '/');
  const manifestReference = homepage?.$('link[rel="manifest"]').attr('href');
  check(Boolean(manifestReference), 'Manifest da marca ausente');
  if (manifestReference) {
    const manifestURL = new URL(manifestReference, origin);
    const manifestFile = await resolveLocal(manifestURL);
    check(Boolean(manifestFile), 'Arquivo do manifest não encontrado');
    if (manifestFile) {
      try {
        const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
        check(/Gislaine Duarte/.test(manifest.name ?? ''), 'Manifest com nome da marca divergente');
        check(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'Manifest sem ícones');
        for (const icon of manifest.icons ?? []) {
          await inspectReference(icon.src, manifestURL.href, 'manifest', pages);
          check(Boolean(icon.sizes) && Boolean(icon.type), 'Ícone do manifest sem sizes/type');
        }
      } catch (error) { errors.push(`Manifest JSON inválido: ${error.message}`); }
    }
  }
  for (const file of files.filter((candidate) => candidate.endsWith('.css'))) {
    const css = await readFile(file, 'utf8');
    const base = `${origin}/${path.relative(root, file).replaceAll('\\', '/')}`;
    for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
      if (!match[2].startsWith('#')) await inspectReference(match[2], base, path.relative(root, file), pages);
    }
  }

  const robotsFile = path.join(root, 'robots.txt');
  const robots = await readFile(robotsFile, 'utf8').catch(() => '');
  check(Boolean(robots), 'robots.txt ausente');
  check(/User-agent:\s*\*/i.test(robots), 'robots.txt sem regra geral de crawler');
  check(!/Disallow:\s*\/(?:assets|images|_astro)\/?\s*$/im.test(robots), 'robots.txt bloqueia assets essenciais');
  if (/Disallow:\s*\/\s*$/im.test(robots)) {
    warnings.push('robots.txt bloqueia rastreamento geral; confirmar ambiente antes do lançamento.');
    if (process.env.AUDIT_REQUIRE_INDEXABLE === '1') errors.push('robots.txt bloqueia rastreamento na auditoria de publicação');
  }
  const sitemapReferences = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map((match) => match[1]);
  check(sitemapReferences.length > 0, 'robots.txt não aponta para o sitemap');
  const sitemapURLs = new Set();
  const readSitemap = async (reference, visited = new Set()) => {
    if (visited.has(reference)) return;
    visited.add(reference);
    const url = new URL(reference, origin);
    check(url.origin === origin, `Sitemap aponta para domínio incorreto: ${reference}`);
    const file = await resolveLocal(url);
    check(Boolean(file), `Sitemap não existe: ${reference}`);
    if (!file) return;
    const xml = load(await readFile(file, 'utf8'), { xmlMode: true });
    if (xml('sitemapindex').length) {
      for (const loc of xml('sitemap > loc').toArray()) await readSitemap(xml(loc).text(), visited);
    } else {
      check(xml('urlset').length === 1, `Sitemap sem urlset válido: ${reference}`);
      for (const loc of xml('url > loc').toArray()) sitemapURLs.add(xml(loc).text().trim());
    }
  };
  for (const reference of sitemapReferences) await readSitemap(reference);
  for (const route of expectedRoutes) check(sitemapURLs.has(`${origin}${route}`), `Sitemap sem rota: ${route}`);
  for (const url of sitemapURLs) {
    check(expectedRoutes.some((route) => `${origin}${route}` === url), `URL indevida no sitemap: ${url}`);
    await inspectReference(url, origin, 'sitemap', pages);
  }

  const llms = await readFile(path.join(root, 'llms.txt'), 'utf8').catch(() => '');
  if (llms) {
    check(llms.includes('Gislaine Duarte'), 'llms.txt sem identificação profissional');
    for (const match of llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) await inspectReference(match[1], origin, 'llms.txt', pages);
  } else warnings.push('llms.txt não foi criado; arquivo opcional, sem impacto sobre a indexação convencional.');

  const bundle = [];
  for (const file of files.filter((candidate) => /\.(?:js|css|woff2|webp|avif)$/.test(candidate))) {
    const bytes = await readFile(file);
    bundle.push({ file: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.byteLength, gzipBytes: /\.(?:js|css)$/.test(file) ? gzipSync(bytes).byteLength : undefined });
  }
  bundle.sort((left, right) => right.bytes - left.bytes);
  const report = { generatedAt: new Date().toISOString(), origin, pages: reportPages, sitemapURLs: [...sitemapURLs], bundle, errors, warnings };
  const output = path.resolve('tests/artifacts');
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'site-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Auditoria: ${pages.size} páginas, ${sitemapURLs.size} URLs no sitemap, ${errors.length} erros, ${warnings.length} observações.`);
  for (const error of errors) console.error(`ERRO: ${error}`);
  for (const warning of warnings) console.warn(`OBS: ${warning}`);
  console.log('Relatório: tests/artifacts/site-audit.json');
  if (errors.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
