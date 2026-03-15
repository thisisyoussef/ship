import { CATEGORY_DEFINITIONS, ROOT_CAUSES, TARGET_COUNTS } from './constants.mjs';

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_DEFINITIONS.map((category) => [category.id, category.label])
);

export const SETUP_CONTRACT = [
  'git clone --depth 1 --branch <ref> <repo-url> <workdir>',
  'pnpm install --frozen-lockfile',
  'pnpm build:shared',
  'pnpm db:migrate',
  'pnpm db:seed',
  'node ./scripts/audit/expand-corpus.mjs --database-url <DATABASE_URL>',
];

export function formatSummaryMetric(value, unit, includePositiveSign = false) {
  if (value === null || value === undefined) {
    return `n/a ${unit}`.trim();
  }
  const prefix = includePositiveSign && typeof value === 'number' && value > 0 ? '+' : '';
  return `${prefix}${value} ${unit}`.trim();
}

export function formatCorpus(corpus) {
  if (!corpus) {
    return `Expected ${TARGET_COUNTS.documents} docs / ${TARGET_COUNTS.issues} issues / ${TARGET_COUNTS.weeks} weeks / ${TARGET_COUNTS.users} users`;
  }
  return `${corpus.documents} docs / ${corpus.issues} issues / ${corpus.weeks} weeks / ${corpus.users} users`;
}

export function renderCategoryCommands(summary, categoryId) {
  const commands = selectCategoryCommands(summary, categoryId).map((command) => command.command);

  return commands.length > 0 ? commands.join('\n') : '(no commands recorded)';
}

export function buildExactReproductionCommands({
  baselineRepo,
  baselineRef,
  submissionRepo,
  submissionRef,
  category,
}) {
  const outputName = category ? `manual-${category}` : 'manual-full-suite';
  const command = [
    `git clone --depth 1 --branch ${shellQuote(baselineRef)} ${shellQuote(baselineRepo)} ship-audit-baseline`,
    `git clone --depth 1 --branch ${shellQuote(submissionRef)} ${shellQuote(submissionRepo)} ship-audit-submission`,
    'cd ship-audit-submission',
    'pnpm install --frozen-lockfile',
    'pnpm build:shared',
    'pnpm exec playwright install --with-deps chromium',
    `node ./scripts/audit/cli.mjs --baseline-dir ../ship-audit-baseline --submission-dir .${category ? ` --category ${category}` : ''} --output-dir ./artifacts/g4-repro/${outputName}`,
  ];
  return command.join('\n');
}

export function renderResultTable(comparison, categoryIds) {
  return categoryIds
    .map((categoryId) => {
      const result = comparison.categories[categoryId];
      const category = CATEGORY_DEFINITIONS.find((entry) => entry.id === categoryId);
      if (!result || !category) {
        return null;
      }
      return `| ${category.label} | ${result.baselineStatus} | ${result.submissionStatus} | ${formatSummaryMetric(result.before, category.unit)} | ${formatSummaryMetric(result.after, category.unit)} | ${formatSummaryMetric(result.delta, category.unit, true)} |`;
    })
    .filter(Boolean)
    .join('\n');
}

export function renderWarningsList(warnings) {
  return warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join('\n') : '- None';
}

