import { reserveIntroSession } from './session.js';
import { INTRO_TIMING, introClock, sampleIntro } from './timeline.js';

let activeRun = null;

function createRun(lease) {
  const root = document.documentElement;
  const overlay = document.querySelector('[data-intro-overlay]');
  if (!overlay) { lease.complete(); delete root.dataset.introState; return null; }
  clearTimeout(window.__gislaineIntroWatchdog);
  const button = overlay.querySelector('[data-intro-skip]');
  const contentSkip = document.querySelector('.skip-link');
  const stageNode = overlay.querySelector('[data-intro-stage]');
  const abort = new AbortController();
  const { signal } = abort;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const previousFocus = document.activeElement;
  const originalScroll = { x: scrollX, y: scrollY };
  const originalStyle = { rootOverflow: root.style.overflow, bodyOverflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight, scrollBehavior: root.style.scrollBehavior };
  const scrollbar = innerWidth - root.clientWidth;
  const start = performance.now();
  let hiddenAt = document.hidden ? start : null;
  let hiddenTime = 0;
  let hold = 0;
  let assetsReleased = false;
  let stage;
  let lastFrame;
  let skipFrom;
  let skipAt;
  let done = false;
  let skipVisible = false;
  let releaseGeneration = 0;
  let guard;
  let frameGuard;
  let owners = 0;
  const callbacks = new Set();

  root.dataset.introState = 'playing';
  root.style.overflow = 'hidden';
  root.style.scrollBehavior = 'auto';
  document.body.style.overflow = 'hidden';
  if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
  document.body.classList.add('intro-playing');
  overlay.dataset.skipReady = 'false';
  button.tabIndex = -1;
  overlay.dataset.phase = 'fragments';
  overlay.dataset.run = lease.token;

  const invalidate = () => callbacks.forEach(callback => callback());
  function measure() {
    const bounds = stageNode.getBoundingClientRect();
    stage = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2,
      size: Math.min(bounds.height / .7, innerWidth * 1.35, innerHeight * .87), opacity: 1 };
  }
  function revealSkip(focus = false) {
    if (!skipVisible) { skipVisible = true; overlay.dataset.skipReady = 'true'; button.tabIndex = 0; }
    if (focus) button.focus({ preventScroll: true });
  }
  function finish(reason = 'complete') {
    if (done) return;
    done = true;
    activeRun = null;
    lease.complete();
    abort.abort();
    clearTimeout(guard);
    clearTimeout(frameGuard);
    root.dataset.introState = 'seen';
    overlay.dataset.result = reason;
    overlay.dataset.phase = 'complete';
    overlay.style.setProperty('--intro-handoff', '1');
    if (reason === 'stalled') {
      document.querySelector('[data-portrait-mask-shape]')?.setAttribute?.('transform', 'translate(.62 .31) scale(.016) translate(-650 -700)');
      const world = document.querySelector('[data-world]');
      if (world) world.style.opacity = '0';
    }
    document.body.classList.remove('intro-playing');
    root.style.overflow = originalStyle.rootOverflow;
    document.body.style.overflow = originalStyle.bodyOverflow;
    document.body.style.paddingRight = originalStyle.paddingRight;
    if (scrollX !== originalScroll.x || scrollY !== originalScroll.y) window.scrollTo(originalScroll.x, originalScroll.y);
    root.style.scrollBehavior = originalStyle.scrollBehavior;
    if (reason !== 'unmount' && (overlay.contains(document.activeElement) || reason === 'skipped' && document.activeElement === document.body)) {
      const target = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : document.querySelector('main');
      target?.focus({ preventScroll: true });
    }
    button.tabIndex = -1;
    invalidate();
    callbacks.clear();
  }
  function skip() {
    if (done || skipFrom) return;
    lease.complete();
    if (!lastFrame || reduced.matches) { finish('skipped'); return; }
    skipFrom = lastFrame;
    skipAt = performance.now() - hiddenTime;
    root.dataset.introState = 'leaving';
    revealSkip();
    invalidate();
  }
  function tick(now, hero, { assetsReady, webglReady, failed, quality }) {
    if (done) return hero;
    if (reduced.matches) { finish('reduced-motion'); return hero; }
    clearTimeout(frameGuard);
    if (innerWidth < 768) frameGuard = setTimeout(() => finish('stalled'), 1100);
    const elapsed = now - start - hiddenTime;
    assetsReleased ||= assetsReady && (webglReady || failed || !quality.webgl);
    const clock = introClock(elapsed, assetsReleased, hold);
    hold = clock.hold;
    if (elapsed >= INTRO_TIMING.skipAvailable) revealSkip();
    const skipProgress = skipFrom ? Math.min(1, (now - hiddenTime - skipAt) / INTRO_TIMING.skip) : 0;
    lastFrame = sampleIntro(clock.elapsed, hero, stage, { mobile: innerWidth < 768, skipFrom, skipProgress });
    const visual = lastFrame.intro;
    overlay.dataset.phase = visual.phase;
    overlay.dataset.progress = visual.progress.toFixed(4);
    overlay.dataset.quality = quality.mode === 'full' ? 'high' : quality.mode === 'mobile' ? 'medium' : quality.mode;
    overlay.style.setProperty('--intro-build', visual.build.toFixed(4));
    overlay.style.setProperty('--intro-assembly', visual.assembly.toFixed(4));
    overlay.style.setProperty('--intro-handoff', visual.handoff.toFixed(4));
    if (visual.handoff > 0) root.dataset.introState = 'leaving';
    if (skipFrom ? skipProgress === 1 : clock.elapsed >= INTRO_TIMING.duration) finish(skipFrom ? 'skipped' : 'complete');
    return lastFrame;
  }
  button.addEventListener('click', skip, { signal });
  contentSkip?.addEventListener('click', () => finish('skipped'), { signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); skip(); }
    if (event.key === 'Tab') {
      event.preventDefault();
      if (document.activeElement === contentSkip || event.shiftKey && document.activeElement !== button) revealSkip(true);
      else (contentSkip ?? button).focus({ preventScroll: true });
    }
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key) && event.target !== button) event.preventDefault();
  }, { capture: true, signal });
  // The document remains exposed to assistive technology; only visual interaction is gated.
  document.addEventListener('focusin', event => { if (!overlay.contains(event.target) && event.target !== contentSkip) revealSkip(true); }, { signal });
  overlay.addEventListener('wheel', event => event.preventDefault(), { passive: false, signal });
  overlay.addEventListener('touchmove', event => { if (event.touches.length === 1) event.preventDefault(); }, { passive: false, signal });
  reduced.addEventListener('change', () => { if (reduced.matches) finish('reduced-motion'); }, { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = performance.now(); clearTimeout(guard); clearTimeout(frameGuard); }
    else {
      if (hiddenAt !== null) hiddenTime += performance.now() - hiddenAt;
      hiddenAt = null;
      if (lastFrame && innerWidth < 768) { clearTimeout(frameGuard); frameGuard = setTimeout(() => finish('stalled'), 1100); }
      armGuard(); invalidate();
    }
  }, { signal });
  function armGuard() {
    clearTimeout(guard);
    guard = setTimeout(() => finish('timeout'), Math.max(0, INTRO_TIMING.guard - (performance.now() - start - hiddenTime)));
  }
  measure();
  if (!document.hidden) armGuard();
  return {
    get active() { return !done; },
    measure, tick,
    acquire(callback) {
      owners++; releaseGeneration++; callbacks.add(callback);
      return () => {
        owners--; callbacks.delete(callback);
        const generation = ++releaseGeneration;
        // StrictMode reclaims the same lease synchronously before this microtask.
        queueMicrotask(() => { if (!owners && generation === releaseGeneration) finish('unmount'); });
      };
    },
  };
}

export function acquireIntro(onInvalidate) {
  if (!activeRun?.active) {
    const lease = reserveIntroSession();
    if (!lease.shouldPlay) {
      clearTimeout(window.__gislaineIntroWatchdog);
      document.documentElement.dataset.introState = 'seen';
      return null;
    }
    activeRun = createRun(lease);
  }
  if (!activeRun) return null;
  const release = activeRun.acquire(onInvalidate);
  return { run: activeRun, release };
}
