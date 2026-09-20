import { expect, test } from '@playwright/test';

test('mobile sem worker conclui a intro com SVG e libera a página', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 });
    Object.defineProperty(window, 'Worker', { configurable: true, value: undefined });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-intro-state', 'playing');
  await expect(page.locator('[data-intro-overlay]')).toHaveAttribute('data-quality', 'medium');
  await expect(page.locator('html')).toHaveAttribute('data-intro-state', 'seen', { timeout: 9000 });
  await expect(page.locator('[data-world] canvas')).toHaveCount(0);
  await expect(page.locator('.hero h1')).toBeVisible();
  expect(errors).toEqual([]);
});

test('intro interrompida por falta de frames libera hero, foto e scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    let freeze = false;
    const nativeRaf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => nativeRaf(time => { if (!freeze) callback(time); });
    new MutationObserver(() => {
      const progress = Number(document.querySelector('[data-intro-overlay]')?.dataset.progress || 0);
      if (progress > 0.1) freeze = true;
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-progress'] });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-intro-state', 'seen', { timeout: 4500 });
  await expect(page.locator('[data-intro-overlay]')).toHaveAttribute('data-result', 'stalled');
  await expect(page.locator('[data-intro-overlay]')).toBeHidden();
  await expect(page.locator('[data-portrait-mask-shape]')).toHaveAttribute('transform', 'translate(.62 .31) scale(.016) translate(-650 -700)');
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
});

test('percurso mobile permanece na margem e não desenha guias soltas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => sessionStorage.setItem('gislaine:intro:v1', 'seen'));
  await page.goto('/');
  await expect(page.locator('[data-journey-svg]')).toHaveAttribute('data-measured', 'true');
  const route = await page.evaluate(() => {
    const path = document.querySelector('[data-journey-main]');
    const story = document.querySelector('#sobre .story-art').getBoundingClientRect().top + scrollY - document.querySelector('main').getBoundingClientRect().top;
    const services = document.querySelector('#atendimentos').getBoundingClientRect().top + scrollY - document.querySelector('main').getBoundingClientRect().top;
    const positions = Array.from({ length: 161 }, (_, index) => path.getPointAtLength(path.getTotalLength() * index / 160))
      .filter(point => point.y >= story && point.y <= services);
    return {
      samples: positions.length,
      minimumX: Math.min(...positions.map(point => point.x)),
      guide: getComputedStyle(document.querySelector('[data-journey-guide]')).display,
      branchGuide: getComputedStyle(document.querySelector('[data-journey-branch-guide]')).display,
    };
  });
  expect(route.samples).toBeGreaterThan(8);
  expect(route.minimumX).toBeGreaterThan(330);
  expect(route.guide).toBe('none');
  expect(route.branchGuide).toBe('none');
  const dashBefore = Number(await page.locator('[data-journey-mask-draw]').getAttribute('stroke-dashoffset'));
  await page.locator('#sobre').scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await page.locator('[data-journey-mask-draw]').getAttribute('stroke-dashoffset'))).toBeLessThan(dashBefore);
});

test('desktop mantém a transição nativa ou a cobertura de fallback', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    sessionStorage.setItem('gislaine:intro:v1', 'seen');
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.classList?.contains('route-veil')) sessionStorage.setItem('gislaine:transition:fallback', 'played');
      return Reflect.apply(originalAnimate, this, args);
    };
    addEventListener('pagereveal', event => {
      sessionStorage.setItem('gislaine:transition:audit', JSON.stringify({
        active: Boolean(event.viewTransition),
        root: getComputedStyle(document.documentElement, '::view-transition-new(root)').animationName,
        symbol: getComputedStyle(document.documentElement, '::view-transition-new(consultation-seed)').animationName,
      }));
    });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('a[href="/atendimentos/consulta-nutricional/"]').first().click();
  await expect(page).toHaveURL(/\/atendimentos\/consulta-nutricional\/$/);
  const transition = await page.evaluate(() => ({ ...JSON.parse(sessionStorage.getItem('gislaine:transition:audit')), fallback: sessionStorage.getItem('gislaine:transition:fallback') }));
  expect(transition.active || transition.fallback === 'played').toBe(true);
  expect(transition.root).toBe('desktop-reveal');
  expect(transition.symbol).toBe('none');
  await expect(page.locator('h1')).toContainText('Consulta nutricional');
  expect(errors).toEqual([]);
});
