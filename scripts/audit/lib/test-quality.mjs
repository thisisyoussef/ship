import { buildAndStartWeb, startApiServer } from './service-runtime.mjs';
import { runPlaywrightSuite } from './playwright-runner.mjs';
import { expandCorpus } from './corpus.mjs';
import { resetSchema, schemaNameForTarget } from './postgres.mjs';
import { runVitestSuite } from './vitest-runner.mjs';
import getPort from 'get-port';

export async function measureTestQuality({
  target,
  baseConnectionString,
  runCommand,
  registerCommand,
  reportEvent,
}) {
  const testSchema = await resetSchema(
    baseConnectionString,
    schemaNameForTarget(target)
  );
  await runCommand(`${target.label}-test-quality-db-migrate`, 'pnpm db:migrate', {
    DATABASE_URL: testSchema.connectionString,
  });

  const apiSuite = await runVitestSuite({
    target,
    runCommand,
    categoryId: 'test-quality',
    commandId: `${target.label}-test-quality-api`,
    workspace: 'api',
    env: { DATABASE_URL: testSchema.connectionString },
  });
  const webSuite = await runVitestSuite({
    target,
    runCommand,
    categoryId: 'test-quality',
    commandId: `${target.label}-test-quality-web`,
    workspace: 'web',
  });

  await runCommand(`${target.label}-test-quality-db-seed`, 'pnpm db:seed', {
    DATABASE_URL: testSchema.connectionString,
  });
  const counts = await expandCorpus(testSchema.connectionString);
  const runtime = {
    ...testSchema,
    counts,
  };
  const webPort = await getPort({ port: 4173 });
  const apiServer = await startApiServer({
    target,
    categoryId: 'test-quality',
    connectionString: runtime.connectionString,
    webOrigin: `http://127.0.0.1:${webPort}`,
    reportEvent,
  });
  registerCommand(apiServer.record);

  const webServer = await buildAndStartWeb({
    target,
    categoryId: 'test-quality',
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
      categoryId: 'test-quality',
      specFile: 'scripts/audit/playwright/test-quality.spec.mjs',
      baseUrl: webServer.baseUrl,
      apiUrl: apiServer.apiUrl,
      repeatEach: 10,
    });
    const primarySuitePassRate = Number(
      (((apiSuite.succeeded ? 1 : 0) + (webSuite.succeeded ? 1 : 0)) / 2 * 100).toFixed(2)
    );

    return {
      status: apiSuite.succeeded && webSuite.succeeded ? 'passed' : 'failed',
      corpus: runtime.counts,
      summaryValue: primarySuitePassRate,
      metrics: {
        apiSuitePassed: apiSuite.succeeded,
        apiPassedTests: apiSuite.totals.passed,
        apiFailedTests: apiSuite.totals.failed,
        apiTotalTests: apiSuite.totals.total,
        webSuitePassed: webSuite.succeeded,
        webPassedTests: webSuite.totals.passed,
        webFailedTests: webSuite.totals.failed,
        webTotalTests: webSuite.totals.total,
        primarySuitePassRate,
        playwrightPassed: playwright.totals.passed,
        playwrightFailed: playwright.totals.failed,
        playwrightFlaky: playwright.totals.flaky,
        playwrightPassRate: playwright.totals.passRate,
        playwrightAttemptPassRate: playwright.totals.attemptPassRate,
        playwrightSucceeded: playwright.succeeded,
      },
      apiSuite,
      webSuite,
      playwright,
    };
  } finally {
    await webServer.stop();
    await apiServer.stop();
  }
}
