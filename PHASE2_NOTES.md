# Phase 2 Notes

## Category 4: Database Query Efficiency

### Reproduced baseline

I reproduced the five audited flows on March 11, 2026 against the branch-local Docker stack before editing the route. The query counts matched the audit exactly. The measured durations were lower than the audit table, but the query shapes and counts were the same.

| User Flow | Endpoint | Total Queries | Slowest Query (ms) | N+1 Detected? |
| --- | --- | ---: | ---: | --- |
| Load main page | `GET /api/documents` | 4 | 1.155 | No |
| View a document | `GET /api/documents/:id` | 4 | 0.615 | No |
| List issues | `GET /api/issues` | 5 | 0.562 | No |
| Load sprint board | `GET /api/weeks/:id/issues` | 5 | 0.483 | No |
| Search content | `GET /api/search/learnings?q=api` | 4 | 0.558 | No |

Count match against the audit:

- `GET /api/documents`: `4`
- `GET /api/documents/:id`: `4`
- `GET /api/issues`: `5`
- `GET /api/weeks/:id/issues`: `5`
- `GET /api/search/learnings?q=api`: `4`

### Diagnosis

#### 1. Load main page: 4-query sequence

From the reproduced `GET /api/documents` log, the four statements were:

1. `0.487 ms`  
   `SELECT s.id, s.user_id, s.workspace_id, s.expires_at, s.last_activity, s.created_at, u.is_super_admin FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = $1`
2. `0.130 ms`  
   `UPDATE sessions SET last_activity = $1 WHERE id = $2`
3. `0.096 ms`  
   `SELECT role FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`
4. `1.155 ms`  
   `SELECT id, workspace_id, document_type, title, parent_id, position, ticket_number, properties, created_at, updated_at, created_by, visibility FROM documents WHERE workspace_id = $1 AND archived_at IS NULL AND deleted_at IS NULL AND (visibility = 'workspace' OR created_by = $2 OR $3 = TRUE) ORDER BY position ASC, created_at DESC`

#### 2. Slowest main-page query: exact SQL and `EXPLAIN ANALYZE`

Exact SQL:

```sql
SELECT id, workspace_id, document_type, title, parent_id, position,
       ticket_number, properties,
       created_at, updated_at, created_by, visibility
FROM documents
WHERE workspace_id = 'a53d0769-ad31-43c7-a883-27355a528478'
  AND archived_at IS NULL
  AND deleted_at IS NULL
  AND (visibility = 'workspace'
       OR created_by = 'e344e12e-35f0-42c3-b502-3dae111bbab3'
       OR TRUE = TRUE)
ORDER BY position ASC, created_at DESC;
```

`EXPLAIN ANALYZE` before any edits:

```text
Sort  (cost=36.50..37.14 rows=257 width=332) (actual time=0.807..0.816 rows=257 loops=1)
  Sort Key: "position", created_at DESC
  Sort Method: quicksort  Memory: 112kB
  ->  Seq Scan on documents  (cost=0.00..26.21 rows=257 width=332) (actual time=0.061..0.517 rows=257 loops=1)
        Filter: ((archived_at IS NULL) AND (deleted_at IS NULL) AND (workspace_id = 'a53d0769-ad31-43c7-a883-27355a528478'::uuid))
Planning Time: 2.296 ms
Execution Time: 0.909 ms
```

#### 3. What the plan shows

- The main-page query does a `Seq Scan` on `documents`, then sorts in memory.
- For the audited super-admin flow, `(visibility = 'workspace' OR created_by = ... OR TRUE = TRUE)` collapses to `TRUE`, so the effective filter is `workspace_id` plus the archive/deletion predicates.
- The plan confirms a possible index target, but on this dataset the route-level round trips on the sprint-board flow were a much larger inefficiency than the already-sub-millisecond execution time of the filtered `documents` scan.

#### 4. Load sprint board: are the 5 queries collapsible?

Yes. The reproduced `GET /api/weeks/:id/issues` flow was:

1. session lookup
2. session activity update
3. workspace admin lookup
4. sprint existence/prefix lookup
5. sprint issues fetch

