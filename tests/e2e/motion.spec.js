import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { assertContactLinks, assertNoHorizontalOverflow, observeFailures, settleLayout } from './helpers.js';

test.describe.configure({ timeout: 60_000 });

async function deviceCapabilities(page, { saveData = false, noWebGL = false } = {}) {
  await page.addInitScript(({ saveData, noWebGL }) => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 8 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 8 });
    const connection = navigator.connection ?? new EventTarget();
    Object.defineProperties(connection, {
      saveData: { configurable: true, value: saveData },
      effectiveType: { configurable: true, value: '4g' },
    });
    if (!navigator.connection) Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
    if (noWebGL) {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...options) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
        return Reflect.apply(original, this, [type, ...options]);
      };
    }
  }, { saveData, noWebGL });
}

function trackThreeRequests(page) {
  const requests = [];
  page.on('request', request => {
    if (/\/(?:three-core|three-renderer)[-.]/.test(new URL(request.url()).pathname)) requests.push(request.url());
  });
  return requests;
}

async function openNarrative(page, { webgl = false } = {}) {
  await page.goto('/');
  await settleLayout(page);
  await expect(page.locator('main')).toHaveAttribute('data-motion-scene', /hero|unfold/);
  await expect(page.locator('[data-journey-svg]')).toHaveAttribute('data-measured', 'true');
  await expect(page.locator('.hero')).toHaveAttribute('aria-busy', 'false');
  if (webgl) {
    if ((await page.locator('[data-world]').getAttribute('data-world-visible')) !== 'true') await approach(page, 0.04);
    await expect(page.locator('[data-world]')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15_000 });
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
  }
}

