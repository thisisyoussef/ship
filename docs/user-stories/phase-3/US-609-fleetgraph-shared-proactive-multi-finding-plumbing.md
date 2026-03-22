# US-609: FleetGraph Shared Proactive Multi-Finding Plumbing

## Status

- State: `in_review`
- Owner: Codex
- Depends on: `US-608`
- Related branch: `codex/fleetgraph-multi-finding-plumbing`
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Assignment reviewer** wants FleetGraph’s proactive surface to support more than one finding type so the remaining workbook cases can ship on the real product surface.

## User Story

> As an assignment reviewer, I want FleetGraph to handle multiple proactive finding types on one shared surface so the remaining proactive use cases are real and not hard-coded exceptions.

## Goal

Pay the one-time shared plumbing cost that generalizes proactive finding persistence, route serialization, and frontend rendering beyond `week_start_drift`, so the remaining proactive workbook cases can ship on the same FleetGraph surface.

## Scope

In scope:

1. Widen stored proactive finding types in the backend and DB.
2. Generalize proactive route serialization and frontend types.
3. Remove week-start-only assumptions from the proactive findings UI shell.

Out of scope:

1. Shipping the sprint-owner gap case itself.
2. Shipping the unassigned sprint-issues case itself.
3. New autonomous mutation paths.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/findings/types.ts`
2. `api/src/services/fleetgraph/findings/store.ts`
3. `api/src/routes/fleetgraph.ts`
4. `api/src/db/migrations/039_fleetgraph_proactive_findings.sql`
5. `web/src/lib/fleetgraph-findings.ts`
6. `web/src/lib/fleetgraph-findings-presenter.ts`
7. `web/src/components/FleetGraphFindingsPanel.tsx`

## Preparation Phase

1. Confirm every place that still assumes `week_start_drift` is the only proactive type.
2. Confirm the current DB constraint and runtime/backend type mismatch.
3. Confirm the minimal UI generalization needed before `sprint_no_owner` and `unassigned_sprint_issues` can surface.

### Preparation Notes

Local docs/code reviewed:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/technical-plan.md`
2. `api/src/services/fleetgraph/findings/types.ts`
3. `api/src/routes/fleetgraph.ts`
4. `web/src/lib/fleetgraph-findings.ts`
5. `web/src/components/FleetGraphFindingsPanel.tsx`

Expected contracts/data shapes:

1. Backend finding unions already know about multiple proactive finding types.
2. Persistence and UI still need widening beyond `week_start_drift`.
3. The proactive findings surface should stay shared instead of branching into bespoke panels.

Planned failing tests:

1. Multiple proactive finding types persist cleanly.
2. Findings route serializes mixed-type results.
3. Findings panel and presenter render without week-start-only assumptions.

## UX Script

Happy path:

1. FleetGraph has more than one proactive finding type available.
2. The shared findings surface renders them cleanly.
3. Users see the right summary/evidence without the surface pretending everything is week-start drift.

Error path:

1. A second proactive finding type is generated.
2. Persistence rejects it or the UI mislabels it as week-start drift.
3. The assignment still only has one real proactive case.

## Preconditions

- [ ] Fresh story branch is checked out before edits begin
- [ ] Existing `week_start_drift` path remains green as the reference lane
- [ ] DB migration path is available locally

## TDD Plan

1. Add failing backend tests for multi-type proactive persistence and serialization.
2. Add failing frontend tests for multi-type rendering/presenter behavior.
3. Patch storage, route, and shared UI only after the mismatches are pinned down.

## Step-by-step Implementation Plan

1. Widen DB/schema contracts for proactive finding types.
2. Update finding-store and route serialization contracts.
3. Generalize frontend finding types, presenter logic, and panel copy.
4. Re-verify the existing `week_start_drift` lane after widening.

## Acceptance Criteria

- [ ] AC-1: Proactive finding persistence accepts more than `week_start_drift`.
- [ ] AC-2: FleetGraph routes serialize multiple proactive finding types cleanly.
- [ ] AC-3: The shared proactive UI no longer assumes every finding is week-start drift.
- [ ] AC-4: The widened plumbing leaves the existing week-start proof lane intact.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/api exec vitest run src/services/fleetgraph/findings/*.test.ts src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec vitest run src/lib/fleetgraph-findings*.test.ts src/components/FleetGraphFindingsPanel.test.tsx
pnpm --filter @ship/api exec tsc --noEmit
pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the existing week-start proof lane still renders normally after the plumbing widening.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Review and Apply`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: inspect the proactive FleetGraph surface before and after the multi-finding widening
- Expected result: the existing week-start lane still works and the shared surface is ready for additional finding types
- Failure signal: the week-start proof lane regresses or the UI still hard-codes week-start-only language

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Review and Apply`.
2. Confirm the existing proactive finding still renders correctly.
3. Inspect the updated shared proactive copy and ensure it no longer reads like a single-type hard-code.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: inspect the proactive FleetGraph surface after the multi-finding plumbing lands
- Expected visible result: the current week-start lane still renders correctly on a generalized proactive surface
- Failure signal: the existing proof lane breaks or still exposes week-start-only assumptions everywhere

## Checkpoint Result

- Outcome: `implemented, pending Railway demo verification`
- Evidence:
  - the proactive findings schema now accepts `sprint_no_owner` and `unassigned_sprint_issues` in addition to `week_start_drift`
  - the findings route now has mixed-type regression coverage, proving the shared serialization path stays clean
  - the visible proactive shell now uses the generic `Proactive findings` heading and frontend type unions no longer force everything into `week_start_drift`
- Residual risk:
  - the container-backed store test still needs a machine with a working container runtime; this shell can run the route suite and typechecks, but not the Testcontainers-backed persistence suite
