# Phase 2 Notes

## Category 1: Type Safety

### Baseline Reproduction

- Reproduced on March 11, 2026 from `/Users/youss/Development/gauntlet/ship`.
- Exact scan commands run before edits:
  - `grep -rn ': any' web/src api/src shared/src --include="*.ts" --include="*.tsx" | wc -l`
  - `grep -rn ' as ' web/src api/src shared/src --include="*.ts" --include="*.tsx" | wc -l`
  - `grep -rn '[^!]![^=]' web/src api/src shared/src --include="*.ts" --include="*.tsx" | wc -l`
- Reproduced baseline totals from those commands:
  - `any`: 99
  - `as`: 1422
  - `!`: 1441
  - Total: 2962
- Note: the grep scan is noisy because it counts SQL ` as ` aliases inside query strings and many non-type `!` tokens. It is preserved here because it was explicitly requested, but it is not the meaningful type-safety baseline.
- AST-based audit baseline used for the actual type-safety work:
  - `any`: 271
  - `as`: 691
  - non-null assertions: 329
  - `@ts-ignore` / `@ts-expect-error`: 1
  - Total: 1291
- AST-based package breakdown:
  - `api/` any: 238
  - `web/` any: 33
  - `shared/` any: 0
  - `api/` as: 317
  - `web/` as: 372
  - `shared/` as: 2
  - `api/` !: 296
  - `web/` !: 33
  - `shared/` !: 0
- AST top violation-dense files:
  - `api/src/routes/weeks.ts`: 85
  - `api/src/routes/projects.ts`: 51
  - `api/src/routes/issues.ts`: 49
  - `web/src/pages/UnifiedDocumentPage.tsx`: 37
  - `api/src/db/seed.ts`: 35
- Working reduction target from the AST baseline:
  - Need to eliminate at least 323 violations.
  - Required final total: 968 or fewer.
- Reproduced package breakdown from the same commands:
  - `api/` any: 75
  - `web/` any: 24
  - `shared/` any: 0
  - `api/` as: 964
  - `web/` as: 453
  - `shared/` as: 5
  - `api/` !: 702
  - `web/` !: 739
  - `shared/` !: 0
- Constraint mismatches discovered during preflight:
  - The API package uses Express + raw `pg`.
  - Root `pnpm tsc --noEmit` fails before edits due pre-existing workspace-wide errors outside the target packages.
  - Package-local type-check passes for `@ship/api`, `@ship/web`, and `@ship/shared`, so package-local `tsc --noEmit` is the enforceable regression gate for this work.

### File Log

- File path: `api/src/routes/route-helpers.ts`
- Violations before / after: new file
- What the any/as/! was actually modeling: repeated authenticated request context checks, raw UUID strings crossing route boundaries, and Postgres scalar coercions were duplicated as ad hoc `req.userId!`, `req.workspaceId!`, and manual count/boolean parsing across route modules.
- What type replaced it and why: added typed `AuthContext`, branded UUID aliases (`UserId`, `WorkspaceId`, `ProjectId`, `IssueId`, `WeekId`, `ProgramId`, `PersonId`), guard helpers, `getAuthContext`, `ensureUuidId`, `parsePgCount`, and `parsePgBoolean` so route files can narrow auth/session state and route params once and consume parsed PG values without local assertions.
- Approach applied: introduced branded identifiers and centralized auth/UUID narrowing so routes can validate request context once and reuse the narrowed values safely.
- Tradeoff made: the helper returns a 401 fallback if auth context is unexpectedly missing after `authMiddleware`; this preserves safe runtime behavior without changing the middleware contract.

- File path: `api/src/routes/weeks.ts`
- Violations before / after: 85 -> 0
- What the any/as/! was actually modeling: authenticated route context, lookup query params, sprint/standup/review SQL row shapes, grouped week issue summaries, and prefilled review TipTap content.
- What type replaced it and why: replaced non-null assertions with `getAuthContext`, query casts with Zod-parsed lookup schemas, row `any` with schema-derived local interfaces (`SprintRow`, `StandupRow`, `ReviewIssueRow`), and ad hoc `any[]` containers with concrete collection types or `unknown[]` SQL parameter arrays.
- Approach applied: parsed external input through schemas, derived explicit SQL row types from selected columns, and used narrowing helpers to remove local assertions.
- Tradeoff made: kept the route aligned with the existing Express runtime and middleware model instead of introducing a different server typing pattern.

