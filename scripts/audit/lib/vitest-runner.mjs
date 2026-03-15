import { dirname, join } from 'node:path';
import { rm } from 'node:fs/promises';
import { ensureDir, readJson } from './fs.mjs';

export async function runVitestSuite({
  target,
  runCommand,
  categoryId,
  commandId,
  workspace,
  extraArgs = '',
  env = {},
}) {
  const reportPath = join(target.outputDir, 'raw', `${commandId}.json`);
  await ensureDir(dirname(reportPath));
  await rm(reportPath, { force: true });

  const commandRecord = await runCommand(
    commandId,
    `pnpm --filter @ship/${workspace} exec vitest run${extraArgs ? ` ${extraArgs}` : ''} --reporter=json --outputFile ${shellQuote(reportPath)}`,
    env,
    true
  );

  const report = await tryReadJson(reportPath);
  const tests = flattenVitestTests(report);

  return {
    commandRecord,
    reportPath,
    succeeded: commandRecord.exitCode === 0 && Boolean(report?.success),
    totals: {
      total: Number(report?.numTotalTests ?? tests.length),
      passed: Number(report?.numPassedTests ?? tests.filter((test) => test.status === 'passed').length),
      failed: Number(report?.numFailedTests ?? tests.filter((test) => test.status === 'failed').length),
      skipped: Number(report?.numPendingTests ?? 0),
      todo: Number(report?.numTodoTests ?? 0),
      passRate: computePassRate(
        Number(report?.numPassedTests ?? tests.filter((test) => test.status === 'passed').length),
        Number(report?.numTotalTests ?? tests.length)
      ),
    },
    tests,
    failedTests: tests.filter((test) => test.status === 'failed'),
    passedTests: tests.filter((test) => test.status === 'passed'),
  };
}

function flattenVitestTests(report) {
  const results = Array.isArray(report?.testResults) ? report.testResults : [];
  const tests = [];

  for (const suite of results) {
    const file = suite.name ?? suite.message ?? 'unknown';
    for (const assertion of suite.assertionResults ?? []) {
      tests.push({
        file,
        fullName: assertion.fullName ?? assertion.title ?? 'unknown test',
        title: assertion.title ?? assertion.fullName ?? 'unknown test',
        status: assertion.status ?? 'unknown',
        failureMessages: (assertion.failureMessages ?? []).map((message) =>
          String(message).replace(/\s+/g, ' ').trim()
        ),
      });
    }
  }

  tests.sort((left, right) => {
    const statusRank = statusOrder(left.status) - statusOrder(right.status);
    if (statusRank !== 0) {
      return statusRank;
    }
    return `${left.file} ${left.fullName}`.localeCompare(`${right.file} ${right.fullName}`);
  });
  return tests;
}

function statusOrder(status) {
  if (status === 'failed') {
    return 0;
  }
  if (status === 'passed') {
    return 1;
  }
  return 2;
}

function computePassRate(passed, total) {
  if (!total) {
    return 0;
  }
  return Number(((passed / total) * 100).toFixed(2));
}

async function tryReadJson(path) {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
