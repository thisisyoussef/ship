# US-604: Review-Tab Plan Validation Proof Lane

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-603`
- Related branch: `codex/fleetgraph-plan-validation-entry`
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's guided action to change something they can immediately verify on the page they are already using.

## User Story

> As an engineer or PM, I want FleetGraph to preview and apply a week-review validation step on the review tab so I can see visible proof of the change without guessing at hidden approval state.

## Goal

Pivot the FleetGraph current-page consequential action proof lane from hidden week-plan approval state on the overview page to visible plan validation on the review tab, while keeping the change narrow and reusing the existing FleetGraph review/apply runtime.

## Scope

In scope:

1. Surface FleetGraph's sprint-page guided action only on the `review` tab.
2. Build a typed `validate_week_plan` action that writes through the existing week review endpoints.
3. Refresh the review tab after apply so `Plan Validation` visibly flips to `Validated`.
4. Update the proof docs and assignment workbook to describe the new visible proof lane truthfully.

Out of scope:

1. Reworking the week overview sidebar to expose hidden plan-approval state.
2. Broadening proactive cases or the finding panel.
3. Replacing the rest of the current-page approval/guided-step model.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/lib/fleetgraph-entry.ts`
2. `web/src/components/FleetGraphEntryCard.tsx`
3. `web/src/hooks/useFleetGraphEntry.ts`
4. `web/src/components/WeekReview.tsx`
5. `api/src/services/fleetgraph/entry/service.ts`
6. `api/src/services/fleetgraph/graph/runtime.ts`
7. `api/src/routes/weeks.ts`

## Preparation Phase

1. Confirm where week-plan approval state is actually visible in Ship today.
2. Confirm whether the existing review tab already has a visible validation control.
3. Confirm whether FleetGraph can safely write through the week-review endpoints with the existing runtime/apply path.

### Preparation Notes

Local docs/code reviewed:

1. `web/src/components/sidebars/WeekSidebar.tsx`
2. `web/src/components/WeekReview.tsx`
3. `api/src/routes/weeks.ts`
4. `web/src/lib/fleetgraph-entry.ts`
5. `api/src/services/fleetgraph/entry/service.ts`

Expected contracts/data shapes:

1. Week review state comes from `GET /api/weeks/:id/review`.
2. Draft review creation uses `POST /api/weeks/:id/review`; existing review updates use `PATCH /api/weeks/:id/review`.
3. `plan_validated` is the visible proof field on the review tab.
4. Hidden overview/sidebar approval state is not reliable enough as the primary user proof lane.

Planned failing tests:

1. Sprint review pages should build a `validate_week_plan` action, including the write body.
2. The entry route should accept validation actions with a review write body.
3. The entry card should load week-review state and preview the validation step on the review tab.

## UX Script

Happy path:

1. User opens `FleetGraph Demo Week - Review and Apply`.
2. User goes to the `Review` tab and clicks `Preview next step`.
3. FleetGraph previews `Validate week plan`.
4. User clicks `Apply`.
5. FleetGraph shows `Week plan validated.` and the page shows `Plan Validation` -> `Validated`.

Error path:

1. User previews the next step on the review tab.
2. FleetGraph either offers a hidden/unverifiable action or the page does not visibly refresh after apply.
3. The user cannot tell what changed, which breaks trust in the guided step.

## Preconditions

- [x] Relevant FleetGraph entry/runtime code was audited
- [x] Relevant week review endpoints were audited
- [x] Existing visible proof lane was found to be insufficient

## TDD Plan

1. Extend the entry payload tests for sprint review validation.
2. Extend the route tests for validation-body acceptance.
3. Extend the entry-card tests for review-tab state loading and preview rendering.
4. Patch production code only after the narrow regressions are identified.

## Step-by-step Implementation Plan

1. Widen the FleetGraph requested-action contracts to carry an optional request body through approval preview and apply.
2. Add `validate_week_plan` to the FleetGraph action model.
3. Read live week-review state on the sprint review tab before building the guided step.
4. Use the review endpoints for the new action and reuse the existing FleetGraph runtime-backed apply path.
5. Refresh the review tab after apply so the visible `Plan Validation` state updates.
6. Update the proof docs and workbook to describe the review-tab validation flow.

## Acceptance Criteria

- [x] AC-1: Sprint review pages preview `Validate week plan` instead of week-plan approval on the overview tab.
- [x] AC-2: The validation guided step writes through FleetGraph's runtime-backed apply path with the required review body.
- [x] AC-3: Applying the guided step visibly updates `Plan Validation` on the review tab.
- [x] AC-4: The guide, workbook, and story log all describe the review-tab proof lane truthfully.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/web exec vitest run src/lib/fleetgraph-entry.test.ts src/hooks/useFleetGraphEntry.test.tsx src/components/FleetGraphEntryCard.test.tsx
pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/entry/action-service.test.ts --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec tsc --noEmit
pnpm --filter @ship/api exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the seeded review-tab proof lane on prod after deploy.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Review and Apply`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply` -> `Review`
- Interaction: click `Preview next step`, then `Apply`
- Expected result: the card previews `Validate week plan`, the result panel says `Week plan validated.`, and the review sidebar shows `Plan Validation` -> `Validated`
- Failure signal: no visible review-state change, no inline result, or the same validation step is re-offered immediately

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Review and Apply`.
2. Switch to the `Review` tab.
3. Click `Preview next step`, then `Apply`.
4. Confirm the result panel says `Week plan validated.` and the `Plan Validation` control shows `Validated`.
5. Click `Preview next step` again and confirm FleetGraph does not offer the same validation step again.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply` -> `Review`
- Interaction: preview the next step, apply it, then preview again
- Expected visible result: FleetGraph previews `Validate week plan`, the review page visibly flips to `Validated`, and the repeated preview is suppressed
- Failure signal: the result is not visible on the review page, or FleetGraph keeps offering the same validation step

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - FleetGraph now builds a typed `validate_week_plan` action only on sprint review tabs and carries the required review write body through the entry/runtime contracts.
  - The review tab listens for the FleetGraph apply event and refetches review state, so the `Plan Validation` control becomes visible proof of the write.
  - The FleetGraph workbook and demo inspection guide now describe the proof lane as a current-page guided step on the review tab instead of a hidden week-plan approval state.
- Residual risk:
  - The proof lane depends on `GET /api/weeks/:id/review` remaining consistent with the write endpoints; if those diverge, the guided step could preview or refresh incorrectly.
