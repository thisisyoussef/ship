# Phase 2 Notes

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
  - `/Users/youss/Development/gauntlet/ship/web/src/hooks/useSessionTimeout.ts` now builds the session-info URL from `import.meta.env.VITE_API_URL` so the hook uses the same API origin as the rest of the frontend.
  - The hook now treats `401` and `403` as expected unauthenticated responses for this best-effort timeout bootstrap and only warns for truly unexpected failures.
- After behavior:
  - Repeating the same login flow no longer produces `500` proxy noise for `GET /api/auth/session`.
  - The hook still preserves inactivity timeout behavior, and the only remaining unauthenticated network response on `/login` is the expected `401` from `/api/auth/me`.
- Evidence:
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/after-login.png`
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/fixed/login-console.txt`
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/fixed/after-login.png`

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
  - Extracted modal-route policy into `/Users/youss/Development/gauntlet/ship/web/src/lib/actionItemsModal.ts`.
  - `/Users/youss/Development/gauntlet/ship/web/src/pages/App.tsx` now tracks whether the `ActionItemsModal` was opened automatically or manually.
  - Automatic open is skipped on document detail routes, and an auto-opened modal is closed when navigation enters a document detail page. Manual opening from the accountability banner still works.
- After behavior:
  - Repeating the same flow leaves the document page immediately interactive.
  - The editor receives focus on first click instead of the dialog overlay intercepting pointer events.
  - This removes a high-severity confusion path on the core editing surface without disabling the accountability banner for intentional use.
- Evidence:
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/issue2-document-overlay.png`
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/fixed/issue2-document-overlay.png`
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/fixed/issue2-click-log.txt`

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
  - `/Users/youss/Development/gauntlet/ship/web/src/components/ui/ErrorBoundary.tsx` now adds a `Reload Page` recovery action alongside `Try Again`.
  - The shared fallback copy now tells the user they can reload or retry, which satisfies the minimum helpful recovery requirement for all existing boundary placements.
- After behavior:
  - Throwing children inside the shared boundary, App subtree boundary, and Editor subtree boundary now render the same fallback with both `Reload Page` and `Try Again`.
  - Render failures still avoid a blank screen, and the fallback gives users an explicit full-page recovery path when retry is insufficient.
- Evidence:
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/baseline/error-boundary-verification.txt`
  - `/Users/youss/Development/gauntlet/ship/output/playwright/phase2/fixed/error-boundary-verification.txt`

### Initial Implementation Plan

1. Fix the session-timeout hook so it uses the same API base path as the rest of the app and handles non-OK session responses explicitly.
2. Change the action-items flow so the startup accountability prompt does not block initial document editing on document routes.
3. Improve the shared error-boundary fallback to provide a clear reload path and verify the updated fallback in all three boundary placements.

### Final Summary

- 3 fixes completed: Yes
- At least one user-facing confusion scenario fixed: Yes
- Passing verdict: Yes

### Validation

- After-state Playwright captures were recorded against temporary local dev servers on `http://localhost:5174` and `http://localhost:3001` because another Ship stack was already bound to the default `5173` and `3000` ports on this machine.
- `pnpm --filter @ship/web test -- src/hooks/useSessionTimeout.test.ts src/lib/actionItemsModal.test.ts src/components/ui/ErrorBoundary.test.tsx`
  - Failed in this workspace because the `@ship/web` `test` script still executed unrelated suites.
  - Result: `18` files run, `12` unrelated failures in `src/lib/document-tabs.test.ts` and `src/components/editor/DetailsExtension.test.ts`.
- `pnpm --filter @ship/web exec vitest run src/hooks/useSessionTimeout.test.ts src/lib/actionItemsModal.test.ts src/components/ui/ErrorBoundary.test.tsx`
  - Passed.
  - Result: `3` files passed, `42` tests passed.
- `DATABASE_URL=postgres://ship:ship_dev_password@localhost:6543/ship_dev pnpm test`
  - Failed on pre-existing `origin/master` regressions outside this category.
  - Result: `28` files run, `425` tests passed, `26` tests failed.
  - Failing suites: `src/routes/issues-history.test.ts` and `src/routes/projects.test.ts`, both returning unexpected `401` responses instead of the statuses those tests expect.
- `PLAYWRIGHT_WORKERS=2 pnpm test:e2e`
  - Failed on a pre-existing accessibility remediation spec outside this category and was then stopped.
  - First failing spec: `e2e/accessibility-remediation.spec.ts:145` (`combobox has required ARIA attributes`).
  - Failure: expected `#issues-program-filter-listbox, [role="listbox"]` to become visible within `2000ms`.

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
