# US-616: FleetGraph Assign-Issues Review/Apply Follow-Through

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-614`
- Related branch: `codex/us-616-assign-issues-review-apply`
- Related commit/PR: `pending finalization`
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

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/phase-3/README.md`
7. `docs/user-stories/phase-3/US-616-fleetgraph-assign-issues-review-apply-follow-through.md`
8. `docs/DEFINITION_OF_DONE.md`
9. `docs/assignments/fleetgraph/README.md`
10. `docs/assignments/fleetgraph/PRESEARCH.md`
11. `docs/assignments/fleetgraph/FLEETGRAPH.md`
12. `.claude/CLAUDE.md`
13. `api/src/services/fleetgraph/actions/service.ts`
14. `api/src/services/fleetgraph/actions/types.ts`
15. `api/src/services/fleetgraph/graph/runtime.ts`
16. `api/src/routes/fleetgraph.ts`
17. `api/src/routes/issues.ts`
18. `api/src/services/fleetgraph/proactive/unassigned-issues.ts`
19. `api/src/services/fleetgraph/demo/fixture.ts`
20. `web/src/components/FleetGraphFindingCard.tsx`
21. `web/src/components/FleetGraphFindingsPanel.tsx`
22. `web/src/hooks/useFleetGraphFindings.ts`
23. `web/src/lib/fleetgraph-findings.ts`
24. `web/src/lib/fleetgraph-findings-presenter.ts`
25. `docs/guides/fleetgraph-demo-inspection.md`
26. `docs/user-stories/phase-3/US-611-fleetgraph-unassigned-sprint-issues.md`

Expected contracts/data shapes:

1. Ship can apply this gap through `POST /api/issues/bulk` by setting `updates.assignee_id` across the currently unassigned sprint issues.
2. The existing proactive review/apply affordance can be reused if `assign_issues` becomes a tracked FleetGraph finding action alongside `assign_owner` and `start_week`.
3. The visible review flow should require an explicit assignee choice, keep the write paused until confirmation, refresh the current page, and resolve the finding after a successful apply.

Planned failing tests:

1. Route and action-service coverage for `assign_issues` review/apply payloads and tracked execution.
2. Presenter coverage that marks `assign_issues` as reviewable and gives it its own execution labels/notices.
3. Panel coverage that replaces the old advisory-only lane with the shared review/apply flow and assignee picker.

## Preconditions

- [x] `US-614` is complete
- [x] The unassigned-issues proof lane is stable in repo bootstrap/demo fixture setup
- [x] The underlying Ship issue-assignment mutation and page refresh behavior are audited before implementation

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

- [x] AC-1: Unassigned-issues findings can enter a real FleetGraph review/apply flow.
- [x] AC-2: Applying the reviewed action writes the intended Ship issue-assignment decision and surfaces visible proof on the current page.
- [x] AC-3: Once the sprint no longer has a meaningful unassigned cluster, FleetGraph no longer resurfaces the same finding for that sprint.
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
3. Verify the seeded unassigned-issues proof lane before and after apply.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Unassigned Issues`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Unassigned Issues`
- Interaction: open FleetGraph, click `Review and apply`, choose an `Issue assignee`, confirm `Assign issues in Ship`, then refresh the page state
- Expected result: the sprint’s issue list reflects the selected assignee on the formerly unassigned issues and FleetGraph does not re-offer the same finding immediately
- Failure signal: the finding remains advisory-only, the assignee picker is missing, the selected assignee is ignored, or the same unassigned-issues gap resurfaces immediately after apply

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Unassigned Issues`.
2. Open the unassigned-issues finding.
3. Choose an `Issue assignee` in the FleetGraph review state.
4. Apply the issue-assignment step through FleetGraph.
5. Confirm the page shows the assignment effect and the unassigned-issues finding disappears or resolves.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Unassigned Issues`
- Interaction: click `Review and apply`, choose an `Issue assignee`, then click `Assign issues in Ship`
- Expected visible result: the page reflects the selected assignee on the sprint issues and the unassigned-issues finding is gone or resolved
- Failure signal: FleetGraph still only shows advisory text, the selected assignee is not applied, or the same finding remains after apply

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Widened FleetGraph’s tracked finding-action contract so `assign_issues` now uses the same review/apply execution path, execution records, and result hydration model as the existing owner-gap and start-week flows.
  - Replaced the old advisory-only unassigned-issues action with a real `POST /api/issues/bulk` apply path that carries the currently unassigned sprint issue IDs plus the reviewer’s selected `Issue assignee`.
  - Updated the proactive findings panel/card so unassigned-issues findings now show `Review and apply`, require an assignee selection, and keep the confirm action disabled until the review payload is ready.
  - Added route, action-service, presenter, and visible-surface regressions for the assignee-selection review/apply path.
  - Refreshed the seeded unassigned-issues demo lane contract and inspection guide so the sanctioned proof path now matches the real review/apply behavior.
  - Local validation passed:
    - `npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/actions/service.test.ts src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts`
    - `npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts`
    - `npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/lib/fleetgraph-findings-presenter.test.ts`
    - `npx pnpm --filter @ship/api exec tsc --noEmit`
    - `npx pnpm --filter @ship/web exec tsc --noEmit`
    - `bash scripts/check_ai_wiring.sh`
    - `git diff --check`
- Residual risk:
  - The live Railway proof still needs post-merge inspection on `FleetGraph Demo Week - Unassigned Issues` to confirm the authenticated assignee-picker flow is visible on the sanctioned demo surface and clears the finding after apply.
