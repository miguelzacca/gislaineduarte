import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { assertContactLinks, assertNoHorizontalOverflow, observeFailures, settleLayout } from './helpers.js';

test.describe.configure({ mode: 'default', timeout: 60_000 });

const INTRO_KEY = 'gislaine:intro:v1';
const TAB_KEY = 'gislaine:intro:tab:v1';
const phases = ['fragments', 'drawing', 'depth', 'assembled', 'handoff'];

async function installProbe(page, { saveData = false, noWebGL = false, noWorker = false, blockedStorage = false, captureGpu = false } = {}) {
  await page.addInitScript(({ saveData, noWebGL, noWorker, blockedStorage, captureGpu }) => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 8 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 8 });
    const connection = navigator.connection ?? new EventTarget();
    Object.defineProperties(connection, {
      saveData: { configurable: true, value: saveData },
      effectiveType: { configurable: true, value: '4g' },
    });
    if (!navigator.connection) Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
    if (noWorker) {
      Object.defineProperty(window, 'Worker', { configurable: true, value: undefined });
      Object.defineProperty(window, 'OffscreenCanvas', { configurable: true, value: undefined });
      Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', { configurable: true, value: undefined });
    }
    if (blockedStorage) Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() { throw new DOMException('Storage disabled by the test', 'SecurityError'); },
    });
    if (noWebGL) {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(kind)) return null;
        return Reflect.apply(original, this, [kind, ...options]);
      };
    }

    const audit = { states: [], phases: [], samples: [], regressions: [], maximumCanvases: 0, uniqueCanvases: 0, rafRequested: 0, rafCompleted: 0, gpuReady: null, gpuVisible: null, captures: {} };
    window.__giIntroAudit = audit;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      audit.rafRequested += 1;
      return request(time => { audit.rafCompleted += 1; callback(time); captureFrame(); });
    };
    function renderedFrame(world, overlay) {
      const canvas = world?.querySelector('canvas');
      const worker = canvas?.dataset.rendererThread === 'worker';
      return {
        canvas,
        ready: worker ? canvas.dataset.workerReady === 'true' : world?.dataset.webglReady === 'true',
        phase: worker ? canvas.dataset.workerPhase : overlay.dataset.phase,
        progress: Number(worker ? canvas.dataset.workerProgress : overlay.dataset.progress),
        azimuth: Number(worker ? canvas.dataset.workerAzimuth : world?.dataset.cameraAzimuth),
        distance: Number(worker ? canvas.dataset.workerDistance : world?.dataset.cameraDistance),
        renders: Number(worker ? canvas.dataset.workerRenderCount : world?.dataset.renderCount || 0),
        thread: worker ? 'worker' : 'main',
      };
    }
    function captureFrame() {
      if (!captureGpu || audit.captures.depth && audit.captures.assembled) return;
      const overlay = document.querySelector('[data-intro-overlay]');
      if (!overlay) return;
      const world = document.querySelector('[data-world]');
      const rendered = renderedFrame(world, overlay);
      const { canvas, phase, progress } = rendered;
      if (!['depth', 'assembled'].includes(phase) || audit.captures[phase]) return;
      if (progress < (phase === 'depth' ? 0.47 : 0.69)) return;
      const opacity = Number(world?.style.opacity || 0);
      if (!canvas || !rendered.ready || opacity < 0.15) return;
      audit.captures[phase] = {
        at: performance.now(), progress, opacity, azimuth: rendered.azimuth, distance: rendered.distance,
        thread: rendered.thread, renders: rendered.renders, controllerPhase: overlay.dataset.phase,
        width: canvas.width, height: canvas.height, image: canvas.toDataURL('image/png'),
      };
    }
    const canvases = new Set();
    let previousState;
    let previousPhase;
    let previousProgress = -1;
    let sampledProgress = -1;
    const record = () => {
      const state = document.documentElement?.dataset.introState;
      if (state && state !== previousState) {
        audit.states.push({ state, at: performance.now() });
        previousState = state;
      }
      const mounted = [...document.querySelectorAll('[data-world] canvas')];
      audit.maximumCanvases = Math.max(audit.maximumCanvases, mounted.length);
      mounted.forEach(canvas => canvases.add(canvas));
      audit.uniqueCanvases = canvases.size;
      const overlay = document.querySelector('[data-intro-overlay]');
      if (!overlay || !['playing', 'leaving'].includes(state)) return;
      const progress = Number(overlay.dataset.progress || 0);
      const phase = overlay.dataset.phase;
      const world = document.querySelector('[data-world]');
      const rendered = renderedFrame(world, overlay);
      if (rendered.ready) {
        const ready = { at: performance.now(), progress: rendered.progress, phase: rendered.phase, controllerPhase: phase, thread: rendered.thread, opacity: Number(world.style.opacity || 0), renders: rendered.renders };
        audit.gpuReady ??= ready;
        if (ready.opacity >= 0.15) audit.gpuVisible ??= ready;
      }
      if (progress < previousProgress - 0.02) audit.regressions.push({ before: previousProgress, after: progress });
      previousProgress = progress;
      const newPhase = phase && phase !== previousPhase;
      if (newPhase) { audit.phases.push(phase); previousPhase = phase; }
      if (!newPhase && progress - sampledProgress < 0.12) return;
      sampledProgress = progress;
      const rect = world?.getBoundingClientRect();
      audit.samples.push({
        at: performance.now(), phase, progress,
        strokes: [...overlay.querySelectorAll('[data-intro-stroke]')].map(node => getComputedStyle(node).strokeDashoffset),
        planes: [...overlay.querySelectorAll('[data-intro-part]')].map(node => getComputedStyle(node).transform),
        world: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, transform: world.style.transform } : null,
        camera: world ? { azimuth: Number(world.dataset.cameraAzimuth), distance: Number(world.dataset.cameraDistance) } : null,
        parts: [...(world?.querySelectorAll('[data-world-part]') ?? [])].map(node => node.getAttribute('transform')),
        rendered: Number(world?.dataset.renderCount || 0),
      });
    };
    new MutationObserver(record).observe(document, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-intro-state', 'data-phase', 'data-progress', 'data-webgl-ready', 'data-worker-ready', 'data-worker-phase', 'data-worker-progress', 'data-worker-render-count'],
    });
    record();
  }, { saveData, noWebGL, noWorker, blockedStorage, captureGpu });
}

