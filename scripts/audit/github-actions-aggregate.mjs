#!/usr/bin/env node
import { appendFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { CATEGORY_DEFINITIONS, CATEGORY_IDS, ROOT_CAUSES } from './lib/constants.mjs';
import { ensureDir, readJson, writeJson, writeText } from './lib/fs.mjs';
import { renderDashboard } from './lib/dashboard.mjs';
import {
  buildExactReproductionCommands,
  CATEGORY_LABELS,
  formatCorpus,
  renderCategorySection,
  renderResultTable,
  renderWarningsList,
  SETUP_CONTRACT,
} from './lib/reporting.mjs';

const config = loadConfig();
await ensureDir(config.outputDir);
await ensureDir(join(config.outputDir, 'diagnostics'));

const aggregate = await aggregateCategoryArtifacts(config);

await writeJson(join(config.outputDir, 'baseline', 'summary.json'), aggregate.baselineSummary);
await writeJson(join(config.outputDir, 'submission', 'summary.json'), aggregate.submissionSummary);
await writeJson(join(config.outputDir, 'comparison.json'), aggregate.comparison);
await writeJson(join(config.outputDir, 'diagnostics', 'category-artifacts.json'), aggregate.categoryArtifacts);
await writeJson(join(config.outputDir, 'diagnostics', 'run-context.json'), {
  runId: config.runId,
  mode: config.mode,
  category: config.category,
  selectedCategories: config.selectedCategories.map((categoryId) => ({
    id: categoryId,
    label: CATEGORY_LABELS[categoryId] ?? categoryId,
  })),
  baselineRepo: config.baselineRepo,
  baselineRef: config.baselineRef,
  submissionRepo: config.submissionRepo,
  submissionRef: config.submissionRef,
  githubRunUrl: config.githubRunUrl,
  outputDir: config.outputDir,
  status: aggregate.aggregateStatus === 'passed' ? 'finished' : aggregate.aggregateStatus,
  generatedAt: aggregate.comparison.generatedAt,
});

const dashboardHtml = renderDashboard({
  comparison: aggregate.comparison,
  baselineSummary: aggregate.baselineSummary,
  submissionSummary: aggregate.submissionSummary,
  recipes: aggregate.recipes,
});
await writeText(join(config.outputDir, 'dashboard.html'), dashboardHtml);

const report = buildSuccessReport({ config, aggregate });
const summary = buildSummary({ config, aggregate });

await writeText(join(config.outputDir, 'diagnostics', 'report.md'), report);
await writeText(join(config.outputDir, 'diagnostics', 'github-summary.md'), summary);

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, 'utf8');
}

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    [
      `aggregate_status=${aggregate.aggregateStatus}`,
      `failed_category_count=${aggregate.comparison.summary.failedCategoryCount}`,
      `incomplete_category_count=${aggregate.comparison.summary.incompleteCategoryCount ?? 0}`,
      `compared_category_count=${aggregate.comparison.summary.comparedCategoryCount}`,
    ].join('\n') + '\n',
    'utf8'
  );
}

console.log(
  `Aggregated ${aggregate.comparison.summary.comparedCategoryCount} categories with ${aggregate.comparison.summary.failedCategoryCount} failed category measurements.`
);

