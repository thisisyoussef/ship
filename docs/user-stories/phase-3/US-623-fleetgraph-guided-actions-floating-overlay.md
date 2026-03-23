# US-623: FleetGraph Guided-Actions Floating Overlay

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-614`, `US-617`
- Related branch: `codex/us-623-guided-actions-overlay`
- Related commit/PR: `d4770bb`, [PR #192](https://github.com/thisisyoussef/ship/pull/192)
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's page-help launcher removed and guided next-step help surfaced in its own floating overlay so current-page guidance feels lighter and more automatic.

## User Story

> As an engineer or PM, I want the old FleetGraph entry card removed and guided actions surfaced in their own bottom-left floating overlay that auto-runs on a new page or tab so I can see whether FleetGraph has a next step without opening a second panel or juggling FAB tabs.

## Goal

Replace the remaining embedded FleetGraph entry card plus FAB tab split with a clearer current-page layout: the page shell should keep proactive findings, the FAB should focus on analysis/chat, and guided next-step preview should live in its own bottom-left floating overlay that automatically checks the new page or tab and only expands when FleetGraph has actionable guidance to show.

## Scope

In scope:

1. Remove the embedded `FleetGraph entry` card from document pages.
2. Split guided actions back out of the FAB into a dedicated bottom-left floating overlay.
3. Reuse the existing guided-step preview, review, apply, and cancel flow in the new overlay rather than rewriting the runtime contract.
4. Automatically preview the current page's guided next step on document or tab changes when FleetGraph entry context is ready.
5. Surface the overlay when a new page or tab has a next step, while keeping quiet/no-step states visually minimal.
6. Update tests, proof-lane docs, and user-facing verification copy to match the new surface truthfully.

Out of scope:

1. New FleetGraph scenario logic, prompt changes, or backend graph-contract rewrites.
2. Replacing the proactive findings panel or building the global left-sidebar queue from `US-619`.
3. Reworking the analysis/chat flow beyond the FAB simplification needed after guided actions move out.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/pages/UnifiedDocumentPage.tsx` — page-level FleetGraph composition and route/tab change inputs.
2. `web/src/components/FleetGraphFab.tsx` — current analysis plus guided-actions split that will be simplified.
3. `web/src/components/FleetGraphGuidedActionsPanel.tsx` — reusable guided preview/review/apply UI that should move intact.
4. `web/src/components/FleetGraphEntryCard.tsx` — embedded surface to remove.
5. `web/src/components/FleetGraphPanelShell.tsx` — current page-local wrapper that should keep proactive work only.
6. `web/src/hooks/useFleetGraphPageEntryInput.ts` — current-page guided-entry preparation contract.
7. `web/src/hooks/useFleetGraphEntry.ts` — preview/apply hook and reset behavior that the overlay will drive.
8. `docs/guides/fleetgraph-demo-inspection.md` — seeded proof-lane steps that still reference the entry card and FAB guided-actions tab.
9. `docs/user-stories/phase-3/US-614-fleetgraph-fab-guided-actions-panel-convergence.md` — current shipped truth that this story supersedes.

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm the smallest safe way to reuse guided preview/apply inside a new overlay without changing backend semantics.
3. Confirm how the overlay should auto-run once per page/tab context without spamming repeated preview requests.
4. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/phase-3/README.md`
7. `docs/DEFINITION_OF_DONE.md`
8. `docs/assignments/fleetgraph/README.md`
9. `docs/assignments/fleetgraph/PRESEARCH.md`
10. `docs/assignments/fleetgraph/FLEETGRAPH.md`
11. `.claude/CLAUDE.md`
12. `docs/user-stories/phase-3/US-614-fleetgraph-fab-guided-actions-panel-convergence.md`
13. `docs/user-stories/phase-3/US-619-fleetgraph-left-sidebar-global-findings-queue.md`
14. `docs/user-stories/phase-3/US-622-fleetgraph-route-trigger-enqueue-and-sweep-bootstrap.md`
15. `web/src/pages/UnifiedDocumentPage.tsx`
16. `web/src/components/FleetGraphEntryCard.tsx`
17. `web/src/components/FleetGraphFab.tsx`
18. `web/src/components/FleetGraphGuidedActionsPanel.tsx`
19. `web/src/components/FleetGraphPanelShell.tsx`
20. `web/src/hooks/useFleetGraphPageEntryInput.ts`
21. `web/src/hooks/useFleetGraphEntry.ts`
22. `web/src/hooks/useFleetGraphAnalysis.ts`
23. `web/src/pages/UnifiedDocumentPage.test.tsx`
24. `web/src/components/FleetGraphFab.test.tsx`
25. `web/src/components/FleetGraphEntryCard.test.tsx`
26. `web/src/components/FleetGraphPanelShell.test.tsx`

Expected contracts/data shapes:

1. `useFleetGraphPageEntryInput` already provides the review-aware guided entry payload the new overlay needs.
2. `FleetGraphGuidedActionsPanel` can stay the canonical guided preview/apply UI if we add a narrow auto-preview capability rather than rewriting the flow.
3. `UnifiedDocumentPage` already has the document/tab/nested-path signals needed to trigger one guided preview attempt per page context.
4. The FAB can return to an analysis-only current-page surface once guided actions move out.

Planned failing tests:

1. The document page no longer renders the embedded `FleetGraph entry` card after opening the FleetGraph panel.
2. Guided actions no longer appear as a FAB tab and instead render in a separate floating overlay surface.
3. The new overlay auto-runs guided preview for a fresh page/tab context and surfaces when a next step is available.
4. Quiet/no-step states stay collapsed or minimal instead of stealing attention on every page load.

## UX Script

Happy path:

1. User opens a seeded FleetGraph document page or switches to a new tab on that page.
2. FleetGraph prepares the page-aware guided-entry input and automatically previews the next step once.
3. If FleetGraph has a next step, a bottom-left overlay appears with the existing review/apply flow ready to inspect.
4. The FAB remains available separately for page analysis and follow-up chat.

Error path:

1. Guided preview fires repeatedly or before page context is ready.
2. The overlay opens on every page even when there is no guided action to take.
3. The move changes review/apply semantics or leaves the user with conflicting overlay and FAB state.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] The current guided-step preview/apply contract is green before moving the surface
- [x] The current-page entry payload is already shared through `useFleetGraphPageEntryInput`
- [x] The validation-ready demo lane still exists for visible proof

## TDD Plan

1. Add failing page-level tests for removing the embedded entry card and rendering a standalone guided overlay surface.
2. Add failing guided-overlay/FAB tests to pin the new analysis-only FAB plus auto-preview overlay behavior.
3. Refresh proof-lane docs and visible copy once the UI behavior is green.

## Step-by-step Implementation Plan

1. Remove `FleetGraphEntryCard` from the document-page shell and add a new guided overlay component that can mount beside the FAB.
2. Rehost `FleetGraphGuidedActionsPanel` inside the new overlay and add a narrow auto-preview-on-context-change path.
3. Simplify `FleetGraphFab` to analysis/chat only.
4. Update tests, story/docs, and seeded inspection steps for the new bottom-left overlay experience.

## Acceptance Criteria

- [x] AC-1: The embedded `FleetGraph entry` card is removed from document pages.
- [x] AC-2: Guided next-step preview/apply lives in its own bottom-left floating overlay instead of a FAB tab.
- [x] AC-3: The overlay automatically previews guided next-step work when a new page or tab context becomes ready.
- [x] AC-4: The overlay becomes visible when FleetGraph has a next step and stays visually restrained when no step is needed.
- [x] AC-5: The FleetGraph FAB remains available for analysis/chat without guided-actions tab state.
- [x] AC-6: Proof docs and verification steps describe the new surface truthfully.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab.test.tsx src/components/FleetGraphGuidedActionsOverlay.test.tsx src/components/FleetGraphPanelShell.test.tsx src/pages/UnifiedDocumentPage.test.tsx
npx pnpm --filter @ship/web exec tsc --noEmit
npx pnpm --filter @ship/api exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Record deployment status.
2. For the Railway auto-deployed demo, verify the validation-ready page shows the new bottom-left guided overlay after `master` updates.
3. If live verification is blocked by auth or environment state, record the exact blocker instead of claiming the overlay behavior is confirmed.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: `FleetGraph Demo Week - Validation Ready`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: open the page or switch into the `Review` tab, wait for FleetGraph to auto-check the page, then inspect the bottom-left overlay and the analysis FAB separately
- Expected result: the entry card is gone, guided next-step preview appears in its own bottom-left overlay when relevant, and the FAB stays analysis-only
- Failure signal: the old entry card still appears, guided actions still live in the FAB, or the overlay fails to appear for a page that has a next step

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Validation Ready`.
2. Navigate to the `Review` tab.
3. Confirm the page no longer shows the embedded `FleetGraph entry` card.
4. Confirm a bottom-left guided overlay appears when FleetGraph has a next step.
5. Open the FAB separately and confirm it still behaves like analysis/chat.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready` -> `Review`
- Interaction: land on the page, let FleetGraph auto-preview the next step, inspect the bottom-left overlay, then open the FAB for analysis
- Expected visible result: guided next-step help appears in a separate bottom-left overlay while the FAB remains a separate analysis surface
- Failure signal: the entry card is still present, the overlay never surfaces, or the FAB still contains guided-actions tabs

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Removed the embedded `FleetGraph entry` card from document pages and deleted its component/tests so guided next-step help no longer competes with the proactive shell.
  - Added a dedicated bottom-left `FleetGraphGuidedActionsOverlay` that auto-previews guided next steps once per page/tab context and reuses the existing review/apply semantics.
  - Simplified the FleetGraph FAB back to analysis/chat only and refreshed the current-page FleetGraph docs plus `US-619` queue truth to match the overlay-based surface.
  - Local validation passed:
    - `npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab.test.tsx src/components/FleetGraphGuidedActionsOverlay.test.tsx src/components/FleetGraphPanelShell.test.tsx src/pages/UnifiedDocumentPage.test.tsx`
    - `npx pnpm --filter @ship/web exec tsc --noEmit`
    - `npx pnpm --filter @ship/api exec tsc --noEmit`
    - `git diff --check`
  - Deployment status: `not deployed`
- Residual risk:
  - The live Railway proof still needs authenticated inspection on `FleetGraph Demo Week - Validation Ready` to confirm the auto-surfacing overlay behavior matches the seeded local path after merge.
