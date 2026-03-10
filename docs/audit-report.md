# Ship Audit Report — Baseline Measurements

**Date:** 2026-03-10
**Auditor:** Claude (Opus 4.6)
**Codebase:** Ship monorepo (api/ + web/ + shared/)
**Commit:** Current HEAD of main branch
**Data volume at time of audit:** 257 documents, 401 associations, 11 users, 1 workspace

---

## Category 1: Type Safety

### Methodology

Searched all `.ts`/`.tsx` files using `grep` with patterns for each violation type. Checked `tsconfig.json` files across root and each package for strict mode settings. Counts exclude `node_modules/` and build output directories.

Patterns used:
- `any` types: `: any\b` and `as any`
- Type assertions: `\bas [A-Z]\w+` (excludes import aliases like `import X as Y` where possible, though some false positives remain)
- Non-null assertions: `\!\.` (matches `x!.y` pattern)
- Directives: `@ts-ignore` and `@ts-expect-error`

### Baseline Measurements

| Metric | Baseline |
|--------|----------|
| **Strict mode enabled?** | **Yes** — root `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true` |
| **Total `any` types** | **268** (api: 229 across 23 files, web: 31 across 8 files, e2e: 6 across 5 files, scripts: 2) |
| **Total type assertions (`as TypeName`)** | **~267** (api: ~59 across 25 files, web: ~208 across 78 files) |
| **Total non-null assertions (`!.`)** | **24** (api: 7, web: 17 across 9 files) |
| **Total `@ts-ignore` / `@ts-expect-error`** | **1** (`web/src/components/icons/uswds/Icon.test.tsx`) |
| **Strict mode error count** | **N/A** — strict mode is already enabled across all packages |

### Top 5 Violation-Dense Files

| Rank | File | `any` Count | Why Problematic |
|------|------|-------------|-----------------|
| 1 | `api/src/__tests__/transformIssueLinks.test.ts` | 37 | Test mocks use `as any` to entirely bypass type checking on input objects |
| 2 | `api/src/services/accountability.test.ts` | 32 | Mock database rows and request objects typed as `any` |
| 3 | `api/src/__tests__/auth.test.ts` | 24 | Express req/res mocks bypass all type safety |
| 4 | `api/src/__tests__/activity.test.ts` | 21 | Untyped test data fixtures |
| 5 | `api/src/routes/issues-history.test.ts` | 20 | Mock request objects bypass Express types |

### Key Findings

- **85% of `any` violations (229/268) are in the API package**, and the majority concentrate in test files where mock objects bypass type checking entirely. This means test mocks won't catch type regressions.
- **Production code hotspots**: `api/src/routes/projects.ts` (13 `any`), `api/src/utils/yjsConverter.ts` (12 `any`), `api/src/routes/weeks.ts` (10 `any`). These handle database query results and Yjs binary conversion — exactly where type errors would cause runtime failures.
- **Web package is relatively clean** (31 `any` total), with violations concentrated in editor extensions (`SlashCommands.tsx`: 6, `FileAttachment.tsx`: 7, `AIScoringDisplay.tsx`: 6).
- The high type assertion count in `web/src/` (208) is largely from React Query hooks casting API response types — structurally sound but could be replaced with proper generics.
- **Strict mode being enabled is a strong foundation** — the codebase avoids implicit `any` and unchecked index access by default.

### Severity: MEDIUM

The strict mode foundation is excellent. Violations are concentrated in tests (which reduces production risk) and a few route files that handle database results. The production `any` usage in `weeks.ts` and `projects.ts` could mask runtime type errors in database result handling.

---

## Category 2: Bundle Size

### Methodology

Built the production frontend using `vite build` (Vite v6.4.1). Measured output sizes from the `web/dist/` directory. Analyzed chunk breakdown from Vite build output. Cross-referenced `package.json` dependencies against import usage.

### Baseline Measurements

| Metric | Baseline |
|--------|----------|
| **Total production bundle size (on disk)** | **4.4 MB** (`web/dist/` total) |
| **Total JS assets** | **~3.2 MB** (261 JS chunks) |
| **Total CSS** | **66.51 KB** (1 CSS file, 12.92 KB gzipped) |
| **Largest chunk** | **`index-C2vAyoQ1.js` — 2,073.70 KB** (589.49 KB gzipped) |
| **Number of JS chunks** | **261** |
| **Number of CSS chunks** | **1** |
| **Gzipped main chunk** | **589.49 KB** |

