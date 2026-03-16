# ShipShape Assignment Brief (Week 4)

Source brief: `/Users/youss/Development/gauntlet/ship/docs/archive/gfa-week-4/GFA_Week_4-ShipShape.pdf`

## Objective

This is a production-readiness audit project for the Ship repository. It is diagnostic-first:

- Orient on the codebase and architecture.
- Establish baseline metrics in 7 categories.
- Deliver measurable improvements in all 7 categories (not just one-off refactors).
- Produce reproducible proof before/after.

## Core schedule (from brief)

- Orientation checkpoint: complete by **4 hours after assignment start**.
- Audit report gate: **Tuesday, 11:59 PM (36 hours)**.
- Early submission: **Friday, 11:59 PM**.
- Final polish/presentation: **Sunday, 11:59 PM**.

## Audit Categories and Required Deliverables

1. Type Safety
2. Bundle Size
3. API Response Time
4. DB Query Efficiency
5. Test Coverage and Quality
6. Runtime Error and Edge Case Handling
7. Accessibility Compliance

For each category:

- Define how measured (tools + methodology + sample conditions).
- Capture baseline numbers.
- List concrete weaknesses and impact.
- Rank severity.
- Deliver measurable improvements against the targets defined in the prompt.

## Required implementation targets (must meet all)

- Reduce type safety violations by 25% (with real typed fixes).
- Reduce bundle by 15% or reduce initial JS load by 20% via code splitting.
- Improve 2 API endpoints with 20% lower P95 at identical load.
- Improve one DB flow query count by 20% or reduce slowest query by 50%.
- Add 3 meaningful test improvements or fix 3 flaky tests.
- Fix 3 runtime/edge-case handling gaps (including at least one user-facing data-loss/confusion case).
- Improve accessibility by 10+ lighthouse points on worst page or clear all Critical/Serious on top 3 pages.

## Key deliverables

- `docs/archive/gfa-week-4/audit-report.md`
- `docs/archive/gfa-week-4/implementation-log.md`
- `docs/archive/gfa-week-4/discoveries.md`
- `docs/archive/gfa-week-4/ai-cost-log.md`
- README update showing setup guidance
- Improved fork with clearly separated changes/commits
- Deployed app
- 3–5 minute demo video
- Social post with learnings

## Orientation checklist emphasis (this is the first phase in this assignment)

- Repo setup and run verification.
- Read all `README` + AGENTS instructions.
- Read `docs/` and map architecture choices.
- Trace web → api → shared → db and auth/middleware flow.
- Trace WebSocket collaboration path.
- Read shared types and API contracts.
- Run test suite and baseline.

## Repo-specific understanding captured in this workspace

- Root README expects Dockerized DB; without Docker running, DB-dependent flows are blocked.
- Monorepo shape: `web/`, `api/`, `shared/` with a strict runtime split.
- Auth chain:
  - API entrypoint in `api/src/index.ts`.
  - Middleware and route wiring in `api/src/app.ts`.
  - Session + bearer token auth in `api/src/middleware/auth.ts`.
- Real-time path:
  - TipTap/Yjs collaboration via `api/src/collaboration/index.ts` + WebSocket server.
  - frontend boot and routing in `web/src/main.tsx`.
- Data model:
  - Unified `documents` table in `api/src/db/schema.sql`.
  - Document route behavior in `api/src/routes/documents.ts`.

## 7 categories mapped to concrete entry points for baseline work

- Type safety: `web/src`, `api/src`, `shared/src`.
- Bundle: `pnpm build:web` + bundle analyzer.
- API timing: seed/populate (`pnpm db:seed`) + profile hot endpoints (`/api/issues`, `/api/documents`, `/api/weeks`, `/api/programs`, `/api/search`).
- DB efficiency: query logging + `explain analyze` on heavy joins/associations endpoints.
- Test baseline: `pnpm test` + reruns for flake spotting.
- Runtime + edge: open app flows with console/server logs + network failure + malformed payload checks.
- Accessibility: lighthouse + axe/pa11y + keyboard traversal on `docs`, `issues`, `programs`, `team`.

## Discovery requirement

Before final submission, document at least 3 things learned with:

- what was discovered
- code path + file reference
- why it matters
- transfer lesson for future projects

