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

- Reproduced on March 11, 2026 from `/Users/youss/Development/gauntlet/ship` during the original category run.
- Exact build command:
  - `pnpm --filter @ship/web exec vite build --sourcemap`
- Exact chunk listing command:
  - `pnpm --filter @ship/web exec vite build --sourcemap 2>&1 | grep -E '\.(js|css)' | sort -k2 -rh | head -30`
- Baseline totals:
  - Total bundle size: `10,539.29 KB`
  - Main chunk (raw): `2,025.10 KB`
  - Main chunk (gzip): `587.62 KB`
  - Number of chunks: `262`
- Baseline discrepancy note:
  - No material discrepancy from the audit. Total size matched exactly and the main chunk differed by `0.04 KB`, well below the allowed 5%.

### Diagnosis Findings

1. Which modules were dynamically imported before the fix?
   - `web/vite.config.ts` does not define any dynamic imports or manual chunking.
   - Existing dynamic imports were limited to:
     - `React.lazy()` tab modules in `web/src/lib/document-tabs.tsx`
     - `import('@/services/upload')` and `import('./FileAttachment')` in `web/src/components/editor/SlashCommands.tsx`
     - `import.meta.glob('/node_modules/@uswds/uswds/dist/img/usa-icons/*.svg', { query: '?react' })` in `web/src/components/icons/uswds/Icon.tsx`
   - `web/src/main.tsx` still statically imported every route page, including editor-bearing routes.

2. Were any dynamically imported modules also statically imported elsewhere?
   - Yes. Vite reported two broken splits that still remain after this route-level work:
     - `web/src/services/upload.ts` is dynamically imported by `web/src/components/editor/SlashCommands.tsx` but also statically imported by `web/src/components/editor/FileAttachment.tsx` and `web/src/components/editor/ImageUpload.tsx`.
     - `web/src/components/editor/FileAttachment.tsx` is dynamically imported by `web/src/components/editor/SlashCommands.tsx` but also statically imported by `web/src/components/Editor.tsx`.
   - More importantly, route-level splitting was missing entirely:
     - `web/src/main.tsx` statically imported `UnifiedDocumentPage`, `PersonEditor`, and every other page.
     - `UnifiedDocumentPage` statically imported the editor surface, which in turn pulled `yjs`, `lowlight`, TipTap, and ProseMirror into the initial app graph.

3. Which top contributors could be deferred?
   - `emoji-picker-react`: yes, only needed from editor-adjacent UI.
   - `highlight.js` / `lowlight`: yes, only needed for editor code blocks.
   - `yjs`: yes, only needed for collaborative editing routes.
   - `prosemirror-view` and the rest of the TipTap/ProseMirror stack: yes, only needed when editor routes render.
   - `react-router`: no meaningful defer opportunity; it is part of the SPA bootstrap path.

4. Were the flagged unused dependencies actually unused?
   - `@tanstack/query-sync-storage-persister`: yes, confirmed unused in `web/src`.
     - Verification command:
       - `grep -rn "@tanstack/query-sync-storage-persister" web/src --include="*.ts" --include="*.tsx"`
     - Result: no matches.
   - `@uswds/uswds`: no, confirmed used.
     - Verification command:
       - `grep -rn "@uswds/uswds" web/src --include="*.ts" --include="*.tsx"`
     - Result: used indirectly by `web/src/components/icons/uswds/Icon.tsx` through `import.meta.glob()` against the USWDS SVG icon set.

### Changes Made

- Removed the verified-dead `@tanstack/query-sync-storage-persister` dependency from `web/package.json` and `pnpm-lock.yaml`.
- Converted top-level page imports in `web/src/main.tsx` to `React.lazy()` route chunks, added a `Suspense` fallback around the route tree, and lazy-loaded React Query devtools only in development.

### After Build Output

```text
dist/assets/PropertyRow-D37wzZcz.js                  836.62 kB │ gzip: 261.18 kB │ map: 3,790.73 kB
dist/assets/UnifiedDocumentPage-Tfkycbpp.js          404.47 kB │ gzip:  99.69 kB │ map: 1,182.93 kB
dist/assets/index-BbcoF1g7.js                        293.94 kB │ gzip:  91.72 kB │ map: 1,230.10 kB
dist/assets/App-CZGxE5LI.js                           88.49 kB │ gzip:  19.38 kB │ map:   269.15 kB
dist/assets/index-C4pl0brL.js                         74.56 kB │ gzip:  25.90 kB │ map:   367.81 kB
dist/assets/index-D_Rleic7.css                        65.10 kB │ gzip:  12.56 kB
dist/assets/IssuesList-DEUo14QD.js                    54.21 kB │ gzip:  15.85 kB │ map:   200.28 kB
dist/assets/Login-mVjEil6L.js                         52.05 kB │ gzip:  10.62 kB │ map:    37.64 kB
dist/assets/core.esm-CZpL4_kp.js                      43.78 kB │ gzip:  14.56 kB │ map:   192.02 kB
dist/assets/ReviewsPage-DzVAY8vG.js                   28.44 kB │ gzip:   7.23 kB │ map:    85.42 kB
```

### Result

- Post-change totals:
  - Total bundle size: `10,614.99 KB`
  - Main chunk (raw): `293.94 KB`
  - Main chunk (gzip): `91.72 KB`
  - Number of chunks: `307`
- Main chunk reduction:
  - Before: `2,025.10 KB`
  - After: `293.94 KB`
  - Reduction: `1,731.16 KB` (`85.49%`)
- Total bundle size change:
  - Before: `10,539.29 KB`
  - After: `10,614.99 KB`
  - Change: `+75.70 KB`
- Threshold result:
  - Option A: no. Total bundle size increased slightly because route-splitting created more individual chunks and sourcemaps.
  - Option B: yes. The initial entry chunk was reduced by `85.49%`.
- Passing verdict: yes

### Verification

- `pnpm install` — pass
- `pnpm --filter @ship/shared build` — pass
- `pnpm --filter @ship/web exec vite build --sourcemap` — pass
- `pnpm --filter @ship/web test` — fail
- Pre-existing failing suites during verification:
  - `src/lib/document-tabs.test.ts`
  - `src/components/editor/DetailsExtension.test.ts`
  - `src/hooks/useSessionTimeout.test.ts`
- Remaining Vite warnings:
  - `web/src/services/upload.ts` and `web/src/components/editor/FileAttachment.tsx` still have mixed dynamic/static import patterns outside this route-entrypoint split.
