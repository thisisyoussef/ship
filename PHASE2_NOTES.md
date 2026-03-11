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

## Category 7: Accessibility

### Baseline Reproduction

- Reproduced on March 11, 2026 from `/Users/youss/Development/gauntlet/ship`.
- Local stack used: `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d`
- Auth used: `dev@ship.local / admin123`
- Lighthouse baseline commands run with an authenticated persistent Chromium profile:
  - `lighthouse http://localhost:5173/docs --only-categories=accessibility`
  - `lighthouse http://localhost:5173/issues --only-categories=accessibility`
  - `lighthouse http://localhost:5173/my-week --only-categories=accessibility`
- Saved Lighthouse baseline artifacts:
  - `/Users/youss/Development/gauntlet/ship/audit/lighthouse-docs-baseline.json`
  - `/Users/youss/Development/gauntlet/ship/audit/lighthouse-issues-baseline.json`
  - `/Users/youss/Development/gauntlet/ship/audit/lighthouse-my-week-baseline.json`
  - `/Users/youss/Development/gauntlet/ship/audit/lighthouse-document-baseline.json`
- Reproduced Lighthouse accessibility scores:
  - `/docs`: `100`
  - `/issues`: `100`
  - `/my-week`: `100`
- Note on Lighthouse `/documents/:id`:
  - The authenticated CLI run wrote a baseline report, but `finalUrl` resolved to `/` in that artifact.
  - I used axe as the authoritative before/after evidence for `/documents/:id`, which matches the task threshold and the measured failures.
- Axe baseline scan command:
  - `node scripts/axe-scan.js baseline`
- Saved axe artifacts:
  - Baseline output preserved in `/Users/youss/Development/gauntlet/ship/audit/axe-baseline.txt`
  - After JSON preserved in `/Users/youss/Development/gauntlet/ship/audit/axe-after.json`
  - After console output preserved in `/Users/youss/Development/gauntlet/ship/audit/axe-after.txt`
- Baseline discrepancy vs provided audit table:
  - `/docs` reproduced as `1 critical + 1 serious`, not `2 critical`.
  - `/documents/:id` reproduced as `1 critical + 1 serious`, not `2 critical`.
  - `/my-week` reproduced as `1 serious rule` with `12 failing nodes`, not `18 separate serious rule objects`.
  - I proceeded with the reproduced state and recorded the mismatch before editing.

### Diagnosis

1. What are the Critical violations on `/docs`?
- Reproduced critical violation ID: `aria-required-children`.
- Affected element:
  - `<ul role="tree" aria-label="Workspace documents" aria-live="polite" class="space-y-0.5 px-2">`
- Reproduced companion serious violation on the same surface:
  - `listitem`
  - `<li><a ... href="/docs?filter=workspace">305 more...</a></li>`
- Root cause:
  - The workspace navigation tree in `/Users/youss/Development/gauntlet/ship/web/src/pages/App.tsx` included a non-tree child (`<li>` wrapping the `305 more...` link) inside a `role="tree"` container.

2. What are the Serious violations on `/my-week`?
- Reproduced serious violation ID: `color-contrast`.
- Failing elements and ratios from the reproduced baseline:
  - `<span class="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">Current</span>`: `2.55:1`, required `4.5:1`
  - `<span class="text-[11px] font-semibold text-muted/50 ...">1.</span>`: `2.26:1`, required `4.5:1`
  - `<span class="text-[11px] font-semibold text-muted/50 ...">2.</span>`: `2.26:1`, required `4.5:1`
  - `<span class="text-[11px] font-semibold text-muted/50 ...">3.</span>`: `2.26:1`, required `4.5:1`
  - `<span class="text-[11px] font-semibold text-muted/50 ...">4.</span>`: `2.26:1`, required `4.5:1`
  - `<span class="text-xs font-medium text-accent">Wed</span>`: `2.82:1`, required `4.5:1`
  - `<span class="text-xs font-medium text-muted">Thu</span>`: `1.84:1`, required `4.5:1`
  - `<span class="text-xs text-muted ml-1">3/12</span>`: `1.84:1`, required `4.5:1`
  - `<span class="text-xs text-muted italic">Upcoming</span>`: `1.84:1`, required `4.5:1`
  - `<span class="text-xs font-medium text-muted">Fri</span>`: `1.84:1`, required `4.5:1`
  - `<span class="text-xs text-muted ml-1">3/13</span>`: `1.84:1`, required `4.5:1`
  - `<span class="text-xs text-muted italic">Upcoming</span>`: `1.84:1`, required `4.5:1`

