# US-614: FleetGraph FAB Guided-Actions Panel Convergence

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-613`
- Related branch: `codex/us-614-fab-guided-actions-panel-convergence`
- Related commit/PR: `pending finalization`
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's guided next-step flow to live in the floating action button so the interaction feels unified without changing what the guided action actually does.

## User Story

> As an engineer or PM, I want `Preview next step` and the guided-actions part of FleetGraph quick actions to move into the floating action button as a separate guided-actions panel so I can use one FleetGraph surface without changing the current review/apply flow or behavior.

## Goal

Converge the current-page guided-step preview into the FleetGraph FAB by giving the FAB a dedicated guided-actions panel that preserves the same guided-step review/apply behavior, copy, and proof path the entry card already uses today. This story should treat the move as a UI-surface relocation first, not a hard backend or graph-contract rewrite.

## Scope

In scope:

1. Move `Preview next step` and the guided-actions slice of FleetGraph quick actions off the embedded entry card and into the FAB.
2. Add a dedicated guided-actions panel inside the FAB that preserves the existing guided-step preview, review, apply, and cancel behavior.
3. Keep current-page analysis and guided actions coherent inside the same floating FleetGraph shell without duplicating or conflicting state.
4. Update proof-lane docs and visible-surface tests so they match the converged FAB experience truthfully.

Out of scope:

1. New FleetGraph scenarios, prompt changes, or scoring changes.
2. Rewriting the guided-step runtime contract if the existing preview/apply path can be reused.
3. Broad visual redesign beyond the minimum needed to separate analysis from guided actions inside the FAB.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/components/FleetGraphFab.tsx`
2. `web/src/components/FleetGraphEntryCard.tsx`
3. `web/src/pages/UnifiedDocumentPage.tsx`
4. `web/src/hooks/useFleetGraphEntry.ts`
5. `web/src/hooks/useFleetGraphAnalysis.ts`
6. `api/src/services/fleetgraph/entry/service.ts`
7. `docs/guides/fleetgraph-demo-inspection.md`
8. `docs/user-stories/phase-3/US-609.5-fleetgraph-fab-analysis-handoff.md`

## Preparation Phase