async function aggregateCategoryArtifacts(config) {
  const categoryArtifacts = await loadCategoryArtifacts(config);
  const baselineReference = firstSummary(categoryArtifacts, 'baseline') ?? {
    label: 'baseline',
    repoUrl: config.baselineRepo,
    ref: config.baselineRef,
    sha: null,
    measuredAt: null,
    corpus: null,
    commands: [],
    categories: {},
  };
  const submissionReference = firstSummary(categoryArtifacts, 'submission') ?? {
    label: 'submission',
    repoUrl: config.submissionRepo,
    ref: config.submissionRef,
    sha: null,
    measuredAt: null,
    corpus: null,
    commands: [],
    categories: {},
  };

  const baselineSummary = {
    ...baselineReference,
    commands: [],
    categories: {},
  };
  const submissionSummary = {
    ...submissionReference,
    commands: [],
    categories: {},
  };

  const comparisonCategories = {};
  const incompleteCategories = [];

  for (const categoryId of config.selectedCategories) {
    const artifact = categoryArtifacts.find((entry) => entry.categoryId === categoryId);
    const baselineCategory = artifact?.baselineSummary?.categories?.[categoryId];
    const submissionCategory = artifact?.submissionSummary?.categories?.[categoryId];
    const comparisonCategory = artifact?.comparison?.categories?.[categoryId];
    const fallbackError =
      artifact?.failure?.error ??
      artifact?.failure?.message ??
      `No completed artifact was collected for ${CATEGORY_LABELS[categoryId] ?? categoryId}.`;
    const hasCompleteArtifact = Boolean(
      artifact?.comparison &&
        artifact?.baselineSummary &&
        artifact?.submissionSummary
    );
    if (!hasCompleteArtifact) {
      incompleteCategories.push({
        categoryId,
        error: fallbackError,
      });
    }

    baselineSummary.categories[categoryId] = baselineCategory
      ? prefixCategoryCommandIds(baselineCategory, categoryId)
      : {
          status: 'failed',
          error: fallbackError,
          commandIds: [],
        };
    submissionSummary.categories[categoryId] = submissionCategory
      ? prefixCategoryCommandIds(submissionCategory, categoryId)
      : {
          status: 'failed',
          error: fallbackError,
          commandIds: [],
        };

    baselineSummary.commands.push(...prefixCommands(artifact?.baselineSummary?.commands ?? [], categoryId));
    submissionSummary.commands.push(...prefixCommands(artifact?.submissionSummary?.commands ?? [], categoryId));

    if (!baselineSummary.corpus && artifact?.baselineSummary?.corpus) {
      baselineSummary.corpus = artifact.baselineSummary.corpus;
    }
    if (!submissionSummary.corpus && artifact?.submissionSummary?.corpus) {
      submissionSummary.corpus = artifact.submissionSummary.corpus;
    }
    if (artifact?.baselineSummary?.measuredAt) {
      baselineSummary.measuredAt = artifact.baselineSummary.measuredAt;
    }
    if (artifact?.submissionSummary?.measuredAt) {
      submissionSummary.measuredAt = artifact.submissionSummary.measuredAt;
    }

    comparisonCategories[categoryId] =
      comparisonCategory ??
      createFallbackComparisonCategory({
        categoryId,
        baselineCategory: baselineSummary.categories[categoryId],
        submissionCategory: submissionSummary.categories[categoryId],
      });
  }

  const comparison = buildComparison({
    config,
    baselineSummary,
    submissionSummary,
    comparisonCategories,
    incompleteCategories,
  });

  return {
    baselineSummary,
    submissionSummary,
    comparison,
    aggregateStatus:
      incompleteCategories.length > 0
        ? 'failed'
        : comparison.summary.failedCategoryCount > 0
          ? 'warning'
          : 'passed',
    recipes: buildRecipes({ baseline: baselineSummary, submission: submissionSummary }),
    categoryArtifacts,
  };
}

async function loadCategoryArtifacts(config) {
  const entries = await readdir(config.categoryResultsDir, { withFileTypes: true }).catch(() => []);
  const artifacts = [];
  const rootArtifact = await loadArtifactDirectory(config.categoryResultsDir, 'root');
  if (rootArtifact) {
    artifacts.push(rootArtifact);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const artifact = await loadArtifactDirectory(join(config.categoryResultsDir, entry.name), entry.name);
    if (!artifact) {
      continue;
    }
    artifacts.push(artifact);
  }

  artifacts.sort((left, right) => CATEGORY_IDS.indexOf(left.categoryId) - CATEGORY_IDS.indexOf(right.categoryId));
  return artifacts;
}

