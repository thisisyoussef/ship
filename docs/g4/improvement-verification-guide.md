# Phase 2 Improvement Verification Guide

This guide is the fastest way to verify the seven assignment categories without reverse-engineering the repo.

Use it in this order:

1. browser checks for the user-facing changes
2. command checks for the measurable categories
3. source checks if you want to inspect the implementation directly

Primary supporting documents:

- [Phase 2 normalized summary](../../PHASE2_IMPROVEMENT_DOCUMENTATION.md)
- [Phase 2 full notes and benchmark details](../../PHASE2_NOTES.md)

## Quick Start

For UI-only verification, use the public deployment:

- app: `https://ship-demo.onrender.com/`
- login: `https://ship-demo.onrender.com/login`
- health: `https://ship-demo.onrender.com/health`

If you want to verify locally with commands:

```bash
cd /path/to/ship
pnpm install
pnpm docker:up
```

Local URLs:

- web: `http://localhost:5173`
- api: `http://localhost:3000`
- health: `http://localhost:3000/health`

Demo credentials:

- email: `dev@ship.local`
- password: `admin123`

## Before/After Summary

| Category | Before | After | Fastest verification |
| --- | --- | --- | --- |
| 1. Type Safety | `1291` AST-audited violations | `902` violations, `30.13%` reduction | run the type-check commands and compare with [PHASE2_IMPROVEMENT_DOCUMENTATION.md](../../PHASE2_IMPROVEMENT_DOCUMENTATION.md) |
| 2. Bundle Size | `2,025.10 KB` main entry chunk | `287.05 KB` documented after, about `294 KB` on current rerun | run the Vite build and check the entry chunk |
| 3. API Response Time | p95 at c50: `/api/documents` `980 ms`, `/api/issues` `402 ms`, `/api/documents/:id` `300 ms`, `/api/weeks/:id/issues` `219 ms`, `/api/search/learnings` `250 ms` | documented p95 after: `136 / 191 / 244 / 67 / 63 ms` | read the summary table, then rerun the benchmark flow if needed |
| 4. DB Query Efficiency | `GET /api/weeks/:id/issues` used `5` queries | reduced to `3` queries | inspect [weeks.ts](../../api/src/routes/weeks.ts) and the before/after SQL in [PHASE2_NOTES.md](../../PHASE2_NOTES.md) |
| 5. Test Coverage | web `133 passed / 13 failed`; E2E `853 passed / 1 failed / 11 flaky / 4 not run` | API `452 passed`; targeted category suites green; current rerun of `my-week-stale-data` is `10/10` | run the targeted test commands below |
| 6. Runtime Error Handling | auth/session console noise, blocking Action Items modal on direct docs, weak error-boundary recovery | login bootstrap is clean, direct docs are interactive, error boundary offers reload | use the browser checks plus targeted runtime tests |
| 7. Accessibility | docs/document tree semantics violations and `/my-week` contrast issues | targeted accessibility checks pass; visible contrast fixes are in place | use the browser checks plus the focused Playwright spec |

## Browser-Only Verification

These steps cover the parts a grader can verify directly in the UI.

Use the deployed app by default:

- app: `https://ship-demo.onrender.com/`
- if you are running locally instead, replace the base URLs below with `http://localhost:5173` for the web app and `http://localhost:3000` for API-only endpoints

### 1. Deployment and health

1. Open `https://ship-demo.onrender.com/login`.
2. Confirm the app loads normally.
3. Open `https://ship-demo.onrender.com/health`.
4. Expected result:
   - before: this step did not prove any phase work by itself
   - after: the app and API are up and the API returns `{"status":"ok"}`

### 2. Login flow and runtime cleanup

1. Open DevTools and keep the Console visible.
2. Sign in with `dev@ship.local / admin123`.
3. Expected result:
   - before: login/bootstrap could produce auth-related console noise, and the app also attempted to load a blocked external Google Fonts stylesheet
   - after: login succeeds without the blocked Google Fonts CSP error and without the extra unauthenticated bootstrap noise on the login page

### 3. My Week visual fixes

1. Go to `https://ship-demo.onrender.com/my-week`.
2. Verify:
   - the `Current` badge has white text on a blue accent background
   - today's day label is brighter
   - future daily rows are not dimmed as entire rows
   - weekly plan and weekly retro text is easier to read
3. Expected result:
   - before: lower-contrast badge/text combinations and whole-row opacity made the page look washed out
   - after: contrast is visibly improved and the page remains readable in the dark theme

### 4. Docs and direct document entry

1. Go to `https://ship-demo.onrender.com/docs`.
2. Use the sidebar and open a document.
3. Copy the `/documents/:id` URL or open a different document directly in a new tab.
4. Expected result:
   - before: direct document entry could be blocked by the auto-opened `Action Items` modal
   - after: the document page opens directly, no blocking `Action Items` dialog sits on top, and the editor accepts clicks immediately

### 5. Route splitting