1. Confirm exactly which entry-card state and contracts power the current guided-step preview/apply flow.
2. Confirm the smallest safe way to rehost that flow inside the FAB without changing guided-step semantics.
3. Confirm how analysis and guided actions should be separated visually inside the FAB so the move stays lightweight and understandable.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/phase-3/README.md`
7. `docs/user-stories/phase-3/US-614-fleetgraph-fab-guided-actions-panel-convergence.md`
8. `docs/DEFINITION_OF_DONE.md`
9. `docs/assignments/fleetgraph/README.md`
10. `docs/assignments/fleetgraph/PRESEARCH.md`
11. `docs/assignments/fleetgraph/FLEETGRAPH.md`
12. `docs/guides/fleetgraph-demo-inspection.md`
13. `docs/user-stories/phase-3/US-609.5-fleetgraph-fab-analysis-handoff.md`
14. `.claude/CLAUDE.md`
15. `web/src/components/FleetGraphFab.tsx`
16. `web/src/components/FleetGraphEntryCard.tsx`
17. `web/src/pages/UnifiedDocumentPage.tsx`
18. `web/src/hooks/useFleetGraphEntry.ts`
19. `web/src/hooks/useFleetGraphAnalysis.ts`
20. `web/src/lib/fleetgraph-entry.ts`
21. `api/src/services/fleetgraph/entry/service.ts`

Expected contracts/data shapes:

1. The existing guided-step preview/apply contract should stay intact unless a narrow UI adapter proves insufficient.
2. The FAB can host analysis and guided actions as separate panels or tabs without resetting the shared page context.
3. `Check this page` should remain the entry-card launcher for analysis, while `Preview next step` should move into the FAB’s guided-actions panel.
4. The page should prepare the same review-aware entry input for both surfaces so guided-step state does not split across the entry card and the FAB.

Planned failing tests:

1. The entry card no longer renders inline `Preview next step` and instead points guided actions into the FAB.
2. The FAB guided-actions panel preserves the same guided-step review/apply lifecycle and visible copy users already rely on.
3. Analysis and guided-actions paths can coexist in the FAB without duplicated state or broken thread continuity.

## UX Script

Happy path:

1. User opens a seeded FleetGraph document page.
2. User launches FleetGraph and opens the guided-actions panel in the FAB.
3. User previews the next step and sees the same guided-step review/apply behavior they use today.
4. If they switch back to analysis, the FAB keeps the same current-page context instead of feeling like a separate tool.

Error path:

1. The guided-step flow is moved into the FAB.
2. The move changes labels, proof cues, or apply behavior, or forces a broader contract rewrite.
3. Users lose trust because the surface moved and the interaction changed at the same time.

## Preconditions

- [x] Fresh story branch is checked out before edits begin
- [x] Entry-card guided-step preview/apply flow is stable before the move
- [x] FAB analysis flow is stable before adding guided-actions convergence
- [x] The move can be attempted as a surface refactor before any deeper runtime changes

## TDD Plan

1. Add visible-surface tests for `Preview next step` launching a FAB guided-actions panel.
2. Add or update FAB tests for guided-step preview/apply state preservation.
3. Keep route/runtime tests focused on preserving the existing guided-step contract, not redefining it.

## Step-by-step Implementation Plan

1. Move the guided-step launcher into a dedicated FAB guided-actions panel while leaving `Check this page` as the entry-card launcher for analysis.
2. Add a dedicated FAB guided-actions panel that reuses the current guided-step preview/apply behavior.
3. Reduce the entry card to the minimum copy/launch affordances needed after the move.
4. Refresh proof docs and seeded verification steps to describe the converged FAB behavior accurately.

## Acceptance Criteria

- [x] AC-1: `Preview next step` no longer depends on inline entry-card guided state and instead opens a dedicated guided-actions panel in the FleetGraph FAB.
- [x] AC-2: The FAB guided-actions panel preserves the same guided-step preview, review, apply, and cancel behavior the entry-card flow already provides.
- [x] AC-3: FAB analysis and guided actions share one current-page surface without duplicated or conflicting state.
- [x] AC-4: Proof docs and verification steps describe the converged FAB flow truthfully and make clear that behavior stayed the same even though the surface moved.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab.test.tsx src/components/FleetGraphEntryCard.test.tsx src/pages/UnifiedDocumentPage.test.tsx
npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/web exec tsc --noEmit
npx pnpm --filter @ship/api exec tsc --noEmit
bash scripts/check_ai_wiring.sh
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the seeded guided-step proof lane on the public demo with the guided-actions flow now living in the FAB.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Validation Ready`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: open FleetGraph, use the guided-actions panel in the FAB for `Preview next step`, then confirm the same guided-step flow is available there
- Expected result: the FAB hosts guided-step preview/apply in a dedicated guided-actions panel, while the current behavior and proof cues stay the same
- Failure signal: guided actions still render inline on the entry card, the FAB flow changes the behavior, or analysis and guided actions fight each other

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Validation Ready`.
2. Open FleetGraph and launch the guided-actions panel.
3. Use `Preview next step`.
4. Confirm the same guided-step preview appears in the FAB rather than inline on the entry card.
5. Apply or cancel the step and confirm the behavior matches the current flow.
6. Return to analysis and confirm the FAB still feels like one coherent surface.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: launch FleetGraph, use `Preview next step` in the FAB guided-actions panel, then return to analysis if needed
- Expected visible result: one floating FleetGraph surface hosts both analysis and guided actions, with guided-step behavior unchanged
- Failure signal: entry-card guided state still owns the flow, the FAB changes the flow, or the two panels duplicate/conflict

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Reworked the validation-ready page so the entry card is now a lightweight launcher while the FAB owns both `Analysis` and `Guided actions` as separate panels in one floating surface.
  - Added a shared page-entry preparation hook so the FAB guided-actions panel receives the same review-aware FleetGraph entry input the old inline preview path relied on.
  - Added a dedicated FAB guided-actions panel that reuses the existing FleetGraph preview/apply contract, carries review/apply state in the FAB, and keeps the debug-dock entry snapshot aligned with the moved flow.
  - Updated the validation-ready demo guide so it now describes `Preview next step` inside the FAB guided-actions panel instead of on the entry card.
  - Local validation passed:
    - `npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab.test.tsx src/components/FleetGraphEntryCard.test.tsx src/pages/UnifiedDocumentPage.test.tsx`
    - `npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts`
    - `npx pnpm --filter @ship/web exec tsc --noEmit`
    - `npx pnpm --filter @ship/api exec tsc --noEmit`
    - `bash scripts/check_ai_wiring.sh`
  - Deployment status: `not deployed`
- Residual risk:
  - The live Railway proof lane still needs post-merge inspection to confirm the authenticated FAB tab state and guided-actions flow match the seeded validation-ready route on the deployed demo.