async function loadArtifactDirectory(artifactDir, artifactName) {
  const comparison = await maybeReadJson(join(artifactDir, 'comparison.json'));
  const baselineSummary = await maybeReadJson(join(artifactDir, 'baseline', 'summary.json'));
  const submissionSummary = await maybeReadJson(join(artifactDir, 'submission', 'summary.json'));
  const runContext = await maybeReadJson(join(artifactDir, 'diagnostics', 'run-context.json'));
  const failure = await maybeReadJson(join(artifactDir, 'diagnostics', 'failure.json'));

  if (!comparison && !baselineSummary && !submissionSummary && !runContext && !failure) {
    return null;
  }

  const categoryId =
    runContext?.selectedCategories?.[0]?.id ??
    Object.keys(comparison?.categories ?? {})[0] ??
    inferCategoryIdFromArtifactName(artifactName);

  if (!categoryId) {
    return null;
  }

  return {
    artifactName,
    artifactDir,
    categoryId,
    comparison,
    baselineSummary,
    submissionSummary,
    runContext,
    failure,
  };
}

function buildComparison({ config, baselineSummary, submissionSummary, comparisonCategories, incompleteCategories }) {
  const orderedCategories = {};
  for (const category of CATEGORY_DEFINITIONS) {
    if (!comparisonCategories[category.id]) {
      continue;
    }
    orderedCategories[category.id] = comparisonCategories[category.id];
  }

  const baselineFailedCategories = collectFailedCategories(baselineSummary);
  const submissionFailedCategories = collectFailedCategories(submissionSummary);
  const failedCategoryCount = baselineFailedCategories.length + submissionFailedCategories.length;
  const incompleteCategoryCount = incompleteCategories.length;

  return {
    runId: config.runId,
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
    summary: {
      overallStatus:
        incompleteCategoryCount > 0 ? 'failed' : failedCategoryCount > 0 ? 'warning' : 'passed',
      failedCategoryCount,
      incompleteCategoryCount,
      incompleteCategories,
      baselineFailedCategories,
      submissionFailedCategories,
      comparedCategoryCount: Object.keys(orderedCategories).length,
    },
    categories: orderedCategories,
  };
}

function createFallbackComparisonCategory({ categoryId, baselineCategory, submissionCategory }) {
  const category = CATEGORY_DEFINITIONS.find((entry) => entry.id === categoryId);
  return {
    label: category?.label ?? categoryId,
    before: null,
    after: null,
    delta: null,
    percentChange: 0,
    unit: category?.unit ?? '',
    baselineStatus: baselineCategory?.status ?? 'failed',
    submissionStatus: submissionCategory?.status ?? 'failed',
    baselineMetrics: baselineCategory?.metrics ?? {},
    submissionMetrics: submissionCategory?.metrics ?? {},
    rootCause: ROOT_CAUSES[categoryId],
    artifactHint: `Aggregate artifact is missing a completed comparison payload for ${CATEGORY_LABELS[categoryId] ?? categoryId}.`,
  };
}

function buildRecipes({ baseline, submission }) {
  const easy = buildExactReproductionCommands({
    baselineRepo: baseline.repoUrl,
    baselineRef: baseline.ref,
    submissionRepo: submission.repoUrl,
    submissionRef: submission.ref,
    category: config.category ?? null,
  });

  const manual = easy;

  return { easy, manual };
}

