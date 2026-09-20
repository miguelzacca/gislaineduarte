// Cross-document events can precede hydration and outlive a pagehide cleanup.
export function installNativeTransitions(host) {
  const key = '__gislaineNativeTransitionsV1';
  if (host[key]) return host[key];

  function report(error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError' ||
        (error?.name === 'InvalidStateError' && /ViewTransition opt-in disabled/.test(error.message)) ||
        error?.message === 'Transition was aborted because of invalid state. ViewTransition opt-in disabled') return;
    if (typeof host.reportError === 'function') host.reportError(error);
    else host.setTimeout(() => { throw error; }, 0);
  }

  function observe(event) {
    for (const phase of ['ready', 'updateCallbackDone', 'finished']) {
      void event.viewTransition?.[phase]?.catch(report);
    }
  }

  const runtime = {
    dispose() {
      host.removeEventListener('pageswap', observe);
      host.removeEventListener('pagereveal', observe);
      if (host[key] === runtime) delete host[key];
    },
  };
  host[key] = runtime;
  host.addEventListener('pageswap', observe);
  host.addEventListener('pagereveal', observe);
  return runtime;
}

export const NATIVE_TRANSITIONS_BOOTSTRAP = `(${installNativeTransitions.toString()})(window);`;