async function startIntro(page, options = {}) {
  await installProbe(page, options);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-intro-state', 'playing');
  await expect(page.locator('[data-intro-overlay]')).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('data-motion-scene', 'intro');
}

async function waitProgress(page, progress) {
  await expect.poll(async () => Number(await page.locator('[data-intro-overlay]').getAttribute('data-progress'))).toBeGreaterThanOrEqual(progress);
}

async function assertReleased(page, { storage = true, interrupted = false } = {}) {
  await expect(page.locator('html')).toHaveAttribute('data-intro-state', 'seen', { timeout: 8500 });
  await expect(page.locator('[data-intro-overlay]')).toBeHidden();
  await expect(page.locator('main')).not.toHaveAttribute('data-motion-scene', 'intro');
  await expect(page.locator('main h1')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector('main');
    return !main.closest('[inert]') && getComputedStyle(document.body).overflowY !== 'hidden' && getComputedStyle(document.documentElement).overflowY !== 'hidden';
  })).toBe(true);
  if (storage) {
    const status = await page.evaluate(key => sessionStorage.getItem(key), INTRO_KEY);
    expect(interrupted ? ['playing', 'seen'] : ['seen']).toContain(status);
  }
}

async function skipIntro(page, method = 'button', options = {}) {
  await waitProgress(page, method === 'escape' ? 0.06 : 0.17);
  const button = page.locator('[data-intro-skip]');
  if (method !== 'escape') {
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.focus();
  }
  const started = await page.evaluate(() => performance.now());
  if (method === 'escape') await page.keyboard.press('Escape');
  else await button.click();
  await assertReleased(page, options);
  const elapsed = await page.evaluate(start => performance.now() - start, started);
  expect(elapsed, 'Pular não deve aguardar o restante da sequência de cinco segundos').toBeLessThan(1100);
  await expect.poll(() => page.evaluate(() => {
    const focused = document.activeElement;
    return focused !== document.body && !focused?.closest('[data-intro-overlay]') && !focused?.closest('[inert]');
  })).toBe(true);
  return elapsed;
}

function threeRequests(page) {
  const requests = [];
  page.on('request', request => {
    if (/\/(?:three-core|three-renderer)[-.]|\/node_modules\/.*three|\/src\/motion\/sculpture\.js/.test(new URL(request.url()).pathname)) requests.push(request.url());
  });
  return requests;
}