function buildSummary({ config, aggregate }) {
  const warnings = collectWarningsFromComparison(aggregate.comparison);

  return [
    '# Ship Audit Summary',
    '',
    `- Status: ${aggregate.aggregateStatus}`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${config.mode}${config.category ? ` (${config.category})` : ''}`,
    `- GitHub run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Baseline: ${aggregate.baselineSummary.repoUrl}@${aggregate.baselineSummary.ref} (${aggregate.baselineSummary.sha ?? 'n/a'})`,
    `- Submission: ${aggregate.submissionSummary.repoUrl}@${aggregate.submissionSummary.ref} (${aggregate.submissionSummary.sha ?? 'n/a'})`,
    `- Categories measured: ${config.selectedCategories.map((categoryId) => CATEGORY_LABELS[categoryId] ?? categoryId).join(', ')}`,
    '',
    '## Category results',
    '',
    '| Category | Baseline | Submission | Before | After | Delta |',
    '| --- | --- | --- | --- | --- | --- |',
    renderResultTable(aggregate.comparison, config.selectedCategories),
    '',
    '## Warnings',
    '',
    renderWarningsList(warnings),
    '',
    '## Reproduce locally',
    '',
    '```bash',
    buildExactReproductionCommands({
      baselineRepo: aggregate.baselineSummary.repoUrl,
      baselineRef: aggregate.baselineSummary.ref,
      submissionRepo: aggregate.submissionSummary.repoUrl,
      submissionRef: aggregate.submissionSummary.ref,
      category: config.category ?? null,
    }),
    '```',
    '',
    'The full human-readable report is stored in `diagnostics/report.md` inside the uploaded workflow artifact.',
    '',
  ].join('\n');
}