Queries 3 and 4 were avoidable in this path:

- the user is a seeded super-admin, and `authMiddleware` already loaded `is_super_admin`
- the sprint verification query returned only sprint existence plus a program prefix that the handler did not use in the response body

That made the route a good candidate for one access-check + issue-fetch statement.

#### 5. List issues: can dependent lookups be batched?

The issues route already batches correctly:

- one statement loads the issue list
- one statement hydrates associations with `WHERE da.document_id = ANY($1)`

There was no N+1 to remove there, so the sprint-board route was the better target.

### Change made

I changed `GET /api/weeks/:id/issues` in `api/src/routes/weeks.ts`:

1. If `req.isSuperAdmin === true`, the route now skips the redundant `workspace_memberships` admin lookup.
2. The route now folds sprint existence/access verification into the issue fetch using an `accessible_sprint` CTE plus `LEFT JOIN LATERAL`.

Why this works:

- `result.rows.length === 0` still means "sprint missing or inaccessible" and returns `404`
- one row with `issue.id IS NULL` still means "sprint exists but has no issues" and returns `[]`
- the issue response mapping is unchanged

### Before/after query logs for the modified flow

#### Before change

Reproduced `GET /api/weeks/:id/issues` before the edit:

1. `0.188 ms`  
   `SELECT s.id, s.user_id, s.workspace_id, s.expires_at, s.last_activity, s.created_at, u.is_super_admin FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = $1`
2. `0.043 ms`  
   `UPDATE sessions SET last_activity = $1 WHERE id = $2`
3. `0.039 ms`  
   `SELECT role FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`
4. `0.359 ms`  
   `SELECT d.id, p.properties->>'prefix' as prefix FROM documents d LEFT JOIN document_associations prog_da ON prog_da.document_id = d.id AND prog_da.relationship_type = 'program' LEFT JOIN documents p ON prog_da.related_id = p.id WHERE d.id = $1 AND d.workspace_id = $2 AND d.document_type = 'sprint' AND (d.visibility = 'workspace' OR d.created_by = $3 OR $4 = TRUE)`
5. `0.483 ms`  
   `SELECT d.id, d.title, d.properties, d.ticket_number, d.created_at, d.updated_at, d.created_by, u.name as assignee_name, CASE WHEN person_doc.archived_at IS NOT NULL THEN true ELSE false END as assignee_archived FROM documents d JOIN document_associations sprint_da ON sprint_da.document_id = d.id AND sprint_da.related_id = $1 AND sprint_da.relationship_type = 'sprint' LEFT JOIN users u ON (d.properties->>'assignee_id')::uuid = u.id LEFT JOIN documents person_doc ON person_doc.workspace_id = d.workspace_id AND person_doc.document_type = 'person' AND person_doc.properties->>'user_id' = d.properties->>'assignee_id' WHERE d.document_type = 'issue' AND (d.visibility = 'workspace' OR d.created_by = $2 OR $3 = TRUE) ORDER BY CASE d.properties->>'priority' WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, d.updated_at DESC`

Total queries: `5`

#### After change

`GET /api/weeks/:id/issues` after the edit:

1. `0.610 ms`  
   `SELECT s.id, s.user_id, s.workspace_id, s.expires_at, s.last_activity, s.created_at, u.is_super_admin FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = $1`
2. `0.104 ms`  
   `UPDATE sessions SET last_activity = $1 WHERE id = $2`
3. `1.668 ms`  
   `WITH accessible_sprint AS (...) SELECT sprint.id as sprint_id, issue.id, issue.title, issue.properties, issue.ticket_number, issue.created_at, issue.updated_at, issue.created_by, issue.assignee_name, issue.assignee_archived FROM accessible_sprint sprint LEFT JOIN LATERAL (...) issue ON TRUE`

Total queries: `3`

Important nuance:

- the merged query is heavier than the old issue fetch by itself
- the endpoint is still better overall because it removes two round trips and one redundant authorization query from the measured flow

### `EXPLAIN ANALYZE` before/after for the modified flow

#### Before: old sprint verification query

