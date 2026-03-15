import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { CATEGORY_DEFINITIONS, CATEGORY_IDS, DEFAULT_BASELINE, DEFAULT_RUN_TIMEOUT_MS, DEFAULT_SUBMISSION, ROOT_CAUSES } from './constants.mjs';
import { createDatabaseHarness } from './postgres.mjs';
import { resolveTargetWorkspace, prepareTargetWorkspace, createTargetSummary } from './repo.mjs';
import { ensureDir, sanitizeName, writeJson, writeText } from './fs.mjs';
import { runLoggedCommand } from './exec.mjs';
import { createAuditEmitter, createCommandCallbacks } from './run-events.mjs';
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
const CATEGORY_LOOKUP = Object.fromEntries(CATEGORY_DEFINITIONS.map((category) => [category.id, category]));

export async function runComparison(options = {}) {
  const projectRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
  const runId = options.runId ?? createRunId();
  const outputDir = resolve(options.outputDir ?? join(projectRoot, 'artifacts', 'g4-repro', runId));
  await ensureDir(outputDir);

  const workingRoot = await mkdtemp(join(os.tmpdir(), `ship-audit-${sanitizeName(runId)}-`));
  const timeoutMs = options.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
  const selectedCategories = normalizeCategories(options.category ? [options.category] : options.categories);
  const emitEvent = createAuditEmitter(options.onEvent);

  emitEvent({
    type: 'run-start',
    phase: 'queue',
    message: `Starting ${selectedCategories.length === CATEGORY_IDS.length ? 'full' : 'category'} audit run`,
    payload: {
      runId,
      categories: selectedCategories,
    },
  });

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
    reportEvent: emitEvent,
  });
  emitEvent({
    type: 'target-resolved',
    targetLabel: 'baseline',
    phase: 'setup',
    message: `Resolved baseline ${baselineTarget.repoUrl}@${baselineTarget.ref}`,
    payload: {
      repoUrl: baselineTarget.repoUrl,
      ref: baselineTarget.ref,
      sha: baselineTarget.sha,
    },
  });
  const submissionTarget = await resolveTargetWorkspace({
    label: 'submission',
    spec: submissionSpec,
    runRoot: workingRoot,
    outputDir: join(outputDir, 'submission'),
    timeoutMs,
    reportEvent: emitEvent,
  });
  emitEvent({
    type: 'target-resolved',
    targetLabel: 'submission',
    phase: 'setup',
    message: `Resolved submission ${submissionTarget.repoUrl}@${submissionTarget.ref}`,
    payload: {
      repoUrl: submissionTarget.repoUrl,
      ref: submissionTarget.ref,
      sha: submissionTarget.sha,
    },
  });

  emitEvent({
    type: 'target-prepare-start',
    targetLabel: 'baseline',
    phase: 'setup',
    message: 'Preparing baseline workspace',
  });
  await prepareTargetWorkspace(baselineTarget, timeoutMs, emitEvent);
  emitEvent({
    type: 'target-prepare-end',
    targetLabel: 'baseline',
    phase: 'setup',
    message: 'Baseline workspace ready',
  });

  emitEvent({
    type: 'target-prepare-start',
    targetLabel: 'submission',
    phase: 'setup',
    message: 'Preparing submission workspace',
  });
  await prepareTargetWorkspace(submissionTarget, timeoutMs, emitEvent);
  emitEvent({
    type: 'target-prepare-end',
    targetLabel: 'submission',
    phase: 'setup',
    message: 'Submission workspace ready',
  });

  if (selectedCategories.some((categoryId) => PLAYWRIGHT_CATEGORIES.has(categoryId))) {
    await runLoggedCommand({
      commandId: 'playwright-install',
      command: 'pnpm exec playwright install chromium',
      cwd: projectRoot,
      outputDir: join(outputDir, '.setup'),
      timeoutMs,
      ...createCommandCallbacks(emitEvent, {
        phase: 'setup',
      }),
    });
  }

  const baselineSummary = createTargetSummary(baselineTarget);
  const submissionSummary = createTargetSummary(submissionTarget);

  emitEvent({
    type: 'target-measure-start',
    targetLabel: 'baseline',
    phase: 'measure',
    message: 'Running baseline measurements',
  });
  await measureTarget({
    target: baselineTarget,
    summary: baselineSummary,
    baseConnectionString: databaseHarness.baseConnectionString,
    categories: selectedCategories,
    timeoutMs,
    emitEvent,
  });
  emitEvent({
    type: 'target-measure-end',
    targetLabel: 'baseline',
    phase: 'measure',
    message: 'Baseline measurements finished',
  });
  emitEvent({
    type: 'target-measure-start',
    targetLabel: 'submission',
    phase: 'measure',
    message: 'Running submission measurements',
  });
  await measureTarget({
    target: submissionTarget,
    summary: submissionSummary,
    baseConnectionString: databaseHarness.baseConnectionString,
    categories: selectedCategories,
    timeoutMs,
    emitEvent,
  });
  emitEvent({
    type: 'target-measure-end',
    targetLabel: 'submission',
    phase: 'measure',
    message: 'Submission measurements finished',
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
  emitEvent({
    type: 'run-finished',
    phase: 'finalize',
    level: 'success',
    message: 'Comparison artifacts written',
    payload: {
      outputDir,
      categories: selectedCategories,
    },
  });

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
  emitEvent,
}) {
  const registerCommand = (record) => {
    summary.commands.push(record);
  };

  for (const categoryId of categories) {
    const runner = CATEGORY_RUNNERS[categoryId];
    if (!runner) {
      continue;
    }

    const category = CATEGORY_LOOKUP[categoryId];
    emitEvent?.({
      type: 'category-start',
      targetLabel: target.label,
      categoryId,
      phase: 'measure',
      message: `Starting ${category?.label ?? categoryId}`,
      payload: {
        label: category?.label ?? categoryId,
        unit: category?.unit ?? '',
      },
    });

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
        ...createCommandCallbacks(emitEvent, {
          targetLabel: target.label,
          categoryId,
          phase: 'measure',
        }),
      });
      summary.commands.push(record);
      return record;
    };

    const commandCountBefore = summary.commands.length;
    try {
      const result = await runner({
        target,
        baseConnectionString,
        runCommand,
        registerCommand,
        reportEvent: emitEvent,
      });
      summary.categories[categoryId] = {
        ...result,
        commandIds: summary.commands.slice(commandCountBefore).map((command) => command.id),
      };
      if (result.corpus) {
        summary.corpus = result.corpus;
      }
      emitEvent?.({
        type: 'category-end',
        targetLabel: target.label,
        categoryId,
        phase: 'measure',
        level: result.status === 'passed' ? 'success' : 'error',
        message:
          result.status === 'passed'
            ? `Finished ${category?.label ?? categoryId}`
            : `Finished ${category?.label ?? categoryId} with failures`,
        payload: {
          label: category?.label ?? categoryId,
          unit: category?.unit ?? '',
          status: result.status,
          summaryValue: result.summaryValue ?? null,
          metrics: result.metrics ?? {},
          corpus: result.corpus ?? null,
        },
      });
    } catch (error) {
      summary.categories[categoryId] = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        commandIds: summary.commands.slice(commandCountBefore).map((command) => command.id),
      };
      emitEvent?.({
        type: 'category-end',
        targetLabel: target.label,
        categoryId,
        phase: 'measure',
        level: 'error',
        message: `Failed ${category?.label ?? categoryId}`,
        payload: {
          label: category?.label ?? categoryId,
          unit: category?.unit ?? '',
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        },
      });
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
