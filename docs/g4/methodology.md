# G4 Measurement Methodology

This submission now treats the audit harness as the source of truth. The same code path powers:

- local grading via `pnpm audit:grade`
- the Render-hosted audit dashboard and worker
- generated artifacts under `artifacts/g4-repro/<run-id>/`

## Canonical Targets

- Baseline repo: `https://github.com/US-Department-of-the-Treasury/ship.git`
- Baseline ref: `master`
- Most recently verified Treasury `master` SHA for this submission: `076a18371da0a09f88b5329bd59611c4bc9536bb`
- Submission repo: `https://github.com/thisisyoussef/ship.git`
- Submission ref: `codex/submission-clean`
- Hosted dashboard: `https://audit-dashboard-yner.onrender.com`

The local CLI defaults to `Treasury master` versus the current checkout. The hosted dashboard defaults to `Treasury master` versus `thisisyoussef/ship@codex/submission-clean`. The hosted dashboard is password-gated; the credential is supplied with the submission rather than committed into the repo.

## Corpus

The harness prepares a deterministic seeded corpus for every runtime-backed category.

- Target corpus: `580 documents / 105 issues / 35 weeks / 23 users`
- Seed flow:
  1. `pnpm db:migrate`
  2. `pnpm db:seed`
  3. harness-owned corpus expansion
  4. hard validation of the final counts

The expander adds the missing users, person documents, and synthetic wiki filler documents needed to reach the target corpus. If the post-expansion counts are not exact, the run fails.

Runtime-backed categories reuse one isolated schema per target run. That keeps the two repos independent while also avoiding cross-category leakage from enum types in Treasury `master` migrations, which query `pg_type` globally.

## Exact Command Contract

These are the commands the harness runs for each target checkout.

Shared prep:

```bash
git clone --depth 1 --branch <ref> <repo-url> <workdir>
pnpm install --frozen-lockfile
pnpm build:shared
```

Category 1 `type-safety`:

```bash
pnpm --filter @ship/shared type-check
pnpm --filter @ship/api type-check
pnpm --filter @ship/web exec tsc --noEmit
```

After those commands, the harness runs an AST scan across `api/`, `web/`, and `shared/` for:

- explicit `any`
- `as` assertions
- non-null assertions
- `@ts-ignore` and `@ts-expect-error`

Category 2 `bundle-size`:

```bash
pnpm --filter @ship/web exec vite build --sourcemap
```

The harness then reads `web/dist/.vite/manifest.json`, resolves the real entry chunk, computes raw size, gzip size, total emitted asset size, and JS chunk count.
If a target build does not emit a Vite manifest, the harness falls back to `web/dist/index.html` and resolves the entry module from the generated script tag.

Category 3 `api-response`:

```bash
pnpm db:migrate
pnpm db:seed
pnpm --filter @ship/api exec tsx src/index.ts
```

After runtime boot the harness authenticates as `dev@ship.local / admin123` and runs `200` requests at concurrency `10`, `25`, and `50` against:

- `GET /api/documents`
- `GET /api/issues`
- `GET /api/documents/:id`
- `GET /api/weeks/:id/issues`
- `GET /api/search/learnings?q=api`

Category 4 `db-efficiency`:

```bash
pnpm db:migrate
pnpm db:seed
pnpm --filter @ship/api exec tsx src/index.ts
```

For this category the API starts with a harness-owned `pg` preload shim that records every SQL statement for the request. The harness then hits `GET /api/weeks/:id/issues` and summarizes statement count and total DB time for that request.

Category 5 `test-quality`:

```bash
pnpm --filter @ship/api test
pnpm --filter @ship/web test
pnpm --filter @ship/web exec vite build
pnpm --filter @ship/web exec vite preview --host 127.0.0.1 --port <port>
pnpm --filter @ship/api exec tsx src/index.ts
pnpm exec playwright test scripts/audit/playwright/test-quality.spec.mjs --config scripts/audit/playwright.config.mjs --workers=1 --repeat-each=10 --reporter=json
```

The authoritative percentage for Category 5 is the built-in API/web suite pass rate. The repeated Playwright run is stored as supplemental stability evidence in the raw artifacts so the grader can see whether the focused stale-data regression is still brittle.

Category 6 `runtime-handling`:

```bash
pnpm --filter @ship/web test -- web/src/components/ui/ErrorBoundary.test.tsx
pnpm --filter @ship/web exec vite build
pnpm --filter @ship/web exec vite preview --host 127.0.0.1 --port <port>
pnpm --filter @ship/api exec tsx src/index.ts
pnpm exec playwright test scripts/audit/playwright/runtime-handling.spec.mjs --config scripts/audit/playwright.config.mjs --workers=1 --repeat-each=1 --reporter=json
```

Category 7 `accessibility`:

```bash
pnpm --filter @ship/web exec vite build
pnpm --filter @ship/web exec vite preview --host 127.0.0.1 --port <port>
pnpm --filter @ship/api exec tsx src/index.ts
pnpm exec playwright test scripts/audit/playwright/accessibility.spec.mjs --config scripts/audit/playwright.config.mjs --workers=1 --repeat-each=1 --reporter=json
```

## Artifact Layout

Every run writes:

```text
artifacts/g4-repro/<run-id>/
  baseline/summary.json
  submission/summary.json
  comparison.json
  dashboard.html
```

The Render worker stores the same files in Postgres and additionally stores a `bundle.tgz` containing the whole artifact tree.

## Prerequisites

Local one-shot grading expects:

- Node `20+`
- `pnpm`
- `git`
- Docker, for the temporary Postgres container used by the harness when `AUDIT_DATABASE_URL` is not already set

The harness installs Chromium on demand with:

```bash
pnpm exec playwright install chromium
```