```text
Nested Loop Left Join  (cost=0.57..24.71 rows=1 width=48) (actual time=0.167..0.169 rows=1 loops=1)
  ->  Nested Loop Left Join  (cost=0.42..16.48 rows=1 width=32) (actual time=0.109..0.110 rows=1 loops=1)
        ->  Index Scan using documents_pkey on documents d  (cost=0.15..8.17 rows=1 width=16) (actual time=0.050..0.050 rows=1 loops=1)
              Index Cond: (id = 'c5de80f3-eb8a-4ab1-8449-0a38bef3ef2f'::uuid)
              Filter: ((workspace_id = 'a53d0769-ad31-43c7-a883-27355a528478'::uuid) AND (document_type = 'sprint'::document_type))
        ->  Index Only Scan using unique_association on document_associations prog_da  (cost=0.27..8.30 rows=1 width=32) (actual time=0.058..0.058 rows=1 loops=1)
              Index Cond: ((document_id = 'c5de80f3-eb8a-4ab1-8449-0a38bef3ef2f'::uuid) AND (relationship_type = 'program'::relationship_type))
              Heap Fetches: 1
  ->  Index Scan using documents_pkey on documents p  (cost=0.15..8.17 rows=1 width=228) (actual time=0.014..0.014 rows=1 loops=1)
        Index Cond: (id = prog_da.related_id)
Planning Time: 2.518 ms
Execution Time: 0.278 ms
```

#### Before: old sprint issues query

```text
Sort  (cost=18.27..18.28 rows=1 width=319) (actual time=0.141..0.141 rows=4 loops=1)
  Sort Key: (CASE (d.properties ->> 'priority'::text) WHEN 'urgent'::text THEN 1 WHEN 'high'::text THEN 2 WHEN 'medium'::text THEN 3 WHEN 'low'::text THEN 4 ELSE 5 END), d.updated_at DESC
  Sort Method: quicksort  Memory: 26kB
  ->  Nested Loop Left Join  (cost=0.58..18.26 rows=1 width=319) (actual time=0.090..0.107 rows=4 loops=1)
        ->  Nested Loop Left Join  (cost=0.45..17.12 rows=1 width=330) (actual time=0.055..0.068 rows=4 loops=1)
              ->  Nested Loop  (cost=0.29..16.49 rows=1 width=298) (actual time=0.010..0.019 rows=4 loops=1)
                    ->  Index Scan using idx_document_associations_related_type on document_associations sprint_da  (cost=0.15..8.17 rows=1 width=16) (actual time=0.006..0.007 rows=5 loops=1)
                          Index Cond: ((related_id = 'c5de80f3-eb8a-4ab1-8449-0a38bef3ef2f'::uuid) AND (relationship_type = 'sprint'::relationship_type))
                    ->  Index Scan using documents_pkey on documents d  (cost=0.15..8.17 rows=1 width=298) (actual time=0.002..0.002 rows=1 loops=5)
                          Index Cond: (id = sprint_da.document_id)
                          Filter: (document_type = 'issue'::document_type)
                          Rows Removed by Filter: 0
              ->  Index Scan using users_pkey on users u  (cost=0.15..0.63 rows=1 width=48) (actual time=0.010..0.010 rows=1 loops=4)
                    Index Cond: (id = ((d.properties ->> 'assignee_id'::text))::uuid)
        ->  Index Scan using idx_documents_person_user_id on documents person_doc  (cost=0.14..1.12 rows=1 width=236) (actual time=0.009..0.009 rows=1 loops=4)
              Index Cond: ((properties ->> 'user_id'::text) = (d.properties ->> 'assignee_id'::text))
              Filter: (workspace_id = d.workspace_id)
Planning Time: 2.951 ms
Execution Time: 0.221 ms
```

#### After: combined query

