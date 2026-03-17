# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-LANGGRAPH-ORCHESTRATION-PHASE
- Story Title: FleetGraph LangGraph orchestration pack
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `api/src/services/fleetgraph/graph/**`
  - `api/src/services/fleetgraph/proactive/runtime.ts`
  - `api/src/services/fleetgraph/entry/service.ts`
  - `api/src/services/fleetgraph/actions/service.ts`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/openapi/schemas/fleetgraph.ts`
  - `web/src/components/FleetGraphDebugDock.tsx`
  - `web/src/components/FleetGraphDebugSurface.tsx`
  - `web/src/components/FleetGraphFindingsPanel.tsx`
  - `web/src/hooks/useFleetGraphFindings.ts`
- Public interfaces/contracts:
  - durable runtime factory with injectable checkpointer
  - review/resume-aware findings action endpoints
  - read-only checkpoint debug endpoint(s)
- Data flow summary:
  - worker or entry route -> graph runtime -> context hydration subgraph -> scenario fan-out -> merge/rank -> advisory or interrupt -> optional resume -> Ship REST action task -> persistent outcome

## Pack Cohesion and Sequencing
- Higher-level pack objectives:
  - make LangGraph the actual orchestrator
  - keep Ship REST as the only product data boundary
  - make approval flows durable and inspectable
  - expose checkpoint/debug evidence for QA
- Story ordering rationale:
  - first add the durable checkpoint seam
  - then migrate proactive and on-demand orchestration into graph nodes
  - then migrate approval to interrupt/resume
  - then expose debug history and refresh proof/docs
- Gaps/overlap check:
  - the worker queue remains untouched as the scheduler
  - the existing MVP proof lane remains the only required scenario family for this pack
- Whole-pack success signal:
  - the current FleetGraph proof lane can be inspected as a real LangGraph workflow with checkpoint history and resumable HITL execution

## Architecture Decisions
- Decision:
  - Use `PostgresSaver` for durable LangGraph checkpoints in production/runtime contexts and `MemorySaver` for tests or explicit injection.
- Alternatives considered:
  - keep `MemorySaver` only
  - build a custom checkpoint store from scratch
- Rationale:
  - Ship already uses Postgres, the official saver exists, and durable checkpoints are the missing primitive for real interrupt/resume and history inspection.

- Decision:
  - Keep the worker queue/dedupe substrate as the scheduler and let each claimed job enter the richer graph.
- Alternatives considered:
  - move scheduling into LangGraph
- Rationale:
  - the queue substrate already solves enqueue, dedupe, retry, and sweep cadence; LangGraph should own workflow execution, not queue ownership.

- Decision:
  - Wrap Ship REST, finding persistence, and action execution steps in `task()` boundaries.
- Alternatives considered:
  - leave side effects inline inside graph nodes
- Rationale:
  - resumable workflows need side-effect boundaries to avoid duplicate writes and to keep checkpoints meaningful.

## Data Model / API Contracts
- Request shape:
  - existing entry and findings routes stay same-origin and auth-bound
  - add read-only checkpoint debug route(s) keyed by thread id
- Response shape:
  - findings review/apply responses include graph-backed review state
  - debug route returns checkpoint summaries plus pending interrupt state
- Storage/index changes:
  - no Ship product schema changes
  - rely on FleetGraph-owned state and LangGraph checkpoint tables in Postgres

## Dependency Plan
- Existing dependencies used:
  - `@langchain/langgraph`
  - `pg`
  - existing FleetGraph stores, tracing, normalization, and worker substrate
- New dependencies proposed (if any):
  - `@langchain/langgraph-checkpoint-postgres`
- Risk and mitigation:
  - risk: Postgres saver boot/setup in tests or routes
  - mitigation: centralize checkpointer creation and keep explicit memory injection for tests

## Test Strategy
- Unit tests:
  - graph runtime branch selection and scenario merge/rank
  - checkpointer factory behavior
  - action-review interrupt/resume behavior
- Integration tests:
  - route-level entry/review/apply/debug flows with injected runtime
  - proactive runtime using graph-native scenario execution
- E2E or smoke tests:
  - QA/debug dock inspection through the existing visible FleetGraph proof lane
- Edge-case coverage mapping:
  - quiet on-demand path
  - pending interrupt reuse
  - approved vs dismissed resume
  - duplicate Ship write prevention

## UI Implementation Plan
- Behavior logic modules:
  - fetch debug history for current entry and visible findings
  - fetch review state from server-backed review initialization
- Component structure:
  - extend the existing debug dock rather than inventing a new surface
  - keep main finding cards human-first
- Accessibility implementation plan:
  - preserve explicit open/close controls and readable section structure in the dock
- Visual regression capture plan:
  - snapshot dock open with checkpoints
  - snapshot approval-review state with graph-backed review metadata

## Rollout and Risk Mitigation
- Rollback strategy:
  - revert to the current thin-graph path by switching back to `MemorySaver` and service-level orchestration if the new graph contract regresses core proof-lane behavior
- Feature flags/toggles:
  - none planned; keep the change bounded to the current FleetGraph surfaces
- Observability checks:
  - runtime tests
  - checkpoint history endpoint
  - LangSmith traces for proactive and approval/resume flows

## Validation Commands
```bash
pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx
pnpm --filter @ship/api type-check
pnpm --filter @ship/web type-check
pnpm --filter @ship/api build
pnpm --filter @ship/web build
git diff --check
```
