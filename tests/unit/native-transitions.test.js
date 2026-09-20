import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import {
  installNativeTransitions,
  NATIVE_TRANSITIONS_BOOTSTRAP,
} from '../../src/motion/native-transitions.js';

const runtimeKey = '__gislaineNativeTransitionsV1';
const transitionEvents = ['pageswap', 'pagereveal'];

function browser({ reportError = true } = {}) {
  const target = new EventTarget();
  const listeners = new Map();
  const host = {
    additions: [],
    reports: [],
    timers: [],
    addEventListener(type, callback, options) {
      target.addEventListener(type, callback, options);
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
      host.additions.push(type);
    },
    removeEventListener(type, callback, options) {
      target.removeEventListener(type, callback, options);
      listeners.get(type)?.delete(callback);
    },
    emit(type, properties = {}) {
      target.dispatchEvent(Object.assign(new Event(type), properties));
    },
    listenerCount(type) { return listeners.get(type)?.size ?? 0; },
    setTimeout(callback, delay) {
      assert.equal(this, host);
      host.timers.push({ callback, delay });
      return host.timers.length;
    },
  };
  if (reportError) {
    host.reportError = function (error) {
      assert.equal(this, host);
      host.reports.push(error);
    };
  }
  return host;
}

function rejectTransition(host, type, error) {
  host.emit(type, { viewTransition: { ready: Promise.reject(error) } });
}

test('instala somente os dois listeners nativos uma vez por documento', t => {
  const host = browser();
  const first = installNativeTransitions(host);
  t.after(() => first.dispose());
  assert.equal(typeof first.dispose, 'function');
  assert.equal(host[runtimeKey], first);
  assert.equal(installNativeTransitions(host), first);
  assert.deepEqual(host.additions, transitionEvents);
  for (const type of transitionEvents) assert.equal(host.listenerCount(type), 1);
  assert.equal(host.listenerCount('unhandledrejection'), 0);
  assert.equal(host.listenerCount('error'), 0);
});

test('observa ready em pageswap e pagereveal, inclusive eventos repetidos', async t => {
  const host = browser();
  const runtime = installNativeTransitions(host);
  t.after(() => runtime.dispose());
  const failures = [];
  for (const type of [...transitionEvents, ...transitionEvents]) {
    const error = new Error(`Falha inesperada em ${type} ${failures.length}`);
    failures.push(error);
    rejectTransition(host, type, error);
  }
  await nextTurn();
  assert.deepEqual(host.reports, failures);
  assert.equal(host.timers.length, 0);
});

test('eventos sem transição ou com ready resolvida não geram erros', async t => {
  const host = browser();
  const runtime = installNativeTransitions(host);
  t.after(() => runtime.dispose());
  for (const type of transitionEvents) {
    assert.doesNotThrow(() => host.emit(type));
    assert.doesNotThrow(() => host.emit(type, { viewTransition: null }));
    host.emit(type, { viewTransition: { ready: Promise.resolve() } });
  }
  await nextTurn();
  assert.deepEqual(host.reports, []);
  assert.deepEqual(host.timers, []);
});

test('cancelamentos esperados de ready são tratados nos dois eventos', async t => {
  const host = browser();
  const runtime = installNativeTransitions(host);
  t.after(() => runtime.dispose());
  for (const type of transitionEvents) {
    for (const [name, message] of [
      ['AbortError', 'Transition was skipped.'],
      ['TimeoutError', 'Transition timed out.'],
      ['InvalidStateError', 'ViewTransition opt-in disabled'],
    ]) {
      rejectTransition(host, type, new DOMException(message, name));
    }
  }
  await nextTurn();
  assert.deepEqual(host.reports, []);
  assert.deepEqual(host.timers, []);
});

test('não oculta InvalidStateError distinto nem erro genérico com texto de cancelamento', async t => {
  const host = browser();
  const runtime = installNativeTransitions(host);
  t.after(() => runtime.dispose());
  const failures = [
    new DOMException('A snapshot could not be created.', 'InvalidStateError'),
    new Error('ViewTransition opt-in disabled'),
    new TypeError('Unexpected transition failure.'),
  ];
  for (const error of failures) rejectTransition(host, 'pagereveal', error);
  await nextTurn();
  assert.deepEqual(host.reports, failures);
  assert.deepEqual(host.timers, []);
});

