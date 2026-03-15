# Ship Audit Report

This report now focuses on reproducible measurement and root-cause analysis. The authoritative metrics are emitted by `pnpm audit:grade` and stored under `artifacts/g4-repro/<run-id>/`.

Methodology reference:

- [G4 methodology](./methodology.md)
- [Commit map](./commit-map.md)
- [Verification guide](./improvement-verification-guide.md)

## Category 1: Type Safety

Baseline problem:

- strict mode was already enabled, but the hot routes and document screens still bypassed it with `any`, `as`, and non-null assertions

Why the original implementation caused the issue:

- shared types existed, but route-level SQL rows and payload shaping were still loosely typed, so engineers had to override the compiler at the exact trust boundaries where type precision mattered most

Why the fix is correct:

- the branch introduces typed SQL helpers, explicit guards, and narrower payload transforms, which removes the need for the unsafe escapes in the core paths instead of adding more assertions around them

Rerun:

```bash
pnpm audit:grade --category type-safety
```

## Category 2: Bundle Size

Baseline problem:

- the app loaded route entrypoints and devtools eagerly, so the editor and collaboration graph were pulled into the first load even for lighter pages

Why the original implementation caused the issue:

- top-level imports prevented Vite from cutting those boundaries into route-specific chunks

Why the fix is correct:

- `React.lazy` route boundaries and deferred devtools move those modules behind actual navigation, which reduces the initial chunk by changing the import graph rather than post-processing the output

Rerun:

```bash
pnpm audit:grade --category bundle-size
```

## Category 3: API Response Time

Baseline problem:

- authenticated list endpoints did repeated session writes and repeated serialization work under concurrency

Why the original implementation caused the issue:

- every request refreshed activity in the database and rebuilt list payloads that were identical for stable result sets, which inflated tail latency on `/api/documents` and `/api/issues`

Why the fix is correct:

- the middleware now throttles session persistence and the list routes cache the serialized result body, which cuts real database and CPU work from the hot path

Rerun:

```bash
pnpm audit:grade --category api-response
```

## Category 4: Database Query Efficiency

Baseline problem:

- the sprint-board issue route split access checks and issue loading into extra database round trips

Why the original implementation caused the issue:

- the route performed separate accessibility checks, project resolution, and issue loading work, including an avoidable admin branch, so one page load triggered more statements than necessary

Why the fix is correct:

- the route now folds the sprint accessibility and issue retrieval into fewer statements and removes the redundant admin lookup, so the request does less SQL work instead of simply caching the outcome

Rerun:

```bash
pnpm audit:grade --category db-efficiency
```

## Category 5: Test Coverage And Quality

Baseline problem:

- the web suite had known failures, and the stale-data and collaboration regressions were not pinned down with deterministic focused coverage

Why the original implementation caused the issue:

- the test surface mixed brittle flows with missing assertions around the editor persistence path, so known regressions were either flaky or not isolated tightly enough to be trusted

Why the fix is correct:

- the branch stabilizes the brittle harnesses, adds deterministic stale-data coverage, and introduces focused collaboration regressions that directly hit the behaviors that were breaking

Measurement note:

- the category percentage is driven by the built-in API/web suite health, while the repeated Playwright stale-data regression is preserved as supplemental artifact evidence for focused inspection

Rerun:

```bash
pnpm audit:grade --category test-quality
```

## Category 6: Runtime Error And Edge Case Handling

Baseline problem:

- auth bootstrap noise and the auto-open action-items modal could break the first usable state for login and direct document entry

Why the original implementation caused the issue:

- the runtime built API URLs incorrectly in some environments and opened the accountability modal without checking whether the user was entering a direct document route, so the app entered bad UI states before the user acted

Why the fix is correct:

- the runtime now derives the API origin explicitly, treats expected unauthenticated responses as non-fatal on public routes, and suppresses the modal on direct document entry, which removes the broken state itself

Rerun:

```bash
pnpm audit:grade --category runtime-handling
```

## Category 7: Accessibility Compliance

Baseline problem:

- the docs tree rendered overflow controls inside tree widgets, and the my-week screen used low-contrast current and future states

Why the original implementation caused the issue:

- the DOM structure violated tree semantics directly, and the visual state system relied on muted contrast that failed accessibility checks

Why the fix is correct:

- overflow controls now sit outside the tree semantics boundary, and the my-week colors were rebalanced so the structure and color tokens satisfy the accessibility rules directly

Rerun:

```bash
pnpm audit:grade --category accessibility
```
