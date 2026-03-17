# FleetGraph Foundation Design
**Date:** 2026-03-17
**Status:** Approved

## Problem

The current FleetGraph MVP passes the checklist but doesn't establish the product foundation. Only one use case is wired (`week_start_drift`), the graph takes the same execution path on every run, on-demand reasoning is skeletal, and the proactive/on-demand modes don't demonstrably share the same graph. The project reads as a polling script with an LLM call bolted on — not a graph agent.

## Goal

Build the reasoning foundation that makes FleetGraph a real agent: multi-turn on-demand sessions with accumulated context, depth escalation driven by the reasoning node itself, and action proposals tied to the analysis that surfaced them. Additional proactive detection types slot in after this foundation is solid.

## Chosen Approach: Multi-turn Graph with Checkpointed Memory

One graph definition, two triggers. Proactive runs are stateless sweeps. On-demand runs are checkpointed sessions with conversation continuity. Both enter at `resolve_context` — the trigger determines initial state, not graph shape.

## Graph Architecture

### State Schema

```typescript
{
  session_id: string                  // links turns via LangGraph checkpointer
  trigger: 'proactive' | 'on_demand'
  context: {
    user_id: string
    role: string
    surface: string                   // 'issue' | 'sprint' | 'project' | 'week'
    document_id: string
    document_type: string
  }
  fetched_data: Record<string, unknown>  // accumulates across turns — no re-fetching
  fetch_depth: 'medium' | 'deep'
  needs_deeper_context: boolean
  deeper_context_hint: {              // targeted — not a full re-crawl
    type: string
    ids: string[]
  } | null
  conversation_history: Turn[]        // last 3 turns sent to LLM; older turns summarized
  context_summary: string             // rolling summary of older turns
  findings: Finding[]
  pending_action: Action | null
  turn_count: number
}
```

### Nodes

| Node | Responsibility |
|---|---|
| `resolve_context` | Establishes who is invoking, what they are looking at, their role |
| `fetch_medium` | Parallel fetches: document + one-hop relationships (issues, assignees, linked docs) |
| `fetch_deep` | Targeted additional fetches based on `deeper_context_hint` from reasoning node |
| `reason` | LLM reasoning — returns findings, depth flag, proposed action, and tier |
| `depth_router` | Conditional: `needs_deeper_context=true` → `fetch_deep` → `reason`; else → `action_router` |
| `action_router` | Conditional: routes by action tier (A/B/C) |
| `render_findings` | Formats and returns analysis to UI |
| `propose_action` | Surfaces proposed action with context; pauses via LangGraph interrupt |
| `execute_action` | Executes Ship mutation only after confirmation received |
| `quiet_exit` | Nothing actionable found — clean exit with empty state |
| `fallback` | Handles Ship API failures, missing data, unexpected state gracefully |

### Graph Flow

```
resolve_context
    → fetch_medium (parallel sub-nodes)
    → reason
    → depth_router
        ├── [needs_deeper_context=true] → fetch_deep → reason (second pass)
        └── [else] → action_router
            ├── [Tier A] → render_findings
            ├── [Tier B] → propose_action → [HITL interrupt] → execute_action
            ├── [Tier C] → propose_action → [HITL interrupt] → execute_action
            └── [nothing] → quiet_exit
    → fallback (on any unhandled error)
```

### Conditional Edges

- **depth_router**: Reads `needs_deeper_context` from reasoning output. True sends to `fetch_deep`, which fetches only what `deeper_context_hint` specifies — not a full traversal. False proceeds to `action_router`.
- **action_router**: Reads proposed action tier. Tier A bypasses confirmation. Tier B surfaces an inline banner. Tier C surfaces a full modal with diff preview. No action routes to `quiet_exit`.

## Conversation Threading

### Session Lifecycle

Each on-demand invocation on a document starts a session. LangGraph `MemorySaver` checkpointer links turns via `thread_id = session_id`. Sessions expire after 30 minutes of inactivity.

```
Turn 1 (auto): document opens → graph runs → analysis rendered in FAB panel
Turn 2 (user): "who's most overloaded?" → graph reads prior state → reasons without re-fetching
Turn 3 (user): "what about the linked project?" → graph detects scope shift → re-fetches for new context
```

### Memory Boundary

Only the last 3 turns are sent to the LLM reasoning node. Older turns are summarized into `context_summary`. Token usage stays predictable regardless of session length.

### Proactive Mode — Stateless

Proactive runs have no checkpointer thread. Each sweep is a fresh graph run. The existing dedupe ledger prevents re-surfacing the same finding. Proactive mode never accumulates conversation state.

## Depth Escalation

The reasoning node returns a structured hint — not a generic "I need more data" signal:

```typescript
{
  needs_deeper_context: true,
  deeper_context_hint: {
    type: 'assignee_workload',
    ids: ['user-123', 'user-456']
  }
}
```

`fetch_deep` fetches only what the hint specifies. A deep run costs approximately 2x a medium run, not 10x. The second pass of `reason` receives the original medium context plus the targeted supplement.

## Action Tier System

| Tier | Examples | Confirmation UX |
|---|---|---|
| A (read-only) | Summarize sprint health, list blockers, explain a document | None — renders inline |
| B (soft mutation) | Create issue, add comment, assign person, flag blocker | Inline banner, one-click confirm |
| C (structural) | Move issues between sprints, close stale items, bulk reassign | Full modal with diff preview + explicit confirm |

The reasoning node proposes both the action and its tier. The graph pauses at `propose_action` via LangGraph interrupt. `execute_action` does not run until a confirmation call is received from the UI.

## UI: Context-Aware FAB

### Principle

The FAB is not a chatbot. It is a document intelligence surface that happens to support follow-up questions. The agent pushes first. The user extends if they want.

### Behavior

- **FAB appears** only on document types FleetGraph understands (issue, sprint, project, week)
- **Badge** appears when FleetGraph has a proactive finding pending for this document
- **Auto-analysis runs** when the document loads — not when the user clicks the FAB
- **FAB click** opens the panel to the already-computed analysis
- **Chat input** sits below the analysis — never above, never blank on open
- **Follow-up responses** append below the initial analysis — they do not replace it
- **Action confirmations** render inline within the panel at the appropriate tier

### What the UI never does

- Opens a blank prompt expecting the user to establish context
- Replaces the auto-analysis when the user asks a follow-up
- Executes any mutation without a visible confirmation step
- Appears on document types where FleetGraph has no reasoning capability

## What This Defers

- Additional proactive detection types (standup, deadline-risk, load-imbalance) — these slot in cleanly once the reasoning foundation is solid
- Deep fetch for proactive mode — proactive stays stateless and cheap
- Multi-document sessions — scope is always the document the user is looking at
- Streaming responses — batch response is sufficient for MVP foundation

## Success Criteria

1. On-demand graph produces visibly different LangSmith traces across different document states
2. Follow-up questions in the same session do not re-fetch already-known data
3. Depth escalation is observable in traces — medium and deep runs show different fetch node execution
4. Action proposals are tied to the analysis that surfaced them — not disconnected suggestions
5. Proactive and on-demand runs share the same graph definition (verifiable in code)
6. No Ship mutation executes without a confirmed HITL interrupt