1. Open DevTools `Network`.
2. Check `Disable cache`.
3. Hard refresh `/login`.
4. Navigate to `/docs`, then open a document page.
5. Expected result:
   - before: the initial load pulled much more of the editor-heavy bundle up front
   - after: route-specific JS loads when you enter `/docs` and `/documents/:id`

## Full Grader Verification

## Category 1: Type Safety

Before:

- `1291` AST-audited violations

After:

- `902` AST-audited violations
- `30.13%` reduction

Commands:

```bash
cd /path/to/ship
pnpm run build:shared
pnpm --filter @ship/shared type-check
pnpm --filter @ship/api type-check
pnpm --filter @ship/web exec tsc --noEmit
```

Expected result:

- all commands pass
- the before/after totals match [PHASE2_IMPROVEMENT_DOCUMENTATION.md](../../PHASE2_IMPROVEMENT_DOCUMENTATION.md)

Source files to inspect:

- [api/src/routes/route-helpers.ts](../../api/src/routes/route-helpers.ts)
- [api/src/routes/weeks.ts](../../api/src/routes/weeks.ts)
- [api/src/routes/projects.ts](../../api/src/routes/projects.ts)
- [api/src/routes/issues.ts](../../api/src/routes/issues.ts)
- [web/src/pages/UnifiedDocumentPage.tsx](../../web/src/pages/UnifiedDocumentPage.tsx)

## Category 2: Bundle Size

Before:

- main entry chunk: `2,025.10 KB`

After:

- documented after: `287.05 KB`
- current local rerun on `master`: about `294.21 KB`

Commands:

```bash
cd /path/to/ship
pnpm run build:shared
pnpm --filter @ship/web exec vite build --sourcemap
```

Expected result:

- the build passes
- the main entry chunk is in the low-300 KB range, not multi-MB
- route chunks such as `UnifiedDocumentPage` stay split out of the initial entry

Source file to inspect:

- [web/src/main.tsx](../../web/src/main.tsx)

## Category 3: API Response Time

Before:

- p95 at concurrency 50:
  - `/api/documents`: `980 ms`
  - `/api/issues`: `402 ms`
  - `/api/documents/:id`: `300 ms`
  - `/api/weeks/:id/issues`: `219 ms`
  - `/api/search/learnings?q=api`: `250 ms`

After:

- documented p95 at concurrency 50:
  - `/api/documents`: `136 ms`
  - `/api/issues`: `191 ms`
  - `/api/documents/:id`: `244 ms`
  - `/api/weeks/:id/issues`: `67 ms`
  - `/api/search/learnings?q=api`: `63 ms`

Quick verification:

1. Read the before/after table in [PHASE2_IMPROVEMENT_DOCUMENTATION.md](../../PHASE2_IMPROVEMENT_DOCUMENTATION.md).
2. Read the benchmark setup, artifact paths, and root-cause analysis in [PHASE2_NOTES.md](../../PHASE2_NOTES.md).

Stronger local rerun:

```bash
cd /path/to/ship
BASE=http://localhost:3000
COOKIE_JAR=/tmp/ship-cookies.txt
CSRF=$(curl -s -c "$COOKIE_JAR" "$BASE/api/csrf-token" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).token))")
curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" -d '{"email":"dev@ship.local","password":"admin123"}' "$BASE/api/auth/login" >/dev/null
SESSION_ID=$(awk '$6==\"session_id\"{print $7}' "$COOKIE_JAR")
DOC_ID=$(curl -s -b "$COOKIE_JAR" "$BASE/api/documents" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d)[0].id))")
WEEK_ID=$(curl -s -b "$COOKIE_JAR" "$BASE/api/weeks" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d)[0].id))")
ab -n 200 -c 50 -H "Cookie: session_id=$SESSION_ID" "$BASE/api/documents"
ab -n 200 -c 50 -H "Cookie: session_id=$SESSION_ID" "$BASE/api/issues"
ab -n 200 -c 50 -H "Cookie: session_id=$SESSION_ID" "$BASE/api/documents/$DOC_ID"
ab -n 200 -c 50 -H "Cookie: session_id=$SESSION_ID" "$BASE/api/weeks/$WEEK_ID/issues"
ab -n 200 -c 50 -H "Cookie: session_id=$SESSION_ID" "$BASE/api/search/learnings?q=api"
```

Source files to inspect:

- [api/src/middleware/auth.ts](../../api/src/middleware/auth.ts)
- [api/src/services/list-response-cache.ts](../../api/src/services/list-response-cache.ts)
- [api/src/routes/documents.ts](../../api/src/routes/documents.ts)
- [api/src/routes/issues.ts](../../api/src/routes/issues.ts)

## Category 4: Database Query Efficiency

Before:

- `GET /api/weeks/:id/issues` issued `5` queries

After:

- `GET /api/weeks/:id/issues` issues `3` queries

Quick verification:

