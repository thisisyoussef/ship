# Phase 2 Improvement Documentation (7 Categories)

This document normalizes Phase 2 evidence into the requested structure for each category:
1) before measurement, 2) root cause, 3) fix description, 4) after measurement, and 5) proof of reproducibility.

## Category 1: Type Safety

- **Before measurement:** AST audit baseline was **1291 total** violations (`any`: 271, `as`: 691, non-null assertions: 329, ts-ignore: 1). Grep baseline captured the noisy legacy total of 2962 as a historical comparison point.
- **Root cause:** Type escapes (`any`, `as`, `!`) were compensating for repeated auth context narrowing, UUID string handling, route-param parsing, and untyped SQL row/PG scalar decoding in high-density route modules.
- **Description of fix:** Added shared typed route helpers (auth context guard, branded UUID IDs, PG parsing helpers) and removed local assertion escapes in high-violation routes (`weeks`, `projects`, `issues`) by introducing schema-validated inputs and explicit query row types.
- **After measurement:** Final AST audit total is **902**, a **30.13% reduction** (389 removed) from the 1291 baseline; this exceeds the required reduction threshold.
- **Proof of reproducibility:** Baseline and after states were produced from the same scan methodology recorded in Phase 2 notes (grep command set + AST audit), with explicit before/after totals and per-file reduction logs.

## Category 2: Bundle Size

- **Before measurement:** Web bundle baseline from `pnpm --filter @ship/web exec vite build --sourcemap` was **10,539.29 KB total**, with a **2,025.10 KB main chunk** (gzip 587.62 KB) across 262 chunks.
- **Root cause:** Route-level code splitting was missing in `web/src/main.tsx`, so editor-heavy dependencies (TipTap/ProseMirror/Yjs/highlight stack) were pulled into the initial graph.
- **Description of fix:** Removed a verified unused dependency, converted top-level pages to `React.lazy()` chunks, wrapped route tree in `Suspense`, and lazy-loaded React Query devtools in development.
- **After measurement:** Main entry chunk dropped to **287.05 KB** (gzip 91.71 KB), an **85.83% reduction**; total bundle became 10,622.89 KB due to chunk/sourcemap redistribution.
- **Proof of reproducibility:** Reproduced with the same Vite build command plus chunk listing command; before/after chunk tables and threshold verdict are documented in Phase 2 notes.

## Category 3: API Response Time

- **Before measurement:** Reproduced local baseline P95 at concurrency 50: `/api/documents` 980 ms, `/api/issues` 402 ms, `/api/documents/:id` 300 ms, `/api/weeks/:id/issues` 219 ms, `/api/search/learnings` 250 ms.
- **Root cause:** Dominant bottleneck was app-layer work, not DB plan cost: per-request session `last_activity` writes, repeated large-list serialization, and concurrent recompute contention.
- **Description of fix:** Throttled session activity updates, added short-TTL serialized list-response caching with in-flight coalescing, cached documents/issues list endpoints, and added workspace-scoped cache invalidation on successful mutations.
- **After measurement:** P95 at concurrency 50 improved to `/api/documents` 136 ms (86.1%), `/api/issues` 191 ms (52.5%), `/api/documents/:id` 244 ms (18.7%), `/api/weeks/:id/issues` 67 ms (69.4%), `/api/search/learnings` 63 ms (74.8%).
- **Proof of reproducibility:** Recorded `ab` artifacts and parsed summaries (`/tmp/ship-bench/after-good/raw`, `/tmp/ship-bench/after-good/summary.tsv`) and validated API type-check/tests.

## Category 4: Database Query Efficiency

- **Before measurement:** Reproduced flow-level query counts confirmed baseline shapes; target flow `GET /api/weeks/:id/issues` executed **5 queries**.
- **Root cause:** The sprint-board flow issued extra verification/lookup queries that could be consolidated; N+1 was not the primary issue, but avoidable multi-query route composition was.
- **Description of fix:** Collapsed the sprint-board route query sequence by combining verification and issue retrieval logic into fewer round trips while preserving existing response behavior.
- **After measurement:** Target flow reduced from **5 → 3 queries** (**40% reduction**), meeting Option A for this category.
- **Proof of reproducibility:** Before/after query logs and paired `EXPLAIN ANALYZE` outputs for old and combined queries are recorded in Phase 2 notes, with API test and type-check verification.

## Category 5: Test Coverage

- **Before measurement:** Baseline state before fixes: web tests had **133 passed / 13 failed**; E2E had **853 passed / 1 failed / 11 flaky / 4 not run** (with local API DB-env mismatch noted).
- **Root cause:** Failures came from stale assertions after product evolution, one real route-tab regression (`sprints` URL normalization), and one flaky state-leak pattern in my-week persistence assertions.
- **Description of fix:** Updated stale unit/E2E assertions to current behavior, fixed tab-routing normalization regression, stabilized flaky my-week test with isolated week numbers + API polling, and added critical-path regression tests (document create+readback and collaboration recovery/concurrency).
- **After measurement:** Final verification runs show API **452 passed**, web **153 passed**, and all targeted category E2E suites passing (`drag-handle` 3/3, `program-mode-week-ux` 5/5, `my-week-stale-data` 10/10, `collaboration-regression` 2/2).
- **Proof of reproducibility:** Command-by-command targeted reruns (including repeat-each stress runs) are listed in Phase 2 notes with explicit pass counts.

## Category 6: Runtime Error Handling

- **Before measurement:** Three reproduced user-facing runtime issues: (1) auth-session console noise via wrong proxy target path, (2) auto-opened action-items modal blocking immediate editor interaction, (3) error boundary fallback missing an explicit reload recovery path.
- **Root cause:** Inconsistent API path usage in session-timeout hook, modal auto-open policy not route-aware for document pages, and incomplete fallback UX in shared error boundary.
- **Description of fix:** Updated session-timeout calls to use consistent API base behavior, introduced route-aware action-items modal policy (skip/close auto-opened modal on document detail entry), and added `Reload Page` action to shared ErrorBoundary fallback.
- **After measurement:** Web test validation passed (`18 files / 161 tests`), plus targeted runtime-error suites passed (`3 files / 42 tests`), and documented reproduced scenarios now resolve with expected behavior.
- **Proof of reproducibility:** Each issue includes explicit reproduction steps, before/after behavior narrative, touched files, and verification commands in Phase 2 notes.

## Category 7: Accessibility

- **Before measurement:** Reproduced baseline violations: `/docs` and `/documents/:id` had `aria-required-children` + `listitem`; `/my-week` had `color-contrast` failures.
- **Root cause:** Invalid tree semantics from overflow links placed inside `role="tree"` containers, plus low-contrast text/background combinations and opacity usage on My Week UI.
- **Description of fix:** Moved overflow links outside tree roots, adjusted My Week contrast classes (badge/text/row opacity), and added focused accessibility regression tests.
- **After measurement:** Category validation passes and confirms fixed tree semantics and contrast regressions; targeted accessibility Playwright suite passes (3/3).
- **Proof of reproducibility:** Baseline issue list, diagnosis, code changes, and focused test command outputs are all captured in Phase 2 notes.
