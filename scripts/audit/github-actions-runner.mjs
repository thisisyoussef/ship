#!/usr/bin/env node
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runComparison } from './lib/run-compare.mjs';
import { CATEGORY_DEFINITIONS, TARGET_COUNTS } from './lib/constants.mjs';

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_DEFINITIONS.map((category) => [category.id, category.label])
);
const SETUP_CONTRACT = [
  'git clone --depth 1 --branch <ref> <repo-url> <workdir>',
  'pnpm install --frozen-lockfile',
  'pnpm build:shared',
  'pnpm db:migrate',
  'pnpm db:seed',
  `Expand canonical corpus to ${TARGET_COUNTS.documents} docs / ${TARGET_COUNTS.issues} issues / ${TARGET_COUNTS.weeks} weeks / ${TARGET_COUNTS.users} users`,
];

const config = loadConfig();
await mkdir(config.outputDir, { recursive: true });
const diagnostics = createDiagnostics(config);
await diagnostics.initialize();
const callback = createCallbackClient(config);
const outputDir = config.outputDir;
const reporter = createEventReporter(callback, diagnostics, config);

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
  reporter.closeGroup();
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
  reporter.closeGroup();
  const message = error instanceof Error ? `${error.message}${error.stack ? `\n${error.stack}` : ''}` : String(error);
  console.error(`::error::${message.split('\n')[0]}`);
  const failureContext = await collectFailureContext(outputDir);
  await diagnostics.markFailure(message, failureContext);
  const artifacts = await collectArtifacts(outputDir);
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

