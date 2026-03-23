# US-606: FleetGraph Chat Follow-Up Reasoning

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-605`
- Related branch: `codex/fleetgraph-chat-followup-reasoning`
- Related commit/PR: `3329380`, [PR #139](https://github.com/thisisyoussef/ship/pull/139)
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph chat to respond to follow-up questions naturally so the surface feels like contextual help instead of a canned replay.

## User Story

> As an engineer or PM, I want FleetGraph to treat follow-up prompts like real conversation so I can ask things like "what else?" and get context-aware guidance.

## Goal

Fix the immediate FleetGraph follow-up-turn regression, polish the chat UI so suggested steps are presented honestly, and record the next conversational LLM layer as a checked-in implementation plan.

## Scope

In scope:

1. Make suggested next steps in the FleetGraph chat surface non-clickable.
2. Ensure the FleetGraph follow-up input uses readable dark text on the light panel.
3. Pass the actual follow-up message into the FleetGraph runtime so the LLM can reason over user replies.
4. Add a checked-in design plan for the next conversational LLM layer.

Out of scope:

1. Replacing the current FleetGraph runtime with a different orchestration framework.
2. Reintroducing direct action execution inside the chat surface.
3. Broadening proactive finding logic beyond follow-up-turn reasoning.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/components/FleetGraphFab.tsx`
2. `web/src/hooks/useFleetGraphAnalysis.ts`
3. `api/src/routes/fleetgraph.ts`
4. `api/src/services/fleetgraph/graph/runtime.ts`
5. `api/src/services/fleetgraph/graph/nodes/reason.ts`
6. `docs/guides/fleetgraph-demo-inspection.md`

## Preparation Phase

1. Confirm how FleetGraph follow-up turns currently reach the runtime.
2. Confirm where the misleading clickable action affordance is rendered.
3. Confirm whether the graph already has the state needed for conversational follow-up.

### Preparation Notes

Local docs/code reviewed:

1. `web/src/components/FleetGraphFab.tsx`
2. `web/src/hooks/useFleetGraphAnalysis.ts`
3. `api/src/routes/fleetgraph.ts`
4. `api/src/services/fleetgraph/graph/types.ts`
5. `api/src/services/fleetgraph/graph/nodes/reason.ts`
6. `api/src/services/fleetgraph/graph/runtime.test.ts`

Expected contracts/data shapes:

1. FleetGraph follow-up turns post to `/api/fleetgraph/thread/:threadId/turn`.
2. The runtime already stores `conversationHistory` and can carry a `userMessage` field in graph state.
3. The FleetGraph FAB renders proposed actions directly inside finding cards.
4. The current chat input sits on a white panel and needs an explicit dark text color to stay readable.

Planned failing tests:

1. FleetGraph FAB should render suggested next steps as plain text, not buttons.
2. FleetGraph FAB input should use an explicit dark text class.
3. The FleetGraph turn route should pass the follow-up message into the runtime.
4. The runtime should keep the follow-up turn on the same thread and let reasoning vary by user message.

## UX Script

Happy path:

1. User opens FleetGraph on a document page.
2. FleetGraph shows findings and suggested next steps as guidance, not fake action buttons.
3. User types a follow-up such as `What else should I look at?`
4. FleetGraph responds based on the user message, the current page context, and prior turns.

Error path:

1. User opens FleetGraph and sees a button-like suggestion that appears actionable but is not the real approval path.
2. User types a follow-up like `What else?`
3. FleetGraph replays the same first answer because the runtime never receives the user message.

## Preconditions

- [x] FleetGraph follow-up route and runtime were audited
- [x] FleetGraph chat UI surface was audited
- [x] Existing conversation state support was found in the graph

## TDD Plan

1. Add a FleetGraph FAB component test for suggestion presentation and input styling.
2. Add a FleetGraph route test for follow-up message pass-through.
3. Add a runtime test that proves a same-thread follow-up can produce a different analysis.
4. Patch production code only after the regression is pinned down.

## Step-by-step Implementation Plan

1. Change the FleetGraph FAB to present proposed actions as suggested next steps instead of clickable buttons.
2. Explicitly darken the chat input text on the white background.
3. Thread `userMessage` through the FleetGraph route and runtime input schema.
4. Tighten the reason-node follow-up prompt so "what else" prefers a new point, a deeper-context request, or a clear no-more-findings answer.
5. Record the next conversational LLM layer in a design note under `docs/plans/`.

## Acceptance Criteria

- [x] AC-1: FleetGraph chat findings present suggested next steps as non-clickable guidance.
- [x] AC-2: The FleetGraph chat input uses readable dark text while typing.
- [x] AC-3: Follow-up turns pass the actual user message into the runtime on the existing thread.
- [x] AC-4: A checked-in conversational LLM plan exists for the next architectural increment.

## Local Validation

Run these before handoff:

```bash
./node_modules/.bin/vitest run src/components/FleetGraphFab.test.tsx
./node_modules/.bin/vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/graph/runtime.test.ts --config vitest.fleetgraph.config.ts
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/tsc --noEmit
git diff --check
```

Use the first `tsc` command from `/Users/youss/Development/gauntlet/ship/web` and the second from `/Users/youss/Development/gauntlet/ship/api`.

## Deployment Handoff

1. Merge to `master`.
2. Let the Railway public demo auto-deploy from `master`.
3. Verify the FleetGraph chat surface on the public demo still opens normally and the follow-up flow behaves conversationally on the seeded FleetGraph documents.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Review and Apply`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: open the FleetGraph chat, inspect the suggested next step, then ask `What else should I look at?`
- Expected result: the suggested step is plain text, the typed input stays readable, and the follow-up answer reflects the prompt instead of replaying the same opening response
- Failure signal: the suggested step is still a clickable button, typed text disappears into the white background, or the follow-up answer just repeats the initial summary

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Review and Apply`.
2. Open the FleetGraph floating chat panel.
3. Confirm any suggested next step is presented as text, not a clickable button.
4. Type `What else should I look at?`
5. Confirm the text stays readable while typing and the response changes based on the follow-up.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Review and Apply`
- Interaction: open FleetGraph chat, inspect the suggestion treatment, then ask a follow-up like `What else should I look at?`
- Expected visible result: the suggestion is advisory text, the input text is dark on the white panel, and the second response behaves like a follow-up instead of a reset
- Failure signal: the UI still shows button-like suggestion affordances or FleetGraph repeats the same initial answer after a follow-up

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - FleetGraph follow-up turns now pass `userMessage` into the runtime and keep using the same thread state.
  - The reasoning prompt now explicitly prefers a new point, a deeper-context request, or a clear no-more-findings answer for prompts like `what else`.
  - FleetGraph chat proposed actions now render as plain suggested next steps, and the input uses explicit dark text on the white panel.
  - The next conversational layer is documented in `docs/plans/2026-03-22-fleetgraph-conversational-llm-plan.md`.
- Residual risk:
  - The current on-demand scenario still routes all follow-up turns through the same scenario family, so deeper conversational repivoting is planned work rather than part of this small fix.