1. Read the `5 -> 3` result in [PHASE2_IMPROVEMENT_DOCUMENTATION.md](../../PHASE2_IMPROVEMENT_DOCUMENTATION.md).
2. Read the exact before/after SQL and `EXPLAIN ANALYZE` blocks in [PHASE2_NOTES.md](../../PHASE2_NOTES.md).

Implementation inspection:

- [api/src/routes/weeks.ts](../../api/src/routes/weeks.ts)

What to look for:

- the route no longer performs the extra admin lookup for super-admins
- sprint accessibility verification and issue retrieval are combined instead of split across separate round trips

## Category 5: Test Coverage

Before:

- web: `133 passed / 13 failed`
- E2E: `853 passed / 1 failed / 11 flaky / 4 not run`

After:

- API suite: `452 passed`
- targeted suites pass, including:
  - `program-mode-week-ux`
  - `my-week-stale-data`
  - `collaboration-regression`
  - `drag-handle`
- latest rerun on March 13, 2026:
  - `e2e/my-week-stale-data.spec.ts --repeat-each=5` -> `10 passed`

Commands:

```bash
cd /path/to/ship
DATABASE_URL=postgres://ship:ship_dev_password@localhost:5433/ship_dev pnpm test
pnpm --filter @ship/web test
PLAYWRIGHT_WORKERS=1 pnpm exec playwright test e2e/my-week-stale-data.spec.ts --workers=1 --repeat-each=5
PLAYWRIGHT_WORKERS=1 pnpm exec playwright test e2e/collaboration-regression.spec.ts --workers=1
PLAYWRIGHT_WORKERS=1 pnpm exec playwright test e2e/category-7-accessibility.spec.ts --workers=1
```

Source files to inspect:

- [api/src/routes/documents.test.ts](../../api/src/routes/documents.test.ts)
- [e2e/collaboration-regression.spec.ts](../../e2e/collaboration-regression.spec.ts)
- [e2e/my-week-stale-data.spec.ts](../../e2e/my-week-stale-data.spec.ts)
- [e2e/program-mode-week-ux.spec.ts](../../e2e/program-mode-week-ux.spec.ts)

## Category 6: Runtime Error Handling

Before:

- login/bootstrap produced auth-related console noise
- direct `/documents/:id` entry could be blocked by the Action Items modal
- the shared error boundary did not offer a full-page recovery action

After:

- public-route auth bootstrap is quiet
- direct document entry stays interactive
- the shared error boundary includes reload recovery
- latest rerun on March 13, 2026:
  - `pnpm --filter @ship/web exec vitest run src/lib/actionItemsModal.test.ts src/hooks/useSessionTimeout.test.ts src/components/ui/ErrorBoundary.test.tsx` -> `42 passed`
  - local browser probe: no blocked Google Fonts CSP error, no extra `/api/auth/me` 401 on `/login`, no blocking Action Items dialog on direct doc routes

Commands:

```bash
cd /path/to/ship
pnpm --filter @ship/web exec vitest run src/lib/actionItemsModal.test.ts src/hooks/useSessionTimeout.test.ts src/components/ui/ErrorBoundary.test.tsx
```

Browser checks:

1. Open `/login` with DevTools Console visible.
2. Sign in.
3. Confirm the login page does not emit the old bootstrap noise.
4. Open a document directly at `/documents/:id`.
5. Confirm no Action Items modal blocks the editor.

Source files to inspect:

- [web/src/hooks/useSessionTimeout.ts](../../web/src/hooks/useSessionTimeout.ts)
- [web/src/lib/actionItemsModal.ts](../../web/src/lib/actionItemsModal.ts)
- [web/src/components/ui/ErrorBoundary.tsx](../../web/src/components/ui/ErrorBoundary.tsx)
- [web/src/hooks/useAuth.tsx](../../web/src/hooks/useAuth.tsx)
- [web/src/pages/App.tsx](../../web/src/pages/App.tsx)
- [api/src/routes/auth.ts](../../api/src/routes/auth.ts)

## Category 7: Accessibility

Before:

- `/docs` and `/documents/:id` had tree/list semantics violations
- `/my-week` had contrast failures

After:

- targeted accessibility checks pass
- `/my-week` contrast fixes are visible in the UI

Commands:

```bash
cd /path/to/ship
PLAYWRIGHT_WORKERS=1 pnpm exec playwright test e2e/category-7-accessibility.spec.ts --workers=1
```

Browser checks:

1. Open `/docs`.
2. Confirm the sidebar tree works normally.
3. Open a document page and confirm the tree/document page is usable.
4. Open `/my-week` and verify the contrast fixes listed in the browser-only section above.

Source files to inspect:

- [web/src/pages/App.tsx](../../web/src/pages/App.tsx)
- [web/src/pages/MyWeekPage.tsx](../../web/src/pages/MyWeekPage.tsx)
- [e2e/category-7-accessibility.spec.ts](../../e2e/category-7-accessibility.spec.ts)
