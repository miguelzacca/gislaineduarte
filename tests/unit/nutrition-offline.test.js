import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
import { buildPlanHtml } from '../../server/nutrition/html.js';
import { generatePlan, dayTotals } from '../../src/lib/nutrition.js';
import { foodById, foods } from '../../src/data/nutrition.js';

// Execute the generated offline document in a Node DOM. No browser, web server,
// external connection, or Playwright is involved.
function openOffline(html, { storage = new Map(), storageBlocked = false } = {}) {
  const { document, Event } = parseHTML(html);
  // LinkeDOM intentionally omits the selectedIndex/value setters of browsers.
  for (const select of document.querySelectorAll('select')) {
    let selected = Math.max(0, [...select.options].findIndex(option => option.hasAttribute('selected')));
    Object.defineProperties(select, {
      selectedIndex: { get: () => selected, set: value => { selected = value; } },
      value: { get: () => select.options[selected]?.value || '', set: value => { selected = [...select.options].findIndex(option => option.value === String(value)); } },
    });
  }
  const downloads = [];
  let printCount = 0;
  const printStates = [];
  const windowEvents = new Map();
  const context = { document, Intl, Date, Blob,
    window: { print: () => { printCount++; printStates.push([...document.querySelectorAll('details')].every(element => element.open)); }, confirm: () => true, addEventListener: (type, listener) => windowEvents.set(type, listener) },
    localStorage: { getItem: key => { if (storageBlocked) throw new Error('Storage blocked'); return storage.get(key) || null; }, setItem: (key, value) => { if (storageBlocked) throw new Error('Storage blocked'); storage.set(key, value); } },
    URL: { createObjectURL: blob => { downloads.push(blob); return 'blob:offline-test'; }, revokeObjectURL: () => {} },
    setTimeout: callback => { callback(); },
  };
  const script = document.querySelector('script').textContent;
  const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
  assert.ok(csp.includes(`sha256-${createHash('sha256').update(script).digest('base64')}`));
  runInNewContext(script, context, { timeout: 10000 });
  return { document, downloads, storage, printCount: () => printCount, printStates,
    fireWindow: type => windowEvents.get(type)?.(),
    click: selector => document.querySelector(selector).dispatchEvent(new Event('click')),
    change: (selector, value, property = 'value') => { const node = document.querySelector(selector); node[property] = value; node.dispatchEvent(new Event('change')); },
    input: (selector, value) => { const node = document.querySelector(selector); node.value = value; node.dispatchEvent(new Event('input')); },
  };
}

const createHtml = async () => {
  const plan = generatePlan({ diet: 'omnivore', conditions: [], allergies: [], excludedFoodIds: [] });
  const original = plan.days[0].meals[0].items[0];
  original.alternatives = [{ foodId: original.foodId === 'apple' ? 'pear' : 'apple', grams: 123 }];
  plan.targets.water = 1800;
  return { plan, html: await buildPlanHtml({ plan, patientName: 'Pessoa Fictícia', id: 'offline-interaction', revision: 7, draft: true }) };
};

test('nutrition offline: approved choice updates photograph, quantities, macros, day totals and actual shopping quantities', async () => {
  const { html, plan } = await createHtml(); const app = openOffline(html);
  const initial = dayTotals(plan.days[0]).kcal;
  const original = plan.days[0].meals[0].items[0]; const option = original.alternatives[0];
  app.change('[data-choice="0-0-0"][value="1"]', true, 'checked');
  const card = app.document.getElementById('food-0-0-0');
  assert.equal(card.querySelector('use').getAttribute('href'), `#photo-${option.foodId}`);
  assert.equal(card.querySelector('[data-food-name]').textContent, foodById[option.foodId].name);
  assert.equal(card.querySelector('[data-food-grams]').textContent, '123 g');
  const expected = initial - foodById[original.foodId].kcal * original.grams / 100 + foodById[option.foodId].kcal * 1.23;
  const actual = Number(app.document.getElementById('total-0-kcal').textContent.replace(/\./g, '').replace(',', '.'));
  assert.ok(Math.abs(actual - expected) < .2);
  assert.equal(app.document.getElementById('week-0-kcal').textContent, app.document.getElementById('total-0-kcal').textContent);
  const weeklyExpected = (plan.days.reduce((sum, day) => sum + dayTotals(day).kcal, 0) + expected - initial) / plan.days.length;
  const weeklyActual = Number(app.document.getElementById('week-average-kcal').textContent.replace(' kcal', '').replace(/\./g, '').replace(',', '.'));
  assert.ok(Math.abs(weeklyActual - weeklyExpected) < .2, 'weekly average reflects the selected portion');
  const scale = Math.max(500, Math.ceil(Math.max(...plan.days.map((day, index) => index === 0 ? expected : dayTotals(day).kcal)) / 500) * 500);
  assert.ok(Math.abs(parseFloat(app.document.getElementById('week-bar-0').style.width) - expected / scale * 100) < .1);
  app.change('#shopping-scope', '0');
  const expectedGrams = plan.days[0].meals.flatMap(meal => meal.items).filter(item => item.foodId === option.foodId).reduce((total, item) => total + item.grams, 123);
  assert.equal(app.document.querySelector(`[data-shop="${option.foodId}"]`).parentElement.querySelector('small').textContent, new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(expectedGrams) + ' g');
  app.click('#download-shopping');
  const shopping = await app.downloads[0].text();
  assert.ok(shopping.includes(plan.days[0].label)); assert.ok(shopping.includes(foodById[option.foodId].name));
  app.click('#next-day'); assert.equal(app.document.getElementById('day-0').hidden, true); assert.equal(app.document.getElementById('day-1').hidden, false);
  app.click('#previous-day'); assert.equal(app.document.getElementById('day-0').hidden, false);
});

