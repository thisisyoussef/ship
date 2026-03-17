# Technical Plan

## Metadata
- Story ID: T103
- Story Title: Implement proactive week-start drift detection and visible finding surface
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `api/src/services/fleetgraph/graph/`
  - `api/src/services/fleetgraph/worker/`
  - `api/src/services/fleetgraph/normalize/`
  - `api/src/services/fleetgraph/tracing/`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/openapi/schemas/fleetgraph.ts`
  - `web/src/components/`
  - `web/src/hooks/`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/T103-WEEK-START-DRIFT/`
- Public interfaces/contracts:
  - `FleetGraphProactiveFinding`
  - `FleetGraphFindingAction`
  - `FleetGraphFindingStatus`
  - `FleetGraphFindingListResponse`
  - any route-local request contract for dismiss/snooze transitions
- Data flow summary:
  - worker sweep or event enqueue claims a proactive FleetGraph job
  - the runtime fetches real Ship week/workspace context and normalizes it
  - deterministic week-start drift scoring decides quiet vs candidate
  - candidate-producing runs invoke the LLM for final synthesis and recommended action wording
  - the result is persisted as one surfaced proactive finding with cooldown, trace, and lifecycle metadata
  - Ship renders the active finding through a same-origin FleetGraph surface

## Pack Cohesion and Sequencing (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - satisfy the Tuesday proactive-detection MVP bar
  - keep the implementation on real Ship data
  - prepare but not execute the later HITL action
- Story ordering rationale:
  - `T102` had to land first so the public deploy and readiness baseline were trustworthy
  - `T103` now proves proactive detection, visibility, and durable lifecycle state
  - `T104` can then focus specifically on approval-required mutation execution
- Gaps/overlap check:
  - this story owns detection, persistence, visibility, dismiss, and snooze
  - `T104` owns confirmation-before-write and duplicate-execution protection for the real action
  - `T105` owns evidence capture after the proactive slice is truly live
- Whole-pack success signal:
  - a reviewer can see one real week-start drift finding in Ship, verify it came from the proactive worker path, and confirm it did not require mocked data

## Architecture Decisions
- Decision: use week-start drift as a deterministic candidate detector before LLM synthesis.
- Alternatives considered: prompt-only detection directly from broad workspace state; implementing multiple candidate detectors in the same story.
- Rationale: deterministic gating keeps cost/latency predictable and produces clearer quiet vs surfaced behavior for the MVP.

- Decision: persist proactive findings as FleetGraph-owned durable records instead of only checkpoint metadata.
- Alternatives considered: deriving visible findings directly from the latest checkpoint; keeping results only in LangSmith traces.
- Rationale: visible Ship rendering, dismiss/snooze lifecycle, cooldown, and later HITL action promotion need a durable surfaced-finding record.

- Decision: keep the recommended action advisory in `T103`.
- Alternatives considered: executing `start week` directly now.
- Rationale: Tuesday requires at least one HITL gate, but `T104` is the right story to implement the actual write path cleanly.

## Data Model / API Contracts
- Request shape:
  - proactive worker jobs continue using the existing trigger envelope and thread/dedupe keys
  - read routes should accept workspace/document context sufficient to render active findings in Ship
  - dismiss/snooze routes should accept only typed finding ids plus the requested lifecycle transition
- Response shape:
  - finding list response returns visible proactive findings with summary, evidence, status, cooldown/snooze metadata, and recommended action payload
  - lifecycle mutation responses return updated finding state only
- Storage/index changes:
  - add the minimum FleetGraph-owned durable table(s) needed for surfaced findings and lifecycle state
  - reuse the existing queue/dedupe/checkpoint substrate rather than duplicating job identity

## Dependency Plan
- Existing dependencies used:
  - `@langchain/langgraph`
  - `langsmith`
  - `zod`
  - existing Ship REST routes and FleetGraph worker/runtime modules
- New dependencies proposed (if any):
  - none
- Risk and mitigation:
  - risk: real Ship week context is too sparse to distinguish genuine drift from legitimate planning state
  - mitigation: define explicit threshold inputs and quiet when evidence is insufficient
  - risk: proactive result exists in storage but is not visible enough for MVP review
  - mitigation: choose one obvious same-origin FleetGraph surface and test it end to end
  - risk: duplicate runs create noisy repeated findings
  - mitigation: tie surfaced-finding identity to the existing dedupe/cooldown model and test repeated sweep behavior

## Test Strategy
- Unit tests:
  - week-start drift candidate selection from normalized week/workspace inputs
  - finding status transitions for active, dismissed, and snoozed states
  - advisory action contract shaping for the later `start week` path
- Integration tests:
  - sweep enqueue -> runtime invoke -> surfaced finding persistence
  - repeated run inside cooldown -> no duplicate finding
  - dismiss/snooze lifecycle respected by later proactive runs
- E2E or smoke tests:
  - Ship-facing visible rendering of an active proactive finding
  - public demo verification after merge
- Edge-case coverage mapping:
  - no week or already-active week -> quiet
  - planning week before threshold -> quiet
  - planning or empty week after threshold -> surfaced finding
  - sparse owner/project context -> quiet or reduced-evidence advisory, never false certainty

## UI Implementation Plan (if applicable)
- Behavior logic modules:
  - fetch/render active proactive findings
  - lifecycle actions for dismiss and snooze
- Component structure:
  - add one proactive FleetGraph surface to Ship that can render worker-produced findings
  - keep the later apply/approval affordance structurally separate until `T104`
- Accessibility implementation plan:
  - button labels for dismiss/snooze
  - status text that explains why the week was flagged
  - focus-safe refresh after lifecycle actions
- Visual regression capture plan:
  - quiet state
  - active week-start drift finding
  - dismissed or snoozed confirmation state

## Rollout and Risk Mitigation
- Rollback strategy:
  - proactive finding persistence and rendering should be revertible independently from the worker substrate
- Feature flags/toggles:
  - continue honoring existing FleetGraph surface enablement and public trace sharing controls
- Observability checks:
  - ensure week-start drift runs emit distinct quiet vs surfaced-finding branches
  - keep finding records trace-linked so `T105` can capture public trace evidence cleanly

## Validation Commands
```bash
pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec vitest run src/components/FleetGraphEntryCard.test.tsx
pnpm --filter @ship/api type-check
pnpm --filter @ship/web type-check
pnpm --filter @ship/api build
pnpm --filter @ship/web build
```
