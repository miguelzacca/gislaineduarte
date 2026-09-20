import { expect, test } from '@playwright/test';
import { assertNoHorizontalOverflow } from './helpers.js';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('menu contém o foco, fecha por Escape e devolve foco ao botão', async ({ page }) => {
  await page.goto('/');
  const openButton = page.getByRole('button', { name: 'Abrir menu', exact: true });
  const dialog = page.locator('#navigation-dialog');
  await openButton.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  await expect(openButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeVisible();

  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press(index % 3 === 0 ? 'Shift+Tab' : 'Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await assertNoHorizontalOverflow(page);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(openButton).toBeFocused();
  await expect(openButton).toHaveAttribute('aria-expanded', 'false');
});

test('fechar e navegar restauram o scroll sem prender a página', async ({ page }) => {
  await page.goto('/');
  const openButton = page.getByRole('button', { name: 'Abrir menu', exact: true });
  const dialog = page.locator('#navigation-dialog');
  await openButton.click();
  await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(openButton).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');

  await openButton.click();
  await dialog.locator('a[href="/sobre/"]').click();
  await expect(page).toHaveURL(/\/sobre\/$/);
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  await page.locator('footer').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
