import { expect, test } from '@playwright/test';
import { assertContactLinks, observeFailures, settleLayout } from './helpers.js';

test('sem JavaScript: conteúdo, foto, FAQ e serviços continuam acessíveis', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main picture img').first()).toBeVisible();
  const question = page.locator('#perguntas summary').first();
  await question.click();
  await expect(question.locator('..')).toHaveAttribute('open', '');
  await page.locator('#atendimentos a[href="/atendimentos/consulta-nutricional/"]').first().click();
  await expect(page).toHaveURL(/\/atendimentos\/consulta-nutricional\/$/);
  await expect(page.locator('h1')).toBeVisible();
  await assertContactLinks(page);
  await context.close();
});

test('movimento reduzido preserva leitura e dispensa animações contínuas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await settleLayout(page);
  await expect(page.locator('h1')).toBeVisible();
  for (const id of ['abordagem', 'atendimentos', 'perguntas']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  const infiniteAnimations = await page.evaluate(() =>
    document.getAnimations().filter((animation) => animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity).length,
  );
  expect(infiniteAnimations).toBe(0);
  await expect(page.locator('[data-scene-ready="true"]')).toHaveCount(0);
  await assertContactLinks(page);
});

test('falha de WebGL mantém símbolo, conteúdo e contato funcionais', async ({ page }) => {
  await page.addInitScript(`(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...options) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...options]);
    };
  })();`);
  const failures = observeFailures(page);
  await page.goto('/');
  await page.locator('#abordagem').scrollIntoViewIfNeeded();
  await settleLayout(page);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#abordagem svg').first()).toBeVisible();
  await assertContactLinks(page);
  await page.locator('#atendimentos a[href="/atendimentos/ciclos-de-acompanhamento/"]').first().click();
  await expect(page.locator('h1')).toBeVisible();
  expect(failures).toEqual([]);
});

test('economia de dados evita iniciar a camada WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = navigator.connection ?? new EventTarget();
    Object.defineProperties(connection, {
      saveData: { configurable: true, value: true },
      effectiveType: { configurable: true, value: '4g' },
    });
    if (!navigator.connection) Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
  });
  const failures = observeFailures(page);
  await page.goto('/');
  await page.locator('#abordagem').scrollIntoViewIfNeeded();
  await settleLayout(page);
  await expect(page.locator('[data-scene-ready="true"]')).toHaveCount(0);
  await assertContactLinks(page);
  expect(failures).toEqual([]);
});

test('falha de imagem não remove a mensagem principal nem o contato', async ({ page }) => {
  await page.route('**/images/gislaine-duarte-*', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main')).toContainText(/qualidade de vida/i);
  await assertContactLinks(page);
});

test('WebGL inicia progressivamente quando o dispositivo permite', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const supported = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  });
  test.skip(!supported, 'Este navegador não disponibilizou WebGL2; a falha controlada é coberta separadamente.');
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('#abordagem').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('[data-scene-ready="true"] canvas')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-scene-ready="true"]')).toHaveCount(0);
  await expect(page.locator('#abordagem canvas')).toHaveCount(0);
  await expect(page.locator('#abordagem svg').first()).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('[data-scene-ready="true"]')).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('#abordagem canvas')).toHaveCount(1);
});
