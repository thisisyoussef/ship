import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { CATEGORY_DEFINITIONS, CATEGORY_IDS, DEFAULT_BASELINE, DEFAULT_RUN_TIMEOUT_MS, DEFAULT_SUBMISSION, ROOT_CAUSES } from './constants.mjs';
import { createDatabaseHarness } from './postgres.mjs';
import { resolveTargetWorkspace, prepareTargetWorkspace, createTargetSummary } from './repo.mjs';
import { ensureDir, sanitizeName, writeJson, writeText } from './fs.mjs';
import { runLoggedCommand } from './exec.mjs';
import { measureTypeSafety } from './type-safety.mjs';
import { measureBundleSize } from './bundle-size.mjs';
import { measureApiResponse } from './api-response.mjs';
import { measureDbEfficiency } from './db-efficiency.mjs';
import { measureTestQuality } from './test-quality.mjs';
import { measureRuntimeHandling } from './runtime-handling.mjs';
import { measureAccessibility } from './accessibility.mjs';
import { renderDashboard } from './dashboard.mjs';

const CATEGORY_RUNNERS = {
  'type-safety': measureTypeSafety,
  'bundle-size': measureBundleSize,
  'api-response': measureApiResponse,
  'db-efficiency': measureDbEfficiency,
  'test-quality': measureTestQuality,
  'runtime-handling': measureRuntimeHandling,
  accessibility: measureAccessibility,
};

const PLAYWRIGHT_CATEGORIES = new Set(['test-quality', 'runtime-handling', 'accessibility']);

export async function runComparison(options = {}) {
  const projectRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
  const runId = options.runId ?? createRunId();
  const outputDir = resolve(options.outputDir ?? join(projectRoot, 'artifacts', 'g4-repro', runId));
  await ensureDir(outputDir);

  const workingRoot = await mkdtemp(join(os.tmpdir(), `ship-audit-${sanitizeName(runId)}-`));
  const timeoutMs = options.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
  const selectedCategories = normalizeCategories(options.category ? [options.category] : options.categories);

  const databaseHarness = await createDatabaseHarness(
    options.databaseUrl ?? process.env.AUDIT_DATABASE_URL ?? ''
  );

  const baselineSpec = normalizeTargetSpec('baseline', options.baseline ?? {});
  const submissionSpec = normalizeTargetSpec('submission', options.submission ?? {});

  const baselineTarget = await resolveTargetWorkspace({
    label: 'baseline',
    spec: baselineSpec,
    runRoot: workingRoot,
    outputDir: join(outputDir, 'baseline'),
    timeoutMs,
  });
  const submissionTarget = await resolveTargetWorkspace({
    label: 'submission',
    spec: submissionSpec,
    runRoot: workingRoot,
    outputDir: join(outputDir, 'submission'),
    timeoutMs,
  });

  await prepareTargetWorkspace(baselineTarget, timeoutMs);
  await prepareTargetWorkspace(submissionTarget, timeoutMs);

  if (selectedCategories.some((categoryId) => PLAYWRIGHT_CATEGORIES.has(categoryId))) {
    await runLoggedCommand({
      commandId: 'playwright-install',
      command: 'pnpm exec playwright install chromium',
      cwd: projectRoot,
      outputDir: join(outputDir, '.setup'),
      timeoutMs,
    });
  }

  const baselineSummary = createTargetSummary(baselineTarget);
  const submissionSummary = createTargetSummary(submissionTarget);

  await measureTarget({
    target: baselineTarget,
    summary: baselineSummary,
    baseConnectionString: databaseHarness.baseConnectionString,
    categories: selectedCategories,
    timeoutMs,
  });
  await measureTarget({
    target: submissionTarget,
    summary: submissionSummary,
    baseConnectionString: databaseHarness.baseConnectionString,
    categories: selectedCategories,
    timeoutMs,
  });

  baselineSummary.measuredAt = new Date().toISOString();
  submissionSummary.measuredAt = new Date().toISOString();

  await writeJson(join(outputDir, 'baseline', 'summary.json'), baselineSummary);
  await writeJson(join(outputDir, 'submission', 'summary.json'), submissionSummary);

  const recipes = buildRecipes({
    baseline: baselineSummary,
    submission: submissionSummary,
  });
  const comparison = buildComparison({
    runId,
    baselineSummary,
    submissionSummary,
  });
  await writeJson(join(outputDir, 'comparison.json'), comparison);

  const dashboardHtml = renderDashboard({
    comparison,
    baselineSummary,
    submissionSummary,
    recipes,
  });
  await writeText(join(outputDir, 'dashboard.html'), dashboardHtml);

  await databaseHarness.stop();

  return {
    runId,
    outputDir,
    baselineSummary,
    submissionSummary,
    comparison,
    dashboardPath: join(outputDir, 'dashboard.html'),
    recipes,
  };
}

