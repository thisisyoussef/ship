# US-608: FleetGraph Context-Aware Page Analysis Completion

## Status

- State: `in_review`
- Owner: Codex
- Depends on: `US-605`
- Related branch: `codex/fleetgraph-page-analysis-completion`
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph page analysis to behave like a real contextual assistant, not a one-off response.

## User Story

> As an engineer or PM, I want FleetGraph to analyze the current Ship page and answer a follow-up question on the same thread so I can get useful contextual help without resetting the conversation.

## Goal

Complete the core on-demand workbook use case by making the canonical FleetGraph page-analysis surface reliable for both the initial current-page answer and a real follow-up turn, then document that surface truthfully as an assignment-proof lane.

## Scope

In scope:

1. Confirm and lock the canonical visible FleetGraph page-analysis surface.
2. Ensure the initial page-analysis path returns meaningful current-page guidance.
3. Ensure follow-up turns preserve thread continuity and behave like continuation, not reset.
4. Update the proof-lane docs for the completed page-analysis use case.

Out of scope:

1. Broad proactive finding work.
2. New autonomous write behavior.
3. A broader conversational repivot architecture beyond the assignment use case.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/components/FleetGraphFab.tsx`
2. `web/src/hooks/useFleetGraphAnalysis.ts`
3. `api/src/routes/fleetgraph.ts`
4. `api/src/services/fleetgraph/graph/runtime.ts`
5. `api/src/services/fleetgraph/graph/nodes/reason.ts`
6. `docs/guides/fleetgraph-demo-inspection.md`

## Preparation Phase

1. Confirm which FleetGraph UI surface counts as the canonical page-analysis proof lane.
2. Confirm whether the current initial-answer flow and follow-up flow share the same runtime contract.
3. Confirm what visible seeded page should be used for user verification.

### Preparation Notes

Local docs/code reviewed:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/task-breakdown.md`
2. `docs/assignments/fleetgraph/FLEETGRAPH.md`
3. `web/src/components/FleetGraphFab.tsx`
4. `web/src/hooks/useFleetGraphAnalysis.ts`
5. `api/src/routes/fleetgraph.ts`
6. `api/src/services/fleetgraph/graph/runtime.ts`

Expected contracts/data shapes:

1. Initial analysis starts from a current document context plus active route surface.
2. Follow-up turns should pass the user message into the same FleetGraph thread.
3. The visible proof lane should live on a seeded FleetGraph document page on Railway.

Planned failing tests:

1. Canonical page-analysis surface handles an initial page question.
2. Follow-up turn keeps the same thread and uses the user’s message.
3. Proof docs reference the canonical completed analysis surface truthfully.

## UX Script

Happy path:

1. User opens a seeded FleetGraph document.
2. User opens the FleetGraph page-analysis surface and asks what matters on this page.
3. FleetGraph returns current-page guidance.
4. User asks a follow-up and gets a contextual continuation instead of a reset.

Error path:

1. User asks an initial page-analysis question.
2. FleetGraph returns something generic or disconnected from the page.
3. User asks a follow-up and FleetGraph simply repeats the first answer.

## Preconditions

- [ ] Fresh story branch is checked out before edits begin
- [ ] Seeded FleetGraph demo document exists for the chosen proof lane
- [ ] FleetGraph analysis route and runtime are healthy locally

## TDD Plan

1. Route/runtime tests for initial analyze and follow-up thread continuity.
2. UI test for the canonical page-analysis surface.
3. Doc/proof-lane updates only after the visible surface is chosen and implemented.

## Step-by-step Implementation Plan

1. Lock the canonical FleetGraph page-analysis surface and remove ambiguity in the docs.
2. Tighten the initial current-page analysis behavior if needed.
3. Tighten follow-up continuity and response behavior if needed.
4. Update the demo inspection guide and story/checkpoint docs to reflect the true proof lane.

## Acceptance Criteria

- [ ] AC-1: FleetGraph has one clearly documented canonical page-analysis surface.
- [ ] AC-2: The initial page-analysis answer is meaningfully grounded in the current page context.
- [ ] AC-3: Follow-up turns preserve thread continuity and respond to the new user question.
- [ ] AC-4: The completed page-analysis use case is reflected truthfully in the assignment proof docs.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab.test.tsx
pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/graph/runtime.test.ts --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec tsc --noEmit
pnpm --filter @ship/api exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the seeded page-analysis proof lane on the public demo.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Validation Ready`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: open the FleetGraph page-analysis surface, ask an initial question, then ask a follow-up
- Expected result: FleetGraph gives current-page guidance first, then a contextual continuation on the same thread
- Failure signal: generic first answer, repeated follow-up answer, or no clear canonical analysis surface

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Validation Ready`.
2. Open the FleetGraph analysis surface.
3. Ask what matters on this page.
4. Ask a follow-up such as `What else should I look at?`
5. Confirm the second answer builds on the first instead of resetting.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: open the page-analysis surface, ask an initial question, then a follow-up
- Expected visible result: the first answer is page-specific and the second answer behaves like a continuation
- Failure signal: the surface is ambiguous, the first answer is generic, or the follow-up resets the thread

## Checkpoint Result

- Outcome: `implemented, pending Railway demo verification`
- Evidence:
  - `Check this page` now returns real current-page analysis on the FleetGraph entry card instead of the old generic stub summary
  - entry-card follow-up turns stay on the same FleetGraph thread through `/api/fleetgraph/thread/:threadId/turn`
  - the floating FAB is no longer the canonical page-analysis proof lane on `UnifiedDocumentPage`
- Residual risk:
  - public-demo verification is still needed on `FleetGraph Demo Week - Validation Ready` after merge/autodeploy
