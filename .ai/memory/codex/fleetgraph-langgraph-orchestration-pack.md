# FleetGraph LangGraph Orchestration Pack

Date: 2026-03-17
Branch: `codex/fleetgraph-langgraph-orchestration-pack`

## What Changed

- Moved FleetGraph orchestration into LangGraph nodes instead of keeping proactive and on-demand behavior in service wrappers.
- Added a durable checkpointer seam with Postgres support for production and injected memory/custom savers for tests.
- Added scenario fan-out and ranking across:
  - `week_start_drift`
  - `entry_context_check`
  - `entry_requested_action`
  - `finding_action_review`
- Replaced the preview-only start-week review with a real `interrupt()` / `resume()` approval path.
- Wrapped FleetGraph-owned side effects in LangGraph `task()` boundaries:
  - finding upsert
  - action begin/finish execution
  - Ship REST action execution
  - proactive fetch/trace tasks
- Added checkpoint-history and pending-interrupt surfacing through:
  - `GET /api/fleetgraph/debug/threads`
  - the page-level FleetGraph debug dock

## Important Boundaries

- Ship product reads/writes remain REST-only.
- FleetGraph-owned Postgres state is still allowed for:
  - checkpoints
  - queue jobs
  - proactive findings
  - action executions
- The worker queue remains the scheduler; LangGraph does not replace it.

## Notable Implementation Details

- `api/src/services/fleetgraph/graph/runtime.ts` is now the main orchestrator.
- `api/src/services/fleetgraph/graph/checkpointer.ts` chooses custom, memory, or Postgres saver.
- `api/src/services/fleetgraph/actions/service.ts` now reviews and resumes a deterministic finding-review thread.
- `web/src/components/FleetGraphFindingsPanel.tsx` now opens a server-backed review step before apply.
- `web/src/components/FleetGraphDebugDock.tsx` now reads real checkpoint history and pending interrupts.

## Validation Notes

- API type-check and build passed.
- Web type-check, focused FleetGraph UI tests, and build passed.
- Focused FleetGraph API tests passed under `vitest.fleetgraph.config.ts`.
- The full FleetGraph config run is still sensitive to local Docker/Testcontainers readiness because the worker integration tests boot an ephemeral Postgres container.