3. What are the Critical violations on `/documents/:id`?
- Same reproduced pattern as `/docs`.
- Critical violation ID: `aria-required-children`
- Companion serious violation ID: `listitem`
- Affected elements:
  - Tree root: `<ul role="tree" aria-label="Workspace documents" ...>`
  - Trailing more-link row: `<li><a ... href="/docs?filter=workspace">305 more...</a></li>`

4. What CSS variables or colors produced the `/my-week` contrast failures?
- The failing global theme tokens came from `/Users/youss/Development/gauntlet/ship/web/tailwind.config.js`:
  - `accent: #005ea2`
  - `muted: #8a8a8a`
- The actual failures were page-specific combinations in `/Users/youss/Development/gauntlet/ship/web/src/pages/MyWeekPage.tsx`:
  - `text-accent` on `bg-accent/20` for the `Current` chip
  - `text-accent` on `bg-accent/5` for the current-day label
  - `text-muted/50` on 11px list indices
  - `opacity-40` applied to future rows, which reduced effective `text-muted` to the failing computed color shown by axe (`#3f3f3f`)
- Conclusion:
  - The underlying tokens are shared, but the failing contrast came from `/my-week`-specific class combinations rather than a globally broken text token.

5. Is keyboard navigation partial because of missing focus indicators, incorrect tab order, or unreachable interactive elements?
- Reproduced keyboard sweep result:
  - After dismissing the startup action-items modal, the tested controls on `/docs`, `/my-week`, and `/documents/:id` were reachable with `Tab`.
  - Visible focus styling was present via `/Users/youss/Development/gauntlet/ship/web/src/index.css` `:focus-visible`.
  - The early tab order was logical: skip link, accountability button, avatar/menu, then primary navigation rail buttons.
- Conclusion:
  - I did not reproduce a keyboard failure driven by missing focus indicators, broken tab order, or unreachable interactive elements on the audited flows.
  - The only notable focus behavior was the intentionally modal action-items dialog owning first focus until dismissed.

### Reproduced Axe Output

```text
=== /docs ===
Critical: 1
Serious: 1
Total: 2
[critical] aria-required-children: Ensure elements with an ARIA role that require child roles contain them
  Element: <ul role="tree" aria-label="Workspace documents" aria-live="polite" class="space-y-0.5 px-2">
  Failure: Fix any of the following: Element has children which are not allowed: li[tabindex]
[serious] listitem: Ensure <li> elements are used semantically
  Element: <li><a class="block px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-border/30 rounded-md transition-colors" href="/docs?filter=workspace" data-discover="true">305 more...</a></li>
  Failure: Fix any of the following: List item parent element has a role that is not role="list"

=== /issues ===
Critical: 0
Serious: 0
Total: 0
No critical or serious violations.

=== /my-week ===
Critical: 0
Serious: 1
Total: 1
[serious] color-contrast: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
  Element: <span class="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">Current</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 2.55 (foreground color: #005ea2, background color: #0a1d2b, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-[11px] font-semibold text-muted/50 w-4 text-right shrink-0 mt-0.5">1.</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 2.26 (foreground color: #4c4c4c, background color: #0d0d0d, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-[11px] font-semibold text-muted/50 w-4 text-right shrink-0 mt-0.5">2.</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 2.26 (foreground color: #4c4c4c, background color: #0d0d0d, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-[11px] font-semibold text-muted/50 w-4 text-right shrink-0 mt-0.5">3.</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 2.26 (foreground color: #4c4c4c, background color: #0d0d0d, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-[11px] font-semibold text-muted/50 w-4 text-right shrink-0 mt-0.5">4.</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 2.26 (foreground color: #4c4c4c, background color: #0d0d0d, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-xs font-medium text-accent">Wed</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 2.82 (foreground color: #005ea2, background color: #0c1114, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-xs font-medium text-muted">Thu</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 1.84 (foreground color: #3f3f3f, background color: #0d0d0d, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-xs text-muted ml-1">3/12</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 1.84 (foreground color: #3f3f3f, background color: #0d0d0d, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-xs text-muted italic">Upcoming</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 1.84 (foreground color: #3f3f3f, background color: #0d0d0d, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-xs font-medium text-muted">Fri</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 1.84 (foreground color: #3f3f3f, background color: #0d0d0d, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-xs text-muted ml-1">3/13</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 1.84 (foreground color: #3f3f3f, background color: #0d0d0d, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  Element: <span class="text-xs text-muted italic">Upcoming</span>
  Failure: Fix any of the following: Element has insufficient color contrast of 1.84 (foreground color: #3f3f3f, background color: #0d0d0d, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1

=== /documents/7071de1d-3ac4-43d4-9f86-dbea7d788f53 ===
Critical: 1
Serious: 1
Total: 2
[critical] aria-required-children: Ensure elements with an ARIA role that require child roles contain them
  Element: <ul role="tree" aria-label="Workspace documents" aria-live="polite" class="space-y-0.5 px-2">
  Failure: Fix any of the following: Element has children which are not allowed: li[tabindex]
[serious] listitem: Ensure <li> elements are used semantically
  Element: <li><a class="block px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-border/30 rounded-md transition-colors" href="/docs?filter=workspace" data-discover="true">305 more...</a></li>
  Failure: Fix any of the following: List item parent element has a role that is not role="list"
```

