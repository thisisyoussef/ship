# US-624: FleetGraph Auto Analysis Once Per Page Context

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-623`
- Related branch: `codex/fleetgraph-auto-enrichment-once`
- Related commit/PR: `pending`
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph page analysis to run automatically on a fresh page context so they do not have to manually kick off the same enrichment every time they open the page.

## User Story

> As an engineer or PM, I want FleetGraph analysis to auto-run for a new page context and mark that context as done so the enrichment happens by default without repeatedly re-triggering from the same view.

## Goal

Keep the current FleetGraph split intact, with guided next steps in the overlay and analysis/chat in the FAB, but let the analysis side bootstrap itself automatically for a fresh page context. The change should stay narrow: run the existing page-analysis request without waiting for the FAB button press, suppress duplicate auto-runs for the same page context, and preserve the existing manual open/chat experience.

## Scope

In scope:

1. Auto-run FleetGraph analysis for a fresh document-page context without requiring the FAB to be opened first.
2. Track a per-context done flag in the UI layer so the same page context does not auto-trigger analysis more than once.
3. Keep the FAB as the place where users read the analysis and continue the chat.
4. Update the checked-in story/queue/checkpoint docs plus the visible-surface tests for the new default behavior.

Out of scope:

1. New FleetGraph scenarios, prompt changes, or backend API changes.
2. Reworking the guided overlay behavior from `US-623`.
3. Persisting FleetGraph analysis history across app reloads beyond the current UI lifecycle.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/components/FleetGraphFab.tsx` — existing analysis launcher and current once-per-document open behavior.
2. `web/src/hooks/useFleetGraphAnalysis.ts` — analysis request lifecycle and conversation state.
3. `web/src/pages/UnifiedDocumentPage.tsx` — current page-level FleetGraph composition and route/tab signals.
4. `web/src/components/FleetGraphGuidedActionsOverlay.tsx` — existing auto-run-on-context-change exemplar.
5. `web/src/components/PlanQualityBanner.tsx` — existing repo pattern for auto analysis plus duplicate suppression.
6. `docs/user-stories/phase-3/US-609.5-fleetgraph-fab-analysis-handoff.md` — current analysis/FAB contract.
7. `docs/user-stories/phase-3/US-623-fleetgraph-guided-actions-floating-overlay.md` — current split between overlay and analysis FAB.

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm the narrowest safe place to auto-run analysis without widening the guided overlay behavior.
3. Confirm how to key the once-only flag to a page context rather than a coarse global FAB state.
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
8. `.claude/CLAUDE.md`
9. `docs/user-stories/phase-3/US-609.5-fleetgraph-fab-analysis-handoff.md`
10. `docs/user-stories/phase-3/US-623-fleetgraph-guided-actions-floating-overlay.md`
11. `web/src/components/FleetGraphFab.tsx`
12. `web/src/hooks/useFleetGraphAnalysis.ts`
13. `web/src/pages/UnifiedDocumentPage.tsx`
14. `web/src/components/FleetGraphGuidedActionsOverlay.tsx`
15. `web/src/components/PlanQualityBanner.tsx`
16. `web/src/components/FleetGraphFab.test.tsx`
17. `web/src/pages/UnifiedDocumentPage.test.tsx`

Expected contracts/data shapes:

1. The FleetGraph FAB remains the only surface that renders analysis text and follow-up chat.
2. A page context can be keyed from the current document plus tab/path signals without changing the backend contract.
3. The done flag should suppress duplicate auto-runs for the same mounted page context but still allow a new page context to trigger a fresh analysis.
4. Manual FAB opening should not trigger a second analysis when the page context has already auto-run successfully.

Planned failing tests:

1. FleetGraph analysis auto-runs before the FAB is opened when a fresh page context key is provided.
2. Opening the FAB after the auto-run does not trigger a duplicate analysis for the same page context.
3. `UnifiedDocumentPage` passes a stable page-context key into the FAB so the auto-run is scoped to the current view.

## UX Script

Happy path:

1. User opens a FleetGraph-enabled document page.
2. The page context becomes ready and FleetGraph analysis auto-starts in the background.
3. The user opens the FAB only when they want to read the result or ask a follow-up.
4. The same page context does not auto-trigger a second analysis from the later FAB open.

Error path:

1. The page auto-runs analysis repeatedly on re-render or when the FAB opens.
2. The once-only flag is too coarse and blocks fresh analysis on a different page context.
3. The auto-run causes stale analysis state to leak across page changes.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] `US-623` remains the latest shipped current-page FleetGraph surface split
- [x] The FleetGraph FAB analysis flow still exists and is covered by focused web tests
- [x] The change can stay inside the frontend current-page FleetGraph layer without backend contract changes

## TDD Plan

1. Update `web/src/components/FleetGraphFab.test.tsx` to pin the new auto-run and no-duplicate-open behavior.
2. Update `web/src/pages/UnifiedDocumentPage.test.tsx` so the page passes a stable analysis-context key into the FAB.
3. Run the focused FleetGraph web tests before cleanup, then run type checks and `git diff --check`.

## Step-by-step Implementation Plan

1. Add the page-context key wiring from `UnifiedDocumentPage` into `FleetGraphFab`.
2. Teach `FleetGraphFab` to auto-start analysis for a fresh context and mark that context as done once triggered.
3. Keep manual FAB opening as a read/chat affordance instead of a second trigger for the same context.
4. Refresh story/queue/checkpoint docs to record the new default behavior.

## Acceptance Criteria

- [x] AC-1: FleetGraph page analysis auto-runs for a fresh page context without requiring the FAB button press.
- [x] AC-2: The same page context does not auto-trigger a second analysis when the FAB is opened later.
- [x] AC-3: A fresh page context still triggers a new analysis run.
- [x] AC-4: Checked-in tests and story metadata reflect the new default behavior truthfully.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab.test.tsx src/pages/UnifiedDocumentPage.test.tsx
npx pnpm --filter @ship/web exec tsc --noEmit
npx pnpm --filter @ship/api exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Record deployment status.
2. For the Railway auto-deployed demo, verify the FleetGraph FAB still opens with analysis content already available after the page-level auto-run lands on `master`.
3. If live verification is blocked, record the exact blocker instead of claiming deployed proof.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: `FleetGraph Demo Week - Validation Ready`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready` -> `Review`
- Interaction: land on the page, wait briefly for FleetGraph to auto-run the page analysis, then open the FAB
- Expected result: the FAB opens with the already-started analysis state instead of requiring a manual trigger for that same page context
- Failure signal: analysis still waits for the FAB button press, the page auto-runs more than once for the same context, or opening the FAB duplicates the request

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Validation Ready`.
2. Navigate to the `Review` tab.
3. Wait for FleetGraph to auto-run page analysis once.
4. Open the FAB.
5. Confirm the analysis is already in progress or already available without a second trigger.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready` -> `Review`
- Interaction: load the page, wait for the background FleetGraph analysis to kick off, then open the FAB
- Expected visible result: FleetGraph analysis is already underway or available when the FAB opens, and the same page context does not trigger a duplicate run
- Failure signal: analysis only starts after the FAB click, or the same page context triggers two runs

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - `pnpm build:shared`
  - `pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab.test.tsx src/pages/UnifiedDocumentPage.test.tsx`
  - `pnpm --filter @ship/web exec tsc --noEmit`
  - `pnpm --filter @ship/api exec tsc --noEmit`
  - `git diff --check`
- Residual risk:
  - Live Railway verification of the review-tab auto-analysis behavior is still pending the normal merge-to-`master` deploy follow-through.
