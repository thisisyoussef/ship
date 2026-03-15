# Commit Map

The clean submission branch is built from `upstream/master` and cherry-picks only the category-specific commits listed below before the reproducibility and hosted-audit commits are added on top.

Baseline reference used for the verified Treasury comparison:

- repo: `https://github.com/US-Department-of-the-Treasury/ship.git`
- ref: `master`
- most recently verified SHA: `076a18371da0a09f88b5329bd59611c4bc9536bb`

Artifact layout for every category rerun:

- `artifacts/g4-repro/<run-id>/baseline/summary.json`
- `artifacts/g4-repro/<run-id>/submission/summary.json`
- `artifacts/g4-repro/<run-id>/comparison.json`
- `artifacts/g4-repro/<run-id>/dashboard.html`

## Category 1: Type Safety

- `d9bee0c` `fix(types): type week routes with shared auth and SQL row helpers`
- `f902e5e` `fix(types): type project route params, queries, and retro payloads`
- `3c1e451` `fix(types): type issue filters and transaction rows in routes`
- `621fe6d` `fix(types): guard unified document state and document shaping`
- `17c113e` `fix(types): replace seed lookup assertions with invariants`
- `df4bdde` `fix(types): type transformIssueLinks and its TipTap fixtures`
- `083b2df` `fix(types): type accountability test mocks and finalize notes`

Rerun command:

```bash
pnpm audit:grade --category type-safety
```

## Category 2: Bundle Size

- `fc3506d` `perf(bundle): remove unused query persister dependency`
- `51e8020` `perf(bundle): lazy-load route entrypoints and defer devtools`

Rerun command:

```bash
pnpm audit:grade --category bundle-size
```

## Category 3: API Response Time

- `d9accca` `perf(api): GET /api/documents — throttle session writes and cache serialized lists`
- `719ceae` `perf(api): GET /api/issues — cache serialized issue lists`

Rerun command:

```bash
pnpm audit:grade --category api-response
```

## Category 4: Database Query Efficiency

- `81401e5` `perf(db): load sprint board — combine sprint access + issue fetch`

Rerun command:

```bash
pnpm audit:grade --category db-efficiency
```

## Category 5: Test Coverage and Quality

- `42a6273` `test(web): align document tab and details extension coverage`
- `077f38e` `test(web): stabilize session timeout and drag handle harnesses`
- `346f207` `fix(weeks): normalize legacy sprint routes for week navigation`
- `a2e26a2` `test(e2e): make my-week stale-data coverage deterministic`
- `a22a0fd` `test(coverage): add collaboration and create-read regression coverage`

Rerun command:

```bash
pnpm audit:grade --category test-quality
```

## Category 6: Runtime Error and Edge Case Handling

- `421ac41` `fix(errors): session timeout bootstrap — stop Vite proxy auth/session noise`
- `c9b5a2a` `fix(errors): action items modal — unblock document editor entry`
- `1ffae21` `fix(errors): error boundary fallback — add explicit reload recovery`

Rerun command:

```bash
pnpm audit:grade --category runtime-handling
```

## Category 7: Accessibility Compliance

- `389a64b` `fix(a11y): move document overflow links out of tree widgets`
- `cfd0941` `fix(a11y): improve my-week contrast for current and future states`
- `5584b11` `test(a11y): cover tree semantics and my-week contrast`

Rerun command:

```bash
pnpm audit:grade --category accessibility
```
