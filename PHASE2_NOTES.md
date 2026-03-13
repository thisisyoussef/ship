# Phase 2 Notes

All seven Phase 2 improvement tracks are merged on `codex/phase2-full-merge`.

- Baseline numbers come from `docs/g4/audit-report.md` and the checked-in audit data under `docs/g4/audit-resources/data/`.
- After-state numbers for Categories 3 and 4 come from the remediation measurements recorded in the merged performance commits because this docs-only follow-up did not rerun load testing.
- After-state numbers for Categories 1, 2, 5, 6, and 7 were rechecked on March 13, 2026 against the merged branch.

## Category 1: Type Safety

### Before measurement

- The audit baseline in `docs/g4/audit-report.md` found `273` explicit `any` types, `691` `as` assertions, `329` non-null assertions, and `1` `@ts-ignore` / `@ts-expect-error`, for `1294` total unsafe constructs.
- Strict mode was already enabled, and package-local strict compiler runs were at `0` errors. The problem was local type-system bypasses, not disabled compiler settings.
- The five densest production files were `api/src/routes/weeks.ts` (`85`), `api/src/routes/projects.ts` (`51`), `api/src/routes/issues.ts` (`49`), `web/src/pages/UnifiedDocumentPage.tsx` (`37`), and `api/src/db/seed.ts` (`35`).

### Explanation of root cause

- Core route handlers were repeatedly overriding request context, UUID params, and query row shapes with local `!`, `as`, and `any` escapes.
- `UnifiedDocumentPage` had to normalize flexible document payloads from the API, but it was doing that with assertions instead of guards.
- Seed and helper code assumed lookups always existed, which hid invariant failures behind non-null assertions.

### Description of fix

- Added `api/src/routes/route-helpers.ts` to centralize typed auth context, branded UUID IDs, and Postgres scalar parsing.
- Reworked `api/src/routes/weeks.ts`, `api/src/routes/projects.ts`, `api/src/routes/issues.ts`, `web/src/pages/UnifiedDocumentPage.tsx`, and `api/src/db/seed.ts` to use Zod parsing, typed query row interfaces, runtime guards, and explicit invariants.
- Tightened `api/src/utils/transformIssueLinks.ts` and its tests so valid TipTap inputs keep their real types without downstream casts.

### After measurement

- A fresh March 13, 2026 AST rerun on the merged branch found `172` explicit `any` types, `547` `as` assertions, `181` non-null assertions, and `1` directive, for `901` total unsafe constructs.
- That is a reduction of `393` unsafe constructs from the audit baseline, or `30.37%`.
- The original hotspot files from the audit now each scan at `0`: `api/src/routes/weeks.ts`, `api/src/routes/projects.ts`, `api/src/routes/issues.ts`, `web/src/pages/UnifiedDocumentPage.tsx`, and `api/src/db/seed.ts`.
- Package-local strict compiler checks still pass for `@ship/shared`, `@ship/api`, and `@ship/web`.

### Proof of reproducibility

- Re-run the strict compiler commands listed in `docs/g4/audit-resources/measurement-commands.md`.
- Re-run the TypeScript AST scan over `web`, `api`, and `shared`, then verify the five original hotspot files above now scan at `0`.
- Relevant merged commits: `ee3ec33`, `8c273e7`, `abf692b`, `9d57f21`, `a607f29`, `4ac80a1`.

## Category 2: Bundle Size

### Before measurement

- The audit baseline in `docs/g4/audit-report.md` recorded a total production bundle size of `10,539.29 KB`.
- The main entry chunk was `2,025.14 KB` raw and `589.52 KB` gzip.
- The build emitted `262` chunks, but the entry graph still front-loaded editor and collaboration code.

### Explanation of root cause

- `web/src/main.tsx` statically imported every top-level route, so document-editing routes pulled the editor stack into the initial entry chunk.
- `web/src/pages/UnifiedDocumentPage.tsx`, `web/src/components/UnifiedEditor.tsx`, and `web/src/components/Editor.tsx` formed a static chain into TipTap, ProseMirror, `yjs`, `y-websocket`, `y-indexeddb`, and syntax-highlighting packages.
- React Query Devtools were still reachable from the production entry graph, and one frontend dependency was confirmed dead weight.

