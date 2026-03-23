# US-622: FleetGraph Route-Trigger Enqueue And Sweep Bootstrap

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-612`
- Related branch: `codex/us-622-route-trigger-enqueue-sweep-bootstrap`
- Related commit/PR: `eafca18`, [PR #182](https://github.com/thisisyoussef/ship/pull/182)
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**PM or engineer** wants proactive FleetGraph findings to come from real Ship activity and real sweep registration so the worker path is not limited to demo seeding and tests.

## User Story

> As a PM or engineer, I want FleetGraph's worker substrate wired into real write routes and workspace bootstrap so proactive findings are enqueued and swept from real Ship state instead of only from seeded/demo-only paths.

## Goal

Finish the missing integration layer between the existing FleetGraph worker substrate and the live Ship app. The queue, dedupe, and sweep runtime already exist, but route-trigger enqueue hooks and workspace sweep bootstrap are still effectively isolated to tests and demo fixture setup rather than real API startup and high-signal write routes.

## Scope

In scope:

1. Wire FleetGraph dirty-context enqueue hooks into the chosen high-signal Ship write routes.
2. Register real workspace sweep schedules during app/bootstrap flow so proactive sweeps can run without demo-only setup.
3. Add regression coverage for route-trigger enqueue, dedupe behavior, and sweep bootstrap registration.
4. Refresh any proof-lane or deploy docs that currently assume demo-only bootstrap for worker-generated findings.

Out of scope:

1. Replacing the existing worker CLI loop or queue substrate.
2. Adding new proactive scenario families.
3. Building the global findings sidebar itself.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `docs/assignments/fleetgraph/FLEETGRAPH.md` — target trigger model and high-signal route list.
2. `docs/guides/fleetgraph-demo-inspection.md` — current worker-generated proof lane expectations.
3. `api/src/services/fleetgraph/worker/runtime.ts` — sweep execution and queue orchestration.
4. `api/src/services/fleetgraph/worker/hooks.ts` — route-trigger enqueue helpers.
5. `api/src/services/fleetgraph/worker/store.ts` — queue and sweep schedule persistence.
6. `api/src/index.ts` — current API bootstrap path.
7. `api/src/routes/documents.ts` — likely high-signal route surface.
8. `api/src/routes/issues.ts` — likely high-signal route surface.
9. `api/src/routes/projects.ts` — likely high-signal route surface.
10. `api/src/routes/weeks.ts` — likely high-signal route surface.
11. `api/src/routes/workspaces.ts` — workspace lifecycle/bootstrap touchpoints if needed.
12. `api/src/services/fleetgraph/demo/fixture.ts` — current demo-only worker bootstrap path.
13. `api/src/services/fleetgraph/worker/runtime.test.ts` — current worker substrate test coverage.

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm which Ship write routes are the narrowest high-signal enqueue touchpoints.
3. Confirm where sweep schedules should be registered for live workspaces without relying on demo-only seeding.
4. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/phase-3/README.md`
7. `docs/user-stories/phase-3/US-622-fleetgraph-route-trigger-enqueue-and-sweep-bootstrap.md`
8. `docs/DEFINITION_OF_DONE.md`
9. `docs/assignments/fleetgraph/README.md`
10. `docs/assignments/fleetgraph/PRESEARCH.md`
11. `docs/assignments/fleetgraph/FLEETGRAPH.md`
12. `docs/guides/fleetgraph-demo-inspection.md`
13. `.claude/CLAUDE.md`
14. `api/src/services/fleetgraph/worker/runtime.ts`
15. `api/src/services/fleetgraph/worker/hooks.ts`
16. `api/src/services/fleetgraph/worker/store.ts`
17. `api/src/services/fleetgraph/worker/runtime.test.ts`
18. `api/src/index.ts`
19. `api/src/routes/documents.ts`
20. `api/src/routes/issues.ts`
21. `api/src/routes/projects.ts`
22. `api/src/routes/weeks.ts`
23. `api/src/routes/workspaces.ts`
24. `api/src/routes/admin.ts`
25. `api/src/routes/setup.ts`
26. `api/src/services/fleetgraph/demo/fixture.ts`

Expected contracts/data shapes:

1. `createFleetGraphDirtyContextHooks` already knows how to enqueue document and workspace mutations, but the live Ship routes were not yet calling those helpers.
2. `registerWorkspaceSweep` already exists on the worker store/runtime, but API startup only relied on demo fixture setup instead of re-registering real active workspaces.
3. The narrowest safe route surfaces are coarse document/workspace write buckets such as `issue-write`, `project-write`, `week-write`, and `workspace-write`, so the worker dedupe ledger can still coalesce noisy repeats.
4. Route-trigger enqueue should stay best-effort after the product write succeeds, so FleetGraph failures do not turn a normal Ship mutation into a user-facing 500.

Planned failing tests:

1. Worker bootstrap registers sweep schedules for real non-archived workspaces without relying on the demo fixture.
2. High-signal Ship write routes enqueue FleetGraph dirty context into `fleetgraph_queue_jobs` through the shared worker integration helper.
3. Worker-facing docs and proof-lane notes describe the live API bootstrap + watched-write path truthfully instead of implying demo-only sweep registration.

## UX Script

Happy path:

1. A meaningful Ship write occurs on a route FleetGraph watches.
2. FleetGraph enqueues the right dirty context quickly and the worker picks it up.
3. A proactive finding appears through the real worker path, and scheduled sweeps also stay registered for drift conditions.

Error path:

1. The worker substrate exists but real routes never enqueue work or bootstrap sweep schedules.
2. Only test code or demo seeding creates queue jobs.
3. The public worker-generated proof lane stays stale or never regenerates from real activity.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] The existing worker substrate and proactive scenarios are current repo truth
- [x] Local API route and FleetGraph worker tests run in this shell

## TDD Plan

1. Add failing worker/bootstrap coverage for real workspace sweep registration.
2. Add failing route-level enqueue coverage on the chosen high-signal write routes.
3. Keep demo-proof verification aligned with the real worker-generated lane after the integration lands.

## Step-by-step Implementation Plan

1. Pick the narrowest real Ship write routes that should enqueue FleetGraph dirty context.
2. Add shared enqueue wiring at those route touchpoints without breaking existing route behavior.
3. Add live sweep-bootstrap registration for real workspaces.
4. Re-verify dedupe, worker polling, and the worker-generated proof lane after the wiring lands.

## Acceptance Criteria

- [x] AC-1: Chosen high-signal Ship write routes enqueue FleetGraph dirty context through the shared worker hooks.
- [x] AC-2: Live app/bootstrap flow registers sweep schedules for real workspaces without relying on demo fixture setup.
- [x] AC-3: Worker dedupe and retry behavior remain intact after the route/bootstrap wiring.
- [x] AC-4: The worker-generated proof lane and related docs reflect the real worker path truthfully.

## Local Validation

Run these before handoff:

```bash
DATABASE_URL=postgresql://youss@localhost:5432/ship_us622_test FLEETGRAPH_WORKER_TEST_DATABASE_URL=postgresql://youss@localhost:5432/ship_us622_test pnpm --filter @ship/api exec vitest run src/services/fleetgraph/worker/runtime.test.ts --config vitest.fleetgraph.config.ts
DATABASE_URL=postgresql://youss@localhost:5432/ship_us622_test pnpm --filter @ship/api exec vitest run src/routes/documents.test.ts src/routes/issues.test.ts src/routes/projects.test.ts src/routes/weeks.test.ts src/routes/workspaces.test.ts
pnpm --filter @ship/api exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy and worker health through completion.
3. Verify `FleetGraph Demo Week - Worker Generated` reflects the live worker path rather than demo-only seeding.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: `FleetGraph Demo Week - Worker Generated`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Worker Generated`
- Interaction: confirm the workspace has real sweep registration, trigger a watched Ship write or wait for the scheduled sweep, then inspect the worker-generated FleetGraph finding
- Expected result: the worker-generated finding appears or refreshes from the real queue/sweep path, not only from seeded demo state
- Failure signal: no queue job is created from the real route/bootstrap wiring, or the worker-generated lane still depends on demo-only seeding

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Worker Generated`.
2. Trigger a watched Ship write in the same workspace or wait for the next sweep window.
3. Confirm FleetGraph surfaces the worker-generated finding on that page.
4. Repeat once to verify dedupe prevents noisy duplicates.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Worker Generated`
- Interaction: rely on the real route-trigger enqueue or scheduled sweep path, then inspect the FleetGraph proactive panel
- Expected visible result: the page shows the worker-generated FleetGraph finding through the real worker path, with refresh behavior that is not limited to demo seeding
- Failure signal: the worker-generated lane never refreshes from real route/sweep activity or duplicates uncontrollably

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Added a shared FleetGraph worker integration helper that wraps the existing dirty-context hooks/store, resolves coarse route surfaces, and can re-register active workspace sweeps on API startup.
  - API startup now re-registers real active workspace sweep schedules, and workspace lifecycle touchpoints register new schedules without relying on demo fixture setup alone.
  - High-signal document, issue, project, week, and workspace write routes now enqueue best-effort FleetGraph worker jobs after the underlying Ship mutation succeeds.
  - Added regressions for active-workspace sweep bootstrap, document/issue/week/workspace queue inserts on real routes, and mocked project-route enqueue handoff.
  - Updated the worker-generated demo/deploy docs so they describe live startup sweep registration plus watched write-route enqueue as the real regeneration path.
  - Local validation passed:
    - `DATABASE_URL=postgresql://youss@localhost:5432/ship_us622_test FLEETGRAPH_WORKER_TEST_DATABASE_URL=postgresql://youss@localhost:5432/ship_us622_test npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/worker/runtime.test.ts --config vitest.fleetgraph.config.ts`
    - `DATABASE_URL=postgresql://youss@localhost:5432/ship_us622_test npx pnpm --filter @ship/api exec vitest run src/routes/documents.test.ts src/routes/issues.test.ts src/routes/projects.test.ts src/routes/weeks.test.ts src/routes/workspaces.test.ts`
    - `npx pnpm --filter @ship/api exec tsc --noEmit`
  - Deployment status: `not deployed`
- Residual risk:
  - The live Railway worker-generated proof lane still needs post-merge observation to confirm the deployed API startup path and the dedicated worker lane stay in sync after the next `master` update.