async function difference(before, after) {
  const buffers = await Promise.all([before, after].map(image => sharp(image).resize(128, 128).removeAlpha().raw().toBuffer()));
  let changed = 0;
  for (let index = 0; index < buffers[0].length; index += 3) {
    const delta = [0, 1, 2].reduce((sum, channel) => sum + Math.abs(buffers[0][index + channel] - buffers[1][index + channel]), 0);
    if (delta > 54) changed += 1;
  }
  return changed / (buffers[0].length / 3);
}

async function paintedFraction(image) {
  const pixels = await sharp(image).resize(128, 128).ensureAlpha().raw().toBuffer();
  let painted = 0;
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 16) painted += 1;
  return painted / (pixels.length / 4);
}

test('intro: primeira visita percorre cinco fases, muda geometria e câmera e entrega o mesmo canvas à hero', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const failures = observeFailures(page);
  await startIntro(page, { captureGpu: true });
  expect(await page.evaluate(key => sessionStorage.getItem(key), INTRO_KEY)).toBe('playing');
  await assertReleased(page);
  const audit = await page.evaluate(() => window.__giIntroAudit);
  const { captures, ...evidence } = audit;
  const captureMetadata = Object.fromEntries(Object.entries(captures).map(([phase, { image: _image, ...metadata }]) => [phase, metadata]));
  await testInfo.attach('intro-fases-e-geometria.json', { body: JSON.stringify({ ...evidence, captures: captureMetadata }, null, 2), contentType: 'application/json' });
  expect(audit.gpuVisible, 'Um frame GPU perceptível deve existir durante a construção, registrado sem atraso de polling').not.toBeNull();
  expect(audit.gpuVisible.phase).toBe('depth');
  expect(audit.gpuVisible.controllerPhase).toBe('depth');
  expect(audit.gpuVisible.progress).toBeLessThan(2 / 3);
  expect(audit.gpuVisible.renders).toBeGreaterThan(0);
  expect(Object.keys(captures)).toEqual(['depth', 'assembled']);
  const first = Buffer.from(captures.depth.image.split(',')[1], 'base64');
  const second = Buffer.from(captures.assembled.image.split(',')[1], 'base64');
  await testInfo.attach('intro-escultura-depth.png', { body: first, contentType: 'image/png' });
  await testInfo.attach('intro-escultura-assembled.png', { body: second, contentType: 'image/png' });
  expect(await paintedFraction(first), 'Depth deve conter pixels reais, não um placeholder transparente').toBeGreaterThan(0.01);
  expect(await paintedFraction(second), 'Assembled deve conter pixels reais, não um placeholder transparente').toBeGreaterThan(0.01);
  expect(Math.abs(captures.depth.azimuth - captures.assembled.azimuth), 'A câmera renderizada, confirmada por ACK no worker, deve mudar entre as poses').toBeGreaterThan(0.1);
  const playing = audit.states.find(entry => entry.state === 'playing');
  const seen = audit.states.find(entry => entry.state === 'seen');
  expect(seen.at - playing.at).toBeGreaterThanOrEqual(4700);
  expect(seen.at - playing.at).toBeLessThanOrEqual(6350);
  expect(audit.states.filter(entry => entry.state === 'playing')).toHaveLength(1);
  expect(audit.phases).toEqual(phases);
  expect(audit.regressions).toEqual([]);
  expect(audit.maximumCanvases).toBe(1);
  expect(audit.uniqueCanvases, 'StrictMode e handoff devem conservar um canvas montado').toBe(1);
  expect(new Set(audit.samples.map(sample => JSON.stringify(sample.strokes))).size).toBeGreaterThan(3);
  expect(new Set(audit.samples.map(sample => JSON.stringify(sample.planes))).size).toBeGreaterThan(3);
  const azimuths = audit.samples.map(sample => sample.camera?.azimuth).filter(Number.isFinite);
  expect(Math.max(...azimuths) - Math.min(...azimuths)).toBeGreaterThan(0.15);
  const worldPoses = audit.samples.filter(sample => sample.world).map(sample => sample.world.transform);
  expect(new Set(worldPoses).size).toBeGreaterThan(3);
  expect(await difference(first, second), 'A câmera e a geometria devem alterar pixels visíveis da escultura').toBeGreaterThan(0.02);
  await expect(page.locator('[data-world] canvas')).toHaveCount(1);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('intro: refresh interrompido, retorno interno e refresh visto não repetem; limpar sessão permite repetir', async ({ page }) => {
  const failures = observeFailures(page);
  await startIntro(page, { saveData: true });
  await waitProgress(page, 0.12);
  expect(await page.evaluate(key => sessionStorage.getItem(key), INTRO_KEY)).toBe('playing');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertReleased(page, { interrupted: true });
  expect(await page.evaluate(() => window.__giIntroAudit.states.some(entry => entry.state === 'playing'))).toBe(false);
  await page.goto('/sobre/');
  await expect(page.locator('[data-intro-overlay]')).toHaveCount(0);
  await page.locator('.site-header .wordmark').click();
  await assertReleased(page, { interrupted: true });
  expect(await page.evaluate(() => window.__giIntroAudit.states.some(entry => entry.state === 'playing'))).toBe(false);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-intro-state', 'playing');
  await skipIntro(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertReleased(page);
  expect(await page.evaluate(() => window.__giIntroAudit.states.some(entry => entry.state === 'playing'))).toBe(false);
  expect(failures).toEqual([]);
});

test('intro: abas novas, inclusive com opener e sessão clonada, têm uma abertura própria', async ({ page, context }) => {
  await startIntro(page, { saveData: true });
  await skipIntro(page);
  const originalTab = await page.evaluate(key => sessionStorage.getItem(key), TAB_KEY);
  const independent = await context.newPage();
  try {
    await startIntro(independent, { saveData: true });
    expect(await independent.evaluate(key => sessionStorage.getItem(key), TAB_KEY)).not.toBe(originalTab);
    await skipIntro(independent);
  } finally { await independent.close(); }
  await context.addInitScript(() => {
    const connection = navigator.connection;
    if (connection) Object.defineProperty(connection, 'saveData', { configurable: true, value: true });
  });
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => { window.open('/', '_blank'); });
  const popup = await popupPromise;
  try {
    await expect(popup.locator('html')).toHaveAttribute('data-intro-state', 'playing');
    expect(await popup.evaluate(key => sessionStorage.getItem(key), TAB_KEY)).not.toBe(originalTab);
    expect(await page.evaluate(key => sessionStorage.getItem(key), INTRO_KEY)).toBe('seen');
    await skipIntro(popup);
    await popup.reload({ waitUntil: 'domcontentloaded' });
    await assertReleased(popup);
  } finally { await popup.close(); }
});

test('intro: botão e Escape interrompem com foco restaurado e alvo confortável no celular', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const failures = observeFailures(page);
  await startIntro(page, { saveData: true });
  await waitProgress(page, 0.17);
  const target = await page.locator('[data-intro-skip]').boundingBox();
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.width).toBeGreaterThanOrEqual(44);
  const buttonTime = await skipIntro(page);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-intro-state', 'playing');
  const escapeTime = await skipIntro(page, 'escape');
  await testInfo.attach('intro-tempo-de-interrupcao.json', { body: JSON.stringify({ buttonTime, escapeTime }), contentType: 'application/json' });
  await assertNoHorizontalOverflow(page);
  expect(failures).toEqual([]);
});

