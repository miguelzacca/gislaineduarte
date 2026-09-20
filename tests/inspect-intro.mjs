import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4323';
const output = path.resolve('tests/artifacts/intro');
const recording = process.argv.includes('--video');
const performanceOnly = process.argv.includes('--performance');
const selectedWidths = process.argv.find(argument => argument.startsWith('--widths='))?.slice('--widths='.length).split(',').map(Number);
const sizes = (performanceOnly || recording ? [[1440, 1000], [390, 844]] : [[320, 568], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 1000], [2560, 1440]]).filter(([width]) => !selectedWidths || selectedWidths.includes(width));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const reviews = [];

try {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, ...(recording ? { recordVideo: { dir: output, size: { width, height } } } : {}) });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      const review = { frames: [], stages: [], longTasks: [], lcp: [], shifts: [] };
      window.__introReview = review;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(time => {
        const start = performance.now();
        callback(time);
        if (document.querySelector('main')?.dataset.motionScene === 'intro') review.frames.push({ time, cpu: performance.now() - start });
      });
      for (const type of ['longtask', 'largest-contentful-paint', 'layout-shift']) {
        try {
          new PerformanceObserver(list => list.getEntries().forEach(entry => {
            if (type === 'longtask') review.longTasks.push({ start: entry.startTime, duration: entry.duration });
            if (type === 'largest-contentful-paint') review.lcp.push({ start: entry.startTime, element: entry.element?.tagName });
            if (type === 'layout-shift' && !entry.hadRecentInput) review.shifts.push(entry.value);
          })).observe({ type, buffered: true });
        } catch { /* This diagnostic is optional on unsupported engines. */ }
      }
      let previous;
      new MutationObserver(() => {
        const overlay = document.querySelector('[data-intro-overlay]');
        const phase = overlay?.dataset.phase;
        if (phase && phase !== previous) {
          review.stages.push({ phase, at: performance.now(), progress: overlay.dataset.progress });
          previous = phase;
        }
        const world = document.querySelector('[data-world]');
        if (!review.firstVisibleGpu && world?.dataset.webglReady && Number(world.style.opacity) >= .15) {
          review.firstVisibleGpu = { at: performance.now(), phase, progress: overlay.dataset.progress };
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-phase', 'data-webgl-ready'] });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const initial = await cdp.send('Performance.getMetrics');
    if (!recording && !performanceOnly) {
      await page.waitForFunction(() => document.querySelector('[data-intro-overlay]')?.dataset.phase === 'depth');
      await page.screenshot({ path: path.join(output, `${width}-depth.png`) });
    }
    await page.waitForFunction(() => document.documentElement.dataset.introState === 'seen', null, { timeout: 8500 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(300);
    const rendered = await page.locator('[data-world]').getAttribute('data-render-count');
    await page.waitForTimeout(500);
    const final = await cdp.send('Performance.getMetrics');
    const stats = await page.evaluate(() => ({
      ...window.__introReview, quality: document.documentElement.dataset.motionQuality,
      session: sessionStorage.getItem('gislaine:intro:v1'), result: document.querySelector('[data-intro-overlay]').dataset.result,
      canvases: document.querySelectorAll('canvas').length, renderCount: document.querySelector('[data-world]').dataset.renderCount,
      scroll: scrollY, overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    const intervals = stats.frames.slice(1).map((frame, index) => frame.time - stats.frames[index].time).filter(delta => delta > 1).sort((a, b) => a - b);
    const metric = (list, name) => list.metrics.find(item => item.name === name)?.value ?? 0;
    stats.cadence = { medianMs: intervals[Math.floor(intervals.length / 2)], p95Ms: intervals[Math.floor(intervals.length * .95)], samples: intervals.length };
    stats.mainThreadSeconds = metric(final, 'TaskDuration') - metric(initial, 'TaskDuration');
    stats.heapBytes = metric(final, 'JSHeapUsedSize');
    stats.idle = rendered === stats.renderCount;
    stats.errors = errors;
    if (!recording && !performanceOnly) await page.screenshot({ path: path.join(output, `${width}-hero.png`) });
    const video = recording ? page.video() : null;
    await context.close();
    if (video) { const destination = path.join(output, `${width}-intro.webm`); await video.saveAs(destination); stats.video = destination; }
    reviews.push({ width, height, ...stats });
    console.log(JSON.stringify({ width, height, duration: stats.stages.at(-1)?.at - stats.stages[0]?.at, cadence: stats.cadence, cpu: stats.mainThreadSeconds, idle: stats.idle, errors }));
  }
} finally { await browser.close(); }
await writeFile(path.join(output, recording ? 'video-review.json' : performanceOnly ? 'performance-review.json' : selectedWidths ? 'responsive-selected-review.json' : 'responsive-review.json'), JSON.stringify({ browser: 'Installed Google Chrome, local Windows, software GPU', generatedAt: new Date().toISOString(), reviews }, null, 2));
