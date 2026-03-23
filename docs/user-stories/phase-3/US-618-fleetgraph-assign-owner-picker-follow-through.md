# US-618: FleetGraph Assign-Owner Picker Follow-Through

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-615`
- Related branch: `codex/us-618-owner-picker-follow-through`
- Active worktree: `/Users/youss/Development/gauntlet/ship`
- Parallel dependency / merge order: Queue visibility landed first on `master`; implementation refreshed from latest `master` and `US-619` remains blocked on `US-616` after this owner-picker follow-through lands.
- Related commit/PR: `42c756e`, [PR #174](https://github.com/thisisyoussef/ship/pull/174)
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

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/phase-3/README.md`
7. `docs/user-stories/phase-3/US-618-fleetgraph-assign-owner-picker-follow-through.md`
8. `docs/DEFINITION_OF_DONE.md`
9. `docs/assignments/fleetgraph/README.md`
10. `docs/assignments/fleetgraph/PRESEARCH.md`
11. `docs/assignments/fleetgraph/FLEETGRAPH.md`
12. `.claude/CLAUDE.md`
13. `web/src/components/sidebars/WeekSidebar.tsx`
14. `web/src/components/ui/Combobox.tsx`
15. `web/src/components/FleetGraphFindingCard.tsx`
16. `web/src/components/FleetGraphFindingsPanel.tsx`
17. `web/src/hooks/useFleetGraphFindings.ts`
18. `web/src/hooks/useTeamMembersQuery.ts`
19. `web/src/pages/UnifiedDocumentPage.tsx`
20. `api/src/services/fleetgraph/actions/service.ts`
21. `api/src/routes/fleetgraph.ts`
22. `api/src/services/fleetgraph/graph/runtime.ts`
23. `docs/guides/fleetgraph-demo-inspection.md`

Expected contracts/data shapes:

1. FleetGraph should reuse the same assignable-member list that already feeds the sprint owner combobox in the Properties sidebar.
2. The owner-gap review/apply routes should stay backward-compatible for non-owner actions while accepting an optional selected `ownerId` for assign-owner actions.
3. The owner-gap proof lane should show the selected owner on the page after apply and clear the proactive finding once ownership exists.

Planned failing tests:

1. Route/service/runtime coverage for carrying an explicit `ownerId` through FleetGraph review/apply.
2. Proactive-panel UI coverage for the inline owner picker, disabled confirm state before selection, and selected-owner apply notice.
3. Proof-lane copy checks so the visible Railway/demo guidance no longer implies self-assignment.

## Preconditions

- [x] `US-615` is complete and merged
- [x] The owner-gap proof lane is stable on the demo
- [x] The sprint owner dropdown behavior in the Properties sidebar is audited before implementation

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

- [x] AC-1: Sprint-owner-gap findings can enter a FleetGraph review/apply flow that includes a searchable owner dropdown.
- [x] AC-2: Applying the reviewed action assigns the selected owner in Ship rather than implicitly assigning the signed-in user.
- [x] AC-3: After a successful apply, the current page shows the selected owner and FleetGraph no longer resurfaces the same owner-gap finding for that sprint.
- [x] AC-4: The seeded proof lane and docs make the end-to-end selected-owner flow easy to test.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/actions/service.test.ts src/services/fleetgraph/graph/runtime.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/lib/fleetgraph-findings-presenter.test.ts
npx pnpm --filter @ship/api exec tsc --noEmit
npx pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

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
3. Choose a specific owner from the dropdown.
4. Apply the owner-assignment step through FleetGraph.
5. Confirm the page shows the selected owner and the owner-gap finding disappears.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Owner Gap`
- Interaction: click `Review and apply`, choose a person from the owner dropdown, then click `Assign owner in Ship`
- Expected visible result: the sprint owner becomes visible on the page as the selected person and the owner-gap finding is gone
- Failure signal: FleetGraph still only supports self-assignment or the selected owner does not match the visible result

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Reused the existing assignable-member combobox pattern from the sprint Properties sidebar so FleetGraph owner-gap review now requires an explicit `Sprint owner` choice before confirmation.
  - Extended the FleetGraph review/apply contract to carry an optional selected `ownerId`, while preserving the original no-body review/apply path for non-owner finding types.
  - Updated the owner-gap apply notices, runtime copy, seeded demo fixture text, and demo inspection guide so the proof lane now describes selecting any teammate instead of self-assignment.
  - Local validation passed:
    - `npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/actions/service.test.ts src/services/fleetgraph/graph/runtime.test.ts --config vitest.fleetgraph.config.ts`
    - `npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/lib/fleetgraph-findings-presenter.test.ts`
    - `npx pnpm --filter @ship/api exec tsc --noEmit`
    - `npx pnpm --filter @ship/web exec tsc --noEmit`
    - `git diff --check`
  - Additional touched-test note:
    - `npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/actions/store.test.ts --config vitest.fleetgraph.config.ts` remains blocked in this shell because no container runtime is available for Testcontainers.
- Residual risk:
  - Live Railway proof still depends on merged-`master` auto-deploy and direct inspection of `FleetGraph Demo Week - Owner Gap` to confirm the selected-owner interaction on the sanctioned demo surface end to end.
