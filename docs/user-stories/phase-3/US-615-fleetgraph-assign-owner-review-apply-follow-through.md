# US-615: FleetGraph Assign-Owner Review/Apply Follow-Through

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-612`
- Related branch: `codex/us-615-assign-owner-review-apply-fresh`
- Related commit/PR: `pending finalization`
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's sprint-owner-gap finding to offer a real guided apply flow so accountability can be assigned without leaving the current FleetGraph interaction.

## User Story

> As an engineer or PM, I want FleetGraph to review and apply `assign sprint owner` from the owner-gap finding so the system can help me close the gap it detected instead of stopping at advisory text.

## Goal

Turn the shipped sprint-owner-gap advisory flow into a real FleetGraph review/apply path that writes owner assignment in Ship, refreshes the current page state, and stops resurfacing the same finding once accountability exists.

## Scope

In scope:

1. Define a real FleetGraph review/apply contract for `assign_owner`.
2. Add a guided review payload that makes clear who will be assigned and why.
3. Execute the underlying Ship owner-assignment write through FleetGraph runtime.
4. Refresh the current page and proactive state after apply so the owner-gap finding resolves visibly.
5. Add a repeatable seeded proof lane for the apply path if the current owner-gap seed is not enough.

Out of scope:

1. Automatic owner recommendation or ranking logic.
2. Bulk assignment workflows.
3. Generalizing every advisory proactive action into review/apply in the same story.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/actions/service.ts`
2. `api/src/services/fleetgraph/contracts/actions.ts`
3. `api/src/routes/fleetgraph.ts`
4. `api/src/routes/weeks.ts`
5. `web/src/components/FleetGraphFindingCard.tsx`
6. `web/src/lib/fleetgraph-findings-presenter.ts`
7. `docs/user-stories/phase-3/US-610-fleetgraph-sprint-owner-gap.md`
8. `docs/guides/fleetgraph-demo-inspection.md`

## Preparation Phase

1. Confirm the smallest safe owner-assignment mutation already exposed by Ship.
2. Confirm how FleetGraph should choose or receive the target owner for review/apply.
3. Confirm the visible proof path after apply on the current page and proactive panel.

### Preparation Notes

- Smallest safe owner-assignment write: reuse Ship's existing `PATCH /api/documents/:id` mutation and keep it behind FleetGraph runtime-mediated apply.
- Target owner rule for this story: assign the authenticated user who clicks `Assign owner in Ship`, and say that explicitly in the review copy.
- Visible proof lane: `FleetGraph Demo Week - Owner Gap` should show the signed-in user in `Owner` after apply, and the owner-gap finding should disappear on refresh.

## Preconditions

- [x] `US-612` is complete and the assignment-critical workbook lane is closed honestly
- [x] A stable owner-gap proof lane exists on the demo
- [x] The Ship owner-assignment endpoint and page refresh behavior are audited before implementation

## TDD Plan

1. Add route/runtime tests for `assign_owner` review and apply.
2. Add UI tests for the finding card review/apply state.
3. Add seeded proof-lane coverage for the resolved-after-apply behavior.

## Step-by-step Implementation Plan

1. Extend FleetGraph action contracts to support `assign_owner`.
2. Implement the review payload and apply execution path.
3. Reuse the existing proactive finding card review/apply affordance instead of keeping owner assignment advisory-only.
4. Refresh the page and finding state after apply.
5. Update seeded-proof docs and handoff steps.

## Acceptance Criteria

- [x] AC-1: Sprint-owner-gap findings can enter a real FleetGraph review/apply flow.
- [x] AC-2: Applying the reviewed action assigns an owner in Ship and surfaces visible proof on the current page.
- [x] AC-3: Once an owner is assigned, FleetGraph no longer resurfaces the same owner-gap finding for that sprint.
- [x] AC-4: The seeded proof lane and docs make the end-to-end apply flow easy to test.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/lib/fleetgraph-findings-presenter.test.ts
npx pnpm --filter @ship/api exec tsc --noEmit
npx pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the seeded owner-gap proof lane before and after apply.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Owner Gap`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: open FleetGraph, review the owner-gap finding, confirm the review says FleetGraph will assign the signed-in user, apply the owner-assignment action, then refresh the page state
- Expected result: the sprint owner is assigned visibly to the signed-in user, the owner-gap finding resolves, and FleetGraph does not re-offer the same owner-gap step
- Failure signal: the finding remains advisory-only, the write is not visible on the page, or the same gap resurfaces immediately after apply

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Owner Gap`.
2. Open the owner-gap finding.
3. Review the owner-assignment step through FleetGraph and confirm it says the signed-in user will be assigned.
4. Apply the owner-assignment step through FleetGraph.
5. Confirm the page shows the signed-in user as owner and the owner-gap finding disappears.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: click `Review and apply`, confirm the review says it will assign the signed-in user, then click `Assign owner in Ship`
- Expected visible result: the sprint owner becomes visible on the page as the signed-in user and the owner-gap finding is gone
- Failure signal: FleetGraph still only shows advisory text or the same finding remains after apply

## Checkpoint Result

- Outcome: `implemented locally`
- Evidence:
  - FleetGraph now treats `assign_owner` as a real finding review/apply action instead of leaving the owner-gap card advisory-only.
  - The apply path runs through FleetGraph runtime, writes owner assignment through Ship's existing document patch route, refreshes the current page, and resolves the owner-gap finding after a successful apply.
  - The seeded proof lane remains `FleetGraph Demo Week - Owner Gap`, and the inspection guide now tells reviewers to confirm the review copy, owner field, and finding disappearance on the same page.
- Residual risk:
  - This first trustworthy path only self-assigns the authenticated user; assigning someone else still needs a separate picker or recommendation flow.
  - Railway demo proof depends on merge-to-`master` auto-deploy, which has not been observed from this branch.
