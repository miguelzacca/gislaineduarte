import { expect, test } from '@playwright/test';
import { load } from 'cheerio';
import { assertContactLinks, contactEmail, installHydrationProbe, observeFailures, publicRoutes, settleLayout, siteOrigin } from './helpers.js';

for (const route of publicRoutes) {
  test(`conteúdo, metadados e carregamento de ${route}`, async ({ page }) => {
    await installHydrationProbe(page);
    const failures = observeFailures(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const serverHTML = load(await response.text());
    expect(serverHTML('main#conteudo h1').length, 'H1 precisa existir no HTML servido antes do React').toBe(1);
    expect(serverHTML('main#conteudo').text().trim().length).toBeGreaterThan(100);
    await page.waitForLoadState('networkidle');
    await settleLayout(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('main#conteudo')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveText(serverHTML('main#conteudo h1').text());
    const serverLinks = serverHTML('main#conteudo a[href]').map((_, node) => serverHTML(node).attr('href')).get();
    const hydratedLinks = await page.locator('main#conteudo a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hydratedLinks, 'Hidratação deve preservar os destinos do HTML inicial').toEqual(serverLinks);
    const hydration = await page.evaluate(() => ({
      mainFound: Boolean(window.__giHydrationAudit.main),
      headingFound: Boolean(window.__giHydrationAudit.heading),
      mainReplaced: window.__giHydrationAudit.mainReplaced,
      headingReplaced: window.__giHydrationAudit.headingReplaced,
    }));
    expect(hydration, 'React deve reutilizar o HTML pré-renderizado sem recriar conteúdo crítico').toEqual({ mainFound: true, headingFound: true, mainReplaced: false, headingReplaced: false });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${siteOrigin}${route}`);
    expect(await page.title()).toContain('Gislaine Duarte');
    expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(40);
    await assertContactLinks(page);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await settleLayout(page);
    expect(failures).toEqual([]);
  });
}

test('os dois Saiba mais, recarregamento e histórico preservam a jornada', async ({ page }) => {
  const services = [
    { path: '/atendimentos/consulta-nutricional/', name: /consulta nutricional/i, message: /consulta/i },
    { path: '/atendimentos/ciclos-de-acompanhamento/', name: /ciclos de acompanhamento/i, message: /ciclo|acompanhamento/i },
  ];

  for (const service of services) {
    await page.goto('/');
    const link = page.locator(`#atendimentos a[href="${service.path}"]`).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAccessibleName(/saiba mais|saber mais|conhecer/i);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${service.path}$`));
    await expect(page.locator('h1')).toHaveText(service.name);
    const quote = page.getByRole('link', { name: /solicitar orçamento/i }).last();
    await expect(quote).toBeVisible();
    const destination = new URL(await quote.getAttribute('href'));
    expect(destination.searchParams.get('text')).toMatch(service.message);
    expect((await page.reload())?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#atendimentos')).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${service.path}$`));
  }
});

test('contato por WhatsApp e e-mail usa somente destinos confirmados', async ({ page }) => {
  await page.goto('/contato/');
  await assertContactLinks(page);
  await expect(page.locator(`main a[href="mailto:${contactEmail}"]`).first()).toBeVisible();
  expect(await page.locator('form').count(), 'Nenhum formulário cenográfico').toBe(0);
});

test('âncoras e perguntas frequentes funcionam por teclado', async ({ page }) => {
  await page.goto('/#perguntas');
  await expect(page.locator('#perguntas')).toBeInViewport();
  const firstQuestion = page.locator('#perguntas summary').first();
  await firstQuestion.focus();
  await page.keyboard.press('Enter');
  await expect(firstQuestion.locator('..')).toHaveAttribute('open', '');
  await page.keyboard.press('Space');
  await expect(firstQuestion.locator('..')).not.toHaveAttribute('open', '');
});

test('skip link leva diretamente ao conteúdo', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.locator('a[href="#conteudo"]').first();
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
});

test('rota inexistente tem HTTP 404 e saída útil', async ({ page }) => {
  const response = await page.goto('/esta-pagina-nao-existe/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const home = page.locator('main a[href="/"]').first();
  await expect(home).toBeVisible();
  await home.click();
  await expect(page.locator('#atendimentos')).toBeVisible();
});

test('registro e formação não adicionam credenciais nem duração presumida', async ({ page }) => {
  await page.goto('/sobre/');
  const about = await page.locator('main').innerText();
  expect(about).toMatch(/bacharel em nutrição/i);
  expect(about).toMatch(/(?:cursando|curso|em andamento)[\s\S]{0,130}(?:pós.graduação|nutrição estética)|pós.graduação[\s\S]{0,130}em andamento/i);
  expect(about).toContain('Gislaine Muller Duarte');
  expect(about).toContain('CRN-2 nº 22562');
  await page.goto('/atendimentos/ciclos-de-acompanhamento/');
  const cycles = await page.locator('main').innerText();
  expect(cycles).not.toMatch(/\b(?:3|5|6|três|cinco|seis)\s*(?:ou\s*(?:3|5|6|três|cinco|seis)\s*)?meses\b/i);
  expect(cycles).not.toMatch(/consultoria\s+(?:nutricional\s+)?sem\s+consulta/i);
  expect(cycles).not.toMatch(/bioimpedância|suporte\s+(?:diário|ilimitado|24)|resultados? garantidos?/i);
});
