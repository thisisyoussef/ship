import { readFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, readJson } from './fs.mjs';

const HARNESS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HARNESS_PROJECT_ROOT = resolve(HARNESS_ROOT, '..', '..');
const PLAYWRIGHT_CONFIG = join(HARNESS_ROOT, 'playwright.config.mjs');

export async function runPlaywrightSuite({
  target,
  runCommand,
  categoryId,
  specFile,
  baseUrl,
  apiUrl,
  repeatEach = 1,
}) {
  const metricsFile = join(target.outputDir, 'raw', `${target.label}-${categoryId}-metrics.json`);
  const specLogFile = join(target.outputDir, 'raw', `${target.label}-${categoryId}-spec.log`);
  const configArg = relative(HARNESS_PROJECT_ROOT, PLAYWRIGHT_CONFIG);
  await ensureDir(dirname(metricsFile));
  await rm(metricsFile, { force: true });
  await rm(specLogFile, { force: true });

  const commandRecord = await runCommand(
    `${target.label}-${categoryId}-playwright`,
    `pnpm exec playwright test ${shellQuote(specFile)} --config ${shellQuote(configArg)} --workers=1 --repeat-each=${repeatEach} --reporter=json`,
    {
      AUDIT_BASE_URL: baseUrl,
      AUDIT_API_URL: apiUrl,
      AUDIT_METRICS_FILE: metricsFile,
      AUDIT_SPEC_LOG_FILE: specLogFile,
    },
    true,
    { cwd: HARNESS_PROJECT_ROOT }
  );

  const stdout = await readFile(commandRecord.stdoutPath, 'utf8');
  const report = JSON.parse(stdout);
  const metrics = await tryReadJson(metricsFile);

  const passed = countByStatus(report, 'passed');
  const failed = countByStatus(report, 'failed');
  const flaky = countByStatus(report, 'flaky');
  const total = passed + failed + flaky;
  const reportErrors = report.errors ?? [];
  const succeeded = commandRecord.exitCode === 0 && reportErrors.length === 0;

  return {
    commandRecord,
    report,
    metrics,
    succeeded,
    totals: {
      passed,
      failed,
      flaky,
      total,
      passRate: total === 0 ? 0 : Number(((passed / total) * 100).toFixed(2)),
    },
  };
}

function countByStatus(report, wantedStatus) {
  let count = 0;

  function visitSuites(suites) {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          if (test.results?.some((result) => result.status === wantedStatus)) {
            count += 1;
          }
        }
      }
      visitSuites(suite.suites);
    }
  }

  visitSuites(report.suites);
  return count;
}

async function tryReadJson(path) {
  try {
    return await readJson(path);
  } catch {
    return {};
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