### Fix Log

#### Fix 1: Shared workspace tree semantics

- Violation IDs:
  - `aria-required-children` (`critical`)
  - `listitem` (`serious`)
- Affected element snippets:
  - `<ul role="tree" aria-label="Workspace documents" ...>`
  - `<li><a ... href="/docs?filter=workspace">305 more...</a></li>`
- Root cause:
  - The `more...` overflow link lived inside the tree container as a plain list item instead of a tree item.
- Fix applied:
  - In `/Users/youss/Development/gauntlet/ship/web/src/pages/App.tsx`, moved the workspace/private `N more...` links out of the `role="tree"` lists so the tree contains only actual document tree items.
- Axe output after fix:
  - `/docs`: `Critical: 0`, `Serious: 0`
  - `/documents/:id`: `Critical: 0`, `Serious: 0`

#### Fix 2: `/my-week` contrast

- Violation ID:
  - `color-contrast` (`serious`)
- Affected element snippets:
  - `<span class="text-xs bg-accent/20 text-accent ...">Current</span>`
  - `<span class="text-[11px] font-semibold text-muted/50 ...">1.</span>`
  - `<span class="text-xs font-medium text-accent">Wed</span>`
  - Future-row labels using `text-muted` under a parent with `opacity-40`
- Root cause:
  - Tiny text was rendered with accent-on-accent-tint or muted/50 on dark backgrounds.
  - Future daily-update rows used `opacity-40`, which dragged otherwise-compliant muted text below the required ratio.
- Fix applied:
  - In `/Users/youss/Development/gauntlet/ship/web/src/pages/MyWeekPage.tsx`:
    - changed the `Current` badge to an accessible solid accent chip with white text,
    - changed the 11px list numerals from `text-muted/50` to `text-muted`,
    - removed `opacity-40` from future daily-update rows,
    - changed the current-day label from `text-accent` to `text-blue-300`.
- Axe output after fix:
  - `/my-week`: `Critical: 0`, `Serious: 0`

### Final Axe Scan Output

```text
=== /docs ===
Critical: 0
Serious: 0
Total: 0
No critical or serious violations.

=== /issues ===
Critical: 0
Serious: 0
Total: 0
No critical or serious violations.

=== /my-week ===
Critical: 0
Serious: 0
Total: 0
No critical or serious violations.

=== /documents/c30cc978-0477-4120-a124-603e44829126 ===
Critical: 0
Serious: 0
Total: 0
No critical or serious violations.
```

### Keyboard Navigation Sweep

- Before:
  - A startup action-items modal took initial focus until dismissed.
  - After dismissing it, `/docs`, `/my-week`, and `/documents/:id` all exposed visible focus styles and reachable controls in a logical tab order.
- After:
  - Same result after the fixes.
  - The accessibility fixes did not introduce unreachable controls or focus regressions.

### Verification Notes

- `pnpm --filter @ship/web test`
  - First run immediately after the tree-only change surfaced unrelated transient failures in `document-tabs.test.ts` and `DetailsExtension.test.ts`.
  - Second run after the `/my-week` change passed cleanly: `16 passed`, `153 passed`.
  - Final verification rerun before commit passed cleanly: `18 passed`, `161 passed`.
- Final axe verification command:
  - `node scripts/axe-scan.js after | tee audit/axe-after.txt`

### Final Summary

- Required outcome:
  - `/docs`: pass
  - `/my-week`: pass
  - `/documents/:id`: pass
- Passing verdict: yes
