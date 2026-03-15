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
  const tests = flattenPlaywrightTests(report);

  const passed = tests.filter((test) => test.status === 'passed').length;
  const failed = tests.filter((test) => test.status === 'failed').length;
  const flaky = tests.filter((test) => test.status === 'flaky').length;
  const total = tests.length;
  const reportErrors = report.errors ?? [];
  const succeeded = commandRecord.exitCode === 0 && reportErrors.length === 0;
  const passedAttempts = tests.reduce((sum, test) => sum + test.passedCount, 0);
  const failedAttempts = tests.reduce((sum, test) => sum + test.failedCount, 0);
  const flakyAttempts = tests.reduce((sum, test) => sum + test.flakyCount, 0);
  const totalAttempts = passedAttempts + failedAttempts + flakyAttempts;

  return {
    commandRecord,
    metrics,
    tests,
    reportErrors,
    succeeded,
    totals: {
      passed,
      failed,
      flaky,
      total,
      passRate: total === 0 ? 0 : Number(((passed / total) * 100).toFixed(2)),
      passedAttempts,
      failedAttempts,
      flakyAttempts,
      totalAttempts,
      attemptPassRate: totalAttempts === 0 ? 0 : Number(((passedAttempts / totalAttempts) * 100).toFixed(2)),
    },
  };
}

function flattenPlaywrightTests(report) {
  const tests = new Map();

  function visitSuites(suites, parents = []) {
    for (const suite of suites ?? []) {
      const nextParents = suite.title ? [...parents, suite.title] : parents;
      for (const spec of suite.specs ?? []) {
        const specTitle = spec.title || nextParents[nextParents.length - 1] || 'unknown spec';
        const file = spec.file ?? suite.file ?? null;
        for (const test of spec.tests ?? []) {
          const key = `${file ?? 'unknown'}::${specTitle}`;
          const existing = tests.get(key) ?? {
            file,
            title: specTitle,
            status: 'unknown',
            passedCount: 0,
            failedCount: 0,
            flakyCount: 0,
            failureMessages: [],
          };

          for (const result of test.results ?? []) {
            const status = result.status ?? 'unknown';
            if (status === 'passed') {
              existing.passedCount += 1;
            } else if (status === 'failed') {
              existing.failedCount += 1;
            } else if (status === 'flaky') {
              existing.flakyCount += 1;
            }

            for (const error of result.errors ?? []) {
              const text = [error.message, error.value, error.stack]
                .filter(Boolean)
                .map((entry) => String(entry).replace(/\s+/g, ' ').trim())
                .join(' ');
              if (text) {
                existing.failureMessages.push(text);
              }
            }
          }

          existing.status =
            existing.failedCount > 0
              ? 'failed'
              : existing.flakyCount > 0
                ? 'flaky'
                : existing.passedCount > 0
                  ? 'passed'
                  : existing.status;

          tests.set(key, existing);
        }
      }
      visitSuites(suite.suites, nextParents);
    }
  }

  visitSuites(report.suites);

  return Array.from(tests.values()).sort((left, right) => {
    const rank = statusOrder(left.status) - statusOrder(right.status);
    if (rank !== 0) {
      return rank;
    }
    return `${left.file ?? ''} ${left.title}`.localeCompare(`${right.file ?? ''} ${right.title}`);
  });
}

function statusOrder(status) {
  if (status === 'failed') {
    return 0;
  }
  if (status === 'flaky') {
    return 1;
  }
  if (status === 'passed') {
    return 2;
  }
  return 3;
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