### Description of fix

- Removed the unused `@tanstack/query-sync-storage-persister` dependency from `web/package.json`.
- Converted top-level page imports in `web/src/main.tsx` to `React.lazy()` route chunks and wrapped the route tree in `Suspense`.
- Gated React Query Devtools behind `import.meta.env.DEV` so production no longer ships them in the entry graph.

### After measurement

- A fresh `pnpm --filter @ship/web exec vite build --sourcemap` run on March 13, 2026 produced a total bundle size of `10,653.81 KB`.
- The current main entry chunk is `287.05 KB` raw and `91.68 kB` gzip.
- The build now emits `307` chunks.
- The main entry chunk dropped by `1,738.09 KB`, an `85.83%` reduction from the audit baseline.
- Total emitted size increased by `114.52 KB`, which is the tradeoff from more chunk metadata and sourcemaps. The initial-load target still passed because the entry chunk reduction was the actual bottleneck fix.

### Proof of reproducibility

- Run `pnpm --filter @ship/web exec vite build --sourcemap`.
- Inspect `web/dist/index.html` and verify it references one JS entry and one CSS file with no `modulepreload` links.
- Inspect `web/dist/assets/index-*.js` and confirm the entry chunk is about `287 KB` raw while the large editor-heavy chunks are isolated behind route loads.
- Relevant merged commit: `95eb937`.

## Category 3: API Response Time

### Before measurement

- The audit baseline in `docs/g4/audit-resources/data/api-latency.csv` showed the broad list endpoints as the main latency problem.
- At concurrency `50`, `GET /api/documents` had `P50 612 ms`, `P95 719 ms`, and `P99 744 ms`.
- At concurrency `50`, `GET /api/issues` had `P50 233 ms`, `P95 334 ms`, and `P99 354 ms`.

### Explanation of root cause

- The auth middleware in `api/src/middleware/auth.ts` wrote `last_activity` on every authenticated request, which turned bursty list traffic into hot-row session churn.
- `GET /api/documents` and `GET /api/issues` rebuilt and serialized the same list responses repeatedly even when the filter set and workspace state had not changed.
- The routes had no short-lived in-memory list cache or in-flight dedupe for identical read traffic.

### Description of fix

- Throttled session-row writes in `api/src/middleware/auth.ts` so authenticated reads no longer update the session table on every GET.
- Added `api/src/services/list-response-cache.ts` with a short TTL cache, in-flight dedupe, and write-side invalidation.
- Wired that cache into `api/src/routes/documents.ts` and `api/src/routes/issues.ts`, plus the mutation routes that need invalidation.

### After measurement

- The remediation benchmark recorded in merged commit `a8bf031` reduced `GET /api/documents` from `P95 980 ms` to `P95 136 ms`.
- The remediation benchmark recorded in merged commit `13f0231` reduced `GET /api/issues` from `P95 402 ms` to `P95 191 ms`.
- Those were the two list endpoints the audit identified as the most meaningful API tail-latency targets.

### Proof of reproducibility

- Follow the authenticated benchmark workflow described in `docs/g4/audit-resources/measurement-commands.md` and `docs/g4/audit-report.md`.
- Benchmark `GET /api/documents` and `GET /api/issues` after logging in with the seeded credentials.
- Inspect `api/src/middleware/auth.ts` and `api/src/services/list-response-cache.ts` to confirm the session-write throttle and list-response cache are both present on the merged branch.
- Relevant merged commits: `a8bf031`, `13f0231`.

## Category 4: Database Query Efficiency

### Before measurement

- The audit baseline in `docs/g4/audit-resources/data/db-query-flows.csv` showed `Load sprint board` at `5` SQL statements with a `0.750 ms` slowest query and no N+1 behavior.
- Query count was not globally bad, but the sprint board path was the best candidate for a measurable round-trip reduction.

### Explanation of root cause