function createEventReporter(callback, diagnostics, config) {
  let events = [];
  let flushTimer = null;
  let flushChain = Promise.resolve();
  let openGroup = null;

  function push(event) {
    logEvent(event);
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

  function logEvent(event) {
    switch (event.type) {
      case 'run-start':
        console.log(
          `::notice title=Audit scope::${escapeAnnotation(
            `${describeMode(config)} | baseline ${config.baselineRef} -> submission ${config.submissionRef}`
          )}`
        );
        break;
      case 'target-resolved':
        console.log(
          `::notice title=${escapeAnnotation(
            `${capitalize(event.targetLabel ?? 'target')} resolved`
          )}::${escapeAnnotation(event.message)}`
        );
        break;
      case 'target-prepare-start':
      case 'target-prepare-end':
      case 'target-measure-start':
      case 'target-measure-end':
      case 'workflow-note':
      case 'run-finished':
      case 'run-error':
        writeWorkflowAnnotation(event);
        break;
      case 'category-start':
        closeGroup();
        openGroup = formatCategoryContext(event);
        console.log(`::group::${openGroup}`);
        console.log(`[plan] ${event.message}`);
        break;
      case 'category-end':
        console.log(formatCategoryResultLine(event));
        writeWorkflowAnnotation(event);
        closeGroup();
        break;
      case 'command-start':
        console.log(`[command] ${formatEventContext(event)} :: ${event.message}`);
        break;
      case 'command-end':
        console.log(`[command] ${formatEventContext(event)} :: ${event.message}`);
        break;
      case 'command-output':
        writeConsoleStream(event);
        break;
      default:
        console.log(`[event] ${formatEventContext(event)} :: ${event.message}`);
        break;
    }
  }

  function closeGroup() {
    if (!openGroup) {
      return;
    }
    console.log('::endgroup::');
    openGroup = null;
  }

  return {
    push,
    flush,
    closeGroup,
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
      ['report.md', join(outputDir, 'diagnostics', 'report.md'), 'text/markdown; charset=utf-8'],
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
  const reportPath = join(diagnosticsDir, 'report.md');

  const context = {
    runId: config.runId,
    mode: config.mode,
    category: config.category,
    selectedCategories: selectedCategoryIds(config).map((categoryId) => ({
      id: categoryId,
      label: CATEGORY_LABELS[categoryId] ?? categoryId,
    })),
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
      const summary = buildSuccessSummary({ config, result });
      const report = buildSuccessReport({ config, result });
      await writeFile(reportPath, report, 'utf8');
      await writeGithubSummary(summaryPath, summary);
    },
    async markFailure(errorMessage, failureContext) {
      context.status = 'failed';
      context.finishedAt = new Date().toISOString();
      context.baselineSha = failureContext.baselineSha ?? null;
      context.submissionSha = failureContext.submissionSha ?? null;
      context.error = errorMessage;
      await writeJsonFile(contextPath, context);
      await writeJsonFile(failurePath, {
        ...context,
        error: errorMessage,
      });
      const summary = buildFailureSummary({ config, errorMessage, failureContext });
      const report = buildFailureReport({ config, errorMessage, failureContext });
      await writeFile(reportPath, report, 'utf8');
      await writeGithubSummary(summaryPath, summary);
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
      return `| ${category.label} | ${category.baselineStatus} | ${category.submissionStatus} | ${formatSummaryMetric(category.before, category.unit)} | ${formatSummaryMetric(category.after, category.unit)} | ${formatSummaryMetric(category.delta, category.unit, true)} |`;
    })
    .join('\n');

  const warnings = collectCategoryWarnings(result);

  return [
    '# Ship Audit Summary',
    '',
    `- Status: ${result.comparison.summary.overallStatus}`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${config.mode}${config.category ? ` (${config.category})` : ''}`,
    `- GitHub run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Baseline: ${result.baselineSummary.repoUrl}@${result.baselineSummary.ref} (${result.baselineSummary.sha})`,
    `- Submission: ${result.submissionSummary.repoUrl}@${result.submissionSummary.ref} (${result.submissionSummary.sha})`,
    `- Categories measured: ${selectedCategoryIds(config).map((categoryId) => CATEGORY_LABELS[categoryId] ?? categoryId).join(', ')}`,
    '',
    '## Category results',
    '',
    '| Category | Baseline | Submission | Before | After | Delta |',
    '| --- | --- | --- | --- | --- | --- |',
    rows,
    '',
    '## Reproduce locally',
    '',
    '```bash',
    result.recipes.easy,
    '```',
    '',
    '## Warnings',
    warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join('\n') : '- None',
    '',
    `A full human-readable report is stored in \`${join('diagnostics', 'report.md')}\` inside the uploaded workflow artifact.`,
    '',
  ].join('\n');
}

function buildFailureSummary({ config, errorMessage, failureContext }) {
  return [
    '# Ship Audit Failure',
    '',
    `- Status: failed`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${config.mode}${config.category ? ` (${config.category})` : ''}`,
    `- GitHub run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Baseline: ${config.baselineRepo}@${config.baselineRef}`,
    `- Submission: ${config.submissionRepo}@${config.submissionRef}`,
    `- Categories requested: ${selectedCategoryIds(config).map((categoryId) => CATEGORY_LABELS[categoryId] ?? categoryId).join(', ')}`,
    '',
    '## Error',
    '',
    '```text',
    errorMessage,
    '```',
    '',
    '## Partial evidence',
    '',
    `- Baseline SHA: ${failureContext.baselineSha ?? 'n/a'}`,
    `- Submission SHA: ${failureContext.submissionSha ?? 'n/a'}`,
    `- Comparison written: ${failureContext.comparisonJson ? 'yes' : 'no'}`,
    `- Partial summaries written: ${failureContext.summaryJson ? 'yes' : 'no'}`,
    '',
    `Any partial output and diagnostics have been written to \`${config.outputDir}\` and uploaded when available.`,
    '',
  ].join('\n');
}

async function writeGithubSummary(summaryPath, content) {
  await writeFile(summaryPath, content, 'utf8');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${content}\n`, 'utf8');
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

function formatSummaryMetric(value, unit, includePositiveSign = false) {
  if (value === null || value === undefined) {
    return `n/a ${unit}`.trim();
  }
  const prefix = includePositiveSign && typeof value === 'number' && value > 0 ? '+' : '';
  return `${prefix}${value} ${unit}`.trim();
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

function selectedCategoryIds(config) {
  return config.mode === 'category' && config.category ? [config.category] : CATEGORY_DEFINITIONS.map((category) => category.id);
}

function buildSuccessReport({ config, result }) {
  const categorySections = CATEGORY_DEFINITIONS
    .filter((category) => result.comparison.categories[category.id])
    .map((category) => {
      const comparisonCategory = result.comparison.categories[category.id];
      const baselineCategory = result.baselineSummary.categories[category.id];
      const submissionCategory = result.submissionSummary.categories[category.id];
      return [
        `## ${category.label}`,
        '',
        `- Baseline status: ${comparisonCategory.baselineStatus}`,
        `- Submission status: ${comparisonCategory.submissionStatus}`,
        `- Before: ${formatSummaryMetric(comparisonCategory.before, category.unit)}`,
        `- After: ${formatSummaryMetric(comparisonCategory.after, category.unit)}`,
        `- Delta: ${formatSummaryMetric(comparisonCategory.delta, category.unit, true)} (${comparisonCategory.percentChange}%)`,
        '',
        `### Root cause`,
        '',
        comparisonCategory.rootCause.baselineProblem,
        '',
        `### Why the fix works`,
        '',
        comparisonCategory.rootCause.whyFixWorks,
        '',
        renderMetricsSection('Baseline metrics', baselineCategory?.metrics),
        '',
        renderMetricsSection('Submission metrics', submissionCategory?.metrics),
        '',
        '### Exact commands run',
        '',
        '#### Baseline',
        '```bash',
        renderCategoryCommands(result.baselineSummary, category.id),
        '```',
        '',
        '#### Submission',
        '```bash',
        renderCategoryCommands(result.submissionSummary, category.id),
        '```',
      ].join('\n');
    })
    .join('\n\n');

  return [
    '# Ship Audit Report',
    '',
    '## Scope',
    '',
    `- Workflow run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${describeMode(config)}`,
    `- Baseline: ${result.baselineSummary.repoUrl}@${result.baselineSummary.ref} (${result.baselineSummary.sha})`,
    `- Submission: ${result.submissionSummary.repoUrl}@${result.submissionSummary.ref} (${result.submissionSummary.sha})`,
    `- Categories measured: ${selectedCategoryIds(config).map((categoryId) => CATEGORY_LABELS[categoryId] ?? categoryId).join(', ')}`,
    `- Canonical runtime corpus: ${formatCorpus(result.submissionSummary.corpus ?? result.baselineSummary.corpus)}`,
    '',
    '## Result table',
    '',
    '| Category | Baseline | Submission | Before | After | Delta |',
    '| --- | --- | --- | --- | --- | --- |',
    ...CATEGORY_DEFINITIONS
      .filter((category) => result.comparison.categories[category.id])
      .map((category) => {
        const comparisonCategory = result.comparison.categories[category.id];
        return `| ${category.label} | ${comparisonCategory.baselineStatus} | ${comparisonCategory.submissionStatus} | ${formatSummaryMetric(comparisonCategory.before, category.unit)} | ${formatSummaryMetric(comparisonCategory.after, category.unit)} | ${formatSummaryMetric(comparisonCategory.delta, category.unit, true)} |`;
      }),
    '',
    '## Reproduce locally',
    '',
    '### Easy mode',
    '```bash',
    result.recipes.easy,
    '```',
    '',
    '### Manual mode',
    '```bash',
    result.recipes.manual,
    '```',
    '',
    '## Setup contract',
    '',
    '```text',
    SETUP_CONTRACT.join('\n'),
    '```',
    '',
    categorySections,
    '',
  ].join('\n');
}

