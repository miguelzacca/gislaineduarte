import { expect, test } from '@playwright/test';
import { assertNoHorizontalOverflow, publicRoutes, settleLayout } from './helpers.js';

const widths = [320, 375, 390, 430, 768, 1024, 1440, 1920, 2560];

for (const width of widths) {
  test(`layout e retrato em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    for (const route of publicRoutes) {
      await page.goto(route);
      await settleLayout(page);
      await assertNoHorizontalOverflow(page);
      await expect(page.locator('h1')).toBeVisible();
      await page.locator('footer').scrollIntoViewIfNeeded();
      await settleLayout(page);
      await assertNoHorizontalOverflow(page);
    }

    await page.goto('/');
    const portrait = page.locator('main picture img[alt*="Gislaine Duarte"]').first();
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    expect(Number(await portrait.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(await portrait.getAttribute('height'))).toBeGreaterThan(0);
    const box = await portrait.boundingBox();
    expect(box?.width).toBeGreaterThan(width < 768 ? width * 0.6 : 200);
    await expect(portrait.locator('..').locator('source')).not.toHaveCount(0);
    for (const element of await page.locator('main [data-reveal]').all()) {
      await element.scrollIntoViewIfNeeded();
      await settleLayout(page);
      await expect(element).not.toHaveClass(/will-reveal/);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await settleLayout(page);
    await page.screenshot({ path: testInfo.outputPath(`homepage-${width}.png`), fullPage: true, animations: 'disabled' });
  });
}

test('texto a 200% continua legível em viewport móvel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await settleLayout(page);
  await assertNoHorizontalOverflow(page);
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('#atendimentos').scrollIntoViewIfNeeded();
  await expect(page.locator('#atendimentos a').first()).toBeVisible();
});