export function renderMetricsSection(title, metrics) {
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

export function renderCategoryBreakdown(categoryId, result) {
  if (!result) {
    return '- No detailed category data captured.';
  }

  switch (categoryId) {
    case 'type-safety':
      return renderTypeSafetyBreakdown(result);
    case 'bundle-size':
      return renderBundleBreakdown(result);
    case 'api-response':
      return renderApiResponseBreakdown(result);
    case 'db-efficiency':
      return renderDbBreakdown(result);
    case 'test-quality':
      return renderTestQualityBreakdown(result);
    case 'runtime-handling':
      return renderRuntimeBreakdown(result);
    case 'accessibility':
      return renderAccessibilityBreakdown(result);
    default:
      return '- No detailed category breakdown renderer is registered.';
  }
}

export function renderCategorySection({
  categoryId,
  comparisonCategory,
  baselineCategory,
  submissionCategory,
  baselineSummary,
  submissionSummary,
}) {
  const category = CATEGORY_DEFINITIONS.find((entry) => entry.id === categoryId);
  if (!category || !comparisonCategory) {
    return '';
  }

  return [
    `## ${category.label}`,
    '',
    `- Baseline status: ${comparisonCategory.baselineStatus}`,
    `- Submission status: ${comparisonCategory.submissionStatus}`,
    `- Before: ${formatSummaryMetric(comparisonCategory.before, category.unit)}`,
    `- After: ${formatSummaryMetric(comparisonCategory.after, category.unit)}`,
    `- Delta: ${formatSummaryMetric(comparisonCategory.delta, category.unit, true)} (${comparisonCategory.percentChange}%)`,
    '',
    '### Root cause',
    '',
    ROOT_CAUSES[categoryId].baselineProblem,
    '',
    '### Why the fix works',
    '',
    ROOT_CAUSES[categoryId].whyFixWorks,
    '',
    renderMetricsSection('Baseline metrics', baselineCategory?.metrics),
    '',
    renderCategoryBreakdown(categoryId, baselineCategory),
    '',
    renderMetricsSection('Submission metrics', submissionCategory?.metrics),
    '',
    renderCategoryBreakdown(categoryId, submissionCategory),
    '',
    '### Exact commands run',
    '',
    '#### Baseline',
    '```bash',
    renderCategoryCommands(baselineSummary, categoryId),
    '```',
    '',
    '#### Submission',
    '```bash',
    renderCategoryCommands(submissionSummary, categoryId),
    '```',
  ].join('\n');
}

function renderTypeSafetyBreakdown(result) {
  const rows = Object.entries(result.packageBreakdown ?? {})
    .map(([pkg, counts]) => `| ${pkg} | ${counts.totalViolations} | ${counts.anyCount} | ${counts.asCount} | ${counts.nonNullCount} | ${counts.directiveCount} |`)
    .join('\n');
  const topFiles = renderList((result.topFiles ?? []).map(
    (file) =>
      `\`${file.path}\` (${file.totalViolations} total: any ${file.anyCount}, as ${file.asCount}, non-null ${file.nonNullCount}, directives ${file.directiveCount})`
  ));

  return [
    '### Detailed breakdown',
    '',
    '| Package | Total | any | as | non-null | directives |',
    '| --- | --- | --- | --- | --- | --- |',
    rows || '| n/a | 0 | 0 | 0 | 0 | 0 |',
    '',
    '#### Highest-violation files',
    topFiles,
  ].join('\n');
}

function renderBundleBreakdown(result) {
  const files = renderList((result.files ?? []).slice(0, 10).map(
    (file) => `\`${file.relativePath}\` (${kb(file.sizeBytes)} KB)`
  ));

  return [
    '### Detailed breakdown',
    '',
    `- Entry file: \`${result.entryFile ?? 'n/a'}\``,
    `- Manifest path: \`${result.manifestPath ?? 'n/a'}\``,
    '',
    '#### Largest emitted assets captured',
    files,
  ].join('\n');
}

function renderApiResponseBreakdown(result) {
  const sections = Object.entries(result.endpointResults ?? {}).map(([endpoint, bands]) => [
    `#### ${endpoint}`,
    '',
    '| Concurrency | Requests | Success | Failure | p95 | avg | min | max |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...bands.map(
      (band) =>
        `| ${band.concurrency} | ${band.totalRequests} | ${band.successCount} | ${band.failureCount} | ${band.p95Ms} ms | ${band.avgMs} ms | ${band.minMs} ms | ${band.maxMs} ms |`
    ),
  ].join('\n'));

  return ['### Detailed breakdown', '', ...sections].join('\n');
}

function renderDbBreakdown(result) {
  const statements = renderList((result.statements ?? []).map((statement) => {
    const sql = normalizeWhitespace(statement.sql).slice(0, 220);
    return `${statement.durationMs} ms${statement.errored ? ' [errored]' : ''} :: \`${sql}\``;
  }));

  return [
    '### Detailed breakdown',
    '',
    `- Total traced statements: ${result.statements?.length ?? 0}`,
    '',
    '#### Traced SQL statements',
    statements,
  ].join('\n');
}

function renderTestQualityBreakdown(result) {
  return [
    '### Detailed breakdown',
    '',
    renderSuiteSummary('API Vitest suite', result.apiSuite),
    '',
    renderSuiteSummary('Web Vitest suite', result.webSuite),
    '',
    renderPlaywrightSummary('Playwright regression suite', result.playwright, { includeAttempts: true }),
  ].join('\n');
}

function renderRuntimeBreakdown(result) {
  return [
    '### Detailed breakdown',
    '',
    renderSuiteSummary('Error boundary Vitest suite', result.errorBoundarySuite),
    '',
    renderPlaywrightSummary('Runtime Playwright suite', result.playwright),
  ].join('\n');
}

function renderAccessibilityBreakdown(result) {
  const metrics = result.playwright?.metrics ?? {};
  return [
    '### Detailed breakdown',
    '',
    renderPlaywrightSummary('Accessibility Playwright suite', result.playwright),
    '',
    '#### Accessibility rule details',
    renderList([
      `Docs tree invalid children: ${metrics.docsTreeInvalidChildren?.length ?? 0}`,
      `Docs tree violation IDs: ${(metrics.docsTreeViolationIds ?? []).join(', ') || 'none'}`,
      `My Week contrast violation IDs: ${(metrics.myWeekContrastViolationIds ?? []).join(', ') || 'none'}`,
    ]),
  ].join('\n');
}

