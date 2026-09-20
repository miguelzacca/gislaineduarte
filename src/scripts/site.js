import { initBrandScenes } from './brand-scene.js';

export function initializeMotion() {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const { signal } = abort;
  const cleanupScenes = initBrandScenes();
  const header = document.querySelector('.site-header');
  let scrollFrame = 0;
  let revealObserver;

  const thread = document.querySelector('[data-thread]');
  const approach = document.querySelector('#abordagem');
  const heroPortrait = document.querySelector('.hero-art .portrait');
  const desktopPointer = matchMedia('(pointer: fine) and (min-width: 768px)');
  function paintScroll() {
    scrollFrame = 0;
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
    if (thread && approach) {
      const bounds = approach.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (innerHeight - bounds.top) / (bounds.height + innerHeight * .3)));
      thread.style.strokeDasharray = '1';
      thread.style.strokeDashoffset = motionPreference.matches ? '0' : String(1 - progress);
    }
    if (heroPortrait) {
      const y = !motionPreference.matches && desktopPointer.matches ? Math.min(window.scrollY * .045, 20) : 0;
      heroPortrait.style.transform = `translateY(${y}px)`;
    }
  }
  function scheduleScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll); }
  window.addEventListener('scroll', scheduleScroll, { passive: true, signal });
  window.addEventListener('resize', scheduleScroll, { passive: true, signal });
  motionPreference.addEventListener('change', scheduleScroll, { signal });
  paintScroll();

  if (!motionPreference.matches && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('will-reveal');
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px 10px 0px', threshold: .06 });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top < innerHeight) return;
      element.classList.add('will-reveal');
      revealObserver.observe(element);
    });
  }

  const navigationSections = document.querySelectorAll('main section[id]');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = document.querySelector(`.desktop-nav a[href="/#${entry.target.id}"]`);
      if (!link) return;
      if (entry.isIntersecting) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
  navigationSections.forEach(section => sectionObserver.observe(section));

  document.querySelectorAll('.button').forEach(button => {
    const icon = button.querySelector('.button__icon');
    button.addEventListener('pointermove', event => {
      if (!desktopPointer.matches || motionPreference.matches || event.pointerType === 'touch') return;
      const bounds = button.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 5;
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 5;
      icon.style.translate = `${x}px ${y}px`;
    }, { passive: true, signal });
    button.addEventListener('pointerleave', () => { icon.style.translate = ''; }, { signal });
  });

  const loadSignal = document.querySelector('.load-signal');
  const criticalImage = document.querySelector('.hero img');
  let visited = false;
  try { visited = sessionStorage.getItem('gi-visited') === '1'; sessionStorage.setItem('gi-visited', '1'); } catch { /* Storage is optional. */ }
  let loadDeadline;
  if (loadSignal && criticalImage && !visited && !motionPreference.matches) {
    const tasks = [criticalImage.decode().catch(() => {}), document.fonts.ready];
    let finished = 0;
    const complete = () => { loadSignal.style.width = '100%'; loadSignal.classList.add('is-complete'); clearTimeout(loadDeadline); };
    loadSignal.style.width = '15%';
    for (const task of tasks) task.finally(() => { finished++; loadSignal.style.width = `${15 + finished / tasks.length * 85}%`; if (finished === tasks.length) complete(); });
    loadDeadline = setTimeout(complete, 1600);
    document.querySelectorAll('.hero-seal .brand-mark__part').forEach((part, i) => {
      part.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 450, delay: i * 50, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
  } else loadSignal?.classList.add('is-complete');

  return () => {
    abort.abort();
    clearTimeout(loadDeadline);
    cancelAnimationFrame(scrollFrame);
    revealObserver?.disconnect();
    sectionObserver.disconnect();
    cleanupScenes();
    document.querySelectorAll('.will-reveal').forEach(element => element.classList.remove('will-reveal'));
  };
}
