import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { publicRoutes, settleLayout } from './helpers.js';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

for (const width of [390, 1440]) {
  for (const route of publicRoutes) {
    test(`axe WCAG AA ${width}px ${route}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      await settleLayout(page);
      const result = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
      await testInfo.attach('axe', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
      expect(result.violations).toEqual([]);
    });
  }
}

test('axe menu mobile aberto', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  const result = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  await testInfo.attach('axe-menu', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.violations).toEqual([]);
});