function renderSuiteSummary(title, suite) {
  if (!suite) {
    return `#### ${title}\n\n- No suite data captured.`;
  }

  return [
    `#### ${title}`,
    '',
    `- Status: ${suite.succeeded ? 'passed' : 'failed'}`,
    `- Totals: ${suite.totals.passed} passed / ${suite.totals.failed} failed / ${suite.totals.total} total (${suite.totals.passRate}%)`,
    suite.totals.skipped ? `- Skipped: ${suite.totals.skipped}` : null,
    suite.totals.todo ? `- Todo: ${suite.totals.todo}` : null,
    '',
    renderTestLists(suite),
  ]
    .filter(Boolean)
    .join('\n');
}

function renderPlaywrightSummary(title, playwright, options = {}) {
  if (!playwright) {
    return `#### ${title}\n\n- No Playwright data captured.`;
  }

  const totalLine = options.includeAttempts
    ? `- Logical tests: ${playwright.totals.passed} passed / ${playwright.totals.failed} failed / ${playwright.totals.flaky} flaky / ${playwright.totals.total} total (${playwright.totals.passRate}%)\n- Attempts: ${playwright.totals.passedAttempts} passed / ${playwright.totals.failedAttempts} failed / ${playwright.totals.flakyAttempts} flaky / ${playwright.totals.totalAttempts} total (${playwright.totals.attemptPassRate}%)`
    : `- Logical tests: ${playwright.totals.passed} passed / ${playwright.totals.failed} failed / ${playwright.totals.flaky} flaky / ${playwright.totals.total} total (${playwright.totals.passRate}%)`;

  return [
    `#### ${title}`,
    '',
    `- Status: ${playwright.succeeded ? 'passed' : 'failed'}`,
    totalLine,
    playwright.reportErrors?.length ? `- Report errors: ${playwright.reportErrors.join(' | ')}` : null,
    '',
    renderPlaywrightTestLists(playwright.tests ?? []),
  ]
    .filter(Boolean)
    .join('\n');
}

function selectCategoryCommands(summary, categoryId) {
  const category = summary.categories[categoryId];
  const commandIds = new Set(category?.commandIds ?? []);
  if (commandIds.size > 0) {
    return summary.commands.filter((command) => commandIds.has(command.id));
  }

  const prefixedCommands = summary.commands.filter((command) =>
    String(command.id ?? '').startsWith(`${categoryId}:`)
  );
  if (prefixedCommands.length > 0) {
    return prefixedCommands;
  }

  return [];
}

function renderTestLists(suite) {
  const failed = (suite.failedTests ?? []).map(
    (test) => `\`${test.file}\` :: ${test.fullName}${test.failureMessages?.[0] ? ` :: ${trimFailure(test.failureMessages[0])}` : ''}`
  );
  const passed = (suite.passedTests ?? []).map((test) => `\`${test.file}\` :: ${test.fullName}`);

  return [
    renderDetailsBlock(`Failed tests (${failed.length})`, failed),
    '',
    renderDetailsBlock(`Passed tests (${passed.length})`, passed),
  ].join('\n');
}

function renderPlaywrightTestLists(tests) {
  const failed = tests
    .filter((test) => test.status === 'failed' || test.status === 'flaky')
    .map(
      (test) =>
        `\`${test.file ?? 'unknown'}\` :: ${test.title} (${test.status}; attempts passed ${test.passedCount}, failed ${test.failedCount}, flaky ${test.flakyCount})${test.failureMessages?.[0] ? ` :: ${trimFailure(test.failureMessages[0])}` : ''}`
    );
  const passed = tests
    .filter((test) => test.status === 'passed')
    .map(
      (test) =>
        `\`${test.file ?? 'unknown'}\` :: ${test.title} (attempts passed ${test.passedCount}, failed ${test.failedCount}, flaky ${test.flakyCount})`
    );

  return [
    renderDetailsBlock(`Failed or flaky tests (${failed.length})`, failed),
    '',
    renderDetailsBlock(`Passed tests (${passed.length})`, passed),
  ].join('\n');
}

function renderDetailsBlock(summary, lines) {
  return [
    `<details>`,
    `<summary>${escapeHtml(summary)}</summary>`,
    '',
    lines.length > 0 ? renderList(lines) : '- None',
    '',
    '</details>',
  ].join('\n');
}

function renderList(lines) {
  return lines.length > 0 ? lines.map((line) => `- ${line}`).join('\n') : '- None';
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

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function trimFailure(value) {
  return normalizeWhitespace(value).slice(0, 240);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function kb(bytes) {
  return Number((Number(bytes || 0) / 1024).toFixed(2));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
