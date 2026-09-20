import { expect } from '@playwright/test';

export const siteOrigin = 'https://gislaineduarte.com.br';
export const whatsappNumber = '5547991913588';
export const contactEmail = 'duartegisarte@gmail.com';
export const publicRoutes = [
  '/',
  '/sobre/',
  '/atendimentos/',
  '/atendimentos/consulta-nutricional/',
  '/atendimentos/ciclos-de-acompanhamento/',
  '/contato/',
  '/privacidade/',
];

export async function settleLayout(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

export async function installHydrationProbe(page) {
  await page.addInitScript(() => {
    const probe = { main: null, heading: null, mainReplaced: false, headingReplaced: false };
    window.__giHydrationAudit = probe;
    new MutationObserver(() => {
      const main = document.querySelector('main#conteudo');
      const heading = main?.querySelector('h1');
      if (main && !probe.main) probe.main = main;
      if (heading && !probe.heading) probe.heading = heading;
      if (main && probe.main !== main) probe.mainReplaced = true;
      if (heading && probe.heading !== heading) probe.headingReplaced = true;
    }).observe(document, { childList: true, subtree: true });
  });
}

export async function assertNoHorizontalOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport + 1);

  const clippedText = await page.locator('main h1, main h2, main h3, main summary').evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || style.visibility === 'hidden') return [];
      return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1
        ? [{ text: element.textContent?.trim().slice(0, 100), left: rect.left, right: rect.right }]
        : [];
    }),
  );
  expect(clippedText, 'Títulos e controles não podem ser cortados pela viewport').toEqual([]);
}

export function observeFailures(page) {
  const failures = [];
  page.on('pageerror', (error) => failures.push(`JavaScript: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`Console: ${message.text()}`);
    if (message.type() === 'warning' && /react|hydrat|server.rendered|did not match|unique.*key/i.test(message.text())) {
      failures.push(`Aviso de hidratação/React: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    if (response.url().startsWith(new URL(page.url()).origin) && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return failures;
}

export async function assertContactLinks(page) {
  const links = page.locator('a[href*="wa.me/"]');
  expect(await links.count(), 'Páginas de atendimento precisam de contato real').toBeGreaterThan(0);
  for (const link of await links.all()) {
    const href = await link.getAttribute('href');
    const url = new URL(href);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toBe(`/${whatsappNumber}`);
    expect(url.searchParams.get('text')?.trim().length).toBeGreaterThan(20);
    if ((await link.getAttribute('target')) === '_blank') {
      expect(await link.getAttribute('rel')).toMatch(/noopener/);
    }
  }
}