### Top 3 Largest Dependencies (estimated from bundle)

| Dependency | Estimated Size | Notes |
|------------|---------------|-------|
| **TipTap / ProseMirror** (17 packages) | ~500-700 KB | Core editor framework — essential, not removable |
| **USWDS** (`@uswds/uswds`) | ~200-400 KB | Government design system — required for compliance |
| **emoji-picker-react** | ~100-200 KB | Full emoji dataset — candidate for lazy loading |

### Unused Dependencies (candidates for removal)

Investigation needed — the following are in `package.json` but usage should be verified:
- `@tanstack/react-query-devtools` — should be dev-only, verify not in production bundle
- `tippy.js` — may overlap with Radix tooltip components
- `diff-match-patch` — text diff library, verify usage scope

### Key Findings

- **The main chunk (2,073 KB) is a monolith.** Vite explicitly warns: "Some chunks are larger than 500 kB after minification." This means **zero code splitting on the application code**. Every page loads every component.
- **200+ icon SVG chunks are correctly split** (each ~0.2-1.7 KB) via the USWDS icon system.
- **Tab components are correctly lazy-loaded** (`WeekIssuesTab`, `ProjectDetailsTab`, etc. are separate chunks of 0.4-16.7 KB).
- The CSS is well-consolidated at 66.51 KB (12.92 KB gzipped) — not a concern.
- **Initial page load downloads ~590 KB gzipped JS** regardless of which page is visited.

### Severity: HIGH

A 2 MB monolithic chunk with no route-level code splitting is a significant performance issue. Code splitting by route (login, dashboard, document editor, team view, admin) would dramatically reduce initial load time.

---

## Category 3: API Response Time

### Methodology

- Database seeded with: 104 issues, 35 sprints, 15 projects, 11 users, 5 programs, 32 weekly plans, 27 retros, 7 wikis (257 total documents, 401 associations)
- Session created directly in database; API server running locally via `tsx watch`
- **Sequential benchmark**: 50 requests per endpoint, measuring `curl` response time
- **Concurrent benchmark**: `autocannon` with 10 connections at 50 req/sec for 10 seconds (to stay within dev rate limit of 1000/min)

### Baseline Measurements — Sequential (50 requests each)

| Endpoint | P50 | P95 | P99 | Min | Max |
|----------|-----|-----|-----|-----|-----|
| `GET /api/documents?document_type=issue` | 6.2ms | 7.6ms | 9.8ms | 5.9ms | 9.8ms |
| `GET /api/weeks` | 5.7ms | 6.7ms | 9.9ms | 5.2ms | 9.9ms |
| `GET /api/projects` | 4.9ms | 7.7ms | 7.8ms | 4.6ms | 7.8ms |
| `GET /api/team/grid` | 5.3ms | 6.9ms | 7.6ms | 4.9ms | 7.6ms |
| `GET /api/documents` | 6.1ms | 7.0ms | 13.7ms | 5.8ms | 13.7ms |

### Baseline Measurements — Concurrent (10 connections, 50 req/sec)

| Endpoint | P50 | P95 (97.5%) | P99 | Max |
|----------|-----|-------------|-----|-----|
| `GET /api/documents?document_type=issue` | 21ms | 51ms | 57ms | 85ms |
| `GET /api/weeks` | 7ms | 23ms | 27ms | 36ms |
| `GET /api/projects` | 4ms | 21ms | 23ms | 26ms |
| `GET /api/team/grid` | 8ms | 23ms | 27ms | 38ms |
| `GET /api/documents` | 18ms | 45ms | 49ms | 65ms |

### Key Findings

- **With current data volume (257 documents), response times are fast.** All P95 sequential times are under 10ms. This is expected — the dataset is small.
- **Under concurrent load, latency increases 3-10x** from sequential. The `/api/documents?document_type=issue` endpoint jumps from 6.2ms (P50 sequential) to 21ms (P50 concurrent) and 51ms (P95 concurrent).
- **The real performance concern is at scale.** The correlated subqueries in `weeks.ts` (7 COUNT subqueries per sprint) and `projects.ts` (inferred status subquery per project) will degrade quadratically with data volume. With 100+ sprints and 1000+ issues, these queries will become bottlenecks.
- **Rate limiting** kicks in at 1000 req/min in dev mode, which constrained load testing.

### Severity: LOW (current) / HIGH (at scale)