function buildFailureReport({ config, errorMessage, failureContext }) {
  return [
    '# Ship Audit Report',
    '',
    '## Status',
    '',
    `- Status: failed`,
    `- Workflow run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${describeMode(config)}`,
    `- Baseline: ${config.baselineRepo}@${config.baselineRef}`,
    `- Submission: ${config.submissionRepo}@${config.submissionRef}`,
    `- Categories requested: ${selectedCategoryIds(config).map((categoryId) => CATEGORY_LABELS[categoryId] ?? categoryId).join(', ')}`,
    '',
    '## Error',
    '',
    '```text',
    errorMessage,
    '```',
    '',
    '## Partial evidence',
    '',
    `- Baseline SHA: ${failureContext.baselineSha ?? 'n/a'}`,
    `- Submission SHA: ${failureContext.submissionSha ?? 'n/a'}`,
    `- Partial summaries available: ${failureContext.summaryJson ? 'yes' : 'no'}`,
    `- Comparison available: ${failureContext.comparisonJson ? 'yes' : 'no'}`,
    '',
    '## Reproduce locally',
    '',
    '### Easy mode',
    '```bash',
    `git clone --branch ${config.submissionRef} ${config.submissionRepo} ship-audit-submission`,
    'cd ship-audit-submission',
    'pnpm install --frozen-lockfile',
    `pnpm audit:grade --category ${config.category ?? '<category>'} --baseline-repo ${config.baselineRepo} --baseline-ref ${config.baselineRef}`,
    '```',
    '',
    '## Setup contract',
    '',
    '```text',
    SETUP_CONTRACT.join('\n'),
    '```',
    '',
  ].join('\n');
}