async function measureTarget({
  target,
  summary,
  baseConnectionString,
  categories,
  timeoutMs,
}) {
  const runCommand = async (
    commandId,
    command,
    env = {},
    allowFailure = false,
    options = {}
  ) => {
    const record = await runLoggedCommand({
      commandId,
      command,
      cwd: options.cwd ?? target.dir,
      env,
      outputDir: target.commandsDir,
      timeoutMs,
      allowFailure,
    });
    summary.commands.push(record);
    return record;
  };

  const registerCommand = (record) => {
    summary.commands.push(record);
  };

  for (const categoryId of categories) {
    const runner = CATEGORY_RUNNERS[categoryId];
    if (!runner) {
      continue;
    }

    const commandCountBefore = summary.commands.length;
    try {
      const result = await runner({
        target,
        baseConnectionString,
        runCommand,
        registerCommand,
      });
      summary.categories[categoryId] = {
        ...result,
        commandIds: summary.commands.slice(commandCountBefore).map((command) => command.id),
      };
      if (result.corpus) {
        summary.corpus = result.corpus;
      }
    } catch (error) {
      summary.categories[categoryId] = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        commandIds: summary.commands.slice(commandCountBefore).map((command) => command.id),
      };
    }
  }
}

function buildComparison({ runId, baselineSummary, submissionSummary }) {
  const categories = {};
  for (const category of CATEGORY_DEFINITIONS) {
    const baseline = baselineSummary.categories[category.id];
    const submission = submissionSummary.categories[category.id];
    if (!baseline || !submission) {
      continue;
    }

    const before = baseline.summaryValue ?? 0;
    const after = submission.summaryValue ?? 0;
    const hasComparableValues =
      typeof baseline.summaryValue === 'number' &&
      typeof submission.summaryValue === 'number';
    const delta = hasComparableValues ? Number((after - before).toFixed(2)) : null;
    const percentChange =
      hasComparableValues && before !== 0
        ? Number((((after - before) / before) * 100).toFixed(2))
        : 0;

    categories[category.id] = {
      label: category.label,
      before: hasComparableValues ? before : null,
      after: hasComparableValues ? after : null,
      delta,
      percentChange,
      unit: category.unit,
      baselineStatus: baseline.status,
      submissionStatus: submission.status,
      baselineMetrics: baseline.metrics ?? {},
      submissionMetrics: submission.metrics ?? {},
      rootCause: ROOT_CAUSES[category.id],
      artifactHint: `artifacts/g4-repro/${runId}/${baselineSummary.label}/summary.json and artifacts/g4-repro/${runId}/${submissionSummary.label}/summary.json`,
    };
  }

  return {
    runId,
    generatedAt: new Date().toISOString(),
    baseline: {
      repoUrl: baselineSummary.repoUrl,
      ref: baselineSummary.ref,
      sha: baselineSummary.sha,
    },
    submission: {
      repoUrl: submissionSummary.repoUrl,
      ref: submissionSummary.ref,
      sha: submissionSummary.sha,
    },
    categories,
  };
}

function buildRecipes({ baseline, submission }) {
  const easy = [
    `git clone --branch ${submission.ref} ${submission.repoUrl} ship-audit-submission`,
    'cd ship-audit-submission',
    'pnpm install --frozen-lockfile',
    `pnpm audit:grade --baseline-repo ${baseline.repoUrl} --baseline-ref ${baseline.ref}`,
  ].join('\n');

  const manual = [
    `git clone --branch ${baseline.ref} ${baseline.repoUrl} ship-audit-baseline`,
    `git clone --branch ${submission.ref} ${submission.repoUrl} ship-audit-submission`,
    'cd ship-audit-submission',
    'pnpm install --frozen-lockfile',
    'pnpm audit:grade --baseline-dir ../ship-audit-baseline --submission-dir .',
  ].join('\n');

  return { easy, manual };
}

function normalizeTargetSpec(label, spec) {
  const defaults = label === 'baseline' ? DEFAULT_BASELINE : DEFAULT_SUBMISSION;
  if (spec.dir) {
    return { dir: resolve(spec.dir) };
  }
  return {
    repoUrl: spec.repoUrl ?? defaults.repoUrl,
    ref: spec.ref ?? defaults.ref,
  };
}

function normalizeCategories(rawCategories) {
  if (!rawCategories || rawCategories.length === 0) {
    return CATEGORY_IDS;
  }
  return rawCategories
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function createRunId() {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
}