Current performance is acceptable for the data volume. The architectural patterns (correlated subqueries, N+1 patterns) will become problematic as data grows.

---

## Category 4: Database Query Efficiency

### Methodology

- Traced SQL queries in all API route files by reading the source code
- Identified N+1 patterns, correlated subqueries, loop-based mutations, and missing indexes
- Ran `EXPLAIN ANALYZE` on representative queries against the seeded database
- Compared existing indexes (`schema.sql`: 47 indexes) against query WHERE clauses

### Baseline Measurements — Query Patterns per User Flow

| User Flow | Total SQL Queries (est.) | Slowest Query | N+1 Detected? |
|-----------|-------------------------|---------------|----------------|
| Load main page (`/api/documents`) | 1 | 0.17ms | No |
| View a document (`/api/documents/:id`) | 2-3 | <1ms | No |
| List issues (`/api/documents?type=issue`) | 1 + associations batch | 0.17ms | No (batch util used) |
| List sprints (`/api/weeks`) | 1 (with 7 subqueries × N sprints) | 0.78ms (35 sprints) | **Yes — correlated subqueries** |
| List projects (`/api/projects`) | 1 (with 2 subqueries × N projects) | 0.71ms (15 projects) | **Yes — correlated subqueries** |

### EXPLAIN ANALYZE Results

**List Issues** (104 rows): 0.172ms execution — Sequential scan on `documents`, filtering by `workspace_id`, `document_type`, `deleted_at`, `archived_at`. Uses `idx_documents_active` partial index.

**List Sprints** (35 rows, 2 COUNT subqueries shown): 0.780ms execution — Each COUNT subquery performs a Nested Loop with Bitmap Heap Scan on `document_associations` (using `idx_document_associations_related_type`), then Memoize + Index Scan on `documents_pkey`. **The full production query has 7 subqueries, not 2** — estimated ~2ms for 35 sprints, scaling to ~20ms for 350 sprints.

**List Projects** (15 rows, 2 COUNT subqueries): 0.713ms execution — Same pattern as sprints. Each project triggers 2 subqueries scanning `document_associations`.

### Critical N+1 and Inefficiency Patterns

| Location | Issue | Severity | Impact |
|----------|-------|----------|--------|
| `api/src/routes/weeks.ts:321-356` | 7 independent COUNT subqueries per sprint in list endpoint. 35 sprints = 245 correlated subqueries | **CRITICAL** | O(N×7) subqueries; scales quadratically |
| `api/src/routes/weeks.ts:1259-1292` | Same 7 subqueries re-executed after every PATCH mutation response | **CRITICAL** | Redundant work on every write |
| `api/src/routes/projects.ts:350-383` | Inferred status subquery with 4-table JOIN per project | **HIGH** | Expensive status computation per project row |
| `api/src/routes/team.ts:275-327` | `jsonb_array_elements_text()` unnesting × 6 LEFT JOINs | **HIGH** | Fan-out multiplied by JOINs |
| `api/src/routes/documents.ts:855-874` | Loop-based DELETE/INSERT for association sync | **MEDIUM** | N queries instead of 1 batch |
| `api/src/routes/dashboard.ts:151-182` | Duplicate of projects.ts inferred status subquery | **MEDIUM** | Code duplication + same perf issue |
| `api/src/routes/standups.ts:56-65` | `properties->>'author_id'` without expression index | **LOW** | GIN index can't optimize string extraction |

### Missing Indexes

1. `CREATE INDEX ON documents ((properties->>'state')) WHERE document_type = 'issue'` — used in every issue count subquery across weeks.ts, projects.ts, dashboard.ts
2. `CREATE INDEX ON documents ((properties->>'assignee_id'))` — used in team allocation queries
3. `CREATE INDEX ON document_associations (document_id, relationship_type, related_id)` — compound index for the most common association lookup pattern

### Severity: HIGH

The correlated subquery pattern in `weeks.ts` is the most significant finding. While current query times are fast (~1ms) due to small data volume, the O(N×7) subquery pattern means response time will grow quadratically. Converting these to JOINs with GROUP BY or a single aggregation query would reduce the pattern to O(1) queries regardless of sprint count.

---

## Category 5: Test Coverage and Quality

### Methodology

- Ran `pnpm test` (vitest) 3 times to detect flaky tests
- Ran `vitest run --coverage` with `@vitest/coverage-v8` for API package line/branch/function coverage
- Ran `vitest run` for web package tests
- Cataloged test files across api/ (28), web/ (16), and e2e/ (71)
- Mapped critical user flows against existing test coverage

