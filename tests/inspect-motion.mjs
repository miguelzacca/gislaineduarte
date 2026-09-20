import { chromium } from '@playwright/test';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('tests/artifacts/motion-v2');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4323';
const video = process.argv.includes('--video');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const reports = [];

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 768, hasTouch: viewport.width < 768, ...(video ? { recordVideo: { dir: output, size: viewport } } : {}) });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    window.motionLab = { tasks: [], cadence: [], sampling: false };
    new PerformanceObserver(list => {
      if (window.motionLab.sampling) window.motionLab.tasks.push(...list.getEntries().map(entry => entry.duration));
    }).observe({ type: 'longtask', buffered: false });
  });
  await page.goto(baseURL);
  await page.locator('[data-world][data-webgl-ready="true"]').waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  const points = await page.evaluate(() => {
    const box = selector => { const b = document.querySelector(selector).getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, height: b.height }; };
    const grid = box('.approach-grid');
    const pin = box(innerWidth < 768 ? '.approach-art' : '.approach-art-inner');
    const inset = innerWidth < 768 ? 74 : 106;
    const start = grid.top - inset, end = grid.bottom - pin.height - inset;
    return [
      ['hero', 0], ['unfold', start * .66],
      ...[.015, 1 / 3, 2 / 3, .985].map((progress, index) => [`focus-${index}`, start + (end - start) * progress]),
      ['story', box('#sobre .story-art').top - innerHeight * .14],
      ['services', box('.service-junction').top - innerHeight * .24],
      ['faq', box('#perguntas').top - innerHeight * .15],
      ['recompose', box('.contact-sculpture-anchor').top - innerHeight * .05],
    ];
  });
  const states = [];
  let previous = 0;
  await page.evaluate(() => {
    window.motionLab.sampling = true;
    let previous = performance.now();
    const sample = now => {
      if (!window.motionLab.sampling) return;
      window.motionLab.cadence.push(now - previous); previous = now;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (const [name, target] of points) {
    const steps = Math.max(1, Math.ceil(Math.abs(target - previous) / 75));
    for (let index = 1; index <= steps; index++) {
      await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), previous + (target - previous) * index / steps);
      await page.waitForTimeout(32);
    }
    await page.waitForTimeout(160);
    await page.screenshot({ path: path.join(output, `${viewport.width}-${name}.png`) });
    states.push(await page.evaluate(name => {
      const main = document.querySelector('main');
      const world = document.querySelector('[data-world]');
      return { name, scene: main.dataset.motionScene, progress: Number(main.dataset.motionProgress), opening: Number(main.dataset.motionOpening), azimuth: Number(world.dataset.cameraAzimuth), distance: Number(world.dataset.cameraDistance), renders: Number(world.dataset.renderCount), dpr: Number(world.dataset.dpr), world: world.getBoundingClientRect().toJSON(), overflow: document.documentElement.scrollWidth > innerWidth, vectorDash: document.querySelector('[data-journey-mask-draw]').getAttribute('stroke-dashoffset') };
    }, name));
    console.log(`${viewport.width} ${name}: ${states.at(-1).scene} ${states.at(-1).progress}`);
    previous = target;
  }
  const timing = await page.evaluate(() => { window.motionLab.sampling = false; return window.motionLab; });
  const beforeIdle = Number(await page.locator('[data-world]').getAttribute('data-render-count'));
  await page.waitForTimeout(1000);
  const idleFrames = Number(await page.locator('[data-world]').getAttribute('data-render-count')) - beforeIdle;
  if (viewport.width < 768) {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.waitForTimeout(170);
    await page.screenshot({ path: path.join(output, `${viewport.width}-menu-opening.png`) });
    await page.waitForTimeout(750);
    await page.screenshot({ path: path.join(output, `${viewport.width}-menu-open.png`) });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  await page.locator('a[href="/atendimentos/consulta-nutricional/"]').first().click();
  await page.waitForURL('**/atendimentos/consulta-nutricional/');
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(output, `${viewport.width}-consulta.png`) });
  const cdp = await context.newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  const firstHeap = await cdp.send('Runtime.getHeapUsage');
  const heaps = [];
  for (let index = 0; !video && index < 4; index++) {
    await page.goto(baseURL);
    await page.locator('[data-world][data-webgl-ready="true"]').waitFor({ timeout: 15_000 });
    await page.goto(`${baseURL}/atendimentos/consulta-nutricional/`);
    await page.locator('.service-hero-symbol').scrollIntoViewIfNeeded();
    await page.locator('[data-world] canvas').waitFor({ state: 'attached', timeout: 15_000 });
    await cdp.send('HeapProfiler.collectGarbage');
    heaps.push(await cdp.send('Runtime.getHeapUsage'));
  }
  const sorted = timing.cadence.filter(value => value > 0).sort((a, b) => a - b);
  reports.push({ viewport, video, states, errors, idleFrames, longTasks: timing.tasks, cadence: { samples: sorted.length, medianMs: sorted[Math.floor(sorted.length * .5)], p95Ms: sorted[Math.floor(sorted.length * .95)] }, firstHeap, heaps, requests: [...new Set(requests)], note: 'Cadência RAF em Chromium/SwiftShader local, não FPS apresentado nem medição de aparelho físico. Gravação adiciona custo; rodar sem --video para medir.' });
  const movie = page.video();
  await context.close();
  if (movie) await rename(await movie.path(), path.join(output, `${viewport.width}-scroll.webm`));
}
await browser.close();
await writeFile(path.join(output, video ? 'visual-review.json' : 'runtime-review.json'), JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
console.log(`Revisão registrada em ${output}`);
