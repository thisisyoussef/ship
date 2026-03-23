# US-620: FleetGraph Finding-Review Thread Scoping Fix

## Status

- State: `todo`
- Owner: Codex
- Depends on: `US-618`
- Related branch:
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph review/apply to stay scoped to the exact finding and selected owner so confirmation never resumes a stale pending action.

## User Story

> As an engineer or PM, I want FleetGraph's finding-review thread to stay scoped to the exact review context I just chose so applying a finding always uses the latest reviewed action.

## Goal

Harden the shipped proactive review/apply flow so pending LangGraph interrupts are keyed tightly enough to the current finding-review request. The current owner-picker path can reuse an existing pending review thread even after the selected owner changes, which risks applying stale review state instead of the latest selection.

## Scope

In scope:

1. Audit how FleetGraph builds finding-review thread IDs and reuses pending interrupts for review/apply.
2. Fix the stale-thread reuse bug for owner-selection review/apply while keeping the start-week review path intact.
3. Add backend and visible-surface regression coverage for changing review context before confirmation.

Out of scope:

1. New proactive finding types or queue surfaces.
2. Reworking the broader guided-actions UI.
3. Adding new FleetGraph action types.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/actions/service.ts` — builds finding-review thread IDs and reuses pending interrupts.
2. `api/src/services/fleetgraph/actions/service.test.ts` — current review/apply regression coverage.
3. `api/src/routes/fleetgraph.ts` — review/apply route contract.
4. `api/src/routes/fleetgraph.test.ts` — route-level owner-review/apply expectations.
5. `web/src/components/FleetGraphFindingsPanel.tsx` — owner-picker review flow and selected-owner handoff.
6. `web/src/components/FleetGraphFindingsPanel.test.tsx` — visible owner-picker review/apply coverage.
7. `api/src/services/fleetgraph/graph/runtime.ts` — interrupt/resume behavior for review threads.

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm exactly where owner selection enters the requested action and where thread reuse happens.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `api/src/services/fleetgraph/actions/service.ts`
2. `api/src/services/fleetgraph/actions/service.test.ts`
3. `api/src/routes/fleetgraph.test.ts`
4. `web/src/components/FleetGraphFindingsPanel.tsx`
5. `web/src/components/FleetGraphFindingsPanel.test.tsx`

Expected contracts/data shapes:

1. The current finding-review thread key is derived from finding identity plus action type, not the selected owner or latest review variant.
2. `ensurePendingReview` reuses any existing interrupt on that thread, so stale review state can survive after a user changes owner selection.
3. The fix should keep start-week review reuse intact while preventing owner-picker flows from resuming the wrong pending action.

Planned failing tests:

1. Reviewing the same owner-gap finding with a different selected owner does not reuse stale pending action state.
2. Applying after changing the selected owner resumes the thread that matches the latest review context.
3. The visible owner-gap flow reflects the most recent review choice before confirmation.

## UX Script

Happy path:

1. User opens a sprint owner-gap finding.
2. User chooses an owner, then changes to a different owner before confirming.
3. FleetGraph applies the latest selected owner in Ship.

Error path:

1. User changes the selected owner after an earlier review thread already exists.
2. FleetGraph reuses the stale interrupt from the previous selection.
3. Ship applies the wrong owner or shows mismatched review copy.

## Preconditions

- [ ] Fresh story branch is checked out from current `master` before edits begin
- [ ] The owner-picker review/apply flow from `US-618` is current repo truth
- [ ] Local FleetGraph API and web tests run in this shell

## TDD Plan

1. Add failing action-service coverage for changing owner selection after a pending review already exists.
2. Add or extend route coverage so review/apply preserves the latest selected owner.
3. Add visible-surface regression coverage if the frontend must change to keep review state truthful.

## Step-by-step Implementation Plan

1. Reproduce the stale-thread reuse path in backend tests first.
2. Narrow the thread-key or pending-review reuse logic so it matches the latest reviewed action context.
3. Update route or UI glue only if needed to preserve the corrected contract.
4. Re-verify the owner-gap proof lane and the start-week path after the fix.

## Acceptance Criteria

- [ ] AC-1: Changing owner selection before confirmation no longer reuses stale review-thread state.
- [ ] AC-2: Applying an owner-gap finding always uses the latest reviewed owner selection.
- [ ] AC-3: Existing start-week review/apply behavior stays intact.
- [ ] AC-4: Backend and visible-surface regressions cover the stale-thread bug.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/api exec vitest run src/services/fleetgraph/actions/service.test.ts src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx
pnpm --filter @ship/api exec tsc --noEmit
pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Re-check the owner-gap proof lane on the live demo so the selected-owner flow matches the latest review state.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: `FleetGraph Demo Week - Owner Gap`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: open FleetGraph, start the owner-gap review flow, pick one owner, switch to another owner, then confirm
- Expected result: FleetGraph reviews and applies the latest selected owner, and the page shows that owner afterward
- Failure signal: FleetGraph reuses stale review copy or Ship applies an earlier owner selection

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Owner Gap`.
2. Review the owner-gap finding.
3. Change the selected owner before confirming.
4. Confirm the action.
5. Verify the page shows the latest selected owner, not the earlier one.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: pick one owner, switch to another during review, then confirm
- Expected visible result: the final selected owner is the one FleetGraph applies and the page refresh reflects that selection
- Failure signal: the wrong owner is applied or the review copy stays scoped to an earlier selection

## Checkpoint Result

- Outcome: `pending`
- Evidence:
- Residual risk:
