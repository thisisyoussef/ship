# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-V2-NATIVE-ROLLOUT-PACK
- Story Title: FleetGraph V2 native rollout pack
- Author: Codex
- Date: 2026-03-19

## Proposed Design
- Components/modules affected:
  - `api/src/services/fleetgraph/graph/types-v2.ts`
  - `api/src/services/fleetgraph/graph/state-v2.ts`
  - `api/src/services/fleetgraph/graph/nodes-v2/**`
  - `api/src/services/fleetgraph/actions/**`
  - `api/src/services/fleetgraph/findings/**`
  - `api/src/services/fleetgraph/worker/**`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/openapi/schemas/fleetgraph.ts`
  - `web/src/hooks/useFleetGraphAnalysis.ts`
  - `web/src/hooks/useFleetGraphEntry.ts`
  - `web/src/components/FleetGraphFab/AnalysisSection.tsx`
  - `web/src/lib/fleetgraph-entry.ts`
  - `web/src/lib/fleetgraph-findings.ts`
  - `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
  - `.ai/memory/session/active-context.md`
- Public interfaces/contracts:
  - native V2 entry/analyze/turn response schemas
  - typed review/apply payloads with `dialogSpec` and optional `dialogSubmission`
  - structured V2 resume request
  - native V2 worker runtime contract
- Data flow summary:
  - route/worker -> V2 runtime -> V2 checkpointed state -> response payload or pending approval -> registry-backed review dialog -> structured resume/apply -> execution service -> existing findings/action stores

## Pack Cohesion and Sequencing
- Higher-level pack objectives:
  - remove V1 compatibility shells
  - preserve multi-turn memory on V2 threads
  - complete typed HITL execution
  - wire V2 persistence to existing FleetGraph stores
  - close rollout docs/status
- Story ordering rationale:
  - first finalize the backend V2 state and contract
  - then cut routes/review/apply over to that contract
  - then remove the worker adapter and wire persistence
  - then migrate the web layer
  - finally refresh docs/status and audit artifacts
- Whole-pack success signal:
  - the main FleetGraph product path can be exercised without V1 route mapping, V1 chat state, or a worker adapter

## Architecture Decisions
- Decision:
  - extend V2 state with V1-equivalent conversation memory instead of keeping a sidecar V1 thread model for follow-up turns
- Alternatives considered:
  - route follow-up turns to V1 forever
  - keep V2 for first turn only and bridge later turns back into V1
- Rationale:
  - one thread/checkpoint model is the only clean native rollout; LangGraph persistence is already the right primitive for multi-turn memory

- Decision:
  - make the shared action registry and execution service the canonical V2 review/apply engine
- Alternatives considered:
  - keep the current confirm-only `pendingApproval` payload and bolt on more dialog cases later
- Rationale:
  - the repo already contains the bounded typed-dialog vocabulary and execution-plan model; rollout should converge on it instead of leaving it unused

- Decision:
  - reuse `fleetgraph_proactive_findings` and `fleetgraph_finding_action_runs` for native V2 persistence
- Alternatives considered:
  - add V2-only tables
  - keep V2 persistence in memory only for now
- Rationale:
  - the user-facing rollout goal is native end to end, not a second persistence system

- Decision:
  - keep `/api/fleetgraph/v2/*` as debug/test surfaces while moving the main web hooks to canonical same-origin routes
- Alternatives considered:
  - move the web app directly onto `/v2/*`
- Rationale:
  - the canonical product entrypoints are already established and should not bifurcate again during closeout

## Data Model / API Contracts
- Backend contract changes:
  - add V2 response schemas for entry/analyze/turn built from `responsePayload`, `reasonedFindings`, `proposedActions`, `pendingApproval`, and thread metadata
  - add typed `dialogSpec` and `dialogSubmission` shapes for review/apply
  - change resume input from bare decision string to structured payload containing decision plus optional submission values
- V2 state changes:
  - add `conversationHistory`, `contextSummary`, `turnCount`, `currentUserMessage`, and optional `dialogSubmission`
  - broaden `PendingApproval` to include action draft, dialog spec, and review metadata
- Persistence changes:
  - adapt V2 surfaced findings into `upsertFinding`
  - adapt V2 action decisions/results into the existing action-run and finding lifecycle surfaces

## Dependency Plan
- Existing dependencies used:
  - `@langchain/langgraph`
  - `@langchain/langgraph-checkpoint-postgres`
  - existing FleetGraph finding/action stores
  - existing React Query and Radix dialog surfaces
- New dependencies proposed:
  - none
- Risk and mitigation:
  - risk: V2 reasoning drifts from V1 follow-up behavior
  - mitigation: port prompt/context behavior from the V1 reason node and lock it down with regression tests
  - risk: partial route migration leaves mixed contracts
  - mitigation: change schemas, routes, and web types in the same pack and remove fallback code instead of shadowing it

## Test Strategy
- Unit tests:
  - V2 context builder/reasoning for initial and follow-up turns
  - structured resume validation and dialog-submission validation
  - V2 persistence adapters for findings/action outcomes
- Integration tests:
  - canonical route responses for entry/analyze/turn/review/apply/readiness
  - worker runtime/store using V2-native state
  - no V1 fallback behavior in routes
- E2E or smoke tests:
  - V2 analysis answer
  - follow-up question
  - typed review/apply flow
  - debug dock thread inspection remains usable
- Edge-case coverage mapping:
  - invalid thread
  - invalid dialog submission
  - repeated apply
  - degraded/fallback V2 response

## UI Implementation Plan
- Behavior logic modules:
  - `useFleetGraphAnalysis` owns native V2 analysis/turn/review/apply flows
  - `useFleetGraphEntry` consumes native V2 entry result and stops calling Ship endpoints directly
- Component structure:
  - keep `AnalysisSection` as the chat shell
  - extend the review dialog renderer to support non-confirm typed fields where provided
  - keep debug dock thread-bound and secondary
- Accessibility implementation plan:
  - typed dialog fields map to explicit labels and descriptions
  - cancel path stays separate from apply
- Visual regression capture plan:
  - advisory-only answer
  - action-required answer
  - confirm dialog
  - non-confirm dialog
  - error notice

## Rollout and Risk Mitigation
- Rollback strategy:
  - revert the pack branch; do not keep partial compatibility code in the route layer
- Feature flags/toggles:
  - V2 remains default-enabled; readiness/reporting must describe actual behavior
- Observability checks:
  - V2 route tests
  - debug thread inspection
  - LangSmith traces for first turn, follow-up turn, and HITL resume

## Validation Commands
```bash
pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts api/src/services/fleetgraph/actions/on-demand-service.test.ts api/src/services/fleetgraph/worker/runtime.test.ts api/src/services/fleetgraph/deployment/config.test.ts
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab/AnalysisSection.test.tsx src/components/FleetGraphDebugDock.test.tsx
pnpm --filter @ship/api type-check
pnpm --filter @ship/web type-check
pnpm --filter @ship/api build
pnpm --filter @ship/web build
git diff --check
```