```text
Nested Loop Left Join  (cost=27.31..35.35 rows=1 width=331) (actual time=0.071..0.072 rows=4 loops=1)
  ->  Index Scan using documents_pkey on documents d  (cost=0.15..8.17 rows=1 width=16) (actual time=0.006..0.006 rows=1 loops=1)
        Index Cond: (id = 'c5de80f3-eb8a-4ab1-8449-0a38bef3ef2f'::uuid)
        Filter: ((workspace_id = 'a53d0769-ad31-43c7-a883-27355a528478'::uuid) AND (document_type = 'sprint'::document_type))
  ->  Sort  (cost=27.16..27.16 rows=1 width=319) (actual time=0.063..0.064 rows=4 loops=1)
        Sort Key: (CASE (d_1.properties ->> 'priority'::text) WHEN 'urgent'::text THEN 1 WHEN 'high'::text THEN 2 WHEN 'medium'::text THEN 3 WHEN 'low'::text THEN 4 ELSE 5 END), d_1.updated_at DESC
        Sort Method: quicksort  Memory: 26kB
        ->  Nested Loop Left Join  (cost=4.62..27.15 rows=1 width=319) (actual time=0.033..0.050 rows=4 loops=1)
              ->  Nested Loop Left Join  (cost=4.48..26.01 rows=1 width=330) (actual time=0.025..0.038 rows=4 loops=1)
                    ->  Nested Loop  (cost=4.33..25.37 rows=1 width=298) (actual time=0.015..0.024 rows=4 loops=1)
                          ->  Bitmap Heap Scan on document_associations sprint_da  (cost=4.17..8.99 rows=2 width=16) (actual time=0.009..0.011 rows=5 loops=1)
                                Recheck Cond: ((related_id = d.id) AND (relationship_type = 'sprint'::relationship_type))
                                Heap Blocks: exact=2
                                ->  Bitmap Index Scan on idx_document_associations_related_type  (cost=0.00..4.17 rows=2 width=0) (actual time=0.005..0.005 rows=5 loops=1)
                                      Index Cond: ((related_id = d.id) AND (relationship_type = 'sprint'::relationship_type))
                          ->  Memoize  (cost=0.16..8.18 rows=1 width=298) (actual time=0.002..0.002 rows=1 loops=5)
                                Cache Key: sprint_da.document_id
                                Cache Mode: logical
                                Hits: 0  Misses: 5  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                                ->  Index Scan using documents_pkey on documents d_1  (cost=0.15..8.17 rows=1 width=298) (actual time=0.001..0.001 rows=1 loops=5)
                                      Index Cond: (id = sprint_da.document_id)
                                      Filter: (document_type = 'issue'::document_type)
                                      Rows Removed by Filter: 0
                    ->  Index Scan using users_pkey on users u  (cost=0.15..0.63 rows=1 width=48) (actual time=0.002..0.002 rows=1 loops=4)
                          Index Cond: (id = ((d_1.properties ->> 'assignee_id'::text))::uuid)
              ->  Index Scan using idx_documents_person_user_id on documents person_doc  (cost=0.14..1.12 rows=1 width=236) (actual time=0.002..0.002 rows=1 loops=4)
                    Index Cond: ((properties ->> 'user_id'::text) = (d_1.properties ->> 'assignee_id'::text))
                    Filter: (workspace_id = d_1.workspace_id)
Planning Time: 1.149 ms
Execution Time: 0.133 ms
```

### Validation

- Full phase command run:

```bash
DATABASE_URL=postgres://ship:ship_dev_password@localhost:5433/ship_dev pnpm test
```

- Result:
  - `26` failures in `src/routes/issues-history.test.ts` and `src/routes/projects.test.ts`
  - failures are unrelated `401` auth expectation mismatches that predate this route change
  - the modified route's suite passed in isolation

```bash
DATABASE_URL=postgres://ship:ship_dev_password@localhost:5433/ship_dev pnpm --filter @ship/api exec vitest run src/routes/weeks.test.ts
```

- Isolated route result: `41` tests passed in `src/routes/weeks.test.ts`

### Option met and verdict

- **Option A met**
- Modified flow: `Load sprint board` / `GET /api/weeks/:id/issues`
- Query count reduction: `5 -> 3` queries
- Improvement amount: `40%`
- Passing verdict: **yes**

## Category 6: Runtime Error Handling

### Diagnosis

1. Why is `GET /api/auth/session` returning 500?

