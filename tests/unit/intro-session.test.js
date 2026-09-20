import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  INTRO_BOOTSTRAP,
  INTRO_KEY,
  INTRO_TAB_KEY,
  beginIntroSession,
  buildBootstrap,
  cancelIntroBootstrap,
  reserveIntroSession,
} from '../../src/intro/session.js';

function storage(initial = {}, behavior = {}) {
  const values = new Map(Object.entries(initial));
  const operations = [];
  return {
    values,
    operations,
    getItem(key) {
      operations.push(['get', key]);
      if (behavior.readError) throw new Error('SecurityError');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      operations.push(['set', key, String(value)]);
      if (behavior.writeError) throw new Error('QuotaExceededError');
      values.set(key, String(value));
    },
    removeItem(key) {
      operations.push(['remove', key]);
      if (behavior.removeError) throw new Error('SecurityError');
      values.delete(key);
    },
    clear() { values.clear(); },
  };
}

let hostSequence = 0;

function browser({ store = storage(), path = '/', hash = '', reduced = false, opener = null } = {}) {
  const hostId = ++hostSequence;
  let sequence = 0;
  const mutations = [];
  const host = {
    location: { pathname: path, hash },
    document: {
      documentElement: {
        dataset: new Proxy({}, {
          set(target, key, value) {
            mutations.push([key, value, store?.values?.get(INTRO_KEY)]);
            target[key] = value;
            return true;
          },
        }),
      },
    },
    sessionStorage: store,
    crypto: { randomUUID: () => `tab-${hostId}-token-${++sequence}` },
    matchMedia: () => ({ matches: reduced }),
    opener,
    mutations,
  };
  return host;
}

function withBrowser(host, action) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: host });
  try { return action(); } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
}

function bootstrap(host) {
  runInNewContext(INTRO_BOOTSTRAP, { window: host });
  return host.__gislaineIntroBoot;
}

function reserve(host, options) {
  return withBrowser(host, () => reserveIntroSession(options));
}

