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
- What the any/as/! was actually modeling: repeated authenticated request context checks and Postgres scalar coercions were duplicated as ad hoc `req.userId!`, `req.workspaceId!`, and manual count/boolean parsing across route modules.
- What type replaced it and why: added typed `AuthContext`, `JsonObject`, `getAuthContext`, `parsePgCount`, and `parsePgBoolean` helpers so route files can narrow auth/session state once and consume parsed PG values without local assertions.
- Which skill pattern was applied: `typescript-ops` type narrowing decision tree; repo-grounded Express auth narrowing in place of the user’s stale Fastify instruction.
- Tradeoff made: the helper returns a 401 fallback if auth context is unexpectedly missing after `authMiddleware`; this preserves safe runtime behavior without changing the middleware contract.

- File path: `api/src/routes/weeks.ts`
- Violations before / after: 85 -> 0
- What the any/as/! was actually modeling: authenticated route context, lookup query params, sprint/standup/review SQL row shapes, grouped week issue summaries, and prefilled review TipTap content.
- What type replaced it and why: replaced non-null assertions with `getAuthContext`, query casts with Zod-parsed lookup schemas, row `any` with schema-derived local interfaces (`SprintRow`, `StandupRow`, `ReviewIssueRow`), and ad hoc `any[]` containers with concrete collection types or `unknown[]` SQL parameter arrays.
- Which skill pattern was applied: Zod inference from `typescript-advanced-patterns`; type narrowing and utility typing from `typescript-ops`; DB-row typing derived from raw SQL selections per `managing-database-schemas`.
- Tradeoff made: kept the route on Express instead of attempting Fastify-style generics because the repository runtime is Express and the Fastify instruction does not match the codebase.

### Totals

- Reproduced baseline total: 2962 (grep scan), 1291 (AST audit baseline)
- Final total after fixes: pending
- Percentage reduction achieved: pending
- Passing verdict: pending