test('sem reportError, erro inesperado é relançado pelo timer do host', async t => {
  const host = browser({ reportError: false });
  const runtime = installNativeTransitions(host);
  t.after(() => runtime.dispose());
  const failure = new Error('Unexpected failure without reportError.');
  rejectTransition(host, 'pageswap', new DOMException('Skipped.', 'AbortError'));
  rejectTransition(host, 'pagereveal', failure);
  await nextTurn();
  assert.equal(host.timers.length, 1);
  assert.equal(host.timers[0].delay, 0);
  assert.throws(host.timers[0].callback, error => error === failure);
});

test('pagehide e restauração do BFCache mantêm os listeners e o mesmo runtime', async t => {
  const host = browser();
  const runtime = installNativeTransitions(host);
  t.after(() => runtime.dispose());
  const failures = [];
  for (const persisted of [true, false]) {
    host.emit('pagehide', { persisted });
    host.emit('pageshow', { persisted });
    assert.equal(host[runtimeKey], runtime);
    for (const type of transitionEvents) {
      assert.equal(host.listenerCount(type), 1);
      const error = new Error(`${type} after pagehide, persisted=${persisted}`);
      failures.push(error);
      rejectTransition(host, type, error);
    }
  }
  await nextTurn();
  assert.deepEqual(host.reports, failures);
  assert.deepEqual(host.additions, transitionEvents);
});

test('dispose remove os listeners, permite reinstalar e não desmonta runtime posterior', async t => {
  const host = browser();
  const first = installNativeTransitions(host);
  first.dispose();
  first.dispose();
  assert.equal(host[runtimeKey], undefined);
  for (const type of transitionEvents) assert.equal(host.listenerCount(type), 0);
  let observedAfterDispose = 0;
  for (const type of transitionEvents) {
    host.emit(type, { viewTransition: { get ready() {
      observedAfterDispose += 1;
      return Promise.resolve();
    } } });
  }
  assert.equal(observedAfterDispose, 0);

  const second = installNativeTransitions(host);
  t.after(() => second.dispose());
  assert.notEqual(second, first);
  first.dispose();
  assert.equal(host[runtimeKey], second);
  for (const type of transitionEvents) assert.equal(host.listenerCount(type), 1);
  const failure = new Error('Failure after reinstall.');
  rejectTransition(host, 'pagereveal', failure);
  await nextTurn();
  assert.deepEqual(host.reports, [failure]);
});

test('bootstrap autossuficiente instala antes da hidratação e compartilha o sentinel', async t => {
  const host = browser();
  assert.equal(typeof NATIVE_TRANSITIONS_BOOTSTRAP, 'string');
  assert.doesNotMatch(NATIVE_TRANSITIONS_BOOTSTRAP, /<\/script/i);
  runInNewContext(NATIVE_TRANSITIONS_BOOTSTRAP, { window: host });
  const first = host[runtimeKey];
  t.after(() => host[runtimeKey]?.dispose());
  assert.ok(first, 'runtime existe imediatamente, sem documento, imports ou timers');
  assert.deepEqual(host.additions, transitionEvents);
  const failure = new Error('Early pagereveal before hydration.');
  rejectTransition(host, 'pagereveal', failure);
  rejectTransition(host, 'pageswap', new DOMException('ViewTransition opt-in disabled', 'InvalidStateError'));
  runInNewContext(NATIVE_TRANSITIONS_BOOTSTRAP, { window: host });
  assert.equal(host[runtimeKey], first);
  assert.equal(installNativeTransitions(host), first);
  assert.deepEqual(host.additions, transitionEvents);
  await nextTurn();
  assert.deepEqual(host.reports, [failure]);
  assert.deepEqual(host.timers, []);

  first.dispose();
  runInNewContext(NATIVE_TRANSITIONS_BOOTSTRAP, { window: host });
  assert.notEqual(host[runtimeKey], first);
  for (const type of transitionEvents) assert.equal(host.listenerCount(type), 1);
});