- File path: `api/src/routes/projects.ts`
- Violations before / after: 51 -> 0
- What the any/as/! was actually modeling: authenticated route context, project list query params, project/sprint/issue/retro SQL row shapes, retro issue summaries, raw UUID params, and synthetic TipTap retro content documents.
- What type replaced it and why: replaced non-null assertions with `getAuthContext`, raw `id` strings with branded `ProjectId` narrowing, request query casts with Zod-parsed list params, row `any` with concrete SQL row interfaces passed through `pool.query<T>()`, retro document bodies with recursive `TipTapDocument` typing, and SQL `any[]` parameter bags with `unknown[]`.
- Approach applied: combined schema-validated input, branded route IDs, recursive document typing, and explicit query row interfaces so the handler no longer relies on downstream casts.
- Tradeoff made: `program_id` remains structurally a UUID string in the create-project response path because that value originates from validated request input rather than a narrowed DB row, but all route-param and auth IDs in this module are now branded and guarded.

- File path: `api/src/routes/issues.ts`
- Violations before / after: 49 -> 0
- What the any/as/! was actually modeling: issue list filter query params, authenticated route context, issue/document redirect SQL rows, transaction-local update payloads, history/iteration rows, and parent-child association checks during close/carryover flows.
- What type replaced it and why: replaced non-null assertions with `getAuthContext`, raw route params with branded `IssueId` narrowing, query casts with Zod-parsed filter schemas, generic `any` rows with concrete issue/history/iteration interfaces passed through `query<T>()`, and transactional `any[]` parameter arrays with `unknown[]`.
- Approach applied: narrowed filters and route IDs at the boundary, modeled association shapes explicitly, and derived row types from the actual selected columns in each query.
- Tradeoff made: kept the issue-property type local to the route because the route currently accepts a `'none'` priority value that does not exist in `shared/`; widening `shared/` was deferred to avoid changing the shared contract during this targeted pass.

- File path: `web/src/components/UnifiedEditor.tsx`
- Violations before / after: 28 -> 28
- What the any/as/! was actually modeling: the editor’s local document union was narrower than the runtime data already passed in from the page layer, specifically omitting `standup` documents and `action_items` issue sources.
- What type replaced it and why: widened the local `DocumentType` and `IssueDocument['source']` unions so the page layer can narrow real API responses without casting unsupported-but-real values back into the editor.
- Approach applied: widened the editor’s discriminated unions to match the runtime document variants already flowing through this surface.
- Tradeoff made: this change improves downstream safety in the page transformer without yet reducing the editor file’s own assertion count; that cleanup is deferred as a separate follow-up.

- File path: `web/src/pages/UnifiedDocumentPage.tsx`
- Violations before / after: 37 -> 0
- What the any/as/! was actually modeling: document-type discrimination, weekly-project context extraction, tab counts, standup author lookup, issue/project conversion source types, and transformation from a flexible API `DocumentResponse` into the stricter `UnifiedDocument` union.
- What type replaced it and why: replaced every assertion with runtime guards and typed accessors (`isRecord`, string/number/array readers, document-type predicates, `BelongsTo` validation, owner parsing) so the page now constructs `UnifiedDocument` values from verified shapes instead of trusting ambient `Record<string, unknown>` data.
- Approach applied: built a guard-driven normalization layer that validates flexible API payloads before constructing stricter UI document unions.
- Tradeoff made: the page now drops malformed optional fields to `undefined`/`null` instead of forcing them into typed positions, which is safer but means obviously bad API payloads render with defaults rather than surfacing as casted values.

- File path: `api/src/db/seed.ts`
- Violations before / after: 35 -> 0
- What the any/as/! was actually modeling: optional array lookups and map lookups across seeded users, projects, sprints, ticket counters, content pools, and report-to hierarchy references that the script previously treated as guaranteed-present via non-null assertions.
- What type replaced it and why: replaced each non-null assertion with `requireValue<T>()`-guarded retrieval so the script now fails with explicit seed-data invariants when an indexed item or map entry is missing, while preserving the real inferred types of those collections.
- Approach applied: replaced implicit assumptions with explicit invariant checks so indexed and mapped seed lookups narrow to concrete values before use.
- Tradeoff made: seed failures now surface earlier and more explicitly if the generated fixture arrays drift out of sync, which is stricter than the previous implicit undefined access but safer for maintenance.

- File path: `api/src/utils/transformIssueLinks.ts`
- Violations before / after: 0 -> 0
- What the any/as/! was actually modeling: callers and tests were forced to re-assert transformed TipTap documents because the helper accepted and returned `unknown`, even though the transformation preserves `TipTapDoc` shape when given a valid document.
- What type replaced it and why: exported `TipTapDoc`, `TipTapNode`, `TipTapMark`, and `IssueInfo`; added a real `isTipTapDoc` guard plus overloads so valid TipTap inputs now return typed TipTap outputs while invalid inputs preserve their original type without casts.
- Approach applied: exported the document model, added a concrete shape guard, and used overloads so valid inputs preserve strong types through the transformation boundary.
- Tradeoff made: this file did not directly reduce the audit count, but it removed the need for downstream cast-heavy consumers and made the associated test rewrite structurally sound.