- The backend route in `/Users/youss/Development/gauntlet/ship/api/src/routes/auth.ts` is mounted behind `authMiddleware` from `/Users/youss/Development/gauntlet/ship/api/src/middleware/auth.ts`, which correctly returns `401` for missing or expired sessions.
- The reproduced `500` is not coming from the Express handler. It is coming from the Dockerized Vite dev server in the `web` container trying to proxy a relative `/api/auth/session` request to `http://127.0.0.1:3000`, which is wrong inside that container.
- Root cause: `/Users/youss/Development/gauntlet/ship/web/src/hooks/useSessionTimeout.ts` uses `fetch('/api/auth/session', { credentials: 'include' })` instead of the same absolute `VITE_API_URL` path used by the rest of the app. `api.auth.me()` succeeds because `/Users/youss/Development/gauntlet/ship/web/src/lib/api.ts` already uses `import.meta.env.VITE_API_URL`.

2. What is the modal overlay on the document page?

- The blocking overlay is the global `ActionItemsModal` rendered from `/Users/youss/Development/gauntlet/ship/web/src/pages/App.tsx`.
- It auto-opens on initial load when `!actionItemsModalShownOnLoad && hasActionItems && actionItemsData?.items`.
- The modal itself is implemented in `/Users/youss/Development/gauntlet/ship/web/src/components/ActionItemsModal.tsx` with a full-screen `Dialog.Overlay` and modal `Dialog.Content`, so it intentionally intercepts pointer events until dismissed.
- On a direct document visit after login, the editor is already visible behind the modal, but the modal still owns focus and pointer events. That makes the main product surface feel broken if the user tries to click into the editor first.

3. Are the existing error boundaries actually configured with fallback UI?

- Yes. `/Users/youss/Development/gauntlet/ship/web/src/pages/App.tsx` and `/Users/youss/Development/gauntlet/ship/web/src/components/Editor.tsx` both use `/Users/youss/Development/gauntlet/ship/web/src/components/ui/ErrorBoundary.tsx` without a custom fallback.
- Reproduced by rendering a throwing child inside the boundary. All three cases rendered the default fallback instead of a blank screen.
- Current fallback text is `Something went wrong` with a single `Try Again` button. It is not blank, but it does not offer a page reload path, which is below the requested minimum recovery affordance.

4. Additional silent failures found during scan

- I scanned `useEffect` async flows and `.then()` chains in `web/src`.
- I did not find a second critical document-save or issue-update path that is fully silent. Most mutation failures are routed through React Query’s global mutation cache and surfaced by `/Users/youss/Development/gauntlet/ship/web/src/components/MutationErrorToast.tsx`.
- I did find intentionally quiet background requests in `/Users/youss/Development/gauntlet/ship/web/src/components/PlanQualityBanner.tsx` and `/Users/youss/Development/gauntlet/ship/web/src/components/sidebars/QualityAssistant.tsx`; both files explicitly document that they are advisory/non-critical and should not redirect or spam the user.
- The third actionable gap for this phase is the incomplete error-boundary recovery UI, not another hidden async failure.

### Baseline Reproductions

#### Issue 1: Auth session console noise

- Severity: Medium
- Reproduction steps:
  1. Start the local Docker stack with `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d`.
  2. Open `http://localhost:5173/login`.
  3. Sign in with `dev@ship.local / admin123`.
  4. Wait on the first authenticated page load for the session-timeout hook to run.
- Before behavior:
  - The UI loads, but the console shows repeated `500` noise for `GET /api/auth/session`.
  - Playwright also records `net::ERR_ABORTED` for the same request.
- Root cause:
  - `/Users/youss/Development/gauntlet/ship/web/src/hooks/useSessionTimeout.ts` uses a relative `/api/auth/session` fetch.
  - Inside the `web` Docker container, Vite proxies relative `/api/*` calls to `127.0.0.1:3000`, which is not the API container.
  - The web container logs show `http proxy error: /api/auth/session` and `connect ECONNREFUSED 127.0.0.1:3000`.
- Fix applied:
  - Pending.
- After behavior:
  - Pending.
