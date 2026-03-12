const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(process.cwd(), 'audit');
const LABEL = process.argv[2] || 'run';

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'dev@ship.local');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
}

async function resolveDocumentPath(page) {
  await page.goto(`${BASE_URL}/docs`, { waitUntil: 'domcontentloaded' });
  const href = await page.locator('a[href*="/documents/"]').first().getAttribute('href');
  if (!href) {
    throw new Error('Could not find a /documents/:id link from /docs');
  }
  return new URL(href, BASE_URL).pathname;
}

function serializeViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map(node => ({
      html: node.html,
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  };
}

function printReport(report) {
  console.log(`\n=== ${report.path} ===`);
  console.log(`Critical: ${report.critical}`);
  console.log(`Serious: ${report.serious}`);
  console.log(`Total: ${report.total}`);

  if (report.violations.length === 0) {
    console.log('No critical or serious violations.');
    return;
  }

  for (const violation of report.violations) {
    console.log(`[${violation.impact}] ${violation.id}: ${violation.description}`);
    for (const node of violation.nodes) {
      console.log(`  Element: ${node.html}`);
      if (node.failureSummary) {
        console.log(`  Failure: ${node.failureSummary.replace(/\s+/g, ' ').trim()}`);
      }
    }
  }
}

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page);
  const documentPath = await resolveDocumentPath(page);
  const pages = ['/docs', '/issues', '/my-week', documentPath];
  const reports = [];

  for (const pagePath of pages) {
    await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = results.violations
      .filter(violation => ['critical', 'serious'].includes(violation.impact))
      .map(serializeViolation);

    const report = {
      path: pagePath,
      url: page.url(),
      critical: violations.filter(violation => violation.impact === 'critical').length,
      serious: violations.filter(violation => violation.impact === 'serious').length,
      total: violations.length,
      nodeCount: violations.reduce((sum, violation) => sum + violation.nodes.length, 0),
      violations,
    };

    reports.push(report);
    printReport(report);
  }

  const outputPath = path.join(OUTPUT_DIR, `axe-${LABEL}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
  console.log(`\nSaved JSON report to ${outputPath}`);

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
