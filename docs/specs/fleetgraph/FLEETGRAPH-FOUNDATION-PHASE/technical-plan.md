# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-FOUNDATION-PHASE
- Story Title: Define the FleetGraph foundational phase
- Author: Codex
- Date: 2026-03-16

## Proposed Design
- Components/modules affected:
  - `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
  - `docs/assignments/fleetgraph/README.md`
  - `.ai/docs/references/fleetgraph-prd.md`
  - `docs/assignments/fleetgraph/PRESEARCH.md`
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
  - `.ai/memory/project/*`
  - `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/`
  - `api/src/services/fleetgraph/llm/`
  - `api/src/services/fleetgraph/tracing/`
  - `api/src/services/fleetgraph/graph/`
  - `api/src/services/fleetgraph/normalize/`
  - `api/vitest.fleetgraph.config.ts`
  - `api/package.json`
- Public interfaces/contracts:
  - `LLMAdapter`: provider-agnostic model adapter; OpenAI default path
  - `TriggerEnvelope`: event or scheduled-sweep entry contract
  - `FleetGraphState`: shared graph state for proactive and on-demand modes
  - `FleetGraphRuntimeInput`: validated graph input envelope before checkpointed execution
  - `NormalizedShipDocument`: one internal FleetGraph document model derived from canonical + legacy Ship payloads
  - `ShipContextEnvelope`: normalized contextual input from Ship routes
  - `InsightLedger`: dedupe/checkpoint metadata contract
- Data flow summary:
  - Repo docs point future agents to the PDF, PRD reference, presearch, and foundation spec pack.
  - The foundation spec pack sequences future implementation into reconnaissance -> provider contract -> tracing -> graph runtime -> normalization -> worker substrate -> deployment -> UI/HITL integration.
  - The current substrate path is adapter -> tracing -> graph shell -> normalization boundary, with real Ship fetch and worker nodes deferred to T006+.

## Architecture Decisions
- Decision: Treat the next FleetGraph phase as substrate-first instead of feature-first.
- Alternatives considered: jump directly into stale-issue detection or contextual chat implementation.
- Rationale: tracing, worker execution, provider choice, and deployment topology would otherwise be chosen accidentally by the first feature story.

- Decision: Keep provider integration adapter-based with OpenAI as the preferred default.
- Alternatives considered: lock the runtime to Claude because the PDF says so; make no default provider choice at all.
- Rationale: the user explicitly removed the Claude-only constraint, but the implementation still benefits from a default path for cost and planning.

- Decision: Require a gauntlet-wide reconnaissance story before adding agent infrastructure.
- Alternatives considered: limit discovery to the Ship repo only.
- Rationale: the surrounding workspace already contains agent-heavy sibling projects that may have reusable patterns or warnings.

## Data Model / API Contracts
- Request shape:
  - Future FleetGraph entrypoints should accept a `TriggerEnvelope` or `ShipContextEnvelope`, not raw route state.
- Response shape:
  - Foundation stories should define typed result contracts for quiet exit, advisory finding, approval-required action, and fallback.
- Storage/index changes:
  - No schema changes in this story.
  - Future foundation work should evaluate how to persist checkpoints, dedupe state, and trace correlation metadata without violating the REST-only Ship data-source constraint.

## Dependency Plan
- Existing dependencies used:
  - `@langchain/langgraph`
  - `langsmith`
  - `zod`
- New dependencies proposed (if any):
  - none in this story beyond the graph runtime package already added
- Risk and mitigation:
  - Risk: dependency decisions get copied from adjacent repos without checking fit.
  - Mitigation: make the first foundation story a gauntlet-wide inventory of reusable patterns and known bad fits.
  - Risk: later stories bypass the shared graph shell and reintroduce ad hoc branch names or per-story state.
  - Mitigation: keep T005+ work behind `api/src/services/fleetgraph/graph/` and extend shared runtime types instead of creating parallel graph entry points.
  - Risk: normalization drifts from live route payloads and silently drops legacy relationship hints that still matter in team/accountability flows.
  - Mitigation: keep the normalization layer fixture-tested against canonical + legacy combinations and treat route/context shaping as its own boundary.

## Test Strategy
- Unit tests:
  - Future `LLMAdapter`, normalization, scoring-policy, and checkpoint-contract tests
- Integration tests:
  - Future trigger enqueue -> worker -> graph trace integration
  - Future Ship-context -> embedded chat entry integration
- E2E or smoke tests:
  - Future deployed worker/API smoke run with trace capture and at least one proactive branch
- Edge-case coverage mapping:
  - mixed-shape REST payload normalization
  - missing or stale trace configuration
  - provider outage or timeout
  - worker replay/dedupe correctness
  - approval-required branch interruption

## UI Implementation Plan (if applicable)
- Behavior logic modules:
  - route-context extraction
  - FleetGraph entry state builder
  - HITL approval envelope
- Component structure:
  - embedded trigger/surface inside the contextual Ship page
  - approval modal or card for consequential actions
- Accessibility implementation plan:
  - keyboard-reachable trigger and confirm flow
  - visible focus handling and semantic labels for evidence/action states
- Visual regression capture plan:
  - deferred to the later UI implementation phase

## Rollout and Risk Mitigation
- Rollback strategy:
  - because this story adds only local substrate modules and tests, rollback is a path-level revert of `api/src/services/fleetgraph/graph/` plus the associated docs/memory notes
- Feature flags/toggles:
  - foundation stories should assume separate toggles for proactive worker, embedded chat surface, and any write-capable actions
- Observability checks:
  - trace metadata taxonomy defined before implementation
  - shared trace links captured as part of the MVP verification contract

## Validation Commands
```bash
cd api && pnpm exec vitest run --config vitest.fleetgraph.config.ts
pnpm --filter @ship/api type-check
pnpm --filter @ship/api build
```