test('nutrition offline: portable HTML retains diary, choices, water and dated progress even without localStorage', async () => {
  const { html, plan } = await createHtml(); const app = openOffline(html, { storageBlocked: true });
  assert.match(app.document.getElementById('storage').textContent, /não salva/);
  app.change('[data-choice="0-0-0"][value="1"]', true, 'checked');
  app.change('[data-meal="0-0"]', true, 'checked');
  app.click('#water-add'); app.click('#water-add');
  app.input('#notes', 'Minha dúvida <script>alert(1)</script> e minha rotina.');
  app.click('#download-progress');
  const snapshot = await app.downloads[0].text();
  assert.ok(snapshot.startsWith('<!doctype html>'));
  const copy = openOffline(snapshot, { storageBlocked: true });
  assert.equal(copy.document.querySelectorAll('script').length, 1);
  assert.equal(copy.document.getElementById('notes').value, 'Minha dúvida <script>alert(1)</script> e minha rotina.');
  assert.equal(copy.document.getElementById('water-value').textContent, '400 ml');
  assert.match(copy.document.getElementById('progress-label').textContent, /^1 de/);
  assert.equal(copy.document.querySelector('#food-0-0-0 [data-food-name]').textContent, foodById[plan.days[0].meals[0].items[0].alternatives[0].foodId].name);
  copy.change('#checkdate', '2030-01-15'); assert.match(copy.document.getElementById('progress-label').textContent, /^0 de/); assert.equal(copy.document.getElementById('water-value').textContent, '0 ml');
  copy.click('#clear'); assert.equal(copy.document.getElementById('notes').value, ''); assert.equal(copy.document.body.hasAttribute('data-progress'), false);
  assert.equal(copy.document.querySelector('#food-0-0-0 [data-food-name]').textContent, foodById[plan.days[0].meals[0].items[0].foodId].name);
});

test('nutrition offline: corrupted storage cannot break the plan and out-of-range saved choices revert to the approved main option', async () => {
  const { html, plan } = await createHtml();
  const storage = new Map([['gd-plan-offline-interaction-7', '{not-json']]);
  assert.doesNotThrow(() => openOffline(html, { storage }));
  storage.set('gd-plan-offline-interaction-7', JSON.stringify({ day: 100, choices: { '0-0-0': 999 }, checks: null, water: null, shopping: [] }));
  const app = openOffline(html, { storage });
  assert.equal(app.document.getElementById('day-0').hidden, false);
  assert.equal(app.document.querySelector('#food-0-0-0 [data-food-name]').textContent, foodById[plan.days[0].meals[0].items[0].foodId].name);
  app.click('#print'); assert.equal(app.printCount(), 1);
  assert.deepEqual(app.printStates, [true], 'print includes all clinical data and swap galleries');
});

test('nutrition offline: contents and gallery anchors reveal their destinations; browser printing restores collapsed details', async () => {
  const { html } = await createHtml(); const app = openOffline(html);
  const identifiers = [...app.document.querySelectorAll('[id]')].map(element => element.id);
  assert.equal(new Set(identifiers).size, identifiers.length, 'wide and compact clinical graphics must keep unique SVG references');
  for (const link of app.document.querySelectorAll('.quicklinks a')) assert.ok(app.document.querySelector(link.getAttribute('href')), 'every contents entry has a destination');
  assert.equal(app.document.getElementById('day-6').hidden, true);
  app.click('#week a[href="#day-6"]');
  assert.equal(app.document.getElementById('day-6').hidden, false);
  const galleryLink = app.document.querySelector('#swaps a[href^="#food-0-"]');
  assert.ok(galleryLink);
  app.click('#swaps a[href="' + galleryLink.getAttribute('href') + '"]');
  const destination = app.document.querySelector(galleryLink.getAttribute('href'));
  assert.equal(app.document.getElementById('day-0').hidden, false);
  assert.equal(destination.querySelector('details').open, true);
  const shopping = app.document.getElementById('shopping'); shopping.open = false;
  app.click('.quicklinks a[href="#shopping"]'); assert.equal(shopping.open, true);
  const technical = app.document.querySelector('.technical-section'); technical.open = false;
  app.fireWindow('beforeprint');
  assert.ok([...app.document.querySelectorAll('details')].every(details => details.open));
  app.fireWindow('afterprint'); assert.equal(technical.open, false);
  assert.equal(shopping.open, true);
});

test('nutrition offline: all photographs and maximum permitted plan content fit the serverless download limit', async () => {
  const plan = generatePlan({ diet: 'omnivore', conditions: [], allergies: [], excludedFoodIds: [] });
  plan.title = '"'.repeat(120); plan.guidance = '"'.repeat(6000);
  plan.days = plan.days.map((day, d) => ({ ...day, meals: Array.from({ length: 8 }, (_, m) => ({
    name: '"'.repeat(80), time: '08:00', note: '"'.repeat(1000),
    items: Array.from({ length: 15 }, (_, i) => ({ foodId: foods[(d * 120 + m * 15 + i) % foods.length].id, grams: 1500,
      alternatives: [1, 2, 3].map(offset => ({ foodId: foods[(d * 120 + m * 15 + i + offset) % foods.length].id, grams: 1500 })),
    })),
  })) }));
  const html = await buildPlanHtml({ plan, patientName: '"'.repeat(100), id: '00000000-0000-0000-0000-000000000000', revision: 1000, draft: true });
  assert.equal((html.match(/<symbol /g) || []).length, foods.length);
  assert.ok(Buffer.byteLength(html) < 4_500_000, `HTML exceeds 4.5 MB: ${Buffer.byteLength(html)} bytes`);
});
