import { readFile } from 'node:fs/promises';
import { buildAndStartWeb, startApiServer } from './service-runtime.mjs';
import { runPlaywrightSuite } from './playwright-runner.mjs';
import { expandCorpus } from './corpus.mjs';
import { resetSchema, schemaNameForTarget } from './postgres.mjs';
import getPort from 'get-port';

export async function measureTestQuality({
  target,
  baseConnectionString,
  runCommand,
  registerCommand,
}) {
  const testSchema = await resetSchema(
    baseConnectionString,
    schemaNameForTarget(target)
  );
  await runCommand(`${target.label}-test-quality-db-migrate`, 'pnpm db:migrate', {
    DATABASE_URL: testSchema.connectionString,
  });

  const apiSuite = await runCommand(
    `${target.label}-test-quality-api`,
    'pnpm --filter @ship/api test',
    { DATABASE_URL: testSchema.connectionString },
    true
  );
  const webSuite = await runCommand(`${target.label}-test-quality-web`, 'pnpm --filter @ship/web test', {}, true);

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
  });
  registerCommand(apiServer.record);

  const webServer = await buildAndStartWeb({
    target,
    categoryId: 'test-quality',
    apiUrl: apiServer.apiUrl,
    runCommand,
    port: webPort,
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
      (((apiSuite.exitCode === 0 ? 1 : 0) + (webSuite.exitCode === 0 ? 1 : 0)) / 2 * 100).toFixed(2)
    );

    return {
      status: apiSuite.exitCode === 0 && webSuite.exitCode === 0 ? 'passed' : 'failed',
      corpus: runtime.counts,
      summaryValue: primarySuitePassRate,
      metrics: {
        apiSuitePassed: apiSuite.exitCode === 0,
        apiSuitePassedCount: extractPassedCount(await readFile(apiSuite.stdoutPath, 'utf8')),
        webSuitePassed: webSuite.exitCode === 0,
        webSuitePassedCount: extractPassedCount(await readFile(webSuite.stdoutPath, 'utf8')),
        primarySuitePassRate,
        playwrightPassed: playwright.totals.passed,
        playwrightFailed: playwright.totals.failed,
        playwrightPassRate: playwright.totals.passRate,
        playwrightSucceeded: playwright.succeeded,
      },
      playwright,
    };
  } finally {
    await webServer.stop();
    await apiServer.stop();
  }
}

function extractPassedCount(output) {
  const match = output.match(/(\d+)\s+passed/i);
  return match ? Number(match[1]) : 0;
}