- Evidence:
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/login-console.txt`
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/after-login.png`

#### Issue 2: Modal overlay blocking editor entry

- Severity: High
- Reproduction steps:
  1. Sign in with `dev@ship.local / admin123`.
  2. Without dismissing the `Action Items` modal, navigate to a document detail page.
  3. Try to click into the editor immediately.
- Before behavior:
  - The editor is visible, but clicks do not enter the editor.
  - Playwright reports the dialog subtree intercepting pointer events instead of the editor receiving the click.
- Root cause:
  - `ActionItemsModal` is rendered globally from `AppLayout` and remains open over document routes until dismissed.
  - The overlay and dialog are modal by design, so the editor is blocked even though the user is already on the document page.
- Fix applied:
  - Pending.
- After behavior:
  - Pending.
- Evidence:
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/issue2-document-overlay.png`
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/issue2-click-log.txt`

#### Issue 3: Error boundary recovery is incomplete

- Severity: Medium
- Reproduction steps:
  1. Render a throwing child inside the shared `ErrorBoundary`.
  2. Repeat for the same default boundary wiring used by the App subtree and Editor subtree.
- Before behavior:
  - The boundary does catch the render error and shows fallback UI.
  - The fallback only offers `Try Again`; there is no explicit reload affordance.
- Root cause:
  - `/Users/youss/Development/gauntlet/ship/web/src/components/ui/ErrorBoundary.tsx` renders a minimal fallback with reset-only recovery.
- Fix applied:
  - Pending.
- After behavior:
  - Pending.
