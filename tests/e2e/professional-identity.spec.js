import { test, expect } from '@playwright/test';
import { publicRoutes, site } from '../../src/data/site.js';
import { assertNoHorizontalOverflow, observeFailures } from './helpers.js';

test.use({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });

for (const route of [...publicRoutes, '/404.html']) {
  test(`identidade profissional: nome completo e CRN consistentes em ${route}`, async ({ page }) => {
    const failures = observeFailures(page);
    await page.goto(route);
    const footer = page.locator('.site-footer .professional-identity');
    await expect(footer).toContainText('Gislaine Muller Duarte');
    await expect(footer).toContainText('Nutricionista');
    await expect(footer).toContainText('CRN-10 nº 22562');
    const directory = footer.getByRole('link', { name: /Consultar no CRN-10.*inscrição profissional/ });
    await expect(directory).toHaveAttribute('href', site.registrationDetails.directoryUrl);
    await expect(directory).toHaveAttribute('rel', 'noopener noreferrer');
    const person = await page.locator('script[type="application/ld+json"]').evaluate(node => JSON.parse(node.textContent)['@graph'].find(item => item['@type'] === 'Person'));
    expect(person.name).toBe('Gislaine Muller Duarte');
    expect(person.identifier.propertyID).toBe('CRN-10');
    expect(person.identifier.value).toBe('22562');
    expect(person.hasCredential.name).toBe('CRN-10 nº 22562');
    expect(JSON.stringify(person)).not.toMatch(/"(?:cpf|birthDate|taxID|vatID|birthPlace|age)"/i);
    expect(await page.content()).not.toMatch(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    await assertNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });
}

test('identidade profissional: rodapé legível em 320 e 1440 e informação presente sem JavaScript', async ({ page, browser }, testInfo) => {
  await page.goto('/sobre/');
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const footer = page.locator('.site-footer');
    await footer.scrollIntoViewIfNeeded();
    await assertNoHorizontalOverflow(page);
    await expect(footer.getByText('CRN-10 nº 22562', { exact: true })).toBeVisible();
    await testInfo.attach(`rodape-${width}.png`, { body: await footer.screenshot(), contentType: 'image/png' });
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const document = await context.newPage();
    await document.goto(new URL('/sobre/', page.url()).href);
    await expect(document.locator('.page-hero .professional-identity')).toContainText('Gislaine Muller Duarte');
    await expect(document.locator('.site-footer .professional-identity')).toContainText('CRN-10 nº 22562');
  } finally { await context.close(); }
});
