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
- Public interfaces/contracts:
  - `LLMAdapter`: provider-agnostic model adapter; OpenAI default path
  - `TriggerEnvelope`: event or scheduled-sweep entry contract
  - `FleetGraphState`: shared graph state for proactive and on-demand modes
  - `ShipContextEnvelope`: normalized contextual input from Ship routes
  - `InsightLedger`: dedupe/checkpoint metadata contract
- Data flow summary:
  - Repo docs point future agents to the PDF, PRD reference, presearch, and foundation spec pack.
  - The foundation spec pack sequences future implementation into reconnaissance -> provider contract -> tracing -> graph runtime -> normalization -> worker substrate -> deployment -> UI/HITL integration.

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
  - None added in this story.
- New dependencies proposed (if any):
  - `@langchain/langgraph`
  - `langsmith`
  - `openai`
  - typed schema validation helpers such as `zod` if the implementation layer needs stricter state contracts
- Risk and mitigation:
  - Risk: dependency decisions get copied from adjacent repos without checking fit.
  - Mitigation: make the first foundation story a gauntlet-wide inventory of reusable patterns and known bad fits.

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
  - because this story is docs/spec only, rollback is path-level revert if future implementation disagrees
- Feature flags/toggles:
  - foundation stories should assume separate toggles for proactive worker, embedded chat surface, and any write-capable actions
- Observability checks:
  - trace metadata taxonomy defined before implementation
  - shared trace links captured as part of the MVP verification contract

## Validation Commands
```bash
rg -n "APPROACH_REFERENCE.md|provider-agnostic|OpenAI|PRESEARCH.md|FleetGraph_PRD.pdf" docs/assignments/fleetgraph/README.md .ai/docs/SINGLE_SOURCE_OF_TRUTH.md .ai/docs/references/fleetgraph-prd.md docs/assignments/fleetgraph/PRESEARCH.md docs/assignments/fleetgraph/FLEETGRAPH.md
find docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE -maxdepth 1 -type f | sort
```