test('intro: Escape responde durante inicialização GPU no worker e a hero herda ou libera um único renderer', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installProbe(page);
  const failures = observeFailures(page);
  let maximumWorkers = 0;
  const workerEvents = [];
  const sculptureWorkers = () => page.workers().filter(worker => worker.url().includes('sculpture-worker'));
  page.on('worker', worker => {
    if (!worker.url().includes('sculpture-worker')) return;
    maximumWorkers = Math.max(maximumWorkers, sculptureWorkers().length);
    workerEvents.push({ event: 'created', url: worker.url() });
    worker.on('close', () => workerEvents.push({ event: 'closed', url: worker.url() }));
  });
  const workerCreated = page.waitForEvent('worker', { predicate: worker => worker.url().includes('sculpture-worker'), timeout: 10_000 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await workerCreated;
  const pending = await page.evaluate(() => ({
    at: performance.now(),
    state: document.documentElement.dataset.introState,
    quality: document.documentElement.dataset.motionQuality,
    renderer: document.querySelector('[data-brand-scene]')?.dataset.sceneState,
    ready: document.querySelector('[data-world]')?.dataset.webglReady === 'true',
    progress: Number(document.querySelector('[data-intro-overlay]')?.dataset.progress || 0),
  }));
  expect(pending.state).toBe('playing');
  expect(pending.quality).toBe('full');
  expect(pending.renderer, 'A fábrica GPU real deve estar pendente, não apenas uma intro já pronta').toBe('loading');
  expect(pending.ready).toBe(false);
  await page.keyboard.press('Escape');
  await assertReleased(page);
  const elapsed = await page.evaluate(start => performance.now() - start, pending.at);
  expect(elapsed, 'Compilar a escultura no worker não pode atrasar a interação na main thread').toBeLessThan(1100);
  await expect(page.locator('main')).toBeFocused();
  await page.evaluate(() => window.scrollTo({ top: 240, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await expect(page.locator('[data-brand-scene]')).toHaveAttribute('data-scene-state', /enhanced|fallback/, { timeout: 12_000 });
  const enhanced = await page.locator('[data-brand-scene]').getAttribute('data-scene-state') === 'enhanced';
  if (enhanced) {
    await expect(page.locator('[data-world] canvas')).toHaveCount(1);
    await expect(page.locator('[data-world] canvas')).toHaveAttribute('data-renderer-thread', 'worker');
    expect(sculptureWorkers()).toHaveLength(1);
  } else {
    await expect(page.locator('[data-world] canvas')).toHaveCount(0);
    await expect.poll(() => sculptureWorkers().length).toBe(0);
    await expect(page.locator('[data-world-vector]')).toHaveCSS('opacity', '1');
  }
  await page.waitForTimeout(350);
  const audit = await page.evaluate(() => window.__giIntroAudit);
  expect(audit.states.filter(entry => entry.state === 'playing')).toHaveLength(1);
  expect(audit.maximumCanvases).toBeLessThanOrEqual(1);
  expect(maximumWorkers).toBe(1);
  await expect(page.locator('[data-intro-overlay]')).toBeHidden();
  await testInfo.attach('intro-skip-gpu-inicializando.json', { body: JSON.stringify({ pending, elapsed, enhanced, maximumWorkers, workerEvents, states: audit.states }, null, 2), contentType: 'application/json' });
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('intro: sem Worker e OffscreenCanvas o fallback main ou SVG mantém a entrada e o contato funcionais', async ({ page }) => {
  const failures = observeFailures(page);
  await startIntro(page, { noWorker: true });
  await assertReleased(page);
  expect(await page.evaluate(() => typeof Worker === 'undefined' && typeof OffscreenCanvas === 'undefined')).toBe(true);
  expect(page.workers().filter(worker => worker.url().includes('sculpture-worker'))).toEqual([]);
  await expect(page.locator('[data-brand-scene]')).toHaveAttribute('data-scene-state', /enhanced|fallback/, { timeout: 10_000 });
  const canvas = page.locator('[data-world] canvas');
  if (await canvas.count()) {
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute('data-renderer-thread', 'main');
  } else {
    await expect(page.locator('[data-world-vector]')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-world-mark]')).toBeVisible();
  }
  await assertNoHorizontalOverflow(page);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('intro: storage bloqueado não lança erro, duplica a sequência ou prende a navegação', async ({ page }) => {
  const failures = observeFailures(page);
  await startIntro(page, { blockedStorage: true, saveData: true });
  await skipIntro(page, 'escape', { storage: false });
  await page.setViewportSize({ width: 430, height: 932 });
  await settleLayout(page);
  expect(await page.evaluate(() => window.__giIntroAudit.states.filter(entry => entry.state === 'playing').length)).toBe(1);
  await assertReleased(page, { storage: false });
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('intro: movimento reduzido evita a abertura e sua ativação durante a sequência libera a página', async ({ page, context }) => {
  await installProbe(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = threeRequests(page);
  const failures = observeFailures(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await assertReleased(page);
  expect(await page.evaluate(() => window.__giIntroAudit.states.some(entry => ['pending', 'playing'].includes(entry.state)))).toBe(false);
  await expect(page.locator('[data-world] canvas')).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertReleased(page);
  const active = await context.newPage();
  try {
    await startIntro(active, { saveData: true });
    await waitProgress(active, 0.2);
    await active.emulateMedia({ reducedMotion: 'reduce' });
    await assertReleased(active);
    await active.emulateMedia({ reducedMotion: 'no-preference' });
    await assertReleased(active);
    expect(await active.evaluate(() => window.__giIntroAudit.states.filter(entry => entry.state === 'playing').length)).toBe(1);
  } finally { await active.close(); }
  expect(failures).toEqual([]);
});

for (const mode of [{ name: 'economia de dados', saveData: true }, { name: 'WebGL indisponível', noWebGL: true }]) {
  test(`intro: ${mode.name} conserva construção e handoff vetoriais sem importar Three`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = observeFailures(page);
    const requests = threeRequests(page);
    await startIntro(page, mode);
    await assertReleased(page);
    const audit = await page.evaluate(() => window.__giIntroAudit);
    expect(audit.phases).toEqual(phases);
    expect(audit.regressions).toEqual([]);
    expect(new Set(audit.samples.map(sample => JSON.stringify(sample.strokes))).size).toBeGreaterThan(3);
    expect(new Set(audit.samples.map(sample => JSON.stringify(sample.parts))).size).toBeGreaterThan(3);
    expect(audit.maximumCanvases).toBe(0);
    await expect(page.locator('[data-world-vector]')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-world-mark]')).toBeVisible();
    expect(requests).toEqual([]);
    await testInfo.attach('intro-fallback-fases.json', { body: JSON.stringify(audit, null, 2), contentType: 'application/json' });
    await assertNoHorizontalOverflow(page);
    await assertContactLinks(page);
    expect(failures).toEqual([]);
  });
}

test('intro: fontes lentas e falhas de foto/3D respeitam deadline e não reabrem a cobertura', async ({ page }) => {
  const failures = observeFailures(page);
  const failedRequests = [];
  page.on('requestfailed', request => failedRequests.push(request.url()));
  let releaseFonts;
  let releaseImages;
  let fonts = 0;
  let images = 0;
  const fontGate = new Promise(resolve => { releaseFonts = resolve; });
  const imageGate = new Promise(resolve => { releaseImages = resolve; });
  await page.route(/\.woff2(?:\?.*)?$/, async route => { fonts += 1; await fontGate; await route.continue(); });
  await page.route('**/images/gislaine-duarte-*', async route => { images += 1; await imageGate; await route.abort('failed'); });
  await page.route(/\/(?:assets\/sculpture-[^/]+\.js|src\/motion\/sculpture\.js)(?:\?.*)?$/, route => route.abort('failed'));
  try {
    await startIntro(page);
    await expect.poll(() => fonts).toBeGreaterThan(0);
    await expect.poll(() => images).toBeGreaterThan(0);
    await assertReleased(page);
    const before = await page.evaluate(() => ({ states: window.__giIntroAudit.states.length, imagePending: !document.querySelector('.hero img').complete }));
    expect(before.imagePending).toBe(true);
    releaseFonts();
    await page.evaluate(() => document.fonts.ready);
    releaseImages();
    await page.waitForLoadState('load');
    await expect.poll(() => page.locator('.hero img').evaluate(image => image.complete)).toBe(true);
    await expect(page.locator('.hero')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-world] canvas')).toHaveCount(0);
    await assertReleased(page);
    expect(await page.evaluate(() => window.__giIntroAudit.states.length)).toBe(before.states);
    expect(failedRequests.some(url => url.includes('/images/gislaine-duarte-'))).toBe(true);
    expect(failures.filter(message => !/^Console: Failed to load resource: net::ERR_FAILED$/.test(message))).toEqual([]);
    await assertContactLinks(page);
  } finally { releaseFonts(); releaseImages(); }
});

test('intro: resize mantém um canvas e o fim limpa RAF, foco modal e bloqueio de scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const failures = observeFailures(page);
  await startIntro(page);
  await waitProgress(page, 0.2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-intro-overlay]')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await waitProgress(page, 0.45);
  await page.setViewportSize({ width: 768, height: 500 });
  await expect(page.locator('[data-intro-overlay]')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await assertReleased(page);
  await settleLayout(page);
  await expect(page.locator('[data-world]')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 10_000 });
  await expect(page.locator('[data-world] canvas')).toHaveCount(1);
  await page.waitForTimeout(350);
  const before = await page.evaluate(() => ({ raf: window.__giIntroAudit.rafRequested, rendered: document.querySelector('[data-world]').dataset.renderCount }));
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ raf: window.__giIntroAudit.rafRequested, rendered: document.querySelector('[data-world]').dataset.renderCount, maximum: window.__giIntroAudit.maximumCanvases }));
  expect(after.raf, 'O relógio da intro precisa parar; nenhum RAF permanente após o handoff').toBe(before.raf);
  expect(after.rendered).toBe(before.rendered);
  expect(after.maximum).toBe(1);
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await assertNoHorizontalOverflow(page);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});