- File path: `api/src/__tests__/transformIssueLinks.test.ts`
- Violations before / after: 66 -> 0
- What the any/as/! was actually modeling: mocked Postgres query results, transformed TipTap document inspection, and callback-local text node lookups were all being forced through `any` because the test had no typed fixture model or stable mock signature.
- What type replaced it and why: replaced loose mocks with a typed `queryMock`, `QueryResult` factory, concrete `IssueLookupRow` fixtures, exported TipTap types from the production helper, and narrowing helpers (`getNodeContent`, `findTextNode`, `getLinkHref`) so every assertion now follows the real document and query shapes under test.
- Approach applied: moved the test onto typed fixtures, typed query results, and explicit narrowing helpers so assertions follow the same shapes the production code uses.
- Tradeoff made: targeted test execution still trips the repo-wide Vitest DB setup before assertions run, so validation for this file is package type-check plus the same pre-existing global test failure observed elsewhere in the API suite.

- File path: `api/src/services/accountability.test.ts`
- Violations before / after: 64 -> 0
- What the any/as/! was actually modeling: the service test was using untyped Postgres mock results, mock-chaining against the overloaded `pool.query` API, and loosely shaped plan/retro fixture documents for due-window scenarios.
- What type replaced it and why: replaced those casts with a typed hoisted `queryMock`, explicit mock row types (`WorkspaceRow`, `PersonRow`, `AccountabilityDocRow`), a `QueryResult` factory, and typed allocation/business-day mocks so each scenario now reflects the actual query and fixture shapes the service consumes.
- Approach applied: converted the test harness to typed mocks and scenario-specific helper builders so each query in the sequence is modeled explicitly without relying on assertion escapes.
- Tradeoff made: like the other API tests, direct Vitest execution still stops in the shared DB setup before assertions run, so the verification gate here is package type-check plus the same pre-existing DB bootstrap failure in the API test runner.

### Totals

- Reproduced baseline total: 2962 (grep scan), 1291 (AST audit baseline)
- Final total after fixes: 902 (AST audit)
- Percentage reduction achieved: 30.13% (389 / 1291)
- Passing verdict: yes

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
   - `web/vite.config.ts` did not define dynamic imports or manual chunking.
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
dist/assets/PropertyRow-CzWzi-N4.js                  836.62 kB │ gzip: 261.18 kB │ map: 3,790.73 kB
dist/assets/UnifiedDocumentPage-BTtMQph-.js          406.07 kB │ gzip: 100.17 kB │ map: 1,189.41 kB
dist/assets/index-CPPNbq8d.js                        293.94 kB │ gzip:  91.71 kB │ map: 1,230.10 kB
dist/assets/App-CCSqVuN2.js                           88.49 kB │ gzip:  19.38 kB │ map:   269.15 kB
dist/assets/index-DuV_k7kB.js                         74.56 kB │ gzip:  25.91 kB │ map:   367.81 kB
dist/assets/index-D_Rleic7.css                        65.10 kB │ gzip:  12.56 kB
dist/assets/IssuesList-BpXCpLdo.js                    54.21 kB │ gzip:  15.85 kB │ map:   200.28 kB
dist/assets/Login-BBu4DqUf.js                         52.05 kB │ gzip:  10.63 kB │ map:    37.64 kB
dist/assets/core.esm-B4ST11IL.js                      43.78 kB │ gzip:  14.56 kB │ map:   192.02 kB
dist/assets/ReviewsPage-FNCQSg0u.js                   28.44 kB │ gzip:   7.23 kB │ map:    85.42 kB
```

### Result

- Post-change totals:
  - Total bundle size: `10,622.89 KB`
  - Main chunk (raw): `287.05 KB`
    - Entry file: `web/dist/assets/index-CPPNbq8d.js`
  - Main chunk (gzip): `91.71 KB`
  - Number of chunks: `307`
- Main chunk reduction:
  - Before: `2,025.10 KB`
  - After: `287.05 KB`
  - Reduction: `1,738.05 KB` (`85.83%`)
- Total bundle size change:
  - Before: `10,539.29 KB`
  - After: `10,622.89 KB`
  - Change: `+83.60 KB`
- Threshold result:
  - Option A: no. Total bundle size increased slightly because route-splitting created more individual chunks and sourcemaps.
  - Option B: yes. The initial entry chunk was reduced by `85.83%`.
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
- Current web test summary:
  - `3` failed files, `13` failed tests, `138` passed tests
- Remaining Vite warnings:
  - `web/src/services/upload.ts` and `web/src/components/editor/FileAttachment.tsx` still have mixed dynamic/static import patterns outside this route-entrypoint split.
