import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSculpture } from '../../src/motion/sculpture-client.js';

test('a delayed intro bitmap cannot replace the SVG after handoff; the final ACK wakes the controller', async t => {
  let worker;
  class FakeWorker extends EventTarget {
    messages = [];
    constructor() { super(); worker = this; }
    postMessage(message) { this.messages.push(message); }
    terminate() { this.terminated = true; }
    emit(data) { this.dispatchEvent(new MessageEvent('message', { data })); }
  }
  for (const [name, value] of Object.entries({ Worker: FakeWorker, OffscreenCanvas: class {} })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    });
  }
  const canvas = {
    dataset: {}, getContext() {}, transferControlToOffscreen: () => ({}),
    ownerDocument: { createElement: () => ({ getContext: () => ({ getExtension: () => null }) }) },
  };
  let invalidations = 0;
  const pending = createSculpture({ canvas, quality: { mode: 'mobile', dpr: 1 }, onInvalidate: () => invalidations++ });
  worker.emit({ type: 'available', supported: true });
  worker.emit({ type: 'initialized', stats: { frames: 0 } });
  const runtime = await pending;
  t.after(() => { runtime.dispose(); worker.emit({ type: 'disposed' }); });
  const intro = { scene: 'intro', assembly: .2, progress: .3, intro: { phase: 'drawing', progress: .3 } };
  const hero = { scene: 'hero', assembly: 1, progress: 0 };
  const frames = () => worker.messages.filter(message => message.type === 'frame');
  const acknowledge = packet => worker.emit({ type: 'rendered', id: packet.id, metadata: packet.metadata, stats: { frames: packet.id } });

  assert.equal(runtime.render(intro), true);
  assert.equal(runtime.render(hero), true);
  assert.equal(frames().length, 1, 'the hero waits for the in-flight intro frame');
  acknowledge(frames()[0]);
  assert.equal(runtime.isReady(intro), true);
  assert.equal(runtime.isReady(hero), false, 'retain the assembled SVG while an intro bitmap is on the canvas');
  assert.equal(frames().length, 2, 'the latest hero frame is posted after the old ACK');
  assert.equal(invalidations, 1);

  acknowledge(frames()[1]);
  assert.equal(runtime.isReady(hero), true);
  assert.equal(invalidations, 2, 'the completed handoff is published even without another scroll event');
  assert.equal(runtime.render(hero), true);
  assert.equal(frames().length, 2, 'the ACK-triggered draw must not create an endless worker/RAF loop');

  runtime.dispose();
  assert.equal(runtime.isReady(hero), false);
  assert.equal(runtime.render(hero), false);
});
