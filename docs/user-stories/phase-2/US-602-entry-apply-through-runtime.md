# US-602: Entry Apply Through Runtime

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-601`
- Related branch: `codex/fleetgraph-t601a-runtime-apply`
- Related commit/PR:
- Target environment: `local first`, `Railway demo if needed for visual verification`

## Persona

**Engineer or PM** wants the final apply step to go through FleetGraph's approval runtime instead of bypassing it.

## User Story

> As an engineer or PM, I want the entry-card `Apply` action to resume FleetGraph's runtime review path so the approval preview and the actual execution follow one consistent model.

## Goal

Finish `T601A` by routing current-page approval execution through FleetGraph's runtime, not a direct browser-to-Ship write, while keeping the scope small: no generalized action-history refactor and no broader proactive plumbing changes.

## Scope

In scope:

1. Add an entry-specific runtime-apply route/service that resumes the pending FleetGraph approval thread.
2. Update the entry hook/UI to call the new FleetGraph route instead of the Ship endpoint directly.
3. Show a lightweight success/error result in the entry-card flow and invalidate the relevant document queries.
4. Add or update tests across web, route, and service/runtime layers.

Out of scope:

1. Generalizing FleetGraph finding execution storage for all entry actions.
2. Changing the proactive finding review/apply model beyond what is needed for parity.
3. Finishing follow-up page analysis or proactive multi-finding work.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/task-breakdown.md` — defines `T601A`
2. `docs/user-stories/phase-2/US-601-current-page-approval-preview.md` — previous story and scope boundary
3. `web/src/hooks/useFleetGraphEntry.ts` — current direct-apply path
4. `web/src/components/FleetGraphEntryCard.tsx` — entry-card approval controls
5. `web/src/components/FleetGraphEntryCard.test.tsx` — current UI assertions
6. `api/src/routes/fleetgraph.ts` — FleetGraph HTTP surface
7. `api/src/routes/fleetgraph.test.ts` — route-level contract coverage
8. `api/src/services/fleetgraph/actions/service.ts` — existing runtime-backed finding apply service
9. `api/src/services/fleetgraph/graph/runtime.ts` — approval interrupt and execute-action nodes
10. `api/src/services/fleetgraph/entry/service.ts` — current entry response contract

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm the smallest safe runtime-backed apply shape.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/task-breakdown.md`
2. `docs/user-stories/phase-2/US-601-current-page-approval-preview.md`
3. `web/src/hooks/useFleetGraphEntry.ts`
4. `web/src/components/FleetGraphEntryCard.tsx`
5. `api/src/routes/fleetgraph.ts`
6. `api/src/services/fleetgraph/actions/service.ts`
7. `api/src/services/fleetgraph/graph/runtime.ts`
8. `api/src/routes/fleetgraph.test.ts`

Expected contracts/data shapes:

1. The entry preview already creates a deterministic FleetGraph `threadId` and a pending approval envelope.
2. The runtime already supports `interrupt()` + `resume()` for approval flows, but `execute_action` currently assumes a finding-backed action execution path.
3. The smallest safe path is an entry-specific apply route that resumes the thread and reuses runtime execution without widening FleetGraph finding execution persistence.

Planned failing tests:

1. Entry apply should call a FleetGraph route, not the Ship endpoint directly.
2. The new route should resume the pending entry approval thread with the current Ship request context.
3. Runtime-backed entry apply should return a user-facing action outcome for the entry card.

## UX Script

Happy path:

1. User opens a supported page and clicks `Preview approval step`.
2. FleetGraph pauses for approval and shows the pending step.
3. User clicks `Apply`.
4. FleetGraph resumes the runtime thread, executes the selected action, refreshes the page data, and shows the result.

Error path:

1. User clicks `Apply` on a stale or invalid approval thread.
2. FleetGraph returns a clear error instead of calling Ship directly.
3. The page remains unchanged and the user can retry from a fresh preview.

## Preconditions

- [x] Local API/web dependencies are installed
- [x] FleetGraph route and web tests run locally
- [x] No deploy-only secrets are required for local validation

## TDD Plan

1. Add web tests proving the entry card applies via FleetGraph, not direct Ship calls.
2. Add route/service tests for the new entry-apply endpoint and runtime resume behavior.
3. Update runtime behavior only as much as needed for entry-backed action execution to succeed.

## Step-by-step Implementation Plan

1. Add the checked-in story and queue updates for `US-602`.
2. Add failing tests for runtime-backed entry apply on web and API surfaces.
3. Implement an entry-apply service/route that resumes the pending approval thread.
4. Update the runtime execute-action path so entry-backed approval threads can run without a finding execution record.
5. Update the entry hook/card to use the new route and show the action result.
6. Run targeted FleetGraph tests and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: Entry-card `Apply` resumes the FleetGraph runtime instead of posting directly to the Ship endpoint from the browser.
- [x] AC-2: The runtime-backed entry apply returns a clear user-facing outcome for success or failure.
- [x] AC-3: Relevant page data is invalidated/refreshed after a successful entry apply.
- [x] AC-4: Web, route, and service/runtime tests cover the new runtime-backed apply path.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/web exec vitest run src/components/FleetGraphEntryCard.test.tsx src/lib/fleetgraph-entry.test.ts
pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/entry/action-service.test.ts --config vitest.fleetgraph.config.ts
git diff --check
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. Record the runtime proof path if blocked or not deployed.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Review and Apply`
- Route or URL: open the seeded FleetGraph demo week or a local supported page with FleetGraph enabled
- Interaction: click `Preview approval step`, then `Apply`
- Expected result: FleetGraph applies the action through its own runtime-backed approval flow, refreshes the page, and shows a user-facing outcome instead of silently posting directly from the browser
- Failure signal: the browser still calls the raw Ship approval endpoint directly, or the UI provides no runtime-backed success/error result after apply

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Review and Apply`.
2. Click `Preview approval step`, then `Apply`.
3. Confirm the action completes through FleetGraph, the page refreshes, and the card shows a clear result rather than just disappearing.

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Entry-card apply now posts to `/api/fleetgraph/entry/apply`, which resumes the pending FleetGraph approval thread instead of calling the Ship approval endpoint directly from the browser.
  - The runtime now supports entry-backed action execution without requiring a finding execution record, so approval preview and execution share the same FleetGraph path.
  - Targeted validation passed on both the web and API surfaces for the new route, service, runtime, and inline result rendering.
- Residual risk:
  - This keeps the convergence intentionally narrow. Entry-backed apply does not yet generalize persistent execution history across all non-finding actions.
