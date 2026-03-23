# US-618: FleetGraph Assign-Owner Picker Follow-Through

## Status

- State: `todo`
- Owner: Codex
- Depends on: `US-615`
- Related branch:
- Active worktree:
- Parallel dependency / merge order:
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's owner-gap review step to let them choose the actual sprint owner from a searchable dropdown so the apply path matches how owner assignment already works in Ship's Properties sidebar.

## User Story

> As an engineer or PM, I want FleetGraph to let me choose the sprint owner during review/apply so I can assign the right person without leaving the current FleetGraph interaction or being forced to assign myself.

## Goal

Extend the shipped US-615 owner-gap review/apply path so it can assign any valid sprint owner through a Properties-tab-style dropdown, keep the write runtime-mediated through FleetGraph, and preserve a clear on-page proof lane after apply.

## Scope

In scope:

1. Reuse or mirror the existing sprint-owner picker interaction from the Properties sidebar inside FleetGraph's owner-gap review state.
2. Extend the review/apply contract so FleetGraph carries a selected owner id instead of hard-coding the signed-in user.
3. Apply the selected owner through the existing runtime-mediated Ship mutation path and refresh the visible page state afterward.
4. Keep the owner-gap proof lane user-visible and trustworthy by showing the chosen owner on page and clearing the finding once the gap is closed.

Out of scope:

1. Automatic owner recommendation or ranking logic.
2. Multi-owner accountability models or broader workflow redesign.
3. Generalizing the same picker pattern to issue assignment in the same story.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/components/sidebars/WeekSidebar.tsx` — current sprint owner dropdown behavior in the Properties sidebar
2. `web/src/components/ui/Combobox.tsx` — shared searchable dropdown control used by the owner field
3. `web/src/components/FleetGraphFindingCard.tsx` — review/apply rendering surface for proactive findings
4. `web/src/components/FleetGraphFindingsPanel.tsx` — owner-gap review/apply orchestration on the proactive panel
5. `web/src/lib/fleetgraph-findings.ts` — current finding and review payload shapes
6. `web/src/hooks/useWeeksQuery.ts` — existing sprint owner update data shapes and expectations
7. `api/src/services/fleetgraph/actions/service.ts` — current owner-gap review/apply behavior that self-assigns the actor
8. `api/src/routes/fleetgraph.ts` — review/apply route wiring and request payload flow
9. `docs/user-stories/phase-3/US-615-fleetgraph-assign-owner-review-apply-follow-through.md` — current owner-apply baseline and proof lane
10. `docs/guides/fleetgraph-demo-inspection.md` — demo verification script for the owner-gap lane

## Preparation Phase

1. Confirm the owner options source FleetGraph should use and whether it can share the same filtered people set as the Properties sidebar.
2. Confirm the smallest review/apply contract change that can carry a selected owner id through the existing runtime-mediated apply path.
3. Confirm the visible proof path after apply on the current page and proactive findings panel when the chosen owner is not the signed-in user.

### Preparation Notes

- Pending implementation.

## Preconditions

- [ ] `US-615` is complete and merged
- [ ] The owner-gap proof lane is stable on the demo
- [ ] The sprint owner dropdown behavior in the Properties sidebar is audited before implementation

## TDD Plan

1. Add route/runtime tests for owner-gap review/apply with an explicit selected owner id.
2. Add proactive-panel UI tests for the owner picker inside the FleetGraph review state.
3. Add or extend proof-lane coverage for the selected-owner visible result and resolved-after-apply behavior.

## Step-by-step Implementation Plan

1. Extend FleetGraph's review contract to return the data needed for a searchable owner picker.
2. Reuse the shared `Combobox` owner-selection pattern from the sprint Properties sidebar in the FleetGraph review UI.
3. Carry the selected owner id through review/apply and runtime-mediated Ship patch execution.
4. Refresh page and finding state after apply so the chosen owner is visible on the page and the owner-gap finding resolves.
5. Update proof-lane docs and handoff steps to describe selecting someone other than the signed-in user.

## Acceptance Criteria

- [ ] AC-1: Sprint-owner-gap findings can enter a FleetGraph review/apply flow that includes a searchable owner dropdown.
- [ ] AC-2: Applying the reviewed action assigns the selected owner in Ship rather than implicitly assigning the signed-in user.
- [ ] AC-3: After a successful apply, the current page shows the selected owner and FleetGraph no longer resurfaces the same owner-gap finding for that sprint.
- [ ] AC-4: The seeded proof lane and docs make the end-to-end selected-owner flow easy to test.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/actions/service.test.ts src/services/fleetgraph/graph/runtime.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/lib/fleetgraph-findings-presenter.test.ts
npx pnpm --filter @ship/api exec tsc --noEmit
npx pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

If sibling branches land first before finalization, rerun this section after syncing to latest `master`.

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the owner-gap proof lane by choosing a non-self owner before and after apply.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Owner Gap`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: open FleetGraph, review the owner-gap finding, use the owner dropdown to choose a person other than the signed-in user, apply the owner-assignment action, then refresh the page state
- Expected result: the sprint owner is assigned visibly to the selected person, the owner-gap finding resolves, and FleetGraph does not re-offer the same owner-gap step
- Failure signal: the review still hard-codes the signed-in user, the chosen owner is ignored on apply, or the same gap resurfaces immediately after apply

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Owner Gap`.
2. Open the owner-gap finding and enter review.
3. Choose a specific owner from the dropdown instead of leaving a self-assignment default.
4. Apply the owner-assignment step through FleetGraph.
5. Confirm the page shows the selected owner and the owner-gap finding disappears.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: click `Review and apply`, choose a person from the owner dropdown, then click `Assign owner in Ship`
- Expected visible result: the sprint owner becomes visible on the page as the selected person and the owner-gap finding is gone
- Failure signal: FleetGraph still only supports self-assignment or the selected owner does not match the visible result

## Checkpoint Result

- Outcome: `pending`
- Evidence:
- Residual risk:
