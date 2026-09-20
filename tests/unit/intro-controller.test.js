import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { INTRO_BOOTSTRAP, INTRO_KEY } from '../../src/intro/session.js';

const hero = Object.freeze({
  scene: 'hero', progress: 0, opening: 0, focus: 0, assembly: 1, branch: 0, energy: 0,
  heroExit: 0, storyProgress: 0, servicesProgress: 0, recompose: 0,
  world: Object.freeze({ x: 1080, y: 300, size: 240, opacity: 1 }),
  camera: Object.freeze({ azimuth: -0.32, elevation: 0.12, distance: 10.8 }),
});

const ready = Object.freeze({
  assetsReady: true, webglReady: true, failed: false,
  quality: Object.freeze({ mode: 'full', webgl: true }),
});

class TrackedTarget extends EventTarget {
  listeners = new Map();

  addEventListener(type, callback, options) {
    super.addEventListener(type, callback, options);
    if (options?.signal?.aborted) return;
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
    options?.signal?.addEventListener('abort', () => this.listeners.get(type)?.delete(callback), { once: true });
  }

  removeEventListener(type, callback, options) {
    super.removeEventListener(type, callback, options);
    this.listeners.get(type)?.delete(callback);
  }

  get listenerCount() {
    return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0);
  }
}

let environmentSequence = 0;

async function withController(options, action) {
  if (typeof options === 'function') { action = options; options = {}; }
  const environmentId = ++environmentSequence;
  let now = 0;
  let timerSequence = 0;
  let tokenSequence = 0;
  let bounds = options.bounds ?? { left: 480, top: 190, width: 240, height: 340 };
  const timers = new Map();
  const storageValues = new Map();
  const storageWrites = [];
  const handles = new Set();
  const scrollCalls = [];
  const invalidations = [];
  const doc = new TrackedTarget();
  const node = name => Object.assign(new TrackedTarget(), {
    name, dataset: {}, isConnected: true, tabIndex: -1, focusCalls: [],
    style: {
      overflow: '', paddingRight: '', scrollBehavior: '',
      setProperty(key, value) { this[key] = value; },
    },
    focus(focusOptions) {
      this.focusCalls.push(focusOptions);
      doc.activeElement = this;
      const event = new Event('focusin');
      Object.defineProperty(event, 'target', { value: this });
      doc.dispatchEvent(event);
    },
  });
  const root = node('root');
  const body = node('body');
  const button = node('intro-skip');
  const main = node('main');
  const contentSkip = node('content-skip');
  const previous = node('previous-focus');
  const overlay = node('overlay');
  const classes = new Set();
  const width = options.width ?? 1440;
  root.clientWidth = width - (options.scrollbar ?? 0);
  root.style.overflow = options.rootOverflow ?? '';
  root.style.scrollBehavior = options.scrollBehavior ?? '';
  body.style.overflow = options.bodyOverflow ?? '';
  body.style.paddingRight = options.paddingRight ?? '0px';
  body.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
  const stage = { getBoundingClientRect: () => bounds };
  overlay.contains = target => target === button || target === stage;
  overlay.querySelector = selector => selector === '[data-intro-skip]' ? button : stage;
  Object.assign(doc, {
    documentElement: root, body, hidden: options.hidden ?? false,
    activeElement: options.previousFocus ? previous : body,
    querySelector: selector => ({ '[data-intro-overlay]': overlay, '.skip-link': contentSkip, main })[selector] ?? null,
  });
  const media = Object.assign(new TrackedTarget(), { matches: options.reduced ?? false });
  const host = {
    document: doc, location: { pathname: '/', hash: '' }, matchMedia: () => media,
    sessionStorage: {
      getItem: key => storageValues.get(key) ?? null,
      setItem: (key, value) => { storageValues.set(key, String(value)); storageWrites.push([key, String(value)]); },
      removeItem: key => storageValues.delete(key),
    },
    crypto: { randomUUID: () => `controller-${environmentId}-${++tokenSequence}` },
    scrollTo(x, y) {
      scrollCalls.push({ x, y, behavior: root.style.scrollBehavior });
      globalThis.scrollX = x;
      globalThis.scrollY = y;
    },
  };
  if (options.blockedStorage) Object.defineProperty(host, 'sessionStorage', { get() { throw new Error('SecurityError'); } });
  const globals = {
    window: host, document: doc, matchMedia: () => media,
    innerWidth: width, innerHeight: options.height ?? 1000,
    scrollX: options.scrollX ?? 0, scrollY: options.scrollY ?? 0,
    getComputedStyle: () => ({ paddingRight: body.style.paddingRight || '0px' }),
    performance: { now: () => now },
    setTimeout(callback, delay) { const id = ++timerSequence; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  const saved = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const trackedTargets = [doc, media, overlay, button, contentSkip];
  try {
    if (options.bootstrap) runInNewContext(INTRO_BOOTSTRAP, { window: host });
    host.__gislaineIntroWatchdog = setTimeout(() => {}, 7000);
    const { acquireIntro } = await import(`../../src/intro/controller.js?controller-unit=${environmentId}`);
    const harness = {
      root, body, button, main, previous, contentSkip, overlay, media, doc, host,
      timers, storageValues, storageWrites, scrollCalls, invalidations,
      acquire(callback = () => invalidations.push(now)) {
        const handle = acquireIntro(callback);
        if (handle) handles.add(handle);
        return handle;
      },
      release(handle) { if (handles.delete(handle)) handle.release(); },
      tick(handle, time, readiness = {}) {
        now = time;
        return handle.run.tick(now, hero, { ...ready, ...readiness, quality: { ...ready.quality, ...readiness.quality } });
      },
      setTime(time) { now = time; },
      advance(time) {
        now = time;
        for (const [id, timer] of [...timers]) {
          if (timer.at <= now && timers.delete(id)) timer.callback();
        }
      },
      visibility(hidden, time) {
        now = time;
        doc.hidden = hidden;
        doc.dispatchEvent(new Event('visibilitychange'));
      },
      resize(nextWidth, nextHeight, nextBounds) {
        globalThis.innerWidth = nextWidth;
        globalThis.innerHeight = nextHeight;
        root.clientWidth = nextWidth;
        bounds = nextBounds;
      },
      click(target = button) { target.dispatchEvent(new Event('click', { cancelable: true })); },
      key(key, { shiftKey = false, target = doc.activeElement } = {}) {
        const event = new Event('keydown', { cancelable: true });
        Object.defineProperties(event, { key: { value: key }, shiftKey: { value: shiftKey }, target: { value: target } });
        doc.dispatchEvent(event);
        return event;
      },
      scroll(x, y) { globalThis.scrollX = x; globalThis.scrollY = y; },
      setReduced(value) { media.matches = value; media.dispatchEvent(new Event('change')); },
      listenerCount() { return trackedTargets.reduce((count, target) => count + target.listenerCount, 0); },
    };
    return await action(harness);
  } finally {
    for (const handle of handles) handle.release();
    await Promise.resolve();
    for (const key of Object.keys(globals)) {
      if (saved[key]) Object.defineProperty(globalThis, key, saved[key]);
      else delete globalThis[key];
    }
  }
}

function assertHeroEndpoint(frame) {
  assert.deepEqual(frame, {
    ...hero, pointer: { x: 0.5, y: 0.5 },
    intro: { build: 1, assembly: 1, handoff: 1, progress: 1, phase: 'handoff' },
  });
}

describe('ciclo de vida do controller da intro', { concurrency: false }, () => {
  test('StrictMode setup/cleanup/setup preserva o mesmo run, relógio e lease do bootstrap', async () => {
    await withController({ bootstrap: true }, async h => {
      const initialToken = h.host.__gislaineIntroBoot.token;
      const first = h.acquire();
      const listeners = h.listenerCount();
      h.tick(first, 500);
      h.release(first);
      const replay = h.acquire();
      await Promise.resolve();
      assert.equal(replay.run, first.run);
      assert.equal(replay.run.active, true);
      assert.equal(h.overlay.dataset.run, initialToken);
      assert.equal(h.host.__gislaineIntroBoot.claimed, true);
      assert.equal(h.listenerCount(), listeners);
      assert.equal(h.timers.size, 1);
      assert.equal(h.storageWrites.filter(([key, value]) => key === INTRO_KEY && value === 'playing').length, 1);
      assert.equal(h.tick(replay, 650).intro.phase, 'drawing');
      assert.equal(h.tick(replay, 650).intro.progress, 650 / 4800);
    });
  });

  test('liberar um de dois owners não encerra a execução do outro', async () => {
    await withController(async h => {
      const first = h.acquire();
      const second = h.acquire();
      assert.equal(first.run, second.run);
      h.release(first);
      await Promise.resolve();
      assert.equal(second.run.active, true);
      assert.equal(h.storageValues.get(INTRO_KEY), 'playing');
      h.release(second);
      await Promise.resolve();
      assert.equal(second.run.active, false);
      assert.equal(h.overlay.dataset.result, 'unmount');
    });
  });

  test('último cleanup libera listeners, guard, estilos e referências de callbacks', async () => {
    await withController(async h => {
      const handle = h.acquire();
      assert.ok(h.listenerCount() >= 7);
      assert.equal(h.body.classList.contains('intro-playing'), true);
      h.release(handle);
      assert.equal(handle.run.active, true, 'cleanup aguarda a oportunidade de replay do StrictMode');
      await Promise.resolve();
      assert.equal(handle.run.active, false);
      assert.equal(h.listenerCount(), 0);
      assert.equal(h.timers.size, 0);
      assert.equal(h.body.classList.contains('intro-playing'), false);
      assert.equal(h.root.style.overflow, '');
      assert.equal(h.body.style.overflow, '');
      assert.equal(h.storageValues.get(INTRO_KEY), 'seen');
      const previousInvalidations = h.invalidations.length;
      h.setReduced(true);
      h.visibility(false, 9000);
      assert.equal(h.invalidations.length, previousInvalidations);
      assert.equal(h.timers.size, 0);
    });
  });

  test('storage bloqueado conserva memória e StrictMode não inicia uma segunda intro', async () => {
    await withController({ blockedStorage: true, bootstrap: true }, async h => {
      const first = h.acquire();
      h.release(first);
      const replay = h.acquire();
      await Promise.resolve();
      assert.equal(replay.run, first.run);
      assertHeroEndpoint(h.tick(replay, 4800));
      assert.equal(h.acquire(), null);
      assert.equal(h.listenerCount(), 0);
      assert.equal(h.timers.size, 0);
    });
  });

  test('execução concluída não volta a criar listeners ou reservar playing', async () => {
    await withController(async h => {
      const handle = h.acquire();
      assertHeroEndpoint(h.tick(handle, 4800));
      const writes = h.storageWrites.length;
      assert.equal(h.acquire(), null);
      assert.equal(h.acquire(), null);
      assert.equal(h.storageWrites.length, writes);
      assert.equal(h.listenerCount(), 0);
      assert.equal(h.timers.size, 0);
      assert.equal(h.tick(handle, 9000), hero);
    });
  });

  test('limpar storage após término permite um run novo sem reter o anterior', async () => {
    await withController(async h => {
      const first = h.acquire();
      h.tick(first, 4800);
      const oldToken = h.overlay.dataset.run;
      h.storageValues.clear();
      const second = h.acquire();
      assert.notEqual(second.run, first.run);
      assert.notEqual(h.overlay.dataset.run, oldToken);
      assert.equal(second.run.active, true);
      assert.equal(h.tick(second, 4800).intro.progress, 0);
      assert.equal(h.timers.size, 1);
      assert.equal(first.run.active, false);
    });
  });

  test('readiness fica liberada após resize e não rebobina o relógio nem a geometria', async () => {
    await withController(async h => {
      const handle = h.acquire();
      const before = h.tick(handle, 3400);
      h.resize(390, 844, { left: 125, top: 220, width: 140, height: 200 });
      handle.run.measure();
      const after = h.tick(handle, 3500, { webglReady: false, quality: { mode: 'mobile' } });
      assert.equal(before.intro.progress, 3400 / 4800);
      assert.equal(after.intro.progress, 3500 / 4800);
      assert.ok(after.intro.progress > before.intro.progress);
      assert.equal(after.intro.phase, 'assembled');
      assert.equal(after.world.x, 195);
      assert.equal(after.world.y, 320);
      assert.equal(h.overlay.dataset.quality, 'medium');
    });
  });

  test('skip em 4750 ms permanece ativo até 5030 e termina exatamente na hero', async () => {
    await withController(async h => {
      const handle = h.acquire();
      h.tick(handle, 4750);
      h.click();
      assert.equal(h.storageValues.get(INTRO_KEY), 'seen', 'intenção de skip é persistida imediatamente');
      const afterNaturalDeadline = h.tick(handle, 4810);
      assert.equal(handle.run.active, true);
      assert.equal(afterNaturalDeadline.scene, 'intro');
      assert.notDeepEqual(afterNaturalDeadline.world, hero.world);
      h.tick(handle, 5029);
      assert.equal(handle.run.active, true);
      assertHeroEndpoint(h.tick(handle, 5030));
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'skipped');
      assert.equal(h.listenerCount(), 0);
    });
  });

  test('skip pausa quando a aba fica oculta e completa 280 ms realmente visíveis', async () => {
    await withController(async h => {
      const handle = h.acquire();
      h.tick(handle, 1000);
      h.click();
      h.tick(handle, 1050);
      h.visibility(true, 1050);
      assert.equal(h.timers.size, 0);
      h.visibility(false, 11050);
      const resumed = h.tick(handle, 11050);
      assert.equal(handle.run.active, true);
      assert.equal(resumed.scene, 'intro');
      h.tick(handle, 11279);
      assert.equal(handle.run.active, true);
      assertHeroEndpoint(h.tick(handle, 11280));
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'skipped');
    });
  });

  test('cliques repetidos não reiniciam os 280 ms do skip', async () => {
    await withController(async h => {
      const handle = h.acquire();
      h.tick(handle, 1000);
      h.click();
      h.tick(handle, 1100);
      h.click();
      assertHeroEndpoint(h.tick(handle, 1280));
      assert.equal(handle.run.active, false);
      assert.equal(h.storageWrites.filter(([key, value]) => key === INTRO_KEY && value === 'seen').length, 1);
    });
  });

  test('StrictMode durante saída mantém a mesma transição já marcada seen', async () => {
    await withController(async h => {
      const first = h.acquire();
      h.tick(first, 1000);
      h.click();
      h.release(first);
      const replay = h.acquire();
      await Promise.resolve();
      assert.equal(replay.run, first.run);
      assert.equal(h.storageValues.get(INTRO_KEY), 'seen');
      assertHeroEndpoint(h.tick(replay, 1280));
      assert.equal(h.overlay.dataset.result, 'skipped');
    });
  });

  test('narrativa normal e guard descontam o período em aba oculta', async () => {
    await withController(async h => {
      const handle = h.acquire();
      const before = h.tick(handle, 2050);
      h.visibility(true, 2050);
      assert.equal(h.timers.size, 0);
      h.advance(22050);
      assert.equal(handle.run.active, true);
      h.visibility(false, 22050);
      const after = h.tick(handle, 22050);
      assert.deepEqual(after, before);
      assert.equal(h.timers.size, 1);
      assert.ok([...h.timers.values()].some(timer => timer.at === 26600));
      assertHeroEndpoint(h.tick(handle, 24800));
      assert.equal(handle.run.active, false);
    });
  });

  test('aba que já inicia oculta não consome tempo da intro ou do guard', async () => {
    await withController({ hidden: true }, async h => {
      const handle = h.acquire();
      assert.equal(h.timers.size, 0);
      h.advance(20000);
      assert.equal(handle.run.active, true);
      h.visibility(false, 20000);
      assert.equal(h.tick(handle, 20000).intro.progress, 0);
      assert.equal([...h.timers.values()][0].at, 26600);
      assertHeroEndpoint(h.tick(handle, 24800));
    });
  });

  test('Tab e Shift+Tab preservam skip-link e acesso imediato ao skip da intro', async () => {
    await withController(async h => {
      h.acquire();
      assert.equal(h.button.tabIndex, -1);
      assert.equal(h.key('Tab').defaultPrevented, true);
      assert.equal(h.doc.activeElement, h.contentSkip);
      h.key('Tab');
      assert.equal(h.doc.activeElement, h.button);
      assert.equal(h.button.tabIndex, 0);
      assert.equal(h.overlay.dataset.skipReady, 'true');
      h.key('Tab', { shiftKey: true });
      assert.equal(h.doc.activeElement, h.contentSkip);
      for (const call of [...h.button.focusCalls, ...h.contentSkip.focusCalls]) assert.deepEqual(call, { preventScroll: true });
    });
  });

  test('Escape antes do primeiro RAF encerra imediatamente e leva foco ao main', async () => {
    await withController(async h => {
      const handle = h.acquire();
      const event = h.key('Escape');
      assert.equal(event.defaultPrevented, true);
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'skipped');
      assert.equal(h.doc.activeElement, h.main);
      assert.deepEqual(h.main.focusCalls, [{ preventScroll: true }]);
      assert.equal(h.listenerCount(), 0);
    });
  });

  test('término restaura foco anterior, scroll exato e estilos preexistentes', async () => {
    await withController({ previousFocus: true, scrollbar: 16, paddingRight: '7px', scrollX: 3, scrollY: 140, rootOverflow: 'scroll', bodyOverflow: 'auto', scrollBehavior: 'smooth' }, async h => {
      const handle = h.acquire();
      assert.equal(h.body.style.paddingRight, '23px');
      assert.equal(h.root.style.scrollBehavior, 'auto');
      h.tick(handle, 1000);
      h.button.focus({ preventScroll: true });
      h.scroll(20, 500);
      h.click();
      assertHeroEndpoint(h.tick(handle, 1280));
      assert.equal(h.root.style.overflow, 'scroll');
      assert.equal(h.body.style.overflow, 'auto');
      assert.equal(h.body.style.paddingRight, '7px');
      assert.equal(h.root.style.scrollBehavior, 'smooth');
      assert.deepEqual(h.scrollCalls, [{ x: 3, y: 140, behavior: 'auto' }]);
      assert.equal(h.doc.activeElement, h.previous);
      assert.deepEqual(h.previous.focusCalls, [{ preventScroll: true }]);
      assert.equal(h.body.classList.contains('intro-playing'), false);
      assert.equal(h.button.tabIndex, -1);
      assert.equal(h.timers.size, 0);
    });
  });

  test('foco anterior removido do documento usa o main como destino seguro', async () => {
    await withController({ previousFocus: true }, async h => {
      const handle = h.acquire();
      h.previous.isConnected = false;
      h.button.focus({ preventScroll: true });
      h.tick(handle, 4800);
      assert.equal(h.doc.activeElement, h.main);
      assert.deepEqual(h.main.focusCalls, [{ preventScroll: true }]);
    });
  });

  test('skip-link de conteúdo fecha intro sem impedir sua navegação nativa', async () => {
    await withController(async h => {
      const handle = h.acquire();
      h.contentSkip.focus({ preventScroll: true });
      const event = new Event('click', { cancelable: true });
      h.contentSkip.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'skipped');
      assert.equal(h.listenerCount(), 0);
    });
  });

  test('movimento reduzido ativado durante a intro encerra e limpa imediatamente', async () => {
    await withController(async h => {
      const handle = h.acquire();
      h.tick(handle, 2000);
      h.setReduced(true);
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'reduced-motion');
      assert.equal(h.root.style.overflow, '');
      assert.equal(h.listenerCount(), 0);
      assert.equal(h.timers.size, 0);
      assert.equal(h.storageValues.get(INTRO_KEY), 'seen');
    });
  });

  test('preferência reduzida inicial não cria run, bloqueio ou listeners', async () => {
    await withController({ reduced: true }, async h => {
      assert.equal(h.acquire(), null);
      assert.equal(h.root.dataset.introState, 'seen');
      assert.equal(h.root.style.overflow, '');
      assert.equal(h.body.classList.contains('intro-playing'), false);
      assert.equal(h.listenerCount(), 0);
      assert.equal(h.timers.size, 0);
      assert.equal(h.storageValues.get(INTRO_KEY), 'seen');
    });
  });

  test('assets que nunca terminam não mantêm o visitante preso após seis segundos', async () => {
    await withController(async h => {
      const handle = h.acquire();
      const pending = { assetsReady: false, webglReady: false };
      for (const time of [0, 2650, 3000, 3850, 5999]) h.tick(handle, time, pending);
      assert.equal(handle.run.active, true);
      assertHeroEndpoint(h.tick(handle, 6000, pending));
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'complete');
      assert.equal(h.listenerCount(), 0);
      assert.equal(h.timers.size, 0);
    });
  });

  test('interrupcao de frames apos o inicio libera a hero sem esperar o deadline geral', async () => {
    await withController({ width: 390 }, async h => {
      const handle = h.acquire();
      h.tick(handle, 100);
      h.advance(1199);
      assert.equal(handle.run.active, true);
      h.advance(1200);
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'stalled');
      assert.equal(h.root.style.overflow, '');
      assert.equal(h.timers.size, 0);
      assert.equal(h.storageValues.get(INTRO_KEY), 'seen');
    });
  });

  test('guard libera a página mesmo sem novos frames do motor', async () => {
    await withController(async h => {
      const handle = h.acquire();
      h.advance(6599);
      assert.equal(handle.run.active, true);
      h.advance(6600);
      assert.equal(handle.run.active, false);
      assert.equal(h.overlay.dataset.result, 'timeout');
      assert.equal(h.root.style.overflow, '');
      assert.equal(h.body.style.overflow, '');
      assert.equal(h.listenerCount(), 0);
      assert.equal(h.timers.size, 0);
      assert.equal(h.storageValues.get(INTRO_KEY), 'seen');
    });
  });

  test('wheel e teclado deixam de ser interceptados depois do cleanup; pinch não é bloqueado', async () => {
    await withController(async h => {
      const handle = h.acquire();
      const wheel = new Event('wheel', { cancelable: true });
      h.overlay.dispatchEvent(wheel);
      assert.equal(wheel.defaultPrevented, true);
      const pinch = new Event('touchmove', { cancelable: true });
      Object.defineProperty(pinch, 'touches', { value: [{}, {}] });
      h.overlay.dispatchEvent(pinch);
      assert.equal(pinch.defaultPrevented, false);
      h.release(handle);
      await Promise.resolve();
      const after = new Event('wheel', { cancelable: true });
      h.overlay.dispatchEvent(after);
      assert.equal(after.defaultPrevented, false);
      assert.equal(h.key('Tab').defaultPrevented, false);
      assert.equal(h.key('PageDown').defaultPrevented, false);
      assert.equal(h.listenerCount(), 0);
    });
  });
});