describe('sessão da introdução cinematográfica', { concurrency: false }, () => {
  test('exporta chaves estáveis, bootstrap determinístico e alias da API', () => {
    assert.equal(INTRO_KEY, 'gislaine:intro:v1');
    assert.equal(INTRO_TAB_KEY, 'gislaine:intro:tab:v1');
    assert.equal(buildBootstrap(), INTRO_BOOTSTRAP);
    assert.equal(beginIntroSession, reserveIntroSession);
    assert.doesNotMatch(INTRO_BOOTSTRAP, /<\/script|localStorage|document\.cookie|window\.name/);
  });

  test('primeira visita reserva playing antes de mostrar o overlay', () => {
    const host = browser();
    const boot = bootstrap(host);
    assert.equal(boot.shouldPlay, true);
    assert.equal(boot.claimed, false);
    assert.equal(boot.reason, 'first-visit');
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'playing');
    assert.deepEqual(host.mutations, [['introState', 'pending', 'playing']]);
    assert.ok(host.sessionStorage.getItem(INTRO_TAB_KEY));
  });

  test('primeiro owner consome a reserva do bootstrap, sem confundir com refresh', () => {
    const host = browser();
    const boot = bootstrap(host);
    const lease = reserve(host);
    assert.equal(lease.shouldPlay, true);
    assert.equal(lease.token, boot.token);
    assert.equal(boot.claimed, true);
    assert.equal(reserve(host).shouldPlay, false);
    assert.equal(reserve(host).reason, 'playing');
  });

  test('bootstrap duplicado não produz outro token nem outra reserva', () => {
    const host = browser();
    const first = bootstrap(host);
    const count = host.sessionStorage.operations.filter(([operation, key]) => operation === 'set' && key === INTRO_KEY).length;
    assert.equal(bootstrap(host), first);
    assert.equal(host.sessionStorage.operations.filter(([operation, key]) => operation === 'set' && key === INTRO_KEY).length, count);
    assert.equal(reserve(host).token, first.token);
  });

  test('watchdog finaliza apenas o boot pendente sem criar uma nova reserva', () => {
    const host = browser();
    const boot = bootstrap(host);
    const token = boot.token;
    assert.equal(host.__gislaineIntroSessionV1.cancelBootstrap(), true);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'seen');
    assert.equal(host.document.documentElement.dataset.introState, undefined);
    assert.equal(boot.claimed, true);
    assert.equal(boot.completed, true);
    assert.equal(boot.token, token);
    assert.equal(reserve(host).reason, 'seen');
    assert.equal(withBrowser(host, () => cancelIntroBootstrap()), false);
  });

  test('watchdog não cancela a lease já reclamada pelo controller', () => {
    const host = browser();
    bootstrap(host);
    const lease = reserve(host);
    assert.equal(withBrowser(host, () => cancelIntroBootstrap()), false);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'playing');
    assert.equal(host.document.documentElement.dataset.introState, 'pending');
    assert.equal(lease.complete(), true);
  });

  test('cancelar sem bootstrap não inicia intro nem escreve playing ou seen', () => {
    const host = browser();
    assert.equal(withBrowser(host, () => cancelIntroBootstrap()), false);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), null);
    assert.equal(host.__gislaineIntroBoot, undefined);
  });

  test('watchdog usa o fallback de memória quando o storage está bloqueado', () => {
    const host = browser({ store: storage({}, { readError: true, writeError: true }) });
    bootstrap(host);
    assert.equal(withBrowser(host, () => cancelIntroBootstrap()), true);
    assert.equal(host.document.documentElement.dataset.introState, undefined);
    assert.equal(reserve(host).reason, 'seen');
  });

  test('watchdog não restaura estado apagado nem captura uma reserva posterior', () => {
    const host = browser();
    bootstrap(host);
    host.sessionStorage.clear();
    assert.equal(withBrowser(host, () => cancelIntroBootstrap()), false);
    assert.equal(host.document.documentElement.dataset.introState, undefined);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), null);
    const next = reserve(host);
    assert.equal(next.shouldPlay, true);
    assert.equal(withBrowser(host, () => cancelIntroBootstrap()), false);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'playing');
  });

  test('final e skip usam complete idempotente e impedem replay na sessão', () => {
    const host = browser();
    bootstrap(host);
    const lease = reserve(host);
    assert.equal(lease.complete(), true);
    assert.equal(lease.complete(), false);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'seen');
    assert.equal(host.__gislaineIntroBoot.completed, true);
    const next = reserve(host);
    assert.equal(next.shouldPlay, false);
    assert.equal(next.reason, 'seen');
    assert.equal(next.complete(), false);
  });

  test('reserva sem bootstrap funciona e guarda um único owner em StrictMode', () => {
    const host = browser();
    const first = reserve(host);
    const duplicate = reserve(host);
    assert.equal(first.shouldPlay, true);
    assert.equal(duplicate.shouldPlay, false);
    assert.equal(duplicate.reason, 'playing');
    assert.equal(first.complete(), true);
    assert.equal(reserve(host).reason, 'seen');
  });

  for (const persisted of ['playing', 'seen']) {
    test(`refresh de ${persisted} não repete a abertura nem mostra overlay`, () => {
      const store = storage({ [INTRO_KEY]: persisted, [INTRO_TAB_KEY]: 'existing-tab' });
      const host = browser({ store });
      const boot = bootstrap(host);
      assert.equal(boot.shouldPlay, false);
      assert.equal(boot.reason, persisted);
      assert.equal(reserve(host).reason, persisted);
      assert.equal(store.getItem(INTRO_TAB_KEY), 'existing-tab');
      assert.deepEqual(host.mutations, []);
    });
  }

  test('limpar armazenamento permite replay no mesmo documento, sem memória obsoleta', () => {
    const host = browser();
    const first = reserve(host);
    first.complete();
    host.sessionStorage.clear();
    const second = reserve(host);
    assert.equal(second.shouldPlay, true);
    assert.notEqual(second.token, first.token);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'playing');
    assert.ok(host.sessionStorage.getItem(INTRO_TAB_KEY));
    assert.equal(second.complete(), true);
  });

  test('uma lease antiga não encerra uma nova reserva após storage.clear', () => {
    const host = browser();
    const first = reserve(host);
    host.sessionStorage.clear();
    const second = reserve(host);
    assert.equal(first.complete(), false);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'playing');
    assert.equal(second.complete(), true);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'seen');
  });

  test('complete não regrava estado apagado sem uma nova reserva', () => {
    const host = browser();
    const lease = reserve(host);
    host.sessionStorage.removeItem(INTRO_KEY);
    assert.equal(lease.complete(), false);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), null);
    assert.equal(reserve(host).shouldPlay, true);
  });

  test('nova aba independente toca a intro sem alterar a aba original', () => {
    const original = browser();
    reserve(original).complete();
    const child = browser();
    assert.equal(bootstrap(child).shouldPlay, true);
    assert.notEqual(child.sessionStorage.getItem(INTRO_TAB_KEY), original.sessionStorage.getItem(INTRO_TAB_KEY));
    assert.equal(original.sessionStorage.getItem(INTRO_KEY), 'seen');
  });

  for (const persisted of ['playing', 'seen']) {
    test(`nova aba com opener e estado ${persisted} clonado recebe sessão própria`, () => {
      const original = browser();
      const originalLease = reserve(original);
      if (persisted === 'seen') originalLease.complete();
      const originalTab = original.sessionStorage.getItem(INTRO_TAB_KEY);
      const childStore = storage(Object.fromEntries(original.sessionStorage.values));
      const child = browser({ store: childStore, opener: original });
      assert.equal(bootstrap(child).shouldPlay, true);
      assert.notEqual(childStore.getItem(INTRO_TAB_KEY), originalTab);
      assert.equal(original.sessionStorage.getItem(INTRO_TAB_KEY), originalTab);
      assert.equal(original.sessionStorage.getItem(INTRO_KEY), persisted);

      const interruptedChild = browser({ store: childStore, opener: original });
      assert.equal(bootstrap(interruptedChild).shouldPlay, false);
      assert.equal(interruptedChild.__gislaineIntroBoot.reason, 'playing');
      assert.equal(reserve(child).complete(), true);

      const refreshedChild = browser({ store: childStore, opener: original });
      assert.equal(bootstrap(refreshedChild).shouldPlay, false);
      assert.equal(refreshedChild.__gislaineIntroBoot.reason, 'seen');
      assert.equal(childStore.getItem(INTRO_KEY), 'seen');
    });
  }

  test('clone com opener é renovado na entrada interna, antes da elegibilidade', () => {
    const original = browser();
    reserve(original).complete();
    const childStore = storage(Object.fromEntries(original.sessionStorage.values));
    const child = browser({ store: childStore, path: '/sobre/', opener: original });
    const internalBoot = bootstrap(child);
    assert.equal(internalBoot.shouldPlay, false);
    assert.equal(internalBoot.reason, 'not-home');
    assert.equal(childStore.getItem(INTRO_KEY), null);
    assert.notEqual(childStore.getItem(INTRO_TAB_KEY), original.sessionStorage.getItem(INTRO_TAB_KEY));
    assert.deepEqual(child.mutations, []);

    const childHome = browser({ store: childStore, opener: original });
    assert.equal(bootstrap(childHome).shouldPlay, true);
    assert.equal(reserve(childHome).complete(), true);
  });

  test('opener inacessível cross-origin não bloqueia a página nem apaga a sessão', () => {
    const opener = {};
    Object.defineProperty(opener, 'sessionStorage', { get() { throw new Error('SecurityError'); } });
    const host = browser({ store: storage({ [INTRO_KEY]: 'seen', [INTRO_TAB_KEY]: 'existing-tab' }), opener });
    assert.equal(bootstrap(host).reason, 'seen');
    assert.equal(host.sessionStorage.getItem(INTRO_TAB_KEY), 'existing-tab');
    assert.deepEqual(host.mutations, []);
  });

  test('rota interna não consome a intro: a home posterior ainda pode iniciar', () => {
    const host = browser({ path: '/atendimentos/' });
    assert.equal(bootstrap(host).reason, 'not-home');
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), null);
    assert.deepEqual(host.mutations, []);
    host.location.pathname = '/';
    assert.equal(reserve(host).shouldPlay, true);
  });

  for (const hash of ['#abordagem', '#atendimentos', '#perguntas']) {
    test(`link profundo ${hash} não toma a navegação de âncora`, () => {
      const host = browser({ hash });
      assert.equal(bootstrap(host).reason, 'deep-link');
      assert.equal(reserve(host).shouldPlay, false);
      assert.equal(host.sessionStorage.getItem(INTRO_KEY), null);
      assert.deepEqual(host.mutations, []);
    });
  }

  test('reduced motion marca seen sem pending e não reaparece após mudar preferência', () => {
    const host = browser({ reduced: true });
    assert.equal(bootstrap(host).reason, 'reduced-motion');
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'seen');
    assert.equal(reserve(host).shouldPlay, false);
    assert.deepEqual(host.mutations, []);
    host.matchMedia = () => ({ matches: false });
    assert.equal(reserve(host).reason, 'seen');
  });

  test('preferência reduzida surgida após bootstrap libera o pending sem começar', () => {
    const host = browser();
    bootstrap(host);
    assert.equal(host.document.documentElement.dataset.introState, 'pending');
    const lease = reserve(host, { reduced: true });
    assert.equal(lease.shouldPlay, false);
    assert.equal(lease.reason, 'reduced-motion');
    assert.equal(host.document.documentElement.dataset.introState, undefined);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'seen');
  });

  test('rota ou hash alterado antes do owner libera pending sem sobrepor a âncora', () => {
    const host = browser();
    bootstrap(host);
    host.location.hash = '#atendimentos';
    assert.equal(reserve(host).reason, 'deep-link');
    assert.equal(host.document.documentElement.dataset.introState, undefined);
  });

  test('override reduzido é explícito e testável sem alterar matchMedia', () => {
    const host = browser();
    const lease = reserve(host, { reduced: true });
    assert.equal(lease.reason, 'reduced-motion');
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'seen');
  });

  test('mudar para movimento reduzido invalida a lease anterior', () => {
    const host = browser();
    const lease = reserve(host);
    assert.equal(reserve(host, { reduced: true }).reason, 'reduced-motion');
    assert.equal(lease.complete(), false);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'seen');
  });

  test('getter de sessionStorage bloqueado usa memória e ainda consome boot uma vez', () => {
    const host = browser({ store: null });
    Object.defineProperty(host, 'sessionStorage', { get() { throw new Error('SecurityError'); } });
    assert.equal(bootstrap(host).shouldPlay, true);
    const first = reserve(host);
    assert.equal(first.shouldPlay, true);
    assert.equal(reserve(host).reason, 'playing');
    assert.equal(first.complete(), true);
    assert.equal(reserve(host).reason, 'seen');
  });

  test('getItem bloqueado usa memória sem lançar nem duplicar a introdução', () => {
    const store = storage({}, { readError: true, writeError: true });
    const host = browser({ store });
    const first = reserve(host);
    assert.equal(first.shouldPlay, true);
    assert.equal(reserve(host).reason, 'playing');
    assert.equal(first.complete(), true);
    assert.equal(reserve(host).reason, 'seen');
  });

  test('quota ou storage somente leitura não transforma null em replay infinito', () => {
    const store = storage({}, { writeError: true });
    const host = browser({ store });
    bootstrap(host);
    const first = reserve(host);
    assert.equal(first.shouldPlay, true);
    assert.equal(store.getItem(INTRO_KEY), null);
    assert.equal(reserve(host).reason, 'playing');
    first.complete();
    assert.equal(reserve(host).reason, 'seen');
  });

  test('nova reserva após limpar playing antes da hidratação invalida a lease do boot', () => {
    const host = browser();
    const initialToken = bootstrap(host).token;
    host.sessionStorage.removeItem(INTRO_KEY);
    const next = reserve(host);
    assert.equal(next.shouldPlay, true);
    assert.notEqual(next.token, initialToken);
    assert.equal(host.__gislaineIntroBoot.claimed, true);
    assert.equal(host.document.documentElement.dataset.introState, undefined);
    assert.equal(next.complete(), true);
  });

  test('reserva já concluída externamente antes da hidratação libera o pending', () => {
    const host = browser();
    bootstrap(host);
    host.sessionStorage.setItem(INTRO_KEY, 'seen');
    assert.equal(reserve(host).reason, 'seen');
    assert.equal(host.document.documentElement.dataset.introState, undefined);
  });

  test('token fallback funciona quando crypto.randomUUID não está disponível', () => {
    const host = browser();
    delete host.crypto;
    const boot = bootstrap(host);
    assert.equal(boot.shouldPlay, true);
    assert.equal(typeof boot.token, 'string');
    assert.ok(boot.token.length > 10);
    assert.equal(reserve(host).token, boot.token);
  });

  test('valor não reconhecido não bloqueia permanentemente a primeira visita', () => {
    const host = browser({ store: storage({ [INTRO_KEY]: 'corrupted' }) });
    assert.equal(bootstrap(host).shouldPlay, true);
    assert.equal(host.sessionStorage.getItem(INTRO_KEY), 'playing');
  });

  test('API funciona sem window durante SSR e permite storage/path injetados', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    delete globalThis.window;
    try {
      assert.equal(reserveIntroSession().reason, 'not-home');
      const store = storage();
      const lease = reserveIntroSession({ storage: store, path: '/', hash: '', reduced: false });
      assert.equal(lease.shouldPlay, true);
      assert.equal(lease.complete(), true);
      assert.equal(store.getItem(INTRO_KEY), 'seen');
    } finally {
      if (previous) Object.defineProperty(globalThis, 'window', previous);
    }
  });
});