async function scrollTo(page, top) {
  await page.evaluate(async (target) => {
    window.scrollTo({ top: target, behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, top);
  await settleLayout(page);
}

async function landmarks(page) {
  return page.evaluate(() => {
    const box = selector => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Âncora ausente: ${selector}`);
      const bounds = element.getBoundingClientRect();
      return { top: bounds.top + scrollY, bottom: bounds.bottom + scrollY, height: bounds.height };
    };
    const grid = box('.approach-grid');
    const pinElement = document.querySelector(innerWidth < 768 ? '.approach-art' : '.approach-art-inner');
    const pinHeight = pinElement.getBoundingClientRect().height;
    const inset = Number.parseFloat(getComputedStyle(pinElement).top);
    if (!Number.isFinite(inset)) throw new Error('O pin ativo deve ter inset mensurável em CSS.');
    const pinStart = grid.top - inset;
    const pinEnd = Math.max(pinStart + 1, grid.bottom - pinHeight - inset);
    const storyAt = Math.max(pinEnd + 1, box('#sobre .story-art').top - innerHeight * 0.12);
    const servicesAt = Math.max(storyAt + 1, box('[data-motion-anchor="services"]').top - innerHeight * 0.28);
    const contact = box('[data-motion-anchor="contact"]');
    const contactAt = Math.max(servicesAt + 1, contact.top - innerHeight * 0.52);
    return {
      pinStart, pinEnd, storyAt, servicesAt, contactAt,
      contactComplete: contact.top - innerHeight * 0.05,
      maximum: document.documentElement.scrollHeight - innerHeight,
    };
  });
}

async function approach(page, progress) {
  const points = await landmarks(page);
  expect(points.pinEnd - points.pinStart, 'O pin precisa oferecer distância real de leitura').toBeGreaterThan(100);
  await scrollTo(page, points.pinStart + (points.pinEnd - points.pinStart) * progress);
  await expect(page.locator('main')).toHaveAttribute('data-motion-scene', 'approach');
  await expect.poll(async () => Math.abs(Number(await page.locator('main').getAttribute('data-motion-progress')) - progress)).toBeLessThan(0.025);
  return snapshot(page);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const world = document.querySelector('[data-world]');
    const worldBox = world.getBoundingClientRect();
    const path = document.querySelector('[data-journey-main]');
    return {
      scroll: scrollY,
      scene: main.dataset.motionScene,
      progress: Number(main.dataset.motionProgress),
      opening: Number(main.dataset.motionOpening),
      quality: document.documentElement.dataset.motionQuality,
      azimuth: Number(world.dataset.cameraAzimuth),
      distance: Number(world.dataset.cameraDistance),
      renders: Number(world.dataset.renderCount || 0),
      dpr: Number(world.dataset.dpr || 0),
      ready: world.dataset.webglReady === 'true',
      world: { x: worldBox.x, y: worldBox.y, width: worldBox.width, height: worldBox.height, transform: world.style.transform },
      parts: [...world.querySelectorAll('[data-world-part]')].map(part => {
        const matrix = part.transform.baseVal.consolidate()?.matrix;
        return {
          name: part.dataset.worldPart,
          transform: part.getAttribute('transform'),
          matrix: matrix ? [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f] : [],
        };
      }),
      path: path.getAttribute('d'),
      length: path.getTotalLength(),
      dash: Number(document.querySelector('[data-journey-mask-draw]').getAttribute('stroke-dashoffset')),
      front: document.querySelector('[data-journey-front]').getAttribute('transform'),
      branches: [...document.querySelectorAll('[data-journey-branch]')].map(branch => ({
        path: branch.getAttribute('d'),
        length: branch.getTotalLength(),
        dash: Number(branch.getAttribute('stroke-dashoffset')),
      })),
      returned: document.querySelector('[data-journey-return]').getAttribute('d'),
      returnDash: Number(document.querySelector('[data-journey-return]').getAttribute('stroke-dashoffset')),
      active: [...document.querySelectorAll('.pillar')].map(pillar => pillar.dataset.pillarActive === 'true'),
    };
  });
}

function changedParts(first, last) {
  return first.parts.filter((part, index) => {
    const next = last.parts[index];
    return part.matrix.some((value, component) => Math.abs(value - next.matrix[component]) > (component > 3 ? 1 : 0.005));
  }).length;
}

async function pixelDifference(first, last) {
  const [before, after] = await Promise.all([first, last].map(buffer => sharp(buffer).resize(160, 160).removeAlpha().raw().toBuffer()));
  let changed = 0;
  for (let index = 0; index < before.length; index += 3) {
    if (Math.abs(before[index] - after[index]) + Math.abs(before[index + 1] - after[index + 1]) + Math.abs(before[index + 2] - after[index + 2]) > 54) changed += 1;
  }
  return changed / (before.length / 3);
}

async function vectorIsVisible(page) {
  await expect(page.locator('[data-world-vector]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-world-mark]')).toBeVisible();
  await expect(page.locator('[data-world] canvas')).toHaveCount(0);
  await expect(page.locator('[data-brand-scene]')).toHaveAttribute('data-scene-state', 'fallback');
}

async function clickVisibleControl(page, control) {
  await expect(control).toBeInViewport();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  // Locator autoscroll can move a sticky header before the app receives its click.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('motion: quatro focos alteram poses e pixels do canvas, e o scroll reverso restaura a cena', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page);
  const failures = observeFailures(page);
  await openNarrative(page, { webgl: true });
  const hero = await snapshot(page);
  const frames = [];
  const images = [];
  for (const progress of [0.04, 1 / 3, 2 / 3, 0.96]) {
    const frame = await approach(page, progress);
    await expect(page.locator('[data-world]')).toHaveAttribute('data-world-visible', 'true');
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
    frames.push(frame);
    if (images.length === 0 || progress > 0.9) images.push(await page.locator('[data-world] canvas').screenshot({ animations: 'disabled' }));
  }
  expect(new Set(frames.map(frame => JSON.stringify(frame.parts))).size).toBe(4);
  expect(changedParts(frames[0], frames.at(-1))).toBeGreaterThanOrEqual(3);
  expect(Math.abs(frames.at(-1).azimuth - frames[0].azimuth)).toBeGreaterThan(0.5);
  expect(frames.at(-1).renders).toBeGreaterThan(frames[0].renders);
  expect(Math.abs(frames[0].world.x - hero.world.x) + Math.abs(frames[0].world.y - hero.world.y)).toBeGreaterThan(100);
  for (const [index, frame] of frames.entries()) {
    expect(frame.active.filter(Boolean)).toHaveLength(1);
    expect(frame.active[index]).toBe(true);
  }
  expect(await pixelDifference(images[0], images[1]), 'As poses precisam alterar pixels úteis, não apenas datasets').toBeGreaterThan(0.025);
  await testInfo.attach('pin-foco-inicial.png', { body: images[0], contentType: 'image/png' });
  await testInfo.attach('pin-foco-final.png', { body: images[1], contentType: 'image/png' });
  await testInfo.attach('poses-do-pin.json', { body: JSON.stringify(frames, null, 2), contentType: 'application/json' });
  const reverse = await approach(page, 0.04);
  expect(reverse.parts).toEqual(frames[0].parts);
  expect(reverse.azimuth).toBeCloseTo(frames[0].azimuth, 3);
  expect(reverse.world.width).toBeCloseTo(frames[0].world.width, 1);
  expect(reverse.world.y).toBeCloseTo(frames[0].world.y, 1);
  await assertNoHorizontalOverflow(page);
  expect(failures).toEqual([]);
});

test('motion: percurso medido conecta serviços, desenha ramos e se recompõe ao final', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page, { noWebGL: true });
  const failures = observeFailures(page);
  await openNarrative(page);
  const start = await snapshot(page);
  expect(start.length).toBeGreaterThan(2000);
  expect(start.path.match(/C/g)?.length).toBeGreaterThanOrEqual(4);
  const middle = await approach(page, 0.5);
  expect(middle.dash).toBeLessThan(start.dash);
  expect(middle.front).not.toEqual(start.front);
  const points = await landmarks(page);
  await scrollTo(page, points.servicesAt + (points.contactAt - points.servicesAt) * 0.12);
  await expect(page.locator('main')).toHaveAttribute('data-motion-scene', 'services');
  const services = await snapshot(page);
  expect(services.branches).toHaveLength(2);
  expect(services.branches[0].path).not.toEqual(services.branches[1].path);
  for (const branch of services.branches) {
    expect(branch.length).toBeGreaterThan(30);
    expect(branch.dash).toBeLessThan(0.1);
  }
  const terminals = await page.locator('[data-journey-terminal]').evaluateAll(nodes => nodes.map(node => ({ x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')) })));
  expect(Math.hypot(terminals[0].x - terminals[1].x, terminals[0].y - terminals[1].y)).toBeGreaterThan(100);
  await scrollTo(page, Math.min(points.maximum, points.contactComplete + 12));
  await expect(page.locator('main')).toHaveAttribute('data-motion-scene', 'recompose');
  const final = await snapshot(page);
  expect(final.opening).toBeLessThan(0.01);
  expect(final.returnDash).toBeLessThan(middle.returnDash);
  expect(final.returned).not.toEqual(middle.returned);
  expect(final.returned).toMatch(/Z$/);
  await expect(page.locator('.contact-band__actions a[href*="wa.me/"]')).toBeInViewport();
  await vectorIsVisible(page);
  await scrollTo(page, 0);
  const reset = await snapshot(page);
  expect(reset.path).toEqual(start.path);
  expect(reset.dash).toBeCloseTo(start.dash, 4);
  expect(reset.front).toEqual(start.front);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`motion: mobile capaz ${viewport.width}×${viewport.height} conserva 3D e espaço de leitura`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await deviceCapabilities(page);
    const failures = observeFailures(page);
    await openNarrative(page, { webgl: true });
    await expect(page.locator('html')).toHaveAttribute('data-motion-quality', 'mobile');
    const first = await approach(page, 0.12);
    const last = await approach(page, 0.87);
    expect(first.dpr).toBeGreaterThan(0);
    expect(first.dpr).toBeLessThanOrEqual(1.25);
    expect(last.renders).toBeGreaterThan(first.renders);
    expect(changedParts(first, last)).toBeGreaterThanOrEqual(3);
    const reading = await page.locator('.approach-art').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return { bottom: bounds.bottom, top: bounds.top, viewport: innerHeight, header: document.querySelector('.site-header').getBoundingClientRect().bottom };
    });
    expect(reading.top).toBeGreaterThanOrEqual(reading.header - 3);
    expect(reading.viewport - reading.bottom, 'A arte sticky deve deixar pelo menos 35% da tela para a leitura').toBeGreaterThan(viewport.height * 0.35);
    await assertNoHorizontalOverflow(page);
    await assertContactLinks(page);
    expect(failures).toEqual([]);
  });
}

test('motion: ausência de WebGL conserva transformação SVG sem importar Three', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await deviceCapabilities(page, { noWebGL: true });
  const failures = observeFailures(page);
  const three = trackThreeRequests(page);
  await openNarrative(page);
  const first = await approach(page, 0.18);
  await vectorIsVisible(page);
  const last = await approach(page, 0.79);
  expect(changedParts(first, last)).toBeGreaterThanOrEqual(3);
  expect(last.dash).toBeLessThan(first.dash);
  expect(last.front).not.toEqual(first.front);
  expect(last.world.transform).not.toBe('none');
  expect(three).toEqual([]);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('motion: saveData mantém narrativa vetorial e evita o pacote 3D', async ({ page }) => {
  await deviceCapabilities(page, { saveData: true });
  const three = trackThreeRequests(page);
  const failures = observeFailures(page);
  await openNarrative(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion-quality', 'lite');
  const first = await approach(page, 0.2);
  const last = await approach(page, 0.8);
  expect(changedParts(first, last)).toBeGreaterThanOrEqual(3);
  await vectorIsVisible(page);
  expect(three).toEqual([]);
  expect(failures).toEqual([]);
});

test('motion: reduced inicial não estica o pin e deixa foto, símbolo e links imediatos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await deviceCapabilities(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const failures = observeFailures(page);
  const three = trackThreeRequests(page);
  await openNarrative(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion-quality', 'reduced');
  await expect(page.locator('[data-world] canvas')).toHaveCount(0);
  await expect(page.locator('.hero .portrait')).toHaveCSS('clip-path', 'none');
  const initial = await snapshot(page);
  for (const selector of ['#abordagem', '#sobre', '#atendimentos', '.contact-band']) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await settleLayout(page);
    const state = await snapshot(page);
    expect(state.parts).toEqual(initial.parts);
    expect(state.opening).toBe(0);
    expect(state.azimuth).toBe(initial.azimuth);
  }
  const pin = await page.locator('.approach-art, .approach-art-inner').evaluateAll(elements => elements.map(element => getComputedStyle(element).position));
  expect(pin).not.toContain('sticky');
  const minimums = await page.locator('.pillar').evaluateAll(elements => elements.map(element => Number.parseFloat(getComputedStyle(element).minHeight)));
  expect(minimums.every(value => value === 0)).toBe(true);
  expect(three).toEqual([]);
  await assertNoHorizontalOverflow(page);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('motion: alternar preferência descarta contexto e restaura apenas um canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page);
  const failures = observeFailures(page);
  await openNarrative(page, { webgl: true });
  await approach(page, 0.45);
  for (let round = 0; round < 2; round += 1) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-world] canvas')).toHaveCount(0);
    await expect(page.locator('[data-world]')).not.toHaveAttribute('data-webgl-ready', 'true');
    await expect(page.locator('[data-brand-scene]')).toHaveAttribute('data-scene-state', 'fallback');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await approach(page, 0.45);
    await expect(page.locator('[data-world]')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15_000 });
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
  }
  expect(failures).toEqual([]);
});

test('motion: perda real de contexto devolve SVG sem bloquear o contato', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page);
  const failures = observeFailures(page);
  await openNarrative(page, { webgl: true });
  await approach(page, 0.4);
  const lost = await page.locator('[data-world] canvas').evaluate(canvas => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(lost, 'Chromium de teste deve disponibilizar WEBGL_lose_context').toBe(true);
  await vectorIsVisible(page);
  const first = await snapshot(page);
  const next = await approach(page, 0.7);
  expect(changedParts(first, next)).toBeGreaterThanOrEqual(3);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('motion: motor para ocioso e com documento oculto, retomando por invalidação', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page);
  await openNarrative(page, { webgl: true });
  await approach(page, 0.4);
  await settleLayout(page);
  const idle = Number(await page.locator('[data-world]').getAttribute('data-render-count'));
  await page.waitForTimeout(1000);
  expect(Number(await page.locator('[data-world]').getAttribute('data-render-count'))).toBe(idle);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.scrollBy({ top: 35, behavior: 'instant' });
  });
  await page.waitForTimeout(350);
  expect(Number(await page.locator('[data-world]').getAttribute('data-render-count'))).toBe(idle);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => Number(await page.locator('[data-world]').getAttribute('data-render-count'))).toBeGreaterThan(idle);
  await expect(page.locator('[data-world] canvas')).toHaveCount(1);
});

test('motion: resize recalcula path e poses sem duplicar canvas nem criar overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page);
  const failures = observeFailures(page);
  await openNarrative(page, { webgl: true });
  const desktop = await approach(page, 0.5);
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await settleLayout(page);
    const current = await approach(page, 0.5);
    await expect(page.locator('[data-world]')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15_000 });
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
    expect(current.length).toBeGreaterThan(1000);
    expect(current.path).not.toMatch(/NaN|Infinity/);
    if (viewport.width !== 1440) expect(current.path).not.toEqual(desktop.path);
    await assertNoHorizontalOverflow(page);
  }
  expect(failures).toEqual([]);
});

test('motion: menu coreografado fecha, restaura foco e preserva o pin após interrupção', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await deviceCapabilities(page);
  const failures = observeFailures(page);
  await openNarrative(page, { webgl: true });
  await approach(page, 0.5);
  const before = await snapshot(page);
  const trigger = page.getByRole('button', { name: 'Abrir menu', exact: true });
  const dialog = page.locator('#navigation-dialog');
  await clickVisibleControl(page, trigger);
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeFocused();
  await expect(dialog).toHaveAttribute('data-motion-phase', /opening|open/);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(before.scroll, 0);
  const returned = await snapshot(page);
  expect(returned.parts).toEqual(before.parts);
  await clickVisibleControl(page, trigger);
  await expect(dialog).toHaveAttribute('data-motion-phase', 'open');
  const links = dialog.locator('a[href], button');
  await links.last().focus();
  await page.keyboard.press('Tab');
  await expect(links.first()).toBeFocused();
  await links.first().focus();
  await page.keyboard.press('Shift+Tab');
  await expect(links.last()).toBeFocused();
  await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(page.locator('[data-world] canvas')).toHaveCount(1);
  expect(failures).toEqual([]);
});

test('motion: transições repetidas, reload e histórico não deixam cobertura ou erros', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page);
  const failures = observeFailures(page);
  await openNarrative(page, { webgl: true });
  for (const path of ['/atendimentos/consulta-nutricional/', '/atendimentos/ciclos-de-acompanhamento/', '/atendimentos/consulta-nutricional/']) {
    await page.locator(`#atendimentos a[href="${path}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('data-motion-scene', 'service-detail');
    await expect(page.locator('[data-world]')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15_000 });
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
    await assertContactLinks(page);
    expect((await page.reload())?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#atendimentos')).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('main h1')).toBeVisible();
    await page.locator('.site-header .wordmark').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-journey-svg]')).toHaveAttribute('data-measured', 'true');
    await expect(page.locator('.hero .portrait')).toBeVisible();
    const blockers = await page.evaluate(() => [...document.querySelectorAll('.route-veil')].filter(element => {
      const style = getComputedStyle(element);
      return !element.hidden && style.display !== 'none' && !/ellipse\(0(?:px|%)/.test(style.clipPath);
    }).length);
    expect(blockers, 'Uma cobertura de saída não pode permanecer sobre o novo documento').toBe(0);
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
  }
  expect(failures).toEqual([]);
});

test('motion: fonte tardia após deadline não reabre o loading enquanto a fotografia continua pendente', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await deviceCapabilities(page, { saveData: true });
  const failures = observeFailures(page);
  let releaseFonts;
  let releaseImages;
  let fontRequests = 0;
  let imageRequests = 0;
  const fontGate = new Promise(resolve => { releaseFonts = resolve; });
  const imageGate = new Promise(resolve => { releaseImages = resolve; });
  await page.route('**/fonts/*.woff2', async route => {
    fontRequests += 1;
    await fontGate;
    await route.continue();
  });
  await page.route('**/images/gislaine-duarte-*', async route => {
    imageRequests += 1;
    await imageGate;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => fontRequests).toBeGreaterThan(0);
    await expect.poll(() => imageRequests).toBeGreaterThan(0);
    const hero = page.locator('.hero');
    await expect(hero).toHaveAttribute('aria-busy', 'false', { timeout: 6000 });
    await expect(page.getByRole('link', { name: 'Falar com a Nutri Gi', exact: true }).first()).toBeVisible();
    const settledBirth = await hero.evaluate(element => {
      window.__giLateAssetStates = [];
      new MutationObserver(() => window.__giLateAssetStates.push(element.getAttribute('aria-busy'))).observe(element, { attributes: true, attributeFilter: ['aria-busy'] });
      return Number(element.style.getPropertyValue('--portrait-birth'));
    });
    releaseFonts();
    await page.evaluate(() => document.fonts.ready);
    await settleLayout(page);
    await expect(hero).toHaveAttribute('aria-busy', 'false');
    const late = await hero.evaluate(element => ({
      states: window.__giLateAssetStates,
      birth: Number(element.style.getPropertyValue('--portrait-birth')),
      imagePending: !element.querySelector('img').complete,
    }));
    expect(late.imagePending).toBe(true);
    expect(late.states).not.toContain('true');
    expect(late.birth).toBeGreaterThanOrEqual(settledBirth);
    releaseImages();
    await page.waitForLoadState('load');
    await expect.poll(() => hero.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await expect(hero).toHaveAttribute('aria-busy', 'false');
    await assertContactLinks(page);
    expect(failures).toEqual([]);
  } finally {
    releaseFonts();
    releaseImages();
  }
});

test('motion: resize durante import 3D pendente descarta geração antiga e conclui a geração mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deviceCapabilities(page);
  const failures = observeFailures(page);
  let releaseModule;
  let moduleRequests = 0;
  const moduleGate = new Promise(resolve => { releaseModule = resolve; });
  await page.route('**/assets/sculpture-*.js', async route => {
    moduleRequests += 1;
    if (moduleRequests === 1) await moduleGate;
    await route.continue();
  });
  try {
    await openNarrative(page);
    await expect.poll(() => moduleRequests).toBeGreaterThan(0);
    await expect(page.locator('[data-brand-scene]')).toHaveAttribute('data-scene-state', 'loading');
    await expect(page.locator('[data-world] canvas')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await settleLayout(page);
    await approach(page, 0.2);
    await expect(page.locator('html')).toHaveAttribute('data-motion-quality', 'mobile');
    await expect(page.locator('[data-world]')).toHaveAttribute('data-world-visible', 'true');
    await expect(page.locator('[data-world] canvas')).toHaveCount(0);
    releaseModule();
    await expect(page.locator('[data-world]')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15_000 });
    await expect(page.locator('[data-brand-scene]')).toHaveAttribute('data-scene-state', 'enhanced');
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
    const buffer = await page.locator('[data-world] canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    expect(buffer.width).toBeLessThanOrEqual(550);
    expect(buffer.height).toBeLessThanOrEqual(550);
    expect(Number(await page.locator('[data-world]').getAttribute('data-dpr'))).toBeLessThanOrEqual(1.25);
    const first = await snapshot(page);
    const next = await approach(page, 0.65);
    expect(next.renders).toBeGreaterThan(first.renders);
    await assertNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  } finally {
    releaseModule();
  }
});
