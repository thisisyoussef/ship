# US-603: Entry Approval Follow-Up Fixes

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-602`
- Related branch: `codex/fleetgraph-entry-apply-followup`
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants the FleetGraph entry approval flow to reflect real approval state and leave a readable, trustworthy result on the page.

## User Story

> As an engineer or PM, I want FleetGraph approval preview to stop re-offering already-applied week approvals and show a readable result so I can tell what changed.

## Goal

Fix the narrow follow-up issues on the recent entry apply story: suppress week-plan approval preview when the page is already approved, refresh the current page after apply so the approval state becomes visible, and make the light success panel readable.

## Scope

In scope:

1. Make current-page approval preview state-aware for already-approved plan states.
2. Refresh the current document/context after apply so the UI reflects the write.
3. Darken the inline result text on the light result panel.
4. Add focused regressions for the already-approved and apply-refresh path.

Out of scope:

1. Broad FleetGraph action model changes.
2. New approval action types.
3. Any deploy-pipeline changes.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/lib/fleetgraph-entry.ts` — preview action builder
2. `web/src/hooks/useFleetGraphEntry.ts` — apply mutation and invalidation
3. `web/src/components/FleetGraphEntryCard.tsx` — inline result panel
4. `web/src/components/FleetGraphEntryCard.test.tsx` — entry-card regression surface
5. `web/src/lib/fleetgraph-entry.test.ts` — payload-builder regression surface
6. `web/src/pages/UnifiedDocumentPage.tsx` — current document data passed into FleetGraph entry
7. `api/src/routes/weeks.ts` — actual week-plan approval write behavior

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm whether preview is currently state-aware and whether apply refreshes the current page.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `web/src/lib/fleetgraph-entry.ts`
2. `web/src/hooks/useFleetGraphEntry.ts`
3. `web/src/components/FleetGraphEntryCard.tsx`
4. `web/src/pages/UnifiedDocumentPage.tsx`
5. `api/src/routes/weeks.ts`

Expected contracts/data shapes:

1. Sprint approval writes set `plan_approval.state = 'approved'` in Ship.
2. The current FleetGraph preview path is blind to that state and re-offers approval based on page type alone.
3. The current page uses `['document', id]` and `documentContextKeys.detail(id)` queries, which should be refreshed after apply.

Planned failing tests:

1. Already-approved week pages should not build a new `approve_week_plan` preview action.
2. The inline result panel should use dark text on the light success surface.
3. Applying approval should invalidate the current page document/context queries.

## UX Script

Happy path:

1. User previews week approval.
2. User clicks `Apply`.
3. FleetGraph shows a readable success result and the page refreshes to the approved state.
4. If the user previews again, FleetGraph does not ask for the same approval again.

Error path:

1. User applies approval.
2. The page does not refresh or preview remains blind to approval state.
3. FleetGraph appears to offer the same approval again, which undermines trust.

## Preconditions

- [x] Relevant FleetGraph entry/apply code was audited
- [x] Relevant week approval write path was audited
- [x] Fresh branch exists

## TDD Plan

1. Add/update tests for already-approved preview suppression.
2. Add/update tests around apply path UI and invalidation behavior.
3. Patch the product code only after the regressions are in place.

## Step-by-step Implementation Plan

1. Extend the entry document shape with approval state needed for preview decisions.
2. Suppress approval preview when the current page is already approved.
3. Invalidate the current document/context queries after apply.
4. Darken the result-panel text classes.
5. Run focused web tests and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: Previewing approval on an already-approved week or plan page does not re-offer the same approval step.
- [x] AC-2: Applying week approval refreshes the current page data so the approval state is visible.
- [x] AC-3: The inline result panel remains readable on the light success/error backgrounds.
- [x] AC-4: Focused regressions cover the already-approved case and the apply follow-up behavior.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/web exec vitest run src/lib/fleetgraph-entry.test.ts src/components/FleetGraphEntryCard.test.tsx src/hooks/useFleetGraphEntry.test.tsx
pnpm --filter @ship/api exec tsc --noEmit
bash scripts/check_ai_wiring.sh
git diff --check
```

## Deployment Handoff

1. Record deployment status.
2. For this visible runtime change, monitor the Railway demo auto-deploy after merge.
3. Record the exact proof lane and outcome.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Review and Apply`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: click `Preview approval step`, then `Apply`, then click `Preview approval step` again
- Expected result: the result panel is readable, the page shows the approved state, and FleetGraph does not offer the same week approval again
- Failure signal: the success text is hard to read, the page looks unchanged after apply, or the same week approval preview reappears immediately

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Review and Apply`.
2. Click `Preview approval step`, then `Apply`.
3. Wait for the page to refresh, confirm the page now shows approved state, then click `Preview approval step` again and confirm the same week approval is not re-offered.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: preview week approval, apply it, then preview again
- Expected visible result: success text is readable, approval state on the page updates, and FleetGraph does not ask for the same approval again
- Failure signal: unreadable result text, stale page approval state, or repeated week-plan approval prompt

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - FleetGraph entry preview now suppresses `approve_week_plan` and `approve_project_plan` when the current page already carries `plan_approval.state = approved`.
  - Applying approval now invalidates the current page document and context queries, so the Ship page can visibly refresh after the write.
  - The inline result panel now uses explicit dark text on the light success/error backgrounds, and the demo inspection guide was updated to check the refreshed page state and repeated preview behavior.
- Residual risk:
  - Weekly-plan pages rely on the current document response carrying accurate `plan_approval` state; if that mapping ever drifts from sprint truth, this preview suppression could drift with it.
