# US-607: FleetGraph Panel Visibility Polish

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-606`
- Related branch: `codex/fleetgraph-panel-visibility-polish-merge`
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph to stay visible, compact, and obvious without hiding the rest of the page.

## User Story

> As an engineer or PM, I want the FleetGraph panel to start minimized, stay within the screen when expanded, and call out proactive alerts clearly so I can notice it without losing the rest of the Ship view.

## Goal

Polish the inline FleetGraph panel so it feels intentional instead of bulky: default it to a collapsed state, cap its expanded height to the visible viewport, and make the collapsed affordance visually stronger with a proactive notification signal when FleetGraph has active findings.

## Scope

In scope:

1. Start the inline FleetGraph panel collapsed on document load.
2. Limit the expanded panel height to the available viewport space and make the inside content scroll instead of pushing the whole page down.
3. Refresh the FleetGraph header treatment so it is easier to notice and shows a notification affordance when proactive findings exist.
4. Keep the change narrow to the inline document-page FleetGraph shell.

Out of scope:

1. Reworking FleetGraph analysis/chat behavior in the floating FAB.
2. Changing proactive finding logic or backend finding generation.
3. Expanding FleetGraph to new surfaces beyond the current document page shell.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/pages/UnifiedDocumentPage.tsx` — current inline FleetGraph shell and page scroll container
2. `web/src/components/FleetGraphFindingsPanel.tsx` — proactive findings surface that drives notification state
3. `web/src/components/FleetGraphEntryCard.tsx` — current page-guidance surface inside the shell
4. `web/src/hooks/useFleetGraphFindings.ts` — proactive findings query contract and cache behavior
5. `docs/user-stories/phase-2/US-604-review-tab-plan-validation.md` — nearest FleetGraph visible-behavior exemplar

## Preparation Phase

1. Confirm where the inline FleetGraph shell currently mounts in the document-page layout.
2. Confirm whether proactive finding state is already queryable on the current document page.
3. Confirm how the page scroll shell behaves when FleetGraph content grows.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `docs/assignments/fleetgraph/README.md`
8. `docs/assignments/fleetgraph/PRESEARCH.md`
9. `docs/assignments/fleetgraph/FLEETGRAPH.md`
10. `.claude/CLAUDE.md`
11. `web/src/pages/UnifiedDocumentPage.tsx`
12. `web/src/components/FleetGraphFindingsPanel.tsx`
13. `web/src/components/FleetGraphEntryCard.tsx`
14. `web/src/hooks/useFleetGraphFindings.ts`
15. `web/src/pages/UnifiedDocumentPage.test.tsx`

Expected contracts/data shapes:

1. The inline FleetGraph shell lives above the tabbed/editor content inside `UnifiedDocumentPage`.
2. Proactive finding state is already available through `useFleetGraphFindings(documentIds)`.
3. The document page uses a page-level scroll container, so a viewport-capped FleetGraph shell should scroll internally when expanded.

Planned failing tests:

1. A FleetGraph panel shell test for collapsed-by-default behavior and proactive notification affordance.
2. A FleetGraph panel shell test for viewport-capped expanded content height.
3. A `UnifiedDocumentPage` regression test proving the FleetGraph shell starts collapsed and expands on demand.

## UX Script

Happy path:

1. User opens `FleetGraph Demo Week - Review and Apply`.
2. The FleetGraph shell starts collapsed but visibly calls attention to itself.
3. User expands FleetGraph and the panel stays within the available screen height.
4. If proactive findings exist, the header shows a notification signal before expansion.

Error path:

1. User opens a document page with FleetGraph expanded by default.
2. The FleetGraph shell grows too tall and pushes the rest of the page off-screen.
3. The user has to hunt for FleetGraph or loses track of proactive alerts, which hurts trust and usability.

## Preconditions

- [x] Relevant document-page FleetGraph shell code was audited
- [x] Proactive findings query surface was audited
- [x] Existing expanded-by-default behavior was found to be too bulky for the visible page shell

## TDD Plan

1. Add a focused shell test for collapsed default behavior and notification state.
2. Add a focused shell test for viewport-capped expanded height.
3. Update the document-page regression test so the inline FleetGraph content only appears after expansion.

## Step-by-step Implementation Plan

1. Add a narrow FleetGraph shell component for the inline document-page panel chrome.
2. Move the inline FleetGraph header/toggle behavior into that shell and default it to collapsed on document load.
3. Use the existing proactive findings query to drive header notification state.
4. Cap the expanded shell height against the visible viewport and let the shell content scroll internally.
5. Update FleetGraph document-page tests and story/checkpoint docs.

## Acceptance Criteria

- [x] AC-1: The inline FleetGraph shell starts collapsed on document load.
- [x] AC-2: Expanding FleetGraph caps the shell to the available viewport instead of pushing the rest of the page out of view.
- [x] AC-3: The FleetGraph collapsed header is more visually prominent and shows a notification affordance when proactive findings exist.
- [x] AC-4: The visible verification path is documented truthfully for the seeded FleetGraph demo lane.

## Local Validation

Run these before handoff:

```bash
cd web && ../node_modules/.bin/vitest run src/components/FleetGraphPanelShell.test.tsx src/pages/UnifiedDocumentPage.test.tsx src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx
cd web && ../node_modules/.bin/tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the seeded FleetGraph demo week after deploy and confirm the inline shell stays compact while still surfacing alerts.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Review and Apply`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: confirm FleetGraph starts collapsed, expand it, and inspect the panel while proactive findings are present or absent
- Expected result: FleetGraph starts minimized, the expanded shell stays within the visible viewport with internal scrolling, and proactive findings are signaled from the collapsed header
- Failure signal: FleetGraph opens expanded by default, hides the lower page content, or offers no obvious notification affordance for proactive findings

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Review and Apply`.
2. Confirm FleetGraph starts collapsed and visibly calls attention to itself.
3. Expand FleetGraph and confirm the lower document content is still reachable because the FleetGraph shell scrolls internally instead of taking over the page.
4. If a proactive finding exists, confirm the collapsed header shows a notification-style signal before you open it.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: load the page, expand FleetGraph, then scroll within the FleetGraph shell if needed
- Expected visible result: FleetGraph starts minimized, expands into a viewport-capped shell, and shows a notification-style alert signal when proactive findings are active
- Failure signal: FleetGraph is expanded on load, the page bottom disappears under the shell, or proactive findings remain visually hidden until after expansion

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Added a dedicated `FleetGraphPanelShell` so the inline document-page FleetGraph surface now starts collapsed, resets closed on document navigation, and caps its expanded height to the visible viewport.
  - Used the existing proactive findings query to drive a notification-style bell badge and stronger header treatment before expansion.
  - Local validation passed:
    - `cd web && ../node_modules/.bin/vitest run src/components/FleetGraphPanelShell.test.tsx src/pages/UnifiedDocumentPage.test.tsx src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
    - `cd web && ../node_modules/.bin/tsc --noEmit`
    - `git diff --check`
- Residual risk:
  - Direct manual inspection on the seeded Railway proof lane is still pending, so the final visual feel on the live demo should be checked after merge.
