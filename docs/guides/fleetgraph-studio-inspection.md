# FleetGraph Studio Inspection Guide

Use this guide when you want native LangGraph Studio graph inspection for FleetGraph.

## What Studio Adds

Studio complements the existing FleetGraph observability stack:

- LangSmith traces:
  - best for run-by-run trace evidence and shared links
- FleetGraph debug dock:
  - best for same-origin page QA and thread ids while using Ship
- LangGraph Studio:
  - best for native graph structure, node traversal, checkpoint state, and interrupt/resume debugging

## Prerequisites

- `api/.env.local` present if you want FleetGraph env defaults loaded automatically
- FleetGraph provider/tracing env set if you want full trace-backed graph debugging
- Dependencies installed with `pnpm install`

Local Postgres is optional for graph preview. Studio uses an in-memory
checkpointer by default so the graph can register and render even when your
local Ship database is unavailable.

## Start Studio

From the repo root:

```bash
pnpm fleetgraph:studio:dev
```

If you want copy-paste example payloads first:

```bash
pnpm --filter @ship/api fleetgraph:studio:examples
```

Expected local endpoints:

- API server: `http://localhost:2024`
- Studio UI: `https://smith.langchain.com/studio?baseUrl=http://localhost:2024`

If you want Studio to inspect real persisted FleetGraph threads from your local
Ship database instead of using the default in-memory checkpointer, start it with:

```bash
FLEETGRAPH_STUDIO_CHECKPOINTER=postgres pnpm fleetgraph:studio:dev
```

Only use that mode when your local Postgres/Ship dev database is reachable.

## Open the FleetGraph Graph

1. Start the local Studio server with the command above.
2. Open the Studio UI URL.
3. Select the graph id `fleetgraph`.
4. Switch to graph mode.

Expected:

- the FleetGraph graph is registered successfully
- node structure is visible for:
  - `resolve_trigger_context`
  - `select_scenarios`
  - `run_scenario`
  - `merge_candidates`
  - `score_and_rank`
  - `quiet_exit`
  - `reason_and_deliver`
  - `approval_interrupt`
  - `execute_action`
  - `persist_action_outcome`
  - `persist_result`
  - `fallback`

## Example Inputs

The repo ships three starter payloads through:

```bash
pnpm --filter @ship/api fleetgraph:studio:examples
```

Those examples cover:

- proactive advisory path
- on-demand document path
- approval review/resume path

Before invoking them in Studio:

- replace placeholder `workspaceId`
- replace placeholder `documentId` or `findingId`
- for the review path, use a real review thread id captured from the FleetGraph debug dock

Resume values for a paused review thread:

- `approved`
- `dismissed`

## Graph Export Note

The Studio config points at a top-level compiled graph export in:

- [graph.ts](/Users/youss/Development/gauntlet/ship/api/src/services/fleetgraph/studio/graph.ts)

That is intentional. The local CLI can register a factory function, but the
Studio preview flow is more reliable when `langgraph.json` references a compiled
graph variable directly.

## Inspect Existing Threads

By default, Studio runs FleetGraph with an in-memory checkpointer for preview
and local graph execution.

If you want to inspect real persisted FleetGraph threads in Studio:

1. Start Studio with `FLEETGRAPH_STUDIO_CHECKPOINTER=postgres`.
2. Create or open a FleetGraph run from Ship itself against the same local DB.
3. Use the FleetGraph debug dock on the document page to capture the thread id.
4. Open Studio and inspect the matching thread/checkpoint history there.

This keeps Studio focused on the real FleetGraph runtime instead of a separate mock flow.

## Troubleshooting

- If Studio does not boot:
  - verify `api/.env.local` exists
  - verify local dependencies were installed with `pnpm install`
  - rerun `pnpm fleetgraph:studio:dev`
- If Studio says the graph failed to preview:
  - confirm `langgraph.json` points to the compiled export in `api/src/services/fleetgraph/studio/graph.ts`
  - use the default memory-backed mode first
  - only enable `FLEETGRAPH_STUDIO_CHECKPOINTER=postgres` after your local DB is reachable
- If the graph registers but node execution is missing:
  - create a real FleetGraph run through Ship first, then inspect the thread in Studio
- If you need sample payloads:
  - run `pnpm --filter @ship/api fleetgraph:studio:examples`
- If you only need proof links rather than graph debugging:
  - use LangSmith or the FleetGraph debug dock instead