- The sprint board path in `api/src/routes/weeks.ts` split sprint-access checks and issue loading into separate trips across the same association-heavy document graph.
- The unified document model was not suffering from classic N+1 behavior here, but the route still paid for redundant queries on a hot week-planning surface.

### Description of fix

- Reworked the sprint board load path in `api/src/routes/weeks.ts` so sprint access and issue fetch logic are combined more tightly.
- Kept list-cache invalidation wired on the same route group so the lower query count does not return stale sprint board data after writes.

### After measurement

- The remediation benchmark recorded in merged commit `1799070` reduced sprint board query count from `5` to `3`.
- That is a `40%` reduction in SQL round trips for the targeted flow, which clears the Phase 2 requirement for a database-efficiency improvement.

### Proof of reproducibility

- Enable PostgreSQL statement and duration logging with the commands in `docs/g4/audit-resources/measurement-commands.md`.
- Exercise the sprint board flow through the real HTTP route, then count the emitted statements in the Postgres logs.
- Inspect `api/src/routes/weeks.ts` to confirm the merged board-loading path is the current implementation.
- Relevant merged commit: `1799070`.

## Category 5: Test Coverage and Quality

### Before measurement

- The audit baseline in `docs/g4/audit-resources/data/test-suite-summary.csv` recorded `1466` discovered tests, with `1397` passed, `16` failed, `6` flaky, and `47` not run.
- The audit also called out missing or weak coverage in the exact areas Ship depends on most: collaboration recovery, concurrent editing, accessibility workflows, and unstable frontend regressions.
- Representative failing or unstable surfaces included `document-tabs`, `DetailsExtension`, `useSessionTimeout`, `drag-handle`, `my-week` stale data, and week-navigation E2E flows.

### Explanation of root cause

- Several frontend tests were coupled to brittle timing or route assumptions.
- Collaboration reconnect/concurrent editing and accessibility checks existed as product risks but not as dedicated regression specs.
- Legacy sprint navigation behavior made week-flow assertions harder to keep deterministic.

### Description of fix

- Stabilized the previously failing frontend regression cluster in `web/src/lib/document-tabs.test.ts`, `web/src/components/editor/DetailsExtension.test.ts`, `web/src/hooks/useSessionTimeout.test.ts`, and `web/src/styles/drag-handle.test.ts`.
- Normalized legacy sprint route behavior in the week flow and made `e2e/my-week-stale-data.spec.ts` deterministic.
- Added dedicated regression specs for collaboration recovery and concurrent editing in `e2e/collaboration-regression.spec.ts`.
- Added dedicated accessibility regression coverage in `e2e/category-7-accessibility.spec.ts`.

### After measurement

- A fresh March 13, 2026 frontend regression rerun completed at `18` passing test files and `161` passing tests with `0` failures in the connected Vitest cluster that includes the stabilized web regressions.
- A fresh March 13, 2026 targeted Playwright rerun completed at `5` passing tests in `31.2s` across `e2e/collaboration-regression.spec.ts` and `e2e/category-7-accessibility.spec.ts`.
- The biggest audit gaps now have explicit regression files instead of being untested risk areas.

### Proof of reproducibility

- Run `pnpm --filter @ship/web test -- src/lib/document-tabs.test.ts src/components/editor/DetailsExtension.test.ts src/hooks/useSessionTimeout.test.ts src/styles/drag-handle.test.ts src/components/ui/ErrorBoundary.test.tsx src/lib/actionItemsModal.test.ts`.
- Run `PLAYWRIGHT_WORKERS=1 pnpm exec playwright test e2e/collaboration-regression.spec.ts e2e/category-7-accessibility.spec.ts --project=chromium`.
- Inspect the new regression files under `e2e/` to confirm collaboration recovery and accessibility now have dedicated coverage.
- Relevant merged commits: `9103ef2`, `58cce7d`, `634c236`, `578e73f`, `ef28ec6`, `95c304a`.

## Category 6: Runtime Error Handling

### Before measurement

- The runtime audit baseline in `docs/g4/audit-resources/data/runtime-summary.csv` recorded `2` repeated console errors per sampled page and `2` silent or confusing failures.
- The most obvious issues were repeated `GET /api/auth/session` console noise, an action-items modal that could block direct editor entry, and a shared error-boundary fallback that only offered `Try Again`.

### Explanation of root cause

- `web/src/hooks/useSessionTimeout.ts` fetched `/api/auth/session` with a relative URL, which hit the wrong proxy target inside the Dockerized web container.
- `ActionItemsModal` auto-opened globally from `web/src/pages/App.tsx`, even when the user landed directly on a document detail route where the editor should be immediately usable.
- `web/src/components/ui/ErrorBoundary.tsx` did catch render failures, but the default fallback had no reload affordance.

### Description of fix

- Updated `web/src/hooks/useSessionTimeout.ts` to derive the session endpoint from `VITE_API_URL` and degrade cleanly when bootstrap info is unavailable.
- Added `web/src/lib/actionItemsModal.ts` and changed `web/src/pages/App.tsx` so auto-opened accountability prompts do not block direct entry into `/documents/:id`.
- Expanded the default `ErrorBoundary` fallback to include both `Reload Page` and `Try Again`.

### After measurement

- A fresh March 13, 2026 rerun of the targeted runtime regression files passed `42` tests: `36` in `useSessionTimeout.test.ts`, `4` in `actionItemsModal.test.ts`, and `2` in `ErrorBoundary.test.tsx`.
- The merged code now prevents document-detail auto-open for the accountability modal and exposes both reload and retry recovery paths in the shared error boundary.
- The session-timeout bootstrap path no longer depends on the broken relative `/api/auth/session` proxy behavior.

### Proof of reproducibility

- Run `pnpm --filter @ship/web test -- src/hooks/useSessionTimeout.test.ts src/lib/actionItemsModal.test.ts src/components/ui/ErrorBoundary.test.tsx`.
- Start the local app, sign in, and verify there is no repeated `/api/auth/session` proxy noise and no auto-opened action-items modal blocking direct document entry.
- Relevant merged commits: `965d164`, `6e3c8f9`, `a294550`.

## Category 7: Accessibility Compliance

### Before measurement

- The audit baseline in `docs/g4/audit-report.md` recorded `2` critical and `20` serious axe violations across the four audited pages.
- `/docs` and `/documents/:id` had broken tree/list semantics, and `/my-week` had `18` serious contrast failures.
- Lighthouse accessibility scores were all `100`, which made the axe findings the real accessibility signal.

### Explanation of root cause

- The document-tree sidebar in `web/src/pages/App.tsx` rendered overflow links as invalid children under `role="tree"`, which triggered `aria-required-children` and `listitem` failures.
- `web/src/pages/MyWeekPage.tsx` used muted visual tokens for chips and timeline labels that fell below WCAG 2.1 AA contrast thresholds.
- The repo had audit artifacts, but it did not yet have a focused Playwright regression spec to keep those issues from coming back.

### Description of fix

- Updated the tree markup in `web/src/pages/App.tsx` so the audited document trees contain only valid `treeitem` children.
- Adjusted the contrast-sensitive labels and chips in `web/src/pages/MyWeekPage.tsx`.
- Added `scripts/axe-scan.js`, checked-in before/after audit artifacts under `audit/`, and the dedicated regression file `e2e/category-7-accessibility.spec.ts`.

### After measurement

- The checked-in `audit/axe-after.txt` report shows `0` critical and `0` serious violations on `/docs`, `/issues`, `/my-week`, and `/documents/:id`.
- A fresh March 13, 2026 Playwright rerun passed all `3` tests in `e2e/category-7-accessibility.spec.ts`.
- The after-state now matches what the audit expected: the originally failing semantic and contrast issues are gone, and they are covered by a dedicated regression spec.

### Proof of reproducibility

- Run `node scripts/axe-scan.js after` against the local app and inspect `audit/axe-after.json` or `audit/axe-after.txt`.
- Run `PLAYWRIGHT_WORKERS=1 pnpm exec playwright test e2e/category-7-accessibility.spec.ts --project=chromium`.
- Relevant merged commits: `d1f2cf9`, `95c304a`.
