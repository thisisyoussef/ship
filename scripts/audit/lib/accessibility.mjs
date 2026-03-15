import { buildAndStartWeb, prepareSeededSchema, startApiServer } from './service-runtime.mjs';
import { runPlaywrightSuite } from './playwright-runner.mjs';
import getPort from 'get-port';

export async function measureAccessibility({
  target,
  baseConnectionString,
  runCommand,
  registerCommand,
  reportEvent,
}) {
  const runtime = await prepareSeededSchema({
    baseConnectionString,
    target,
    categoryId: 'accessibility',
    runCommand,
    reportEvent,
  });
  const webPort = await getPort({ port: 4173 });
  const apiServer = await startApiServer({
    target,
    categoryId: 'accessibility',
    connectionString: runtime.connectionString,
    webOrigin: `http://127.0.0.1:${webPort}`,
    reportEvent,
  });
  registerCommand(apiServer.record);

  const webServer = await buildAndStartWeb({
    target,
    categoryId: 'accessibility',
    apiUrl: apiServer.apiUrl,
    runCommand,
    port: webPort,
    reportEvent,
  });
  registerCommand(webServer.record);

  try {
    const playwright = await runPlaywrightSuite({
      target,
      runCommand,
      categoryId: 'accessibility',
      specFile: 'scripts/audit/playwright/accessibility.spec.mjs',
      baseUrl: webServer.baseUrl,
      apiUrl: apiServer.apiUrl,
    });

    const docsTreeViolations = Number(playwright.metrics.docsTreeViolations ?? 0);
    const myWeekContrastViolations = Number(playwright.metrics.myWeekContrastViolations ?? 0);
    const totalViolations = docsTreeViolations + myWeekContrastViolations;

    return {
      status: playwright.succeeded && playwright.totals.failed === 0 && totalViolations === 0 ? 'passed' : 'failed',
      corpus: runtime.counts,
      summaryValue: totalViolations,
      metrics: {
        docsTreeViolations,
        myWeekContrastViolations,
        totalViolations,
      },
      playwright,
    };
  } finally {
    await webServer.stop();
    await apiServer.stop();
  }
}