- Evidence:
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/error-boundary-verification.txt`

### Initial Implementation Plan

1. Fix the session-timeout hook so it uses the same API base path as the rest of the app and handles non-OK session responses explicitly.
2. Change the action-items flow so the startup accountability prompt does not block initial document editing on document routes.
3. Improve the shared error-boundary fallback to provide a clear reload path and verify the updated fallback in all three boundary placements.

### Final Summary

- 3 fixes completed: Pending
- At least one user-facing confusion scenario fixed: Pending
- Passing verdict: Pending

## Category 2: Bundle Size

### Reproduced Baseline

- Reproduced on March 11, 2026 from `/Users/youss/Development/gauntlet/ship` on commit `55e2ee1`.
- Exact build command run before edits:
  - `pnpm --filter @ship/web exec vite build --sourcemap`
- Exact chunk listing command run before edits:
  - `pnpm --filter @ship/web exec vite build --sourcemap 2>&1 | grep -E '\.(js|css)' | sort -k2 -rh | head -30`
- Reproduced baseline totals:
  - Total bundle size: `10,539.29 KB`
    - Measured as all files under `web/dist/assets`, including sourcemaps.
  - Main chunk (raw): `2,025.10 KB`
  - Main chunk (gzip): `587.62 KB`
  - Number of chunks: `262`
- Baseline discrepancy note:
  - No material discrepancy.
  - Total bundle size matches the audit baseline exactly.
  - Main chunk raw differs by `0.04 KB`, well below the allowed 5%.

### Baseline Build Output

```text
dist/assets/index-DJeYp5na.css                          66.51 kB │ gzip:  12.93 kB
dist/assets/ProgramWeeksTab-BzbUWlt4.js                 16.81 kB │ gzip:   5.56 kB │ map:    55.51 kB
dist/assets/WeekReviewTab-DmxN07T1.js                   12.70 kB │ gzip:   3.71 kB │ map:    37.54 kB
dist/assets/StandupFeed-BjJLDai5.js                      9.70 kB │ gzip:   2.92 kB │ map:    24.17 kB
dist/assets/ProjectRetroTab-BV2rvgoM.js                  9.10 kB │ gzip:   2.44 kB │ map:    23.90 kB
dist/assets/ProjectWeeksTab-oE3MioHn.js                  6.71 kB │ gzip:   2.34 kB │ map:    19.44 kB
dist/assets/ProgramProjectsTab-eNNvrO8g.js               4.46 kB │ gzip:   1.58 kB │ map:    10.19 kB
dist/assets/ProjectDetailsTab-gSyN3jFM.js                3.66 kB │ gzip:   1.52 kB │ map:    15.03 kB
dist/assets/WeekPlanningTab-DWsXI-LK.js                  3.04 kB │ gzip:   1.51 kB │ map:     9.03 kB
dist/assets/index-C2vAyoQ1.js                        2,073.74 kB │ gzip: 587.62 kB │ map: 8,003.97 kB
```

### Diagnosis Findings

1. Which modules are dynamically imported in `vite.config` or route definitions?
   - `web/vite.config.ts` does not define any dynamic imports or manual chunking.
   - Top-level route definitions in `web/src/main.tsx` did not use dynamic imports before the fix; every page was statically imported.
   - Existing dynamic imports before the fix were limited to:
     - `React.lazy()` tab components in `web/src/lib/document-tabs.tsx`
     - `import('@/services/upload')` and `import('./FileAttachment')` in `web/src/components/editor/SlashCommands.tsx`
     - `import.meta.glob('/node_modules/@uswds/uswds/dist/img/usa-icons/*.svg', { query: '?react' })` in `web/src/components/icons/uswds/Icon.tsx`

2. Are any of those same modules also statically imported somewhere else in the codebase?
   - Yes.
   - Vite reported two broken splits during the reproduced baseline build:
     - `web/src/services/upload.ts` is dynamically imported by `web/src/components/editor/SlashCommands.tsx` but also statically imported by `web/src/components/editor/FileAttachment.tsx` and `web/src/components/editor/ImageUpload.tsx`.
     - `web/src/components/editor/FileAttachment.tsx` is dynamically imported by `web/src/components/editor/SlashCommands.tsx` but also statically imported by `web/src/components/Editor.tsx`.
   - The larger route-level split was missing entirely:
     - `web/src/main.tsx` statically imported `web/src/pages/UnifiedDocumentPage.tsx`, `web/src/pages/PersonEditor.tsx`, and every other route page.
     - `web/src/pages/UnifiedDocumentPage.tsx` statically imported `web/src/components/UnifiedEditor.tsx`.
     - `web/src/components/UnifiedEditor.tsx` statically imported `web/src/components/Editor.tsx`.
     - `web/src/components/Editor.tsx` statically imported `yjs`, `y-websocket`, `y-indexeddb`, `lowlight`, and TipTap/ProseMirror packages.
   - Net effect before the fix:
     - editor and collaboration code was eligible to land in the initial `index-*.js` chunk even though only document/person editing routes need it.

3. Which of the top 5 contributors can be deferred to route-level or component-level load without breaking functionality?
   - `emoji-picker-react`: yes. It is only used by `web/src/components/EmojiPicker.tsx`, which is reached from document-editing sidebars.
   - `highlight.js` / `lowlight`: yes. It is only used by `web/src/components/Editor.tsx` for code block highlighting.
   - `yjs`: yes. It is only used by `web/src/components/Editor.tsx` for collaborative editing.
   - `prosemirror-view` and the rest of the TipTap/ProseMirror stack: yes. They are only needed when an editor route renders.
   - `react-router`: no meaningful defer opportunity. It is part of the SPA bootstrap path.

4. Are the two unused dependencies actually unused?
   - `@tanstack/query-sync-storage-persister`: confirmed unused in `web/src`.
     - Verification command: `grep -rn "@tanstack/query-sync-storage-persister" web/src --include="*.ts" --include="*.tsx"`
     - Result: no matches.
   - `@uswds/uswds`: not unused.
     - Verification command: `grep -rn "@uswds/uswds" web/src --include="*.ts" --include="*.tsx"`
     - Result: used in `web/src/components/icons/uswds/Icon.tsx` through `import.meta.glob()` against the USWDS SVG icon set.

### Change Log

- Change 1: removed `@tanstack/query-sync-storage-persister` from `web/package.json` and refreshed the lockfile.
  - Target: eliminate a verified-dead dependency from the frontend manifest.
  - Result: no measurable production bundle reduction; the package was already tree-shaken out of the build.
- Change 2: converted top-level page imports in `web/src/main.tsx` from static imports to `React.lazy()` route chunks and wrapped the route tree in `Suspense`.
  - Target: stop editor-bearing routes from being pulled into the initial app entry.
  - Affected routes: `AppLayout`, `Documents`, `Issues`, `Programs`, `TeamMode`, `TeamDirectory`, `PersonEditor`, `FeedbackEditor`, `PublicFeedback`, `Projects`, `Dashboard`, `MyWeekPage`, `AdminDashboard`, `AdminWorkspaceDetail`, `WorkspaceSettings`, `ConvertedDocuments`, `UnifiedDocumentPage`, `StatusOverviewPage`, `ReviewsPage`, `OrgChartPage`, `Login`, `InviteAccept`, and `Setup`.
- Change 3: gated React Query Devtools behind `import.meta.env.DEV` and lazy-loaded them separately.
  - Target: prevent production from shipping development-only tooling inside the entry graph.

### Split Verification

- `web/dist/index.html` now references only:
  - `/assets/index-CPPNbq8d.js`
  - `/assets/index-D_Rleic7.css`
- There are no `modulepreload` links in the generated HTML.
- The new entry chunk contains dynamic preload metadata for route chunks, but no static JS imports.
- The editor stack is isolated behind route chunks instead of the entry bundle:
  - `UnifiedDocumentPage-BTtMQph-.js`: `406.07 kB`
  - `PropertyRow-CzWzi-N4.js`: `836.62 kB`

### After Build Output

```text
dist/assets/PropertyRow-CzWzi-N4.js                  836.62 kB │ gzip: 261.18 kB │ map: 3,790.73 kB
dist/assets/UnifiedDocumentPage-BTtMQph-.js          406.07 kB │ gzip: 100.17 kB │ map: 1,189.41 kB
dist/assets/index-CPPNbq8d.js                        293.94 kB │ gzip:  91.71 kB │ map: 1,229.96 kB
dist/assets/App-CCSqVuN2.js                           88.49 kB │ gzip:  19.38 kB │ map:   269.15 kB
dist/assets/index-DuV_k7kB.js                         74.56 kB │ gzip:  25.91 kB │ map:   367.81 kB
dist/assets/index-D_Rleic7.css                        65.10 kB │ gzip:  12.56 kB
dist/assets/IssuesList-BpXCpLdo.js                    54.21 kB │ gzip:  15.85 kB │ map:   200.28 kB
dist/assets/Login-BBu4DqUf.js                         52.05 kB │ gzip:  10.63 kB │ map:    37.64 kB
dist/assets/core.esm-B4ST11IL.js                      43.78 kB │ gzip:  14.56 kB │ map:   192.02 kB
dist/assets/ReviewsPage-FNCQSg0u.js                   28.44 kB │ gzip:   7.23 kB │ map:    85.42 kB
```

### Rebuilt Metrics

- Total bundle size: `10,622.76 KB`
- Main chunk (raw): `287.05 KB`
  - Entry file: `web/dist/assets/index-CPPNbq8d.js`
- Main chunk (gzip): `91.71 kB` (Vite output)
- Number of chunks: `307`
- Main chunk reduction:
  - Before: `2,025.10 KB`
  - After: `287.05 KB`
  - Reduction: `1,738.05 KB` (`85.83%`)
- Total bundle size reduction:
  - Before: `10,539.29 KB`
  - After: `10,622.76 KB`
  - Change: `+83.47 KB`

### Result

- Total reduction achieved:
  - Option A: no. Total bundle size increased slightly because route-splitting created more individual sourcemaps and chunk metadata.
  - Option B: yes. The initial entry chunk was reduced by `85.83%`.
- Threshold met: `Option B`
- Passing verdict: yes

### Verification Notes

- `pnpm --filter @ship/web exec vite build --sourcemap` passes after the bundle changes.
- `pnpm --filter @ship/web test` still fails, but the failures are pre-existing and unchanged by this work:
  - `src/styles/drag-handle.test.ts`
  - `src/lib/document-tabs.test.ts`
  - `src/components/editor/DetailsExtension.test.ts`
  - `src/hooks/useSessionTimeout.test.ts`
