#!/usr/bin/env node
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runComparison } from './lib/run-compare.mjs';

const config = loadConfig();
await mkdir(config.outputDir, { recursive: true });
const diagnostics = createDiagnostics(config);
await diagnostics.initialize();
const callback = createCallbackClient(config);
const outputDir = config.outputDir;
const reporter = createEventReporter(callback, diagnostics);

try {
  await callback.post('start', {
    githubRunId: config.githubRunId,
    githubRunAttempt: config.githubRunAttempt,
    githubRunUrl: config.githubRunUrl,
    message: `GitHub Actions started the ${config.mode} audit run.`,
  });

  const result = await runComparison({
    runId: config.runId,
    category: config.category ?? undefined,
    baseline: {
      repoUrl: config.baselineRepo,
      ref: config.baselineRef,
    },
    submission: {
      repoUrl: config.submissionRepo,
      ref: config.submissionRef,
    },
    outputDir,
    databaseUrl: config.databaseUrl,
    onEvent: reporter.push,
  });

  await reporter.flush();
  const categoryWarnings = collectCategoryWarnings(result);
  for (const warning of categoryWarnings) {
    console.warn(`::warning::${warning}`);
  }
  if (categoryWarnings.length === 0) {
    console.log('::notice::Audit comparison completed without failed category measurements.');
  }

  await diagnostics.markSuccess(result);
  const artifacts = await collectArtifacts(outputDir);
  await callback.post('complete', {
    githubRunId: config.githubRunId,
    githubRunAttempt: config.githubRunAttempt,
    githubRunUrl: config.githubRunUrl,
    baselineSha: result.baselineSummary.sha,
    submissionSha: result.submissionSummary.sha,
    summaryJson: {
      baseline: result.baselineSummary,
      submission: result.submissionSummary,
    },
    comparisonJson: result.comparison,
    artifacts,
    outputDir,
    message: 'GitHub Actions finished the audit run and uploaded all tracked artifacts.',
  });

  console.log(`Audit run ${config.runId} completed successfully.`);
} catch (error) {
  await reporter.flush().catch(() => {});
  const message = error instanceof Error ? `${error.message}${error.stack ? `\n${error.stack}` : ''}` : String(error);
  console.error(`::error::${message.split('\n')[0]}`);
  await diagnostics.markFailure(message);
  const artifacts = await collectArtifacts(outputDir);
  const failureContext = await collectFailureContext(outputDir);
  await callback
    .post('fail', {
      githubRunId: config.githubRunId,
      githubRunAttempt: config.githubRunAttempt,
      githubRunUrl: config.githubRunUrl,
      phase: 'failed',
      error: message,
      baselineSha: failureContext.baselineSha,
      submissionSha: failureContext.submissionSha,
      summaryJson: failureContext.summaryJson,
      comparisonJson: failureContext.comparisonJson,
      artifacts,
      details: {
        runId: config.runId,
      },
    })
    .catch(() => {});
  throw error;
}

function loadConfig() {
  const runId = readRequiredEnv('AUDIT_RUN_ID');
  const mode = process.env.AUDIT_MODE === 'category' ? 'category' : 'full';
  const category = normalizeOptional(process.env.AUDIT_CATEGORY);
  const callbackBaseUrl = normalizeOptional(process.env.AUDIT_CALLBACK_BASE_URL);
  const callbackSecret = normalizeOptional(process.env.AUDIT_CALLBACK_SECRET);
  const outputDir = resolve(
    process.env.AUDIT_OUTPUT_DIR || join(process.cwd(), 'artifacts', 'g4-repro', `actions-${runId}`)
  );

  return {
    runId,
    mode,
    category,
    baselineRepo: readRequiredEnv('AUDIT_BASELINE_REPO'),
    baselineRef: readRequiredEnv('AUDIT_BASELINE_REF'),
    submissionRepo: readRequiredEnv('AUDIT_SUBMISSION_REPO'),
    submissionRef: readRequiredEnv('AUDIT_SUBMISSION_REF'),
    callbackBaseUrl,
    callbackSecret,
    outputDir,
    databaseUrl: process.env.RUNNER_DATABASE_URL || process.env.AUDIT_DATABASE_URL || '',
    githubRunId: numberOrNull(process.env.GITHUB_RUN_ID),
    githubRunAttempt: numberOrNull(process.env.GITHUB_RUN_ATTEMPT),
    githubRunUrl: buildGithubRunUrl(),
  };
}

