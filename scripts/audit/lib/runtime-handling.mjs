import { buildAndStartWeb, prepareSeededSchema, startApiServer } from './service-runtime.mjs';
import { runPlaywrightSuite } from './playwright-runner.mjs';
import { runVitestSuite } from './vitest-runner.mjs';
import getPort from 'get-port';

export async function measureRuntimeHandling({
  target,
  baseConnectionString,
  runCommand,
  registerCommand,
  reportEvent,
}) {
  const errorBoundarySuite = await runVitestSuite({
    target,
    runCommand,
    categoryId: 'runtime-handling',
    commandId: `${target.label}-runtime-error-boundary`,
    workspace: 'web',
    extraArgs: 'src/components/ui/ErrorBoundary.test.tsx',
  });

  const runtime = await prepareSeededSchema({
    baseConnectionString,
    target,
    categoryId: 'runtime-handling',
    runCommand,
    reportEvent,
  });
  const webPort = await getPort({ port: 4173 });
  const apiServer = await startApiServer({
    target,
    categoryId: 'runtime-handling',
    connectionString: runtime.connectionString,
    webOrigin: `http://127.0.0.1:${webPort}`,
    reportEvent,
  });
  registerCommand(apiServer.record);

  const webServer = await buildAndStartWeb({
    target,
    categoryId: 'runtime-handling',
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
      categoryId: 'runtime-handling',
      specFile: 'scripts/audit/playwright/runtime-handling.spec.mjs',
      baseUrl: webServer.baseUrl,
      apiUrl: apiServer.apiUrl,
    });

    const unexpectedConsoleErrors = Number(playwright.metrics.unexpectedConsoleErrors ?? 0);
    const blockingActionItemsModals = Number(playwright.metrics.blockingActionItemsModals ?? 0);
    const runtimeIssues =
      unexpectedConsoleErrors + blockingActionItemsModals + (errorBoundarySuite.succeeded ? 0 : 1);

    return {
      status:
        errorBoundarySuite.succeeded &&
        playwright.succeeded &&
        playwright.totals.failed === 0 &&
        runtimeIssues === 0
          ? 'passed'
          : 'failed',
      corpus: runtime.counts,
      summaryValue: runtimeIssues,
      metrics: {
        unexpectedConsoleErrors,
        blockingActionItemsModals,
        errorBoundaryUnitPassed: errorBoundarySuite.succeeded,
        errorBoundaryFailedTests: errorBoundarySuite.totals.failed,
        playwrightSucceeded: playwright.succeeded,
      },
      errorBoundarySuite,
      playwright,
    };
  } finally {
    await webServer.stop();
    await apiServer.stop();
  }
}
