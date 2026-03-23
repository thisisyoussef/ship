# US-616: FleetGraph Assign-Issues Review/Apply Follow-Through

## Status

- State: `todo`
- Owner: Codex
- Depends on: `US-614`
- Related branch:
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's unassigned-issues finding to offer a real guided apply flow so assignment decisions can be made from the same FleetGraph interaction instead of stopping at advisory text.

## User Story

> As an engineer or PM, I want FleetGraph to review and apply the next issue-assignment step from the unassigned-issues finding so the system can help me close the coordination gap it detected instead of only pointing it out.

## Goal

Turn the shipped unassigned-sprint-issues advisory flow into a real FleetGraph review/apply path that writes an explicit issue-assignment decision in Ship, refreshes the current page state, and stops resurfacing the same finding once the sprint no longer has a meaningful unassigned cluster.

## Scope

In scope:

1. Define a real FleetGraph review/apply contract for the unassigned-issues case.
2. Add a guided review payload that makes clear what FleetGraph will change and why.
3. Execute the underlying Ship write through FleetGraph runtime and refresh the visible page state after apply.
4. Resolve or suppress the finding once the cluster is no longer actionable.
5. Add or extend a seeded proof lane for the apply path if the existing unassigned-issues seed is not enough.

Out of scope:

1. Automatic assignee recommendation or ranking logic.
2. Bulk staffing optimization beyond the specific sprint gap FleetGraph is surfacing.
3. Generalizing every advisory proactive action into review/apply in the same story.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/actions/service.ts`
2. `api/src/services/fleetgraph/contracts/actions.ts`
3. `api/src/routes/fleetgraph.ts`
4. `api/src/routes/issues.ts`
5. `api/src/routes/weeks.ts`
6. `web/src/components/FleetGraphFindingCard.tsx`
7. `web/src/lib/fleetgraph-findings-presenter.ts`
8. `docs/user-stories/phase-3/US-611-fleetgraph-unassigned-sprint-issues.md`
9. `docs/guides/fleetgraph-demo-inspection.md`

## Preparation Phase

1. Confirm the smallest safe Ship mutation that can represent “close the unassigned issues gap.”
2. Confirm whether FleetGraph should collect assignee choices, target a single default action, or route into an existing Ship assignment surface.
3. Confirm the visible proof path after apply on both the page and the proactive findings surface.

### Preparation Notes

- Pending implementation.

## Preconditions

- [ ] `US-614` is complete
- [ ] The unassigned-issues proof lane is stable on the demo
- [ ] The underlying Ship issue-assignment mutation and page refresh behavior are audited before implementation

## TDD Plan

1. Add route/runtime tests for the unassigned-issues review and apply path.
2. Add UI tests for the proactive finding review/apply state.
3. Add or extend seeded proof-lane coverage for resolved-after-apply behavior.

## Step-by-step Implementation Plan

1. Extend FleetGraph action contracts to support the unassigned-issues apply path.
2. Implement the review payload and apply execution path.
3. Reuse the existing proactive finding review/apply affordance instead of keeping issue assignment advisory-only.
4. Refresh page and finding state after apply.
5. Update seeded-proof docs and handoff steps.

## Acceptance Criteria

- [ ] AC-1: Unassigned-issues findings can enter a real FleetGraph review/apply flow.
- [ ] AC-2: Applying the reviewed action writes the intended Ship issue-assignment decision and surfaces visible proof on the current page.
- [ ] AC-3: Once the sprint no longer has a meaningful unassigned cluster, FleetGraph no longer resurfaces the same finding for that sprint.
- [ ] AC-4: The seeded proof lane and docs make the end-to-end apply flow easy to test.

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
3. Verify the seeded unassigned-issues proof lane before and after apply.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Unassigned Issues`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Unassigned Issues`
- Interaction: open FleetGraph, review the unassigned-issues finding, apply the issue-assignment step, then refresh the page state
- Expected result: the sprint’s unassigned cluster is visibly resolved or reduced below the trigger threshold and FleetGraph does not re-offer the same finding immediately
- Failure signal: the finding remains advisory-only, the write is not visible on the page, or the same unassigned-issues gap resurfaces immediately after apply

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Unassigned Issues`.
2. Open the unassigned-issues finding.
3. Review and apply the issue-assignment step through FleetGraph.
4. Confirm the page shows the assignment effect and the unassigned-issues finding disappears or resolves.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Unassigned Issues`
- Interaction: apply the FleetGraph issue-assignment step from the proactive finding
- Expected visible result: the page reflects the assignment decision and the unassigned-issues finding is gone or resolved
- Failure signal: FleetGraph still only shows advisory text or the same finding remains after apply

## Checkpoint Result

- Outcome: `pending`
- Evidence:
- Residual risk:
