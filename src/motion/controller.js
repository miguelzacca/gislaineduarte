import { clamp, range, sampleMotion, selectQuality } from './model.js';
import { createVectorNarrative } from './vector-narrative.js';
import { initializeTransitions } from './transitions.js';
import { acquireIntro } from '../intro/controller.js';

export function initializeMotion() {
  const main = document.querySelector('main');
  const world = main?.querySelector('[data-world]');
  const sceneRoot = main?.querySelector('[data-brand-scene]');
  const hero = main?.querySelector('.hero');
  const portrait = hero?.querySelector('.portrait');
  const portraitMask = hero?.querySelector('[data-portrait-mask-shape]');
  const storyPhoto = main?.querySelector('#sobre .story-art');
  const birth = main?.querySelector('[data-birth-mark]');
  const header = document.querySelector('.site-header');
  const abort = new AbortController();
  const { signal } = abort;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedData = matchMedia('(prefers-reduced-data: reduce)');
  const connection = navigator.connection;
  const vectors = world ? createVectorNarrative({ main, world, journey: main.querySelector('[data-journey-svg]') }) : null;
  const cleanupTransitions = initializeTransitions();
  const pointer = { x: .5, y: .5 };
  const pillars = [...(main?.querySelectorAll('.pillar') ?? [])];
  const cards = [...(main?.querySelectorAll('.service-card') ?? [])];
  const birthTime = performance.now();
  let visited = false;
  try { visited = sessionStorage.getItem('gi-visited') === '1'; sessionStorage.setItem('gi-visited', '1'); } catch { /* Storage is optional. */ }
  document.documentElement.dataset.motionVisit = visited ? 'repeat' : 'first';
  let quality;
  let layout;
  let frameId = 0;
  let dirty = true;
  let disposed = false;
  let runtime = null;
  let creationAbort = null;
  let loading = false;
  let failed = false;
  let generation = 0;
  let assets = hero ? 0 : 1;
  let intro = 1;
  let renders = 0;
  let heavyFrames = 0;
  let base = 720;
  let focusedService = -1;
  let idleTask;
  let deadline;
  let debug;
  const cinematic = hero ? acquireIntro(schedule) : null;

  const rect = element => {
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { left: box.left, top: box.top + scrollY, width: box.width, height: box.height, bottom: box.bottom + scrollY };
  };
  const queryRect = selector => rect(main.querySelector(selector));
  function readQuality() {
    return selectQuality({ width: innerWidth, dpr: devicePixelRatio, reducedMotion: reduced.matches, saveData: reducedData.matches || connection?.saveData, effectiveType: connection?.effectiveType, memory: navigator.deviceMemory ?? 8, cores: navigator.hardwareConcurrency ?? 8 });
  }
  function destroySculpture() {
    generation++;
    creationAbort?.abort(); creationAbort = null;
    runtime?.dispose(); runtime = null;
    world?.querySelector('[data-scene-canvas]')?.replaceChildren();
    if (sceneRoot) { delete sceneRoot.dataset.sceneReady; sceneRoot.dataset.sceneState = 'fallback'; }
    world?.removeAttribute('data-webgl-ready');
  }
  function measure() {
    dirty = false;
    const next = readQuality();
    if (quality && next.mode !== quality.mode) destroySculpture();
    quality = next;
    document.documentElement.dataset.motionQuality = quality.mode;
    document.documentElement.classList.add('motion-enabled');
    base = innerWidth < 768 ? 440 : 720;
    if (world) { world.style.width = `${base}px`; world.style.height = `${base}px`; }
    const grid = main.querySelector('.approach-grid');
    const pinNode = main.querySelector(innerWidth < 768 ? '.approach-art' : '.approach-art-inner');
    const stage = main.querySelector('#abordagem .brand-scene');
    const container = rect(grid), pinBox = rect(pinNode), stageBox = rect(stage);
    const pinEnabled = pinNode && getComputedStyle(pinNode).position === 'sticky';
    const inset = pinEnabled ? Number.parseFloat(getComputedStyle(pinNode).top) || 0 : 0;
    layout = {
      hero: queryRect('[data-motion-anchor="hero"]'), heroBottom: rect(hero)?.bottom ?? 0,
      pin: container && pinBox && stageBox ? { top: container.top, bottom: container.bottom, height: pinBox.height, inset, enabled: pinEnabled, centerY: stageBox.top - pinBox.top + stageBox.height / 2, x: stageBox.left + stageBox.width / 2, size: Math.min(stageBox.width * 1.25, stageBox.height * 1.3) } : null,
      story: queryRect('#sobre .story-art'), services: queryRect('[data-motion-anchor="services"]'), contact: queryRect('[data-motion-anchor="contact"]'), detail: queryRect('[data-motion-anchor="detail"]'), end: document.documentElement.scrollHeight,
      pillars: pillars.map(rect), cards: cards.map(rect),
    };
    vectors?.measure();
    cinematic?.run.measure();
    runtime?.resize(base, quality.dpr);
    if (!quality.webgl) destroySculpture();
  }
  function canEnhance() {
    return world && !disposed && !failed && quality?.webgl && assets >= 1 && !document.hidden && world.dataset.worldVisible === 'true' && !document.body.classList.contains('menu-open');
  }
  async function enhance() {
    if (!canEnhance() || loading || runtime) return;
    loading = true;
    const version = generation;
    const creation = new AbortController();
    creationAbort = creation;
    sceneRoot.dataset.sceneState = 'loading';
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
    try {
      // The transport keeps GPU preparation off this controller's only RAF.
      const { createSculpture } = await import('./sculpture-client.js');
      if (version !== generation || !canEnhance()) return;
      const created = await createSculpture({ canvas, quality, signal: creation.signal, onInvalidate: schedule, onContextLost: () => { if (disposed || version !== generation) return; failed = true; destroySculpture(); schedule(); } });
      if (version !== generation || !canEnhance()) { created?.dispose(); return; }
      if (!created) throw new Error('No WebGL context');
      runtime = created; world.querySelector('[data-scene-canvas]').replaceChildren(canvas); runtime.resize(base, quality.dpr); schedule();
    } catch { if (!disposed && version === generation) { failed = true; destroySculpture(); schedule(); } canvas.remove(); }
    finally { if (creationAbort === creation) creationAbort = null; loading = false; if (!runtime && canEnhance()) schedule(); }
  }
  function schedule() { if (!disposed && !frameId && !document.hidden) frameId = requestAnimationFrame(draw); }
  function invalidate() { dirty = true; schedule(); }
  function draw(now) {
    frameId = 0;
    if (disposed || document.hidden) return;
    if (dirty) measure();
    // Read the viewport once, before SVG/style writes invalidate layout.
    const viewport = { width: innerWidth, height: innerHeight };
    const position = scrollY;
    header?.classList.toggle('is-scrolled', position > 24);
    intro = reduced.matches || visited || position > 50 ? 1 : Math.max(intro, Math.min(assets, range(birthTime, birthTime + 720, now)));
    let frame = sampleMotion(layout, position, viewport, reduced.matches);
    frame.assembly = intro; frame.pointer = pointer;
    if (cinematic?.run.active) frame = cinematic.run.tick(now, frame, { assetsReady: completed === jobs.length, webglReady: Boolean(runtime) && runtime.isReady?.() !== false, failed, quality });
    if (focusedService >= 0 && frame.scene === 'services') { frame.focus = focusedService ? 3 : 0; frame.energy = .8; }
    main.dataset.motionScene = frame.scene; main.dataset.motionProgress = frame.progress.toFixed(4); main.dataset.motionOpening = frame.opening.toFixed(4);
    if (birth) { birth.style.setProperty('--birth-progress', String(intro)); birth.style.opacity = intro >= 1 ? '0' : '1'; }
    hero?.setAttribute('aria-busy', assets < 1 ? 'true' : 'false');
    hero?.style.setProperty('--hero-exit', reduced.matches ? '0' : frame.heroExit.toFixed(4));
    hero?.style.setProperty('--portrait-birth', String(intro));
    if (portrait) portrait.style.setProperty('--portrait-depth', reduced.matches ? '0' : `${frame.heroExit * 36}px`);
    const photoReveal = frame.intro ? frame.intro.handoff : intro;
    portraitMask?.setAttribute('transform', `translate(.62 .31) scale(${(.0007 + photoReveal * .0153).toFixed(5)}) translate(-650 -700)`);
    if (storyPhoto) storyPhoto.style.setProperty('--story-progress', String(reduced.matches ? .5 : frame.storyProgress));
    cards.forEach((card, index) => { const box = layout.cards[index]; card.style.setProperty('--service-formation', String(reduced.matches ? 1 : range(box.top - viewport.height * .95, box.top - viewport.height * .32, position))); });
    pillars.forEach((pillar, index) => { pillar.dataset.pillarActive = String(Math.round(frame.focus) === index && frame.scene === 'approach'); });
    if (world) {
      const { x, y, size, opacity } = frame.world;
      const visible = !reduced.matches && y + size / 2 > 0 && y - size / 2 < viewport.height;
      world.style.transform = `translate3d(${(x - base / 2).toFixed(2)}px,${(y - base / 2).toFixed(2)}px,0) scale(${(size / base).toFixed(5)})`;
      world.style.opacity = visible ? String(opacity) : '0'; world.dataset.worldVisible = String(visible);
      world.dataset.cameraAzimuth = frame.camera.azimuth.toFixed(4); world.dataset.cameraDistance = frame.camera.distance.toFixed(4);
      vectors?.render(frame);
      if (runtime && visible && !document.body.classList.contains('menu-open')) {
        const started = performance.now();
        try {
          if (!runtime.render(frame)) throw new Error('The scene is unavailable; continue with SVG.');
          renders++;
          const cost = Math.max(performance.now() - started, runtime.frameCost ?? 0);
          heavyFrames = cost > 28 ? heavyFrames + 1 : Math.max(0, heavyFrames - 1);
          if (heavyFrames > 12 && quality.dpr > .8) { quality.dpr = Math.max(.8, quality.dpr * .8); runtime.resize(base, quality.dpr); heavyFrames = 0; }
          if (runtime.isReady?.() !== false) {
            sceneRoot.dataset.sceneReady = 'true'; sceneRoot.dataset.sceneState = 'enhanced'; world.dataset.webglReady = 'true'; world.dataset.renderCount = String(renders); world.dataset.dpr = quality.dpr.toFixed(2);
          }
        } catch { failed = true; destroySculpture(); }
      }
      if (!runtime && assets >= 1 && visible) void enhance();
    }
    if (debug) debug.textContent = `${frame.scene} ${(frame.progress * 100).toFixed(0)}% · ${quality.mode} · DPR ${quality.dpr.toFixed(2)} · WebGL ${runtime ? 'ativo' : loading ? 'carregando' : 'SVG'}\n${JSON.stringify(runtime?.getStats() ?? {})}`;
    if (intro < assets && !reduced.matches && !visited) schedule();
    if (cinematic?.run.active) schedule();
  }
  window.addEventListener('scroll', schedule, { passive: true, signal }); window.addEventListener('resize', invalidate, { passive: true, signal });
  reduced.addEventListener('change', invalidate, { signal }); reducedData.addEventListener('change', invalidate, { signal }); connection?.addEventListener?.('change', invalidate, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; } else invalidate(); }, { signal });
  document.addEventListener('pointermove', event => { if (event.pointerType === 'touch' || reduced.matches || !event.target.closest?.('.hero, .approach, .service-card')) return; pointer.x = clamp(event.clientX / innerWidth); pointer.y = clamp(event.clientY / innerHeight); schedule(); }, { passive: true, signal });
  cards.forEach((card, index) => {
    const focus = () => { focusedService = index % 2; card.dataset.motionFocus = 'true'; schedule(); };
    const blur = () => { focusedService = -1; delete card.dataset.motionFocus; schedule(); };
    card.addEventListener('pointerenter', focus, { passive: true, signal }); card.addEventListener('pointerleave', blur, { passive: true, signal }); card.addEventListener('focusin', focus, { signal }); card.addEventListener('focusout', blur, { signal });
  });
  const resizeObserver = new ResizeObserver(invalidate); resizeObserver.observe(main);
  const reveals = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('will-reveal'); entry.target.classList.add('is-revealed'); reveals.unobserve(entry.target); } }), { threshold: .04 });
  main.querySelectorAll('[data-reveal]').forEach(element => { if (element.getBoundingClientRect().top >= innerHeight && !reduced.matches) { element.classList.add('will-reveal'); reveals.observe(element); } });
  const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    const link = document.querySelector(`.desktop-nav a[href="/#${entry.target.id}"]`);
    if (link) { if (entry.isIntersecting) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }
  }), { rootMargin: '-20% 0px -60% 0px' });
  main.querySelectorAll('section[id]').forEach(section => sectionObserver.observe(section));
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('motionDebug')) { debug = document.createElement('output'); debug.className = 'motion-debug'; debug.setAttribute('aria-hidden', 'true'); document.body.append(debug); }
  const critical = hero?.querySelector('img');
  const jobs = [document.fonts.ready, critical ? critical.decode().catch(() => {}) : Promise.resolve()];
  let completed = 0;
  jobs.forEach(job => job.then(() => { if (disposed) return; completed++; assets = Math.max(assets, completed / jobs.length); invalidate(); }));
  deadline = setTimeout(() => { assets = 1; schedule(); }, 1200);
  Promise.all(jobs).then(() => { if (disposed) return; clearTimeout(deadline); assets = 1; invalidate(); if ('requestIdleCallback' in window) idleTask = requestIdleCallback(() => void enhance(), { timeout: 1400 }); else void enhance(); });
  schedule();
  return () => {
    disposed = true; abort.abort(); clearTimeout(deadline);
    cinematic?.release();
    if (idleTask && 'cancelIdleCallback' in window) cancelIdleCallback(idleTask);
    cancelAnimationFrame(frameId); destroySculpture(); resizeObserver.disconnect(); reveals.disconnect(); sectionObserver.disconnect(); vectors?.dispose(); cleanupTransitions(); debug?.remove();
    main.querySelectorAll('.will-reveal').forEach(element => element.classList.remove('will-reveal'));
    document.documentElement.classList.remove('motion-enabled'); main.removeAttribute('data-motion-scene');
  };
}
