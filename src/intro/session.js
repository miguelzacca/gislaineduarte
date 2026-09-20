export const INTRO_KEY = 'gislaine:intro:v1';
export const INTRO_TAB_KEY = 'gislaine:intro:tab:v1';

const RUNTIME_KEY = '__gislaineIntroSessionV1';

// This factory is self-contained because the same implementation runs before paint.
function createSessionRuntime(host, introKey, tabKey) {
  const storageStates = new WeakMap();
  const memoryState = createState();
  let pendingBoot = null;

  function createState() {
    return { status: null, activeToken: null, memoryOnly: false, tabPrepared: false };
  }

  function token() {
    try {
      if (host.crypto?.randomUUID) return host.crypto.randomUUID();
    } catch { /* A session token is an ownership marker, not a security secret. */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function defaultStorage() {
    try { return host.sessionStorage; } catch { return null; }
  }

  function stateFor(storage) {
    if (!storage || (typeof storage !== 'object' && typeof storage !== 'function')) return memoryState;
    if (!storageStates.has(storage)) storageStates.set(storage, createState());
    return storageStates.get(storage);
  }

  function prepareTab(storage, state) {
    if (!storage) return;

    try {
      let current = storage.getItem(tabKey);
      if (state.tabPrepared && current) return;
      state.tabPrepared = true;
      let openerToken = null;
      try { openerToken = host.opener?.sessionStorage?.getItem(tabKey); } catch { /* Cross-origin opener. */ }

      if (current && current === openerToken) {
        current = null;
        state.status = null;
        state.activeToken = null;
        try { storage.removeItem(introKey); } catch { state.memoryOnly = true; }
      }
      if (!current) storage.setItem(tabKey, token());
    } catch { /* Intro state still has a document-local fallback. */ }
  }

  function readStatus(storage, state) {
    if (state.memoryOnly) return state.status;
    try {
      if (!storage) throw new Error('Storage unavailable');
      const value = storage.getItem(introKey);
      const status = value === 'playing' || value === 'seen' ? value : null;
      if (status !== state.status) {
        state.status = status;
        state.activeToken = null;
      }
    } catch { state.memoryOnly = true; }
    return state.status;
  }

  function writeStatus(storage, state, status) {
    state.status = status;
    try {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(introKey, status);
      state.memoryOnly = false;
    } catch { state.memoryOnly = true; }
  }

  function preference(options) {
    if (options.reduced !== undefined) return Boolean(options.reduced);
    try { return Boolean(host.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
  }

  function declined(reason) {
    return { shouldPlay: false, token: null, reason, complete: () => false };
  }

  function releasePending(state) {
    if (pendingBoot?.state !== state) return;
    pendingBoot = null;
    if (host.__gislaineIntroBoot) host.__gislaineIntroBoot.claimed = true;
    const root = host.document?.documentElement;
    if (root?.dataset?.introState === 'pending') delete root.dataset.introState;
  }

  function reserve(options = {}, fromBootstrap = false) {
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const state = stateFor(storage);
    prepareTab(storage, state);

    const path = options.path ?? host.location?.pathname ?? '';
    const hash = options.hash ?? host.location?.hash ?? '';
    if (path !== '/' || hash) {
      releasePending(state);
      return declined(path !== '/' ? 'not-home' : 'deep-link');
    }
    if (preference(options)) {
      state.activeToken = null;
      writeStatus(storage, state, 'seen');
      releasePending(state);
      return declined('reduced-motion');
    }

    const status = readStatus(storage, state);
    if (!fromBootstrap && pendingBoot?.state === state &&
        pendingBoot.lease.token === state.activeToken &&
        !host.__gislaineIntroBoot?.claimed && status === 'playing') {
      const lease = pendingBoot.lease;
      host.__gislaineIntroBoot.claimed = true;
      pendingBoot = null;
      return lease;
    }
    if (pendingBoot?.state === state && pendingBoot.lease.token !== state.activeToken) releasePending(state);
    if (status) return declined(status);

    const leaseToken = token();
    state.activeToken = leaseToken;
    writeStatus(storage, state, 'playing');
    let completed = false;
    const lease = {
      shouldPlay: true,
      token: leaseToken,
      reason: 'first-visit',
      complete() {
        if (completed) return false;
        readStatus(storage, state);
        if (state.activeToken !== leaseToken || state.status !== 'playing') return false;
        completed = true;
        writeStatus(storage, state, 'seen');
        state.activeToken = null;
        if (host.__gislaineIntroBoot?.token === leaseToken) host.__gislaineIntroBoot.completed = true;
        return true;
      },
    };
    if (fromBootstrap) pendingBoot = { state, lease };
    return lease;
  }

  function bootstrap() {
    if (host.__gislaineIntroBoot) return host.__gislaineIntroBoot;
    const lease = reserve({}, true);
    const boot = { token: lease.token, claimed: !lease.shouldPlay, shouldPlay: lease.shouldPlay, reason: lease.reason };
    host.__gislaineIntroBoot = boot;
    if (lease.shouldPlay && host.document?.documentElement?.dataset) {
      host.document.documentElement.dataset.introState = 'pending';
    }
    return boot;
  }

  function cancelBootstrap() {
    if (!pendingBoot) return false;
    const { state, lease } = pendingBoot;
    const completed = lease.complete();
    releasePending(state);
    return completed;
  }

  return { reserve, bootstrap, cancelBootstrap };
}

let serverRuntime;

function runtime() {
  if (typeof window === 'undefined') {
    serverRuntime ??= createSessionRuntime({}, INTRO_KEY, INTRO_TAB_KEY);
    return serverRuntime;
  }
  window[RUNTIME_KEY] ??= createSessionRuntime(window, INTRO_KEY, INTRO_TAB_KEY);
  return window[RUNTIME_KEY];
}

/** Reserve once per owner; retain this lease across StrictMode effect replays. */
export function reserveIntroSession(options) {
  return runtime().reserve(options);
}

export const beginIntroSession = reserveIntroSession;

export function cancelIntroBootstrap() {
  return runtime().cancelBootstrap();
}

export function buildBootstrap() {
  return `(()=>{const h=window,k=${JSON.stringify(RUNTIME_KEY)};h[k]??=(${createSessionRuntime.toString()})(h,${JSON.stringify(INTRO_KEY)},${JSON.stringify(INTRO_TAB_KEY)});h[k].bootstrap();})();`;
}

export const INTRO_BOOTSTRAP = buildBootstrap();
