import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'tests/artifacts/intro';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__strictIntro = { signals: [], reservations: 0 };
    const listen = window.addEventListener;
    window.addEventListener = function (type, callback, options) {
      if (type === 'scroll' && callback.name === 'schedule') window.__strictIntro.signals.push(options.signal);
      return Reflect.apply(listen, this, [type, callback, options]);
    };
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'gislaine:intro:v1' && value === 'playing') window.__strictIntro.reservations++;
      return Reflect.apply(set, this, [key, value]);
    };
  });
  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.introState === 'seen', null, { timeout: 12_000 });
  await page.waitForFunction(() => document.querySelector('[data-world]')?.dataset.webglReady === 'true', null, { timeout: 12_000 });
  const state = await page.evaluate(() => ({
    signals: window.__strictIntro.signals.map(signal => ({ aborted: signal.aborted })),
    reservations: window.__strictIntro.reservations,
    overlays: document.querySelectorAll('vite-error-overlay').length,
    canvases: document.querySelectorAll('canvas').length,
    status: sessionStorage.getItem('gislaine:intro:v1'),
    result: document.querySelector('[data-intro-overlay]').dataset.result,
    heading: document.querySelector('h1').textContent,
    contact: document.querySelector('a[href*="wa.me"]').href,
  }));
  assert.deepEqual(state.signals, [{ aborted: true }, { aborted: false }], 'Real development StrictMode must replay and clean its effect.');
  assert.equal(state.reservations, 1);
  assert.equal(state.overlays, 0);
  assert.equal(state.canvases, 1);
  assert.equal(state.status, 'seen');
  assert.equal(state.result, 'complete');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${output}/dev-strict-hero.png` });
  await writeFile(`${output}/dev-strict-review.json`, JSON.stringify({ ...state, errors, generatedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ ...state, errors }));
} finally { await browser.close(); }