function buildSuccessReport({ config, aggregate }) {
  const categorySections = CATEGORY_DEFINITIONS
    .filter((category) => aggregate.comparison.categories[category.id])
    .map((category) => {
      return renderCategorySection({
        categoryId: category.id,
        comparisonCategory: aggregate.comparison.categories[category.id],
        baselineCategory: aggregate.baselineSummary.categories[category.id],
        submissionCategory: aggregate.submissionSummary.categories[category.id],
        baselineSummary: aggregate.baselineSummary,
        submissionSummary: aggregate.submissionSummary,
      });
    })
    .join('\n\n');
  const warnings = collectWarningsFromComparison(aggregate.comparison);

  return [
    '# Ship Audit Report',
    '',
    '## Scope',
    '',
    `- Workflow run: ${config.githubRunUrl ?? 'n/a'}`,
    `- Run ID: ${config.runId}`,
    `- Mode: ${config.mode}${config.category ? ` (${config.category})` : ''}`,
    `- Baseline: ${aggregate.baselineSummary.repoUrl}@${aggregate.baselineSummary.ref} (${aggregate.baselineSummary.sha ?? 'n/a'})`,
    `- Submission: ${aggregate.submissionSummary.repoUrl}@${aggregate.submissionSummary.ref} (${aggregate.submissionSummary.sha ?? 'n/a'})`,
    `- Categories measured: ${config.selectedCategories.map((categoryId) => CATEGORY_LABELS[categoryId] ?? categoryId).join(', ')}`,
    `- Canonical runtime corpus: ${formatCorpus(aggregate.submissionSummary.corpus ?? aggregate.baselineSummary.corpus)}`,
    '',
    '## Workflow layout',
    '',
    '- One kickoff job validates refs and writes the requested scope.',
    '- Each category runs in its own GitHub Actions job with its own logs and uploaded evidence bundle.',
    '- This aggregate artifact merges the seven category outputs into one report and dashboard.',
    '',
    '## Result table',
    '',
    '| Category | Baseline | Submission | Before | After | Delta |',
    '| --- | --- | --- | --- | --- | --- |',
    renderResultTable(aggregate.comparison, config.selectedCategories),
    '',
    '## Warnings',
    '',
    renderWarningsList(warnings),
    '',
    '## Reproduce locally',
    '',
    '### Exact comparison commands',
    '```bash',
    buildExactReproductionCommands({
      baselineRepo: aggregate.baselineSummary.repoUrl,
      baselineRef: aggregate.baselineSummary.ref,
      submissionRepo: aggregate.submissionSummary.repoUrl,
      submissionRef: aggregate.submissionSummary.ref,
      category: config.category ?? null,
    }),
    '```',
    '',
    'The category sections below include the exact commands the harness executed for both targets.',
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

function collectWarningsFromComparison(comparison) {
  const warnings = [];
  for (const failure of comparison.summary.baselineFailedCategories ?? []) {
    warnings.push(`Baseline ${CATEGORY_LABELS[failure.categoryId] ?? failure.categoryId}: ${failure.error ?? 'measurement failed'}`);
  }
  for (const failure of comparison.summary.submissionFailedCategories ?? []) {
    warnings.push(`Submission ${CATEGORY_LABELS[failure.categoryId] ?? failure.categoryId}: ${failure.error ?? 'measurement failed'}`);
  }
  for (const failure of comparison.summary.incompleteCategories ?? []) {
    warnings.push(`Incomplete category artifact for ${CATEGORY_LABELS[failure.categoryId] ?? failure.categoryId}: ${failure.error ?? 'artifact missing'}`);
  }
  return warnings;
}

function prefixCommands(commands, categoryId) {
  return commands.map((command, index) => ({
    ...command,
    id: `${categoryId}:${command.id ?? `command-${index + 1}`}`,
  }));
}

function prefixCategoryCommandIds(category, categoryId) {
  return {
    ...category,
    commandIds: (category.commandIds ?? []).map((commandId) => `${categoryId}:${commandId}`),
  };
}

function collectFailedCategories(summary) {
  return Object.entries(summary.categories)
    .filter(([, category]) => category?.status === 'failed')
    .map(([categoryId, category]) => ({
      categoryId,
      error: category?.error ?? null,
    }));
}

function inferCategoryIdFromArtifactName(name) {
  const tail = basename(name).replace(/^audit-run-[^-]+-/, '');
  return CATEGORY_IDS.find((categoryId) => tail.endsWith(categoryId)) ?? null;
}

function firstSummary(categoryArtifacts, target) {
  for (const artifact of categoryArtifacts) {
    const summary = target === 'baseline' ? artifact.baselineSummary : artifact.submissionSummary;
    if (summary) {
      return summary;
    }
  }
  return null;
}

async function maybeReadJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function loadConfig() {
  const runId = readRequiredEnv('AUDIT_RUN_ID');
  const mode = process.env.AUDIT_MODE === 'category' ? 'category' : 'full';
  const category = normalizeOptional(process.env.AUDIT_CATEGORY);
  const categoryResultsDir = resolve(
    process.env.AUDIT_CATEGORY_RESULTS_DIR ?? join(process.cwd(), 'downloaded-category-artifacts')
  );
  const outputDir = resolve(
    process.env.AUDIT_OUTPUT_DIR ?? join(process.cwd(), 'artifacts', 'g4-repro', `actions-${runId}`, 'aggregate')
  );

  return {
    runId,
    mode,
    category,
    selectedCategories: mode === 'category' && category ? [category] : CATEGORY_IDS,
    baselineRepo: readRequiredEnv('AUDIT_BASELINE_REPO'),
    baselineRef: readRequiredEnv('AUDIT_BASELINE_REF'),
    submissionRepo: readRequiredEnv('AUDIT_SUBMISSION_REPO'),
    submissionRef: readRequiredEnv('AUDIT_SUBMISSION_REF'),
    categoryResultsDir,
    outputDir,
    githubRunUrl: buildGithubRunUrl(),
  };
}

function buildGithubRunUrl() {
  const serverUrl = normalizeOptional(process.env.GITHUB_SERVER_URL);
  const repository = normalizeOptional(process.env.GITHUB_REPOSITORY);
  const runId = normalizeOptional(process.env.GITHUB_RUN_ID);
  if (!serverUrl || !repository || !runId) {
    return null;
  }
  return `${serverUrl.replace(/\/$/, '')}/${repository}/actions/runs/${runId}`;
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