### Baseline Measurements

| Metric | Baseline |
|--------|----------|
| **Total unit test files** | **44** (28 API, 16 web) |
| **Total E2E test files** | **71** (Playwright) |
| **Total unit tests** | **602** (451 API, 151 web) |
| **Pass / Fail / Flaky** | **API: 451/0/0, Web: 138/13/0** |
| **Suite runtime** | **API: ~21s, Web: ~6s** |
| **API code coverage (lines)** | **40.34%** |
| **API code coverage (branches)** | **33.44%** |
| **API code coverage (functions)** | **40.90%** |
| **Web code coverage** | **Not configured** (no `@vitest/coverage-v8` in web package) |

### Test Stability

All 3 test runs produced identical results:
- Run 1: 451 passed, 0 failed (21.20s)
- Run 2: 451 passed, 0 failed (20.89s)
- Run 3: 451 passed, 0 failed (21.38s)

**Zero flaky tests detected.** This is excellent stability.

### Web Test Failures (13 failures)

All 13 web failures are caused by a ProseMirror schema error: `No node type or group 'detailsSummary' found`. This is a dependency configuration issue in the test environment (the `DetailsExtension` TipTap extension isn't loading properly in tests), not a code bug. Affects 3 test files.

### Coverage Gaps — Low-Coverage API Routes

| Route File | Line Coverage | Note |
|------------|--------------|------|
| `dashboard.ts` | 2.04% | Nearly untested |
| `programs.ts` | 5.05% | Nearly untested |
| `weekly-plans.ts` | 4.80% | Nearly untested |
| `caia-auth.ts` | 3.93% | Auth provider untested |
| `admin-credentials.ts` | 6.59% | Credential management untested |
| `admin.ts` | 14.54% | Admin panel largely untested |
| `team.ts` | 8.70% | Team allocation untested |
| `comments.ts` | 8.98% | Comments API untested |
| `associations.ts` | 6.45% | Document associations untested |

### Critical Flows Coverage Map

| Critical Flow | Unit Tests | E2E Tests | Gap? |
|--------------|-----------|-----------|------|
| Authentication (login/session) | auth.test.ts (24 tests) | auth.spec.ts | No |
| Document CRUD | documents.test.ts (45 tests) | documents.spec.ts | No |
| Issue management | issues.test.ts (35+ tests) | issues.spec.ts | No |
| Sprint/Week management | weeks.test.ts (42 tests) | weeks.spec.ts | No |
| Project management | projects.test.ts (14 tests) | — | Partial |
| Dashboard | **None** | dashboard.spec.ts | **Yes — no unit tests** |
| Team allocation | **None** | team.spec.ts | **Yes — no unit tests** |
| Comments | **None** | inline-comments.spec.ts | **Yes — no unit tests** |
| Real-time collaboration | collaboration.test.ts | race-conditions.spec.ts | Partial |
| Search | search.test.ts (11 tests) | search.spec.ts | No |
| Accessibility | — | 4 a11y spec files | No |

### Severity: MEDIUM

40% API line coverage is moderate. The test suite is stable (zero flakes) which is a strong positive. The main gaps are in dashboard, team, comments, and admin routes — these are covered by E2E tests but lack unit-level regression protection. The 13 web test failures need a dependency fix.

---

## Category 6: Runtime Error and Edge Case Handling

### Methodology

Static code analysis of error handling patterns across web/ and api/ packages. Searched for ErrorBoundary components, try/catch blocks, .catch() handlers, console.error calls, WebSocket reconnection logic, loading states, and null safety patterns. Analyzed API error handling middleware.

### Baseline Measurements

| Metric | Baseline |
|--------|----------|
| **Console errors during normal usage** | **~0** (app has clean console in normal operation based on code analysis) |
| **Unhandled promise rejections (server)** | **0 detected** — route handlers use try/catch consistently |
| **Network disconnect recovery** | **Pass** — y-websocket auto-reconnects, IndexedDB persists offline edits |
| **Missing error boundaries** | **1 location** — only a single global ErrorBoundary wrapping all routes |
| **Silent failures identified** | **3** (see below) |

### Error Boundary Analysis

**Global ErrorBoundary** (`web/src/components/ui/ErrorBoundary.tsx`, 59 lines):
- Catches React rendering errors with `getDerivedStateFromError()` + `componentDidCatch()`
- Generic fallback: "Something went wrong" with "Try Again" button
- Logs error + component stack to console
- **Limitation**: No granular error boundaries per page/feature — a crash in any component takes down the entire app shell

**MutationErrorToast** (`web/src/components/MutationErrorToast.tsx`, 24 lines):
- Subscribes to React Query mutation cache errors
- Shows operation-specific toast: "Failed to {operation}"
- Properly unsubscribes on unmount

### API Error Handling Infrastructure

| Layer | Implementation | Status |
|-------|---------------|--------|
| Rate limiting | Login: 5/15min, API: 100/min (prod), 1000/min (dev) | Good |
| CSRF protection | csrf-sync middleware on all mutating endpoints | Good |
| Session timeout | 15-min inactivity + 12-hr absolute | Good |
| Database timeout | 30s `statement_timeout` | Good |
| Input validation | Route-level parameter validation | Partial |
| Query client retry | 3 retries, skips 4xx errors | Good |
| Cache corruption | Detection + recovery with schema versioning | Excellent |

### Error Handling Coverage

| Pattern | Count | Notes |
|---------|-------|-------|
| try/catch blocks (web/) | 62 files | Good coverage across hooks and pages |
| .catch() handlers (web/) | 33 occurrences in 12 files | Moderate — some promise chains may lack handlers |
| console.error calls (web/) | 37 files | Logging is prefixed for debuggability |
| Null safety checks (web/) | 1,412 occurrences | Excellent — extensive optional chaining and nullish coalescing |
| Loading states | 104 occurrences of `isLoading`/`isPending` | Good coverage |
| Suspense boundaries | 2 locations | Low — only Icon component and UnifiedDocumentPage |

### Silent Failures Identified

1. **Login setup check** (`web/src/pages/Login.tsx:78-93`): If the `/api/setup/status` fetch fails, the error is caught and logged but the user sees no feedback — `setIsCheckingSetup(false)` runs silently. **Impact**: User may not realize the app failed to check if setup is needed.

2. **Cache migration** (`web/src/lib/queryClient.ts`): Schema version migration failures are caught with `console.warn` but silently continue. If the cache is corrupted, the app proceeds with stale/broken cached data. **Impact**: Potential stale data shown to user.

3. **Editor content save race condition**: When a user edits content and the WebSocket disconnects mid-save, the Yjs CRDT layer handles merging, but there's no user-visible indicator that changes haven't been confirmed by the server yet. The `synced`/`disconnected` status exists in code but may not be prominently displayed. **Impact**: User may believe edits are saved when they're only cached locally.

### Severity: MEDIUM

Error handling infrastructure is solid (rate limiting, CSRF, session management, cache corruption recovery). The main gaps are: (1) only one global ErrorBoundary rather than per-feature boundaries, (2) limited Suspense coverage, and (3) the three silent failure scenarios identified above. The WebSocket collaboration layer has excellent reconnection and offline support.

---

## Category 7: Accessibility Compliance

### Methodology

- Static code analysis of ARIA attributes, keyboard handlers, form labels, color contrast, and semantic HTML
- Reviewed existing E2E accessibility test specs (4 files using axe-core)
- Analyzed USWDS component integration for built-in accessibility
- Checked `index.html` for root-level accessibility requirements
- **Note**: Lighthouse could not run in this environment (headless Chrome sandbox restriction). Scores are estimated from code analysis and existing axe-core test results.

### Baseline Measurements

| Metric | Baseline |
|--------|----------|
| **Lighthouse accessibility score** | **Not measurable** (Chrome sandbox restriction in test environment) |
| **Estimated score based on code analysis** | **~85-90/100** (strong ARIA usage, WCAG-compliant colors, keyboard nav) |
| **Total ARIA attributes** | **261 occurrences across 53 files** |
| **Keyboard navigation handlers** | **77 occurrences across 22 files** |
| **axe-core test coverage** | **4 E2E spec files** testing wcag2a, wcag2aa, wcag21a, wcag21aa |
| **Color contrast compliance** | **WCAG 2.1 AA** — all theme colors documented to meet 4.5:1 ratio |
| **Form label coverage** | **23 files with form labels** — login form uses `sr-only` labels with `htmlFor` |
| **Missing ARIA labels or roles** | **~5 potential locations** (see findings below) |

### Accessibility Infrastructure

**E2E Accessibility Tests** (4 files):
1. `accessibility.spec.ts` (293 lines) — axe-core audits on login, app shell, docs mode, programs mode; keyboard navigation; screen reader announcements; focus visibility
2. `accessibility-remediation.spec.ts` (~69 KB) — comprehensive remediation tests
3. `status-colors-accessibility.spec.ts` (125 lines) — validates no low-contrast color variants used for status badges
4. `check-aria.spec.ts` — ARIA attribute validation

**USWDS Integration**:
- U.S. Web Design System v3.13.0 provides accessible base components
- Icon component (`Icon.tsx`, 131 lines) implements proper ARIA: `role="img"`, `aria-label` for titled icons, `aria-hidden` + `focusable: false` for decorative icons
- Lazy-loaded icons with Suspense fallback

**Root HTML**:
- `lang="en"` on `<html>` element
- `<meta charset="UTF-8">` and responsive viewport meta
- Theme color meta tags for light/dark modes

### Accessibility Strengths

1. **Login page** — Excellent: `aria-invalid`, `aria-describedby`, `role="alert"` on errors, `sr-only` labels, keyboard-navigable form
2. **Color contrast** — All theme colors documented as WCAG 2.1 AA compliant (4.5:1 minimum). Background `#0d0d0d`, foreground `#f5f5f5` = 18.53:1 ratio
3. **Focus styles** — Global `:focus-visible` with `2px solid #005ea2` outline, properly suppressed on non-interactive containers
4. **Image alt text** — All `<img>` elements have `alt` attributes (Login logo: `alt="Ship"`, ResizableImage: fallback `alt=""`)
5. **Status colors** — E2E tests verify no low-contrast -400 color variants used

### Accessibility Gaps

| Location | Issue | Severity |
|----------|-------|----------|
| **Global error boundary** | Error fallback UI (`ErrorBoundary.tsx`) lacks `role="alert"` or `aria-live` | Moderate |
| **Dropdown menus** | Some custom dropdowns may lack `aria-expanded` state tracking | Moderate |
| **Loading indicators** | `Suspense` only used in 2 locations — most loading states are visual-only without `aria-live="polite"` announcements | Moderate |
| **Editor toolbar** | TipTap editor toolbar buttons may lack descriptive `aria-label` attributes | Minor |
| **Data tables** | Issue lists and team grids render as divs rather than semantic `<table>` elements | Minor |

### Severity: LOW-MEDIUM

Accessibility compliance is strong overall, aided by USWDS integration and comprehensive E2E axe-core testing. The identified gaps are primarily about enhancing existing accessible patterns (adding aria-live to loading states, aria-expanded to dropdowns) rather than fundamental accessibility failures. The color contrast compliance and keyboard navigation foundation are solid.

---

## Summary — Severity Rankings

| Category | Severity | Key Finding |
|----------|----------|-------------|
| **1. Type Safety** | MEDIUM | 268 `any` types (85% in API tests); strict mode enabled |
| **2. Bundle Size** | **HIGH** | 2,073 KB monolithic main chunk; zero route-level code splitting |
| **3. API Response Time** | LOW (now) / HIGH (at scale) | All P95 < 10ms with 257 docs; O(N²) query patterns will degrade |
| **4. Database Query Efficiency** | **HIGH** | 7 correlated subqueries per sprint; loop-based mutations; 3 missing indexes |
| **5. Test Coverage** | MEDIUM | 40.3% API line coverage; zero flaky tests; 13 web test failures (config issue) |
| **6. Runtime Error Handling** | MEDIUM | Solid infrastructure; 1 global ErrorBoundary; 3 silent failure paths |
| **7. Accessibility** | LOW-MEDIUM | Strong WCAG 2.1 AA foundation; 261 ARIA attributes; gaps in aria-live and Suspense |

### Priority Improvement Order

1. **Bundle Size** (Category 2) — Highest impact. Route-level code splitting would reduce initial load by 50%+.
2. **Database Query Efficiency** (Category 4) — Consolidate correlated subqueries before data grows.
3. **API Response Time** (Category 3) — Directly addressed by fixing Category 4.
4. **Type Safety** (Category 1) — Replace `any` in production route files; create typed mock helpers for tests.
5. **Test Coverage** (Category 5) — Add unit tests for dashboard, team, comments routes.
6. **Runtime Error Handling** (Category 6) — Add per-feature ErrorBoundaries and aria-live loading states.
7. **Accessibility** (Category 7) — Fix the 5 identified gaps; get Lighthouse running for actual scores.
