# US-610: FleetGraph Sprint-Owner Gap

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-609.5`
- Related branch: `codex/fleetgraph-sprint-owner-gap`
- Related commit/PR: `pending finalization`
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**PM** wants FleetGraph to flag weeks with no owner so accountability gaps are obvious before the sprint drifts.

## User Story

> As a PM, I want FleetGraph to surface a sprint-owner gap proactively so I can fix missing accountability before the week slips.

## Goal

Ship the `sprint_no_owner` workbook case end to end on FleetGraph’s widened proactive surface, with visible UI proof and standard finding lifecycle behavior.

## Scope

In scope:

1. Turn the existing `sprint_no_owner` scenario into a real proactive FleetGraph finding.
2. Persist, serialize, and render it on the shared proactive surface.
3. Support standard finding lifecycle controls such as dismiss and snooze.

Out of scope:

1. New owner-assignment mutation execution flows.
2. Broader workload balancing logic.
3. The unassigned sprint-issues case.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/graph/runtime.ts`
2. `api/src/services/fleetgraph/proactive/sprint-no-owner.ts`
3. `api/src/services/fleetgraph/findings/store.ts`
4. `web/src/components/FleetGraphFindingsPanel.tsx`
5. `docs/assignments/fleetgraph/FLEETGRAPH.md`

## Preparation Phase

1. Confirm the existing `sprint_no_owner` scenario logic and thresholds.
2. Confirm what evidence and summary the UI needs for this case.
3. Confirm how the lifecycle controls should behave for this new type.

### Preparation Notes

Local docs/code reviewed:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/task-breakdown.md`
2. `api/src/services/fleetgraph/proactive/sprint-no-owner.ts`
3. `api/src/services/fleetgraph/graph/runtime.ts`
4. `web/src/lib/fleetgraph-findings-presenter.ts`
5. `web/src/components/FleetGraphFindingsPanel.tsx`

Expected contracts/data shapes:

1. Runtime already knows about `sprint_no_owner`.
2. Shared proactive plumbing from `US-609` should already be in place.
3. The new finding should remain advisory-only for this assignment slice.

Planned failing tests:

1. Candidate logic surfaces a sprint-owner gap finding.
2. Deduped proactive storage accepts and preserves the new type.
3. Shared findings UI renders the sprint-owner gap clearly.

## UX Script

Happy path:

1. A planning or active week has no owner assigned.
2. FleetGraph surfaces the sprint-owner gap proactively.
3. The PM sees the week identity, accountability context, and suggested next step.

Error path:

1. The week has no owner.
2. FleetGraph remains silent or mislabels the finding.
3. The workbook still lacks a second real proactive case.

## Preconditions

- [x] Fresh story branch is checked out before edits begin
- [x] Shared proactive multi-finding plumbing is complete
- [x] A seeded or reproducible proof lane exists for owner-gap verification

## TDD Plan

1. Runtime/candidate tests for sprint-owner gap detection.
2. Store/route tests for proactive persistence and lifecycle.
3. UI test for visible rendering on the shared findings surface.

## Step-by-step Implementation Plan

1. Finish the `sprint_no_owner` candidate and metadata contract if needed.
2. Thread it through the widened proactive store and route.
3. Render the new case on the shared FleetGraph proactive UI.
4. Update proof docs for the new workbook use case.

## Acceptance Criteria

- [x] AC-1: FleetGraph surfaces `sprint_no_owner` as a real proactive finding.
- [x] AC-2: The finding persists with standard lifecycle behavior.
- [x] AC-3: The shared proactive UI renders clear summary and evidence for the owner-gap case.
- [x] AC-4: The workbook/proof docs reflect the shipped sprint-owner gap use case truthfully.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/proactive/sprint-no-owner.test.ts src/services/fleetgraph/graph/runtime.test.ts src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/lib/fleetgraph-findings-presenter.test.ts
npx pnpm --filter @ship/api exec tsc --noEmit
npx pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the owner-gap proof lane on the public demo.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Owner Gap`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: inspect the proactive FleetGraph panel and its lifecycle controls
- Expected result: FleetGraph surfaces a sprint-owner gap summary with accountability context, advisory-only next-step guidance, and standard quick actions
- Failure signal: no proactive finding appears, the copy is empty/system-shaped, or FleetGraph offers a broken apply path

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Owner Gap`.
2. Confirm FleetGraph surfaces a sprint-owner gap finding.
3. Confirm the suggested next step is advisory-only and does not offer `Review and apply`.
4. Read the summary and evidence and confirm they explain the missing owner clearly.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: inspect the proactive panel and its quick actions
- Expected visible result: a sprint-owner gap finding appears with clear accountability context and advisory-only next-step guidance
- Failure signal: no finding, broken lifecycle controls, or a fake apply flow for owner assignment

## Checkpoint Result

- Outcome: `pass`
- Evidence: FleetGraph now persists and renders `sprint_no_owner` on the shared proactive surface, the owner-gap card stays advisory-only instead of exposing a broken mutation path, and the demo fixture seeds `FleetGraph Demo Week - Owner Gap` as a reproducible proof lane.
- Residual risk: the seeded owner-gap lane is guaranteed in the demo fixture, but the fixture integration test still requires a local container runtime and could not be executed in this shell.
