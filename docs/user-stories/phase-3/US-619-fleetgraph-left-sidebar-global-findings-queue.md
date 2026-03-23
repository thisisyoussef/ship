# US-619: FleetGraph Left-Sidebar Global Findings Queue

## Status

- State: `todo`
- Owner:
- Depends on: `US-616`, `US-618`
- Related branch:
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants a dedicated FleetGraph place in Ship's left sidebar so proactive work can be triaged from one queue instead of only from page-local surfaces.

## User Story

> As an engineer or PM, I want a separate FleetGraph tab in Ship's left sidebar that sweeps proactive findings across the application and shows them in one queue with notification icons and applicable action bars so I can triage and act without opening each page first.

## Goal

Give FleetGraph a first-class workspace-wide home in Ship's app shell by reusing the existing proactive findings plus review/apply contracts in a dedicated left-sidebar queue surface. This should feel like a real Ship triage lane: visible from anywhere, badge-worthy, and able to route into or act on findings without turning FleetGraph into a second disconnected workflow.

## Scope

In scope:

1. Add a dedicated FleetGraph mode/tab in the global Ship left sidebar that opens a workspace-wide findings queue.
2. Load active proactive findings across the workspace, not just the current document context, and present them as a queue with notification icon/badge treatment.
3. Reuse existing finding cards and action bars so review/apply, dismiss, and snooze still work from the global queue when a finding type supports them.
4. Add navigation from each finding into the related Ship document context without losing the value of the queue surface.
5. Refresh proof-lane docs and seeded verification data so the sidebar queue can be inspected with multiple active finding types.

Out of scope:

1. New proactive finding types, ranking rules, or graph-scenario rewrites.
2. Replacing the current-page FleetGraph entry, FAB, or embedded findings panel.
3. Reworking Ship's global layout beyond what is needed for a new sidebar mode, badge, and queue view.
4. Building a separate notification system outside the existing FleetGraph findings/action infrastructure.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/pages/App.tsx` — global left-sidebar mode rail, routing, and badge visibility live here.
2. `web/src/components/DashboardSidebar.tsx` — lightweight sidebar section pattern for a dedicated mode view.
3. `web/src/pages/UnifiedDocumentPage.tsx` — current page-local FleetGraph entry and findings surfaces that this story should complement, not replace.
4. `web/src/components/FleetGraphFindingsPanel.tsx` — existing proactive queue behavior, empty/error states, and action wiring.
5. `web/src/components/FleetGraphFindingCard.tsx` — current review/apply/dismiss/snooze action bar UI to reuse instead of forking.
6. `web/src/hooks/useFleetGraphFindings.ts` — findings query contract and cache invalidation shape.
7. `api/src/routes/fleetgraph.ts` — current `/api/fleetgraph/findings` route and mutation endpoints.
8. `api/src/services/fleetgraph/findings/store.ts` — finding-store support for workspace-wide listing, ordering, and status filtering.
9. `docs/user-stories/phase-3/US-609-fleetgraph-shared-proactive-multi-finding-plumbing.md` — background on the shared proactive finding surface.
10. `docs/user-stories/phase-3/US-616-fleetgraph-assign-issues-review-apply-follow-through.md` and `docs/user-stories/phase-3/US-618-fleetgraph-assign-owner-picker-follow-through.md` — action-bar completion dependencies this queue should wait for.

## Preparation Phase

1. Confirm the smallest safe route/shell change for a new global FleetGraph sidebar mode.
2. Confirm whether omitting `documentIds` from the existing findings route is enough for a workspace-wide queue or whether a narrow explicit contract flag is clearer.
3. Confirm the queue ordering, badge-count rule, and finding-to-document navigation pattern before implementation starts.

### Preparation Notes

Local docs/code reviewed:

1. `web/src/pages/App.tsx`
2. `web/src/components/FleetGraphFindingsPanel.tsx`
3. `web/src/components/FleetGraphFindingCard.tsx`
4. `web/src/hooks/useFleetGraphFindings.ts`
5. `api/src/routes/fleetgraph.ts`
6. `docs/assignments/fleetgraph/README.md`
7. `docs/assignments/fleetgraph/FLEETGRAPH.md`

Expected contracts/data shapes:

1. The existing `/api/fleetgraph/findings` route already scopes by workspace and only narrows further when `documentIds` are present, so the global queue should prefer that shared contract before inventing a second list endpoint.
2. `FleetGraphFindingsPanel` and `FleetGraphFindingCard` already encode the action-bar behavior this story should reuse.
3. The app shell in `App.tsx` is the right place for the new FleetGraph sidebar mode, route, and notification badge.
4. A seeded proof lane will need multiple simultaneously active proactive findings so the queue demonstrates a real cross-page sweep.

Planned failing tests:

1. The app shell shows a FleetGraph sidebar mode with a notification icon/badge when active findings exist.
2. The new FleetGraph queue view loads workspace-wide findings and renders finding cards with the existing action bars.
3. Review/apply, dismiss, and snooze mutations refresh the global queue without breaking document-scoped findings.
4. Each queue item can navigate into the related Ship document while preserving triage clarity.

## UX Script

Happy path:

1. User is anywhere in Ship where the left sidebar is visible.
2. The FleetGraph sidebar item shows a notification icon or badge because proactive findings are active.
3. User opens FleetGraph and sees a queue of proactive findings from across the workspace, not just the current page.
4. User reviews, applies, dismisses, or snoozes a finding from the queue, or clicks through to the related document.
5. The queue refreshes and the notification state reflects the remaining actionable work.

Error path:

1. User opens the FleetGraph sidebar queue.
2. The queue only shows page-local findings, duplicates existing panels without adding workspace sweep value, or drops the action bars.
3. Users still need to open each page to understand or act on proactive work, so the new tab adds chrome without real triage value.

## Preconditions

- [ ] Fresh story branch is checked out from current `master` before edits begin
- [ ] `US-616` and `US-618` are merged to `master`, or their exact blocker is recorded before this story starts
- [ ] Existing FleetGraph finding action bars are green in document-scoped surfaces before lifting them into the global queue
- [ ] The implementation can reuse the current findings route or a narrow contract extension instead of inventing a second proactive store path

## TDD Plan

1. Add failing app-shell tests for the new FleetGraph sidebar mode, badge icon, and route.
2. Add failing queue-view tests for workspace-wide finding cards and document-navigation affordances.
3. Extend route/store tests to pin workspace-wide list behavior, ordering, and mutation refresh semantics.
4. Keep shared finding-card coverage green so the global queue does not fork action behavior.

## Step-by-step Implementation Plan

1. Add a global FleetGraph route plus left-sidebar mode entry in the Ship app shell, including notification icon/badge state.
2. Extend the findings query path to support a workspace-wide queue mode explicitly and safely.
3. Build the dedicated queue view by reusing existing finding card/action components and adding queue-specific document context chrome where needed.
4. Wire badge counts, refresh behavior, and post-mutation invalidation so the queue stays truthful.
5. Refresh seeded proof lanes and docs for a multi-finding, cross-context verification path.

## Acceptance Criteria

- [ ] AC-1: Ship's left sidebar exposes a dedicated FleetGraph tab or mode with a visible notification icon/badge when active proactive findings exist.
- [ ] AC-2: The FleetGraph queue view lists active proactive findings from across the workspace instead of only the current document context.
- [ ] AC-3: Existing finding action bars continue to support review/apply, dismiss, and snooze behavior from the global queue when the finding type allows it.
- [ ] AC-4: Users can navigate from a queue item into the related Ship document context without losing clarity about why the finding was surfaced.
- [ ] AC-5: Current page-local FleetGraph entry, FAB, and embedded findings surfaces remain intact.
- [ ] AC-6: Proof-lane docs and seeded verification data describe the new global queue surface truthfully.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/web exec vitest run src/pages/UnifiedDocumentPage.test.tsx src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphFindingCard.test.tsx src/pages/FleetGraphQueuePage.test.tsx
npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/findings/store.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/web exec tsc --noEmit
npx pnpm --filter @ship/api exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. For the Railway auto-deployed demo, verify the new `/fleetgraph` queue surface and sidebar badge after `master` updates.
4. If the seeded multi-finding queue proof lane is blocked, record the exact blocker instead of claiming the global queue is verified.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: `FleetGraph Demo Queue - Global Findings`
- Route or URL: `/fleetgraph`
- Interaction: open the FleetGraph left-sidebar tab, inspect the queue, review/apply or dismiss one finding, then open a related Ship document from another finding
- Expected result: the queue shows multiple active proactive findings across Ship, the sidebar notification state matches the queue, and action bars still work from the global surface
- Failure signal: the queue only shows the current page, the badge is missing or stale, or the finding actions no longer work from the queue

## User Checkpoint Test

1. Open `/docs` or another route where the left sidebar is visible.
2. Click the FleetGraph tab in the left sidebar.
3. Confirm the queue shows multiple active findings from different Ship contexts.
4. Use one finding's action bar and confirm the queue refreshes.
5. Open another finding's related document and confirm Ship lands in the expected page.

## What To Test

- Route or URL: `/fleetgraph`
- Interaction: open the FleetGraph left-sidebar queue, inspect notification state, act on one finding, and open a related document from another finding
- Expected visible result: a workspace-wide proactive queue is available from the left sidebar with notification icons and the existing finding action bars
- Failure signal: only page-local findings appear, notification state is wrong, or queue actions/navigation fail

## Checkpoint Result

- Outcome: `pending`
- Evidence:
  - Implementation remains blocked until `US-616` and `US-618` land on `master`.
- Residual risk:
  - The branch must not skip its dependency gate and start product changes before the owner-picker and assign-issues action bars are both merged.
