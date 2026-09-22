import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeMotion } from '../../src/motion/controller.js';

test('layouts without main skip motion setup and return a safe cleanup', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const selectors = [];
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { querySelector(selector) { selectors.push(selector); return null; } },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'document', original);
    else delete globalThis.document;
  });

  // No browser observers, media queries, or animation frames exist in this test.
  // Setup must stop before accessing any of them, including on a second mount.
  for (let mount = 0; mount < 2; mount++) {
    const cleanup = initializeMotion();
    assert.equal(typeof cleanup, 'function');
    assert.doesNotThrow(() => { cleanup(); cleanup(); });
  }
  assert.deepEqual(selectors, ['main', 'main']);
});
