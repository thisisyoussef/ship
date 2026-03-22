# FleetGraph Conversational LLM Plan

**Date:** 2026-03-22
**Related story:** `docs/user-stories/phase-3/US-606-fleetgraph-chat-follow-up-reasoning.md`
**Scope:** Make FleetGraph follow-up chat turns feel conversational and context-aware without breaking the existing provider-agnostic graph/runtime boundary.

## Why this plan exists

The current FleetGraph chat already has an LLM-backed `reason` node, but the user-visible experience still felt deterministic because the follow-up route was re-running the same document analysis without sending the actual user message back into the graph.

This pass fixes the immediate regression by:

1. passing `userMessage` into the runtime on follow-up turns
2. keeping follow-up conversation state on the same thread
3. making the chat surface present actions as suggestions instead of fake buttons

That gets FleetGraph unstuck, but it is still only the first conversational layer. The next step is to make follow-up turns choose a better reasoning path instead of always replaying the same document-summary loop.

## Current grounded architecture

- UI chat surface: `web/src/components/FleetGraphFab.tsx`
- Follow-up mutation hook: `web/src/hooks/useFleetGraphAnalysis.ts`
- Turn route: `api/src/routes/fleetgraph.ts`
- Runtime selection: `api/src/services/fleetgraph/graph/runtime.ts`
- On-demand scenario stub: `api/src/services/fleetgraph/graph/on-demand-analysis.ts`
- LLM reasoning node: `api/src/services/fleetgraph/graph/nodes/reason.ts`
- Context fetch nodes:
  - `api/src/services/fleetgraph/graph/nodes/fetch-medium.ts`
  - `api/src/services/fleetgraph/graph/nodes/fetch-deep.ts`

Today the runtime can:

- load the current document and one-hop children
- preserve a thread-scoped conversation history
- let the LLM request deeper context through `deeperContextHint`

What it still cannot do well:

- distinguish a new question from “say more about that”
- suppress repeated findings across turns in a principled way
- deliberately pivot from the current document to a related project/week/issue when the user’s wording calls for it
- choose between “answer now”, “fetch more context”, and “re-enter another scenario family”

## Target conversational layer

Add a lightweight conversational orchestration layer ahead of `reason` for on-demand turns.

### 1. Turn intent router

Create a deterministic or low-cost classification step before the main reasoning node.

Suggested intents:

- `summarize_current_context`
- `expand_existing_finding`
- `what_else`
- `explain_why`
- `compare_related_items`
- `suggest_next_step`
- `action_follow_up`
- `switch_focus`

Output contract:

```ts
interface FleetGraphTurnIntent {
  intent:
    | 'summarize_current_context'
    | 'expand_existing_finding'
    | 'what_else'
    | 'explain_why'
    | 'compare_related_items'
    | 'suggest_next_step'
    | 'action_follow_up'
    | 'switch_focus'
  requestedEntityIds?: string[]
  requestedEntityType?: 'document' | 'issue' | 'project' | 'sprint' | 'program'
  shouldRefreshMediumContext: boolean
  shouldAllowScenarioRepivot: boolean
}
```

Why:

- “What else?” should not take the exact same path as “Summarize this page.”
- “Start somewhere else” or “what about the project owner?” should be able to pivot fetch scope.

### 2. Conversational state additions

Extend graph state for turn-aware reasoning.

Suggested fields:

- `turnIntent`
- `coveredFindingKeys: string[]`
- `activeFocus`
  - current entity id/type currently being reasoned about
- `responseMode`
  - `summary`
  - `follow_up`
  - `comparison`
  - `recommendation`
- `lastReasoningOutcome`

Why:

- the graph needs memory of what has already been surfaced
- the graph should know whether it is broadening, deepening, or pivoting

### 3. Context planning node

Insert a node between intent routing and the existing fetch nodes.

Responsibilities:

- decide whether cached medium context is still sufficient
- request a refresh when the user is asking “what changed” or “what else”
- map `switch_focus` turns onto related entities from the current graph neighborhood
- choose whether to re-enter a different scenario family instead of only on-demand analysis

Planned outputs:

- `fetchPlan: 'reuse' | 'refresh_medium' | 'fetch_deep' | 'repivot_scenario'`
- `focusTarget`
- `repivotScenarios?: FleetGraphScenario[]`

### 4. Repetition guard in reasoning

Keep the main LLM reasoning node, but give it explicit anti-repetition context.

Prompt additions:

- list already-surfaced finding titles or keys
- ask for a distinct additional point when the intent is `what_else`
- allow a graceful “nothing materially new” answer when appropriate

Response contract additions:

- `reusedFindingKeys?: string[]`
- `newFindingKeys?: string[]`
- `answerType: 'new_point' | 'deeper_explanation' | 'no_more_material_findings' | 'needs_more_context'`

### 5. Scenario repivot support

Allow certain follow-up turns to start from another graph entry point without losing thread continuity.

Examples:

- from a sprint page, “what about ownership?” could repivot into `sprint_no_owner`
- from a project page, “anything else at risk?” could repivot into issue or week risk analysis
- from a review surface, “start from the broader project context” could pivot to parent project reasoning

This should stay inside the same thread, but record the new `activeFocus`.

### 6. UI response contract

Keep the chat UI simple and truthful.

- suggested actions remain plain-text next steps, not clickable fake affordances
- conversational responses can still include findings, but those findings should be presented as guidance first
- if the graph needs more context, the user should see a natural-language explanation instead of a repeated summary

## Suggested rollout

### Phase A: Landed in this pass

- pass follow-up `userMessage` into the runtime
- preserve thread continuity across turns
- refine the prompt so “what else” prefers new information or an explicit “nothing more”
- make FleetGraph chat suggestions non-clickable and keep input text readable

### Phase B: Intent routing

- add `turn_intent` node before `fetch_medium`
- add tests for `what_else`, `why`, and `switch_focus`
- add LangSmith trace metadata for chosen turn intent

### Phase C: Context planning and repivoting

- introduce `context_plan` node
- allow refresh versus reuse decisions
- support repivoting into scenario families beyond `on_demand_analysis`

### Phase D: Quality and evaluation

- add transcript-style tests for repeated follow-up prompts
- add trace assertions that show when the graph widened context
- capture at least three trace examples:
  - same-surface follow-up
  - deeper-context follow-up
  - repivoted follow-up

## Validation expectations

When the next conversational phase lands, verify:

1. “What else?” produces a materially different answer or an explicit “nothing more here” response.
2. “Why is that risky?” expands the previous finding instead of starting over.
3. “What about the project?” can widen focus beyond the current document when related context exists.
4. The graph trace shows the selected turn intent and fetch plan.
5. Suggested next steps in the UI remain advisory, not hidden action buttons.

## Key guardrails

- Keep the provider boundary intact. Do not hard-code OpenAI-specific logic into graph nodes.
- Reuse the existing thread/checkpointer model instead of inventing a second conversation store.
- Prefer small structured contracts around the LLM rather than replacing the runtime with free-form chat.
- Do not add direct action execution back into the chat surface unless the HITL contract is redesigned explicitly.
