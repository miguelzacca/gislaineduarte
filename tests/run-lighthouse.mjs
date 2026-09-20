import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4323';
const outputArgument = process.argv.find(argument => argument.startsWith('--output='));
const output = path.resolve(outputArgument?.slice('--output='.length) || 'tests/artifacts/lighthouse');
const mobileOnly = process.argv.includes('--mobile-only');
const cases = [
  { name: 'home-mobile-1', route: '/', mobile: true },
  { name: 'home-mobile-2', route: '/', mobile: true },
  { name: 'home-mobile-3', route: '/', mobile: true },
  { name: 'home-desktop', route: '/', mobile: false },
  { name: 'consulta-mobile', route: '/atendimentos/consulta-nutricional/', mobile: true },
].filter((run) => !mobileOnly || run.name.startsWith('home-mobile'));

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

await mkdir(output, { recursive: true });
const measurements = [];
for (const run of cases) {
  const port = await freePort();
  const browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${port}`, '--enable-unsafe-swiftshader'] });
  try {
    console.log(`Lighthouse ${run.name}…`);
    const flags = { port, output: ['html', 'json'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] };
    if (!run.mobile) {
      flags.formFactor = 'desktop';
      flags.screenEmulation = { mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false };
      flags.throttling = { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 };
    }
    const result = await lighthouse(new URL(run.route, baseURL).href, flags);
    if (!result) throw new Error('Lighthouse não retornou resultado.');
    await writeFile(path.join(output, `${run.name}.html`), result.report[0]);
    await writeFile(path.join(output, `${run.name}.json`), result.report[1]);
    const { lhr } = result;
    if (lhr.runtimeError) throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);
    measurements.push({
      name: run.name,
      url: lhr.finalDisplayedUrl,
      lighthouseVersion: lhr.lighthouseVersion,
      scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)])),
      lcpMs: lhr.audits['largest-contentful-paint'].numericValue,
      fcpMs: lhr.audits['first-contentful-paint'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tbtMs: lhr.audits['total-blocking-time'].numericValue,
      speedIndexMs: lhr.audits['speed-index'].numericValue,
      transferBytes: lhr.audits['total-byte-weight'].numericValue,
      warnings: lhr.runWarnings,
      failedAudits: Object.entries(lhr.audits).filter(([, audit]) => audit.score !== null && audit.score < 1).map(([id, audit]) => ({ id, title: audit.title, score: audit.score, displayValue: audit.displayValue })),
    });
    console.log(JSON.stringify(measurements.at(-1)));
  } finally { await browser.close(); }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
const homeMobile = measurements.filter((run) => run.name.startsWith('home-mobile'));
const medianHomeMobile = {
  name: 'home-mobile-median',
  samples: homeMobile.map((run) => run.name),
  scores: Object.fromEntries(Object.keys(homeMobile[0].scores).map((key) => [key, median(homeMobile.map((run) => run.scores[key]))])),
  ...Object.fromEntries(['lcpMs', 'fcpMs', 'cls', 'tbtMs', 'speedIndexMs', 'transferBytes'].map((key) => [key, median(homeMobile.map((run) => run[key]))])),
};
const report = { generatedAt: new Date().toISOString(), environment: 'Laboratório local; rede e CPU simuladas pelo Lighthouse mobile.', fieldINP: null, note: 'TBT não é INP. Medianas calculadas separadamente para cada métrica. Dados reais de Core Web Vitals só podem ser observados após lançamento e tráfego suficiente.', medianHomeMobile, measurements };
await writeFile(path.join(output, mobileOnly ? 'summary-mobile.json' : 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Mediana mobile: ${medianHomeMobile.scores.performance}/100; LCP ${(medianHomeMobile.lcpMs / 1000).toFixed(2)} s; CLS ${medianHomeMobile.cls.toFixed(3)}; TBT ${medianHomeMobile.tbtMs.toFixed(0)} ms.`);
console.log(`Relatórios: ${output}`);
