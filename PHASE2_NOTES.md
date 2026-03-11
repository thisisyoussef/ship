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
  - The API package is Express + raw `pg`, not Fastify + ORM.
  - Root `pnpm tsc --noEmit` fails before edits due pre-existing workspace-wide errors outside the target packages.
  - Package-local type-check passes for `@ship/api`, `@ship/web`, and `@ship/shared`, so package-local `tsc --noEmit` is the enforceable regression gate for this work.

### File Log

- File path: `api/src/routes/route-helpers.ts`
- Violations before / after: new file
- What the any/as/! was actually modeling: repeated authenticated request context checks, raw UUID strings crossing route boundaries, and Postgres scalar coercions were duplicated as ad hoc `req.userId!`, `req.workspaceId!`, and manual count/boolean parsing across route modules.
- What type replaced it and why: added typed `AuthContext`, branded UUID aliases (`UserId`, `WorkspaceId`, `ProjectId`, `IssueId`, `WeekId`, `ProgramId`, `PersonId`), guard helpers, `getAuthContext`, `ensureUuidId`, `parsePgCount`, and `parsePgBoolean` so route files can narrow auth/session state and route params once and consume parsed PG values without local assertions.
- Which skill pattern was applied: branded IDs from `typescript-advanced-patterns`; `typescript-ops` type narrowing decision tree; repo-grounded Express auth narrowing in place of the user’s stale Fastify instruction.
- Tradeoff made: the helper returns a 401 fallback if auth context is unexpectedly missing after `authMiddleware`; this preserves safe runtime behavior without changing the middleware contract.

- File path: `api/src/routes/weeks.ts`
- Violations before / after: 85 -> 0
- What the any/as/! was actually modeling: authenticated route context, lookup query params, sprint/standup/review SQL row shapes, grouped week issue summaries, and prefilled review TipTap content.
- What type replaced it and why: replaced non-null assertions with `getAuthContext`, query casts with Zod-parsed lookup schemas, row `any` with schema-derived local interfaces (`SprintRow`, `StandupRow`, `ReviewIssueRow`), and ad hoc `any[]` containers with concrete collection types or `unknown[]` SQL parameter arrays.
- Which skill pattern was applied: Zod inference from `typescript-advanced-patterns`; type narrowing and utility typing from `typescript-ops`; DB-row typing derived from raw SQL selections per `managing-database-schemas`.
- Tradeoff made: kept the route on Express instead of attempting Fastify-style generics because the repository runtime is Express and the Fastify instruction does not match the codebase.

- File path: `api/src/routes/projects.ts`
- Violations before / after: 51 -> 0
- What the any/as/! was actually modeling: authenticated route context, project list query params, project/sprint/issue/retro SQL row shapes, retro issue summaries, raw UUID params, and synthetic TipTap retro content documents.
- What type replaced it and why: replaced non-null assertions with `getAuthContext`, raw `id` strings with branded `ProjectId` narrowing, request query casts with Zod-parsed list params, row `any` with concrete SQL row interfaces passed through `pool.query<T>()`, retro document bodies with recursive `TipTapDocument` typing, and SQL `any[]` parameter bags with `unknown[]`.
- Which skill pattern was applied: branded IDs and Zod inference from `typescript-advanced-patterns`; narrowing strategy from `typescript-ops`; raw-SQL row typing derived from the schema and selected columns per `managing-database-schemas`.
- Tradeoff made: `program_id` remains structurally a UUID string in the create-project response path because that value originates from validated request input rather than a narrowed DB row, but all route-param and auth IDs in this module are now branded and guarded.

- File path: `api/src/routes/issues.ts`
- Violations before / after: 49 -> 0
- What the any/as/! was actually modeling: issue list filter query params, authenticated route context, issue/document redirect SQL rows, transaction-local update payloads, history/iteration rows, and parent-child association checks during close/carryover flows.
- What type replaced it and why: replaced non-null assertions with `getAuthContext`, raw route params with branded `IssueId` narrowing, query casts with Zod-parsed filter schemas, generic `any` rows with concrete issue/history/iteration interfaces passed through `query<T>()`, and transactional `any[]` parameter arrays with `unknown[]`.
- Which skill pattern was applied: branded IDs and discriminated association unions from `typescript-advanced-patterns`; query/body narrowing from `typescript-ops`; raw-SQL row typing derived from selected columns per `managing-database-schemas`.
- Tradeoff made: kept the issue-property type local to the route because the route currently accepts a `'none'` priority value that does not exist in `shared/`; widening `shared/` was deferred to avoid changing the shared contract during this targeted pass.

- File path: `web/src/components/UnifiedEditor.tsx`
- Violations before / after: 28 -> 28
- What the any/as/! was actually modeling: the editor’s local document union was narrower than the runtime data already passed in from the page layer, specifically omitting `standup` documents and `action_items` issue sources.
- What type replaced it and why: widened the local `DocumentType` and `IssueDocument['source']` unions so the page layer can narrow real API responses without casting unsupported-but-real values back into the editor.
- Which skill pattern was applied: additive union widening based on the `typescript-ops` narrowing workflow.
- Tradeoff made: this change improves downstream safety in the page transformer without yet reducing the editor file’s own assertion count; that cleanup is deferred as a separate follow-up.

- File path: `web/src/pages/UnifiedDocumentPage.tsx`
- Violations before / after: 37 -> 0
- What the any/as/! was actually modeling: document-type discrimination, weekly-project context extraction, tab counts, standup author lookup, issue/project conversion source types, and transformation from a flexible API `DocumentResponse` into the stricter `UnifiedDocument` union.
- What type replaced it and why: replaced every assertion with runtime guards and typed accessors (`isRecord`, string/number/array readers, document-type predicates, `BelongsTo` validation, owner parsing) so the page now constructs `UnifiedDocument` values from verified shapes instead of trusting ambient `Record<string, unknown>` data.
- Which skill pattern was applied: Type Narrowing Decision Tree from `typescript-ops`; additive union widening from `typescript-advanced-patterns` where the page and editor contracts had drifted.
- Tradeoff made: the page now drops malformed optional fields to `undefined`/`null` instead of forcing them into typed positions, which is safer but means obviously bad API payloads render with defaults rather than surfacing as casted values.

### Totals

- Reproduced baseline total: 2962 (grep scan), 1291 (AST audit baseline)
- Final total after fixes: pending
- Percentage reduction achieved: pending
- Passing verdict: pending
