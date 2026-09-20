import { BRAND_PATHS } from '../lib/brand.js';
import { installNativeTransitions } from './native-transitions.js';

const revealed = 'ellipse(145% 125% at 62% 32%)';
const curve = 'cubic-bezier(.22,.8,.2,1)';

function brandAperture(width, height, expanded) {
  const scale = expanded ? Math.max(width / 170, height / 150) * 1.8 : .045;
  const center = expanded ? [width * .52, height * .48] : [width * .91, 40];
  let axis = 0;
  const contour = `${BRAND_PATHS.pulp.split('Z')[0]}Z`.replace(/-?\d*\.?\d+/g, coordinate => {
    const dimension = axis++ % 2;
    return ((Number(coordinate) - (dimension ? 790 : 625)) * scale + center[dimension]).toFixed(2);
  });
  return `path("${contour}")`;
}

export function playMenu(dialog, opening) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 1 : opening ? 680 : 420;
  let cancelled = false;
  const closedMask = reduced ? revealed : brandAperture(innerWidth, innerHeight, false);
  const openMask = reduced ? revealed : brandAperture(innerWidth, innerHeight, true);
  dialog.dataset.motionPhase = opening ? 'opening' : 'closing';
  const animations = [dialog.animate(
    [{ clipPath: opening ? closedMask : openMask, '--menu-progress': opening ? 0 : 1 }, { clipPath: opening ? openMask : closedMask, '--menu-progress': opening ? 1 : 0 }],
    { duration, easing: curve, fill: 'both' },
  )];
  const items = [...dialog.querySelectorAll('.menu-nav a')];
  items.forEach((item, index) => {
    const far = 'perspective(900px) rotateX(62deg) rotateY(-12deg) translate3d(26px,45px,-130px)';
    const near = 'perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)';
    animations.push(item.animate(
      [{ transform: opening && !reduced ? far : near, clipPath: opening && !reduced ? 'inset(0 0 100% 0)' : 'inset(0)' }, { transform: opening || reduced ? near : far, clipPath: opening || reduced ? 'inset(0)' : 'inset(0 0 100% 0)' }],
      { duration: reduced ? 1 : opening ? 620 : 250, delay: reduced ? 0 : opening ? 80 + index * 65 : (items.length - index - 1) * 30, easing: curve, fill: 'both' },
    ));
  });
  const finished = Promise.all(animations.map(animation => animation.finished.catch(() => null))).then(() => {
    if (!cancelled) { dialog.dataset.motionPhase = opening ? 'open' : 'closed'; dialog.style.setProperty('--menu-progress', opening ? '1' : '0'); }
  });
  return { finished, cancel() { cancelled = true; animations.forEach(animation => animation.cancel()); } };
}

export function initializeTransitions() {
  installNativeTransitions(window);
  const abort = new AbortController();
  const { signal } = abort;
  const veil = document.querySelector('.route-veil');
  let departure = null;
  let departing = false;
  function navigate(event) {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !url.pathname.startsWith('/atendimentos/')) return;
    document.documentElement.dataset.routeDirection = url.pathname.includes('ciclos') ? 'cycle' : 'seed';
    if ('onpageswap' in window || matchMedia('(prefers-reduced-motion: reduce)').matches || !veil) return;
    event.preventDefault();
    if (departing) return;
    departing = true;
    veil.hidden = false;
    departure = veil.animate([{ clipPath: 'ellipse(0% 0% at 50% 65%)' }, { clipPath: revealed }], { duration: 280, easing: curve, fill: 'forwards' });
    departure.finished.then(() => location.assign(url.href)).catch(() => { if (!signal.aborted) location.assign(url.href); });
  }
  document.addEventListener('click', navigate, { signal });
  return () => { abort.abort(); departure?.cancel(); if (veil) veil.style.clipPath = ''; delete document.documentElement.dataset.routeDirection; };
}
