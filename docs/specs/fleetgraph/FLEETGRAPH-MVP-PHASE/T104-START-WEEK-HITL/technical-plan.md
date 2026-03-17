# Technical Plan

## Metadata
- Story ID: T104
- Story Title: Execute the real week-start action through a human-in-the-loop FleetGraph gate
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `api/src/services/fleetgraph/findings/`
  - `api/src/services/fleetgraph/entry/`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/openapi/schemas/fleetgraph.ts`
  - `web/src/components/FleetGraphFindingsPanel.tsx`
  - `web/src/hooks/useFleetGraphFindings.ts`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/T104-START-WEEK-HITL/`
- Public interfaces/contracts:
  - `FleetGraphApplyFindingRequest`
  - `FleetGraphApplyFindingResponse`
  - durable action execution record for one finding/action pair
  - visible UI state for review/apply/result
- Data flow summary:
  - user opens a document page with a visible week-start drift finding
  - user chooses review/apply on the visible finding surface
  - FleetGraph same-origin route loads the finding, validates that it still carries a `start_week` action, checks duplicate-execution state, and then calls the existing Ship REST `POST /api/weeks/:id/start` route with the user’s auth context
  - FleetGraph records the result, resolves or preserves the finding appropriately, and returns a typed visible result payload

## Pack Cohesion and Sequencing (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - satisfy the Tuesday HITL pass item with a real action
  - preserve the visible Ship proof lane
  - keep `T105` focused on evidence capture rather than last-minute product behavior
- Story ordering rationale:
  - `T103` established the visible proactive panel and advisory recommendation
  - `T104` extends that same panel first, then adds real execution
  - `T105` can now capture traces, demo proof, and workbook evidence from the actual visible MVP path
- Gaps/overlap check:
  - `T104` owns one real action path only
  - `T105` owns evidence capture, not product semantics

## Architecture Decisions
- Decision: execute the real action through the existing same-origin Ship REST endpoint instead of adding FleetGraph-specific product-write SQL.
- Alternatives considered: direct FleetGraph SQL write; factoring the week-start business logic behind a new shared internal service first.
- Rationale: the assignment boundary is REST-only for Ship product state, and the existing route already defines the supported mutation contract.

- Decision: add durable FleetGraph-owned execution state to suppress duplicate apply attempts.
- Alternatives considered: rely on the week-start route’s “already active” error alone; keep duplicate protection only in browser state.
- Rationale: duplicate-click and retry safety must survive refreshes and repeated attempts.

- Decision: extend the existing visible findings panel rather than routing approval execution through a separate page.
- Alternatives considered: standalone FleetGraph approval screen; using only the entry card.
- Rationale: the UI-first workflow now requires visible proof early and continuously, and the finding panel is already the natural place for the action.

## Data Model / API Contracts
- Request shape:
  - `POST /api/fleetgraph/findings/:id/apply`
  - authenticated same-origin request with CSRF/session context
- Response shape:
  - typed action result including outcome (`applied`, `already_started`, `rejected`, `failed`) and updated finding state where relevant
- Storage/index changes:
  - add the minimum FleetGraph-owned table needed to persist per-finding action execution state and duplicate suppression
  - keep proactive findings as the source of recommendation context

## Dependency Plan
- Existing dependencies used:
  - `zod`
  - `@tanstack/react-query`
  - existing Ship REST route `POST /api/weeks/:id/start`
- New dependencies proposed:
  - none
- Risk and mitigation:
  - risk: forwarding auth/CSRF incorrectly to the Ship REST route
  - mitigation: proxy the incoming same-origin auth context directly and cover with route tests
  - risk: action succeeds but the finding panel does not reflect the result
  - mitigation: return typed result payloads and invalidate/refetch the findings query

## Test Strategy
- Unit tests:
  - action execution state transitions
  - duplicate apply suppression
- Integration tests:
  - apply -> Ship REST start route -> success result
  - apply -> already active -> safe resolved result
  - reject/cancel leaves Ship state unchanged
- E2E or smoke tests:
  - visible document-page apply flow
  - post-merge Render inspection of the visible apply/result state

## UI Implementation Plan (if applicable)
- Behavior logic modules:
  - findings hook gains apply mutation
  - findings panel gains review/apply/result rendering
- Component structure:
  - keep the action inside `FleetGraphFindingsPanel`
  - use an inline confirmation state or modal only if it improves clarity/accessibility
- Accessibility implementation plan:
  - review/apply control names must state the consequence clearly
  - failure/success states must be screen-readable

## Rollout and Risk Mitigation
- Rollback strategy:
  - the apply route and panel extension should be revertible without removing the T103 proactive finding surface
- Feature flags/toggles:
  - preserve existing FleetGraph enablement surfaces
- Observability checks:
  - keep action result state associated with the originating thread/finding so `T105` can capture approval-path traces cleanly

## Validation Commands
```bash
pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx
pnpm --filter @ship/api type-check
pnpm --filter @ship/web type-check
pnpm --filter @ship/api build
pnpm --filter @ship/web build
```
