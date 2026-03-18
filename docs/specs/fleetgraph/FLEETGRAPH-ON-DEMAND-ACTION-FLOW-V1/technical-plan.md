# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-ON-DEMAND-ACTION-FLOW-V1
- Story Title: FleetGraph on-demand action flow v1
- Author: Codex
- Date: 2026-03-18

## Proposed Design
- Components/modules affected:
  - `api/src/services/fleetgraph/graph/types.ts`
  - `api/src/services/fleetgraph/graph/state.ts`
  - `api/src/services/fleetgraph/graph/nodes/reason.ts`
  - `api/src/services/fleetgraph/graph/runtime.ts`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/openapi/schemas/fleetgraph.ts`
  - `web/src/hooks/useFleetGraphAnalysis.ts`
  - `web/src/components/FleetGraphFab/AnalysisSection.tsx`
- Public interfaces/contracts:
  - typed on-demand action draft union
  - review/apply endpoints for on-demand thread actions
  - review response payload shared by backend and web
- Data flow summary:
  - on-demand analyze/turn -> reason node emits supported action draft -> user clicks action -> FleetGraph review endpoint validates thread/action and returns confirm copy -> apply endpoint forwards same-origin request context and executes Ship REST via FleetGraph -> web invalidates affected queries and renders truthful result

## Architecture Decisions
- Decision:
  - Keep the story on the current on-demand runtime instead of migrating onto the V2 runtime.
- Alternatives considered:
  - fold this into the V2 three-lane architecture now
- Rationale:
  - the active on-demand FAB is already wired to the older runtime; this story is about action safety and coherence, not a second graph migration.

- Decision:
  - Define a dedicated on-demand action draft shape instead of reusing proactive finding actions directly.
- Alternatives considered:
  - reuse `FleetGraphRequestedAction` unchanged
  - keep free-form `proposedAction`
- Rationale:
  - on-demand actions need review-dialog metadata and per-thread/action identity while still staying small and confirm-only.

- Decision:
  - Apply on-demand actions through FleetGraph routes, not browser-direct Ship calls.
- Alternatives considered:
  - keep the current direct browser mutation path
- Rationale:
  - this reuses the repo’s existing safety model, keeps request validation server-side, and prevents unsupported action proposals from becoming clickable writes.

## Data Model / API Contracts
- Request shape:
  - review: no body; thread and action ids come from the route
  - apply: no body; server reads request context headers/cookies
- Response shape:
  - analyze/turn: findings include typed `proposedAction` only for supported actions
  - review: `{ action, review }`
  - apply: `{ action, actionOutcome }`
- Storage/index changes:
  - none; on-demand action state stays thread-local in the existing graph/checkpoint state

## Dependency Plan
- Existing dependencies used:
  - `@langchain/langgraph`
  - existing FleetGraph runtime, request-context helpers, and action executor
  - Radix dialog through the existing `ConfirmDialog`
- New dependencies proposed (if any):
  - none
- Risk and mitigation:
  - risk: thread state may not retain enough action identity across turns
  - mitigation: persist analyzed findings and selected action drafts in graph state keyed by a deterministic `actionId`

## Test Strategy
- Unit tests:
  - reason-node sanitization only promotes the three supported actions
  - unsupported stagnation suggestions stay advisory-only
- Integration tests:
  - review/apply routes validate workspace/thread/action combinations
  - apply forwards request context and uses FleetGraph rather than direct browser execution
- E2E or smoke tests:
  - FAB-supported action opens review dialog and reflects apply result in UI
- Edge-case coverage mapping:
  - stale action id
  - repeated apply
  - invalid endpoint/action type
  - Ship REST failure

## UI Implementation Plan
- Behavior logic modules:
  - `useFleetGraphAnalysis` owns review/apply mutations and query invalidation
- Component structure:
  - `AnalysisSection` keeps its card layout and uses `ConfirmDialog` for supported actions
- Accessibility implementation plan:
  - dialog title/description sourced from server review payload; `Cancel` remains distinct from `Apply`
- Visual regression capture plan:
  - supported action idle state
  - confirm dialog state
  - failed apply state

## Rollout and Risk Mitigation
- Rollback strategy:
  - revert to advisory-only on-demand findings by stripping supported action drafts if the review/apply flow regresses
- Feature flags/toggles:
  - none; bounded by action-type allowlist
- Observability checks:
  - route tests for thread state
  - existing FleetGraph debug state remains available for thread inspection

## Validation Commands
```bash
pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts src/services/fleetgraph/graph/nodes/reason.test.ts
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFab/AnalysisSection.test.tsx src/hooks/useFleetGraphAnalysis.test.tsx
pnpm --filter @ship/api type-check
pnpm --filter @ship/web type-check
pnpm --filter @ship/api build
pnpm --filter @ship/web build
git diff --check
```
