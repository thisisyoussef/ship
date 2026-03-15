export const TARGET_COUNTS = Object.freeze({
  documents: 580,
  issues: 105,
  weeks: 35,
  users: 23,
});

export const DEFAULT_BASELINE = Object.freeze({
  label: 'baseline',
  repoUrl: 'https://github.com/US-Department-of-the-Treasury/ship.git',
  ref: 'master',
});

export const DEFAULT_SUBMISSION = Object.freeze({
  label: 'submission',
  repoUrl: 'https://github.com/thisisyoussef/ship.git',
  ref: 'codex/submission-clean',
});

export const CATEGORY_DEFINITIONS = Object.freeze([
  {
    id: 'type-safety',
    label: 'Category 1: Type Safety',
    summaryMetricLabel: 'AST-audited violations',
    unit: 'violations',
  },
  {
    id: 'bundle-size',
    label: 'Category 2: Bundle Size',
    summaryMetricLabel: 'Main entry chunk',
    unit: 'KB',
  },
  {
    id: 'api-response',
    label: 'Category 3: API Response Time',
    summaryMetricLabel: '/api/documents p95 @ c50',
    unit: 'ms',
  },
  {
    id: 'db-efficiency',
    label: 'Category 4: Database Query Efficiency',
    summaryMetricLabel: 'Queries for GET /api/weeks/:id/issues',
    unit: 'queries',
  },
  {
    id: 'test-quality',
    label: 'Category 5: Test Coverage and Quality',
    summaryMetricLabel: 'Primary suite pass rate',
    unit: '%',
  },
  {
    id: 'runtime-handling',
    label: 'Category 6: Runtime Error and Edge Case Handling',
    summaryMetricLabel: 'Unexpected runtime failures',
    unit: 'issues',
  },
  {
    id: 'accessibility',
    label: 'Category 7: Accessibility Compliance',
    summaryMetricLabel: 'Critical or serious accessibility violations',
    unit: 'violations',
  },
]);

export const CATEGORY_IDS = CATEGORY_DEFINITIONS.map((category) => category.id);

export const ROOT_CAUSES = Object.freeze({
  'type-safety': {
    title: 'Unsafe typing clustered in route handlers and core document screens.',
    baselineProblem:
      'The codebase already had strict mode enabled, but core routes and document screens repeatedly bypassed it with `any`, `as`, and non-null assertions in the hottest trust-boundary paths.',
    whyFixWorks:
      'The fixes replace local type escapes with typed query helpers, explicit guards, and constrained payload shaping, which removes the unsafe assumptions at the call sites instead of leaving them in place and adding more checks around them.',
  },
  'bundle-size': {
    title: 'The initial route pulled editor-heavy code into the first paint path.',
    baselineProblem:
      'Top-level pages and devtools were imported eagerly, so the initial entry chunk absorbed the editor, collaboration, and route code even when the user only loaded login or docs navigation.',
    whyFixWorks:
      'Route-level lazy loading and deferred devtools move that code behind navigation boundaries, so the browser stops downloading and parsing those modules until the user actually enters those screens.',
  },
  'api-response': {
    title: 'High-volume list endpoints paid unnecessary session-write and serialization costs on every request.',
    baselineProblem:
      'Authenticated list requests repeatedly refreshed session activity in the database and rebuilt identical response payloads, which compounded under concurrency and inflated tail latency on `/api/documents` and `/api/issues`.',
    whyFixWorks:
      'The middleware now throttles session persistence, and the routes reuse cached serialized list responses for stable result sets, so the hot paths stop doing duplicate writes and duplicate JSON work on every request.',
  },
  'db-efficiency': {
    title: 'The sprint board route split access checks and issue loading into extra round trips.',
    baselineProblem:
      'GET `/api/weeks/:id/issues` performed separate queries for sprint access, project resolution, and issue retrieval, including an avoidable admin lookup branch, so each page load paid for redundant SQL work.',
    whyFixWorks:
      'The route now folds the accessibility check and issue query into fewer statements and removes the extra admin lookup, so the route does less database work rather than masking the added latency higher in the stack.',
  },
  'test-quality': {
    title: 'Important regressions existed in unstable or missing coverage paths.',
    baselineProblem:
      'The web suite had known failures, the stale-data flow was flaky, and collaboration/editor regressions were not pinned down by deterministic focused coverage.',
    whyFixWorks:
      'The fixes stabilize the brittle flows and add targeted regression coverage for the exact stale-data, collaboration, and document entry behaviors that were previously failing or under-specified.',
  },
  'runtime-handling': {
    title: 'Users hit noisy auth bootstrap failures and blocking UI behavior during direct document entry.',
    baselineProblem:
      'The login bootstrap hit the wrong runtime origin in some environments, and the action-items modal could auto-open on top of direct document routes, breaking the editor before the user could interact with it.',
    whyFixWorks:
      'The runtime now derives the correct API origin, treats expected unauthenticated responses as non-fatal on public pages, and suppresses the blocking modal on direct document entry, which removes the bad state instead of hiding the symptoms.',
  },
  accessibility: {
    title: 'The docs tree and my-week styling violated structural and contrast expectations.',
    baselineProblem:
      'Overflow controls were rendered inside tree widgets and the my-week view used low-contrast combinations for current and future states, leading to concrete axe and contrast failures.',
    whyFixWorks:
      'The overflow controls are now outside the tree semantics boundary, and the my-week colors were rebalanced for current and future states, so the DOM and color tokens match the accessibility rules directly.',
  },
});

export const DEFAULT_RUN_TIMEOUT_MS = 12 * 60 * 1000;