function createCallbackClient(config) {
  if (!config.callbackBaseUrl || !config.callbackSecret) {
    return {
      async post() {},
    };
  }

  const baseHeaders = {
    'content-type': 'application/json',
    'x-audit-callback-secret': config.callbackSecret,
  };

  return {
    async post(action, payload) {
      const url = `${trimTrailingSlash(config.callbackBaseUrl)}/api/internal/runs/${config.runId}/${action}`;
      await retry(async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Callback ${action} failed (${response.status}): ${errorText || response.statusText}`);
        }
      });
    },
  };
}

function createEventReporter(callback, diagnostics) {
  let events = [];
  let flushTimer = null;
  let flushChain = Promise.resolve();

  function push(event) {
    events.push(event);
    if (events.length >= 25) {
      void flush();
      return;
    }
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flush();
      }, 250);
    }
  }

  async function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    const currentBatch = events;
    events = [];
    if (currentBatch.length === 0) {
      return;
    }

    flushChain = flushChain.then(async () => {
      await diagnostics.appendEvents(currentBatch);
      await callback.post('events', { events: currentBatch });
    });
    await flushChain;
  }

  return {
    push,
    flush,
  };
}

async function collectArtifacts(outputDir) {
  const bundleDir = await mkdtemp(join(tmpdir(), 'ship-audit-bundle-'));
  const bundlePath = join(bundleDir, 'bundle.tgz');

  try {
    const artifacts = [];

    const artifactSpecs = [
      ['baseline-summary.json', join(outputDir, 'baseline', 'summary.json'), 'application/json'],
      ['submission-summary.json', join(outputDir, 'submission', 'summary.json'), 'application/json'],
      ['comparison.json', join(outputDir, 'comparison.json'), 'application/json'],
      ['dashboard.html', join(outputDir, 'dashboard.html'), 'text/html; charset=utf-8'],
      ['run-context.json', join(outputDir, 'diagnostics', 'run-context.json'), 'application/json'],
      ['events.jsonl', join(outputDir, 'diagnostics', 'events.jsonl'), 'application/x-ndjson'],
      ['failure.json', join(outputDir, 'diagnostics', 'failure.json'), 'application/json'],
      ['github-summary.md', join(outputDir, 'diagnostics', 'github-summary.md'), 'text/markdown; charset=utf-8'],
    ];

    for (const [name, filePath, contentType] of artifactSpecs) {
      const artifact = await maybeReadArtifact(name, filePath, contentType);
      if (artifact) {
        artifacts.push(artifact);
      }
    }

    await runTar(outputDir, bundlePath);
    artifacts.push({
      name: 'bundle.tgz',
      contentType: 'application/gzip',
      bodyBase64: await readBase64(bundlePath),
    });

    return artifacts;
  } finally {
    await rm(bundleDir, { recursive: true, force: true });
  }
}

async function maybeReadArtifact(name, filePath, contentType) {
  try {
    return {
      name,
      contentType,
      bodyBase64: await readBase64(filePath),
    };
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
}

async function collectFailureContext(outputDir) {
  const baselineSummary = await maybeReadJson(join(outputDir, 'baseline', 'summary.json'));
  const submissionSummary = await maybeReadJson(join(outputDir, 'submission', 'summary.json'));
  const comparisonJson = await maybeReadJson(join(outputDir, 'comparison.json'));

  return {
    baselineSha: baselineSummary?.sha ?? null,
    submissionSha: submissionSummary?.sha ?? null,
    summaryJson:
      baselineSummary || submissionSummary
        ? {
            baseline: baselineSummary ?? null,
            submission: submissionSummary ?? null,
          }
        : null,
    comparisonJson,
  };
}

async function readBase64(filePath) {
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

async function runTar(outputDir, bundlePath) {
  await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-czf', bundlePath, '-C', outputDir, '.'], {
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`tar exited with code ${code}`));
    });
  });
}

async function retry(operation, attempts = 5) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      await sleep(attempt * 750);
    }
  }
  throw lastError;
}

function buildGithubRunUrl() {
  const serverUrl = normalizeOptional(process.env.GITHUB_SERVER_URL);
  const repository = normalizeOptional(process.env.GITHUB_REPOSITORY);
  const runId = normalizeOptional(process.env.GITHUB_RUN_ID);

  if (!serverUrl || !repository || !runId) {
    return null;
  }

  return `${trimTrailingSlash(serverUrl)}/${repository}/actions/runs/${runId}`;
}

function createDiagnostics(config) {
  const diagnosticsDir = join(config.outputDir, 'diagnostics');
  const contextPath = join(diagnosticsDir, 'run-context.json');
  const eventsPath = join(diagnosticsDir, 'events.jsonl');
  const failurePath = join(diagnosticsDir, 'failure.json');
  const summaryPath = join(diagnosticsDir, 'github-summary.md');

  const context = {
    runId: config.runId,
    mode: config.mode,
    category: config.category,
    baselineRepo: config.baselineRepo,
    baselineRef: config.baselineRef,
    submissionRepo: config.submissionRepo,
    submissionRef: config.submissionRef,
    githubRunId: config.githubRunId,
    githubRunAttempt: config.githubRunAttempt,
    githubRunUrl: config.githubRunUrl,
    callbackEnabled: Boolean(config.callbackBaseUrl && config.callbackSecret),
    outputDir: config.outputDir,
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  return {
    async initialize() {
      await mkdir(diagnosticsDir, { recursive: true });
      await writeJsonFile(contextPath, context);
      await writeFile(eventsPath, '', 'utf8');
    },
    async appendEvents(events) {
      if (events.length === 0) {
        return;
      }
      const payload = events.map((event) => JSON.stringify(event)).join('\n');
      await appendFile(eventsPath, `${payload}\n`, 'utf8');
    },
    async markSuccess(result) {
      context.status = result.comparison.summary.overallStatus === 'warning' ? 'warning' : 'finished';
      context.finishedAt = new Date().toISOString();
      context.baselineSha = result.baselineSummary.sha;
      context.submissionSha = result.submissionSummary.sha;
      context.failedCategoryCount = result.comparison.summary.failedCategoryCount;
      await writeJsonFile(contextPath, context);
      await writeGithubSummary(summaryPath, buildSuccessSummary({ config, result }));
    },
    async markFailure(errorMessage) {
      context.status = 'failed';
      context.finishedAt = new Date().toISOString();
      context.error = errorMessage;
      await writeJsonFile(contextPath, context);
      await writeJsonFile(failurePath, {
        ...context,
        error: errorMessage,
      });
      await writeGithubSummary(summaryPath, buildFailureSummary({ config, errorMessage }));
    },
  };
}

function collectCategoryWarnings(result) {
  const warnings = [];
  for (const targetLabel of ['baseline', 'submission']) {
    const failures = result.comparison.summary[
      targetLabel === 'baseline' ? 'baselineFailedCategories' : 'submissionFailedCategories'
    ];
    for (const failure of failures) {
      warnings.push(
        `${targetLabel} ${failure.categoryId} failed${failure.error ? `: ${failure.error}` : ''}`
      );
    }
  }
  return warnings;
}

function buildSuccessSummary({ config, result }) {
  const rows = Object.entries(result.comparison.categories)
    .map(([categoryId, category]) => {
      return `| ${category.label} | ${category.baselineStatus} | ${category.submissionStatus} | ${formatSummaryMetric(category.before, category.unit)} | ${formatSummaryMetric(category.after, category.unit)} |`;
    })
    .join('\n');

  const warnings = collectCategoryWarnings(result);

  return [
    '# Audit Runner',
    '',
    `- Status: ${result.comparison.summary.overallStatus}`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${config.mode}${config.category ? ` (${config.category})` : ''}`,
    `- GitHub run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Baseline: ${result.baselineSummary.repoUrl}@${result.baselineSummary.ref} (${result.baselineSummary.sha})`,
    `- Submission: ${result.submissionSummary.repoUrl}@${result.submissionSummary.ref} (${result.submissionSummary.sha})`,
    '',
    '## Category results',
    '',
    '| Category | Baseline | Submission | Before | After |',
    '| --- | --- | --- | --- | --- |',
    rows,
    '',
    warnings.length > 0 ? '## Warnings' : '## Warnings',
    warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join('\n') : '- None',
    '',
    `Artifacts are available under \`${config.outputDir}\` in the uploaded workflow artifact.`,
    '',
  ].join('\n');
}

function buildFailureSummary({ config, errorMessage }) {
  return [
    '# Audit Runner Failure',
    '',
    `- Status: failed`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${config.mode}${config.category ? ` (${config.category})` : ''}`,
    `- GitHub run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Baseline: ${config.baselineRepo}@${config.baselineRef}`,
    `- Submission: ${config.submissionRepo}@${config.submissionRef}`,
    '',
    '## Error',
    '',
    '```text',
    errorMessage,
    '```',
    '',
    `Any partial output and diagnostics have been written to \`${config.outputDir}\` and uploaded when available.`,
    '',
  ].join('\n');
}

async function writeGithubSummary(summaryPath, content) {
  await writeFile(summaryPath, content, 'utf8');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, content, 'utf8');
  }
}

async function writeJsonFile(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function maybeReadJson(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
}

function formatSummaryMetric(value, unit) {
  return value === null || value === undefined ? `n/a ${unit}`.trim() : `${value} ${unit}`.trim();
}

function isMissingFile(error) {
  return Boolean(error) && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeOptional(value) {
  return value && value.length > 0 ? value : null;
}

function numberOrNull(value) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