function renderCategoryCommands(summary, categoryId) {
  const category = summary.categories[categoryId];
  const commandIds = new Set(category?.commandIds ?? []);
  const commands = summary.commands
    .filter((command) => commandIds.size === 0 || commandIds.has(command.id))
    .map((command) => command.command);

  return commands.length > 0 ? commands.join('\n') : '(no commands recorded)';
}

function renderMetricsSection(title, metrics) {
  const entries = Object.entries(metrics ?? {});
  if (entries.length === 0) {
    return `### ${title}\n\n- No detailed metrics captured.`;
  }

  return [
    `### ${title}`,
    '',
    ...entries.map(([key, value]) => `- ${formatMetricKey(key)}: ${renderMetricValue(value)}`),
  ].join('\n');
}

function renderMetricValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(', ');
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatMetricKey(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCorpus(corpus) {
  if (!corpus) {
    return `Expected ${TARGET_COUNTS.documents} docs / ${TARGET_COUNTS.issues} issues / ${TARGET_COUNTS.weeks} weeks / ${TARGET_COUNTS.users} users`;
  }
  return `${corpus.documents} docs / ${corpus.issues} issues / ${corpus.weeks} weeks / ${corpus.users} users`;
}

function writeWorkflowAnnotation(event) {
  const level = event.level === 'error' ? 'error' : event.level === 'warn' ? 'warning' : 'notice';
  const title = formatEventContext(event);
  const message =
    event.type === 'category-end'
      ? formatCategoryResultLine(event)
      : event.message;
  console.log(`::${level} title=${escapeAnnotation(title)}::${escapeAnnotation(message)}`);
}

function writeConsoleStream(event) {
  const prefix = `[${formatEventContext(event)}]`;
  const writer = event.stream === 'stderr' || event.level === 'error' ? console.error : console.log;
  const lines = String(event.message ?? '')
    .split(/\r?\n/)
    .filter((line) => line.length > 0);

  for (const line of lines) {
    writer(`${prefix} ${line}`);
  }
}

function formatCategoryResultLine(event) {
  const label = CATEGORY_LABELS[event.categoryId] ?? event.categoryId ?? 'Category';
  const status = event.payload?.status ?? (event.level === 'error' ? 'failed' : 'passed');
  const summaryValue = event.payload?.summaryValue;
  const unit = event.payload?.unit ?? '';
  const metric =
    typeof summaryValue === 'number'
      ? `${summaryValue} ${unit}`.trim()
      : event.payload?.error
        ? String(event.payload.error)
        : 'no summary metric';
  return `${capitalize(event.targetLabel ?? 'target')} / ${label} / ${status}: ${metric}`;
}

function formatCategoryContext(event) {
  const categoryLabel = CATEGORY_LABELS[event.categoryId] ?? event.categoryId ?? 'Category';
  return `${capitalize(event.targetLabel ?? 'target')} :: ${categoryLabel}`;
}

function formatEventContext(event) {
  const parts = [];
  if (event.phase) {
    parts.push(event.phase);
  }
  if (event.targetLabel) {
    parts.push(event.targetLabel);
  }
  if (event.categoryId) {
    parts.push(CATEGORY_LABELS[event.categoryId] ?? event.categoryId);
  }
  if (event.commandId) {
    parts.push(event.commandId);
  }
  return parts.length > 0 ? parts.join(' / ') : 'audit';
}

function escapeAnnotation(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function describeMode(config) {
  if (config.mode === 'category' && config.category) {
    return `category / ${CATEGORY_LABELS[config.category] ?? config.category}`;
  }
  return `full / ${CATEGORY_DEFINITIONS.length} categories`;
}

function capitalize(value) {
  return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
}
