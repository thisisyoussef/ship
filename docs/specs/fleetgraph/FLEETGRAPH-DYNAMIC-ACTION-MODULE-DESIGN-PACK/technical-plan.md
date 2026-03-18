# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-DYNAMIC-ACTION-MODULE-DESIGN-PACK
- Story Title: FleetGraph dynamic action module design pack
- Author: Codex
- Date: 2026-03-18

## Proposed Design
- Components/modules affected:
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-DYNAMIC-ACTION-MODULE-DESIGN-PACK/`
  - future implementation surfaces referenced by the docs:
    - `api/src/services/fleetgraph/contracts/`
    - `api/src/services/fleetgraph/actions/`
    - `api/src/services/fleetgraph/graph/`
    - `web/src/components/FleetGraphFab/`
- Public interfaces/contracts:
  - `FleetGraphActionDefinition`
  - `FleetGraphActionDraft`
  - `FleetGraphDialogSpec`
  - `FleetGraphDialogSubmission`
  - `FleetGraphActionReviewPayload`
  - `FleetGraphActionExecutionPlan`
- Data flow summary:
  - scenario reasoning produces a safe `FleetGraphActionDraft`
  - FleetGraph review service resolves the draft through a shared action registry
  - the registry hydrates dialog options and review copy from Ship REST or deterministic FleetGraph services
  - user input returns through apply as a typed `FleetGraphDialogSubmission`
  - FleetGraph validates the submission, builds an `ExecutionPlan`, and resumes `approval_interrupt`
  - `execute_confirmed_action` runs the selected adapter against Ship REST with replay-safe boundaries

## Pack Cohesion and Sequencing
- Higher-level pack objectives:
  - unify proactive and on-demand action language
  - expand FleetGraph beyond confirm-only actions without losing safety
  - document a bounded first action pack and a near-term roadmap
- Story ordering rationale:
  - first update the workbook and architecture docs
  - then publish the action/dialog matrix
  - only after docs are aligned should runtime/service/web stories begin
- Whole-pack success signal:
  - an implementer can build the shared action module from the docs without inventing new contracts or action-specific dialog rules

## Architecture Decisions
- Decision:
  - use one shared action registry for on-demand and proactive flows.
- Alternatives considered:
  - keep separate action systems per surface
  - expand only the on-demand module and retrofit proactive later
- Rationale:
  - the shared action vocabulary already exists in FleetGraph contracts, and the next useful actions span both surfaces.

- Decision:
  - keep `approval_interrupt` as the graph node name, but broaden its payload to typed dialog review and submission handling.
- Alternatives considered:
  - rename the node
  - move dialog handling outside the graph entirely
- Rationale:
  - existing docs, traces, and runtime language already center `approval_interrupt`; widening the contract is lower-churn than renaming the node family.

- Decision:
  - ship typed dialog primitives first: `confirm`, `single_select`, `multi_select`, `text_input`, `textarea`.
- Alternatives considered:
  - remain confirm-only
  - jump straight to schema-driven generic forms
- Rationale:
  - the first useful action pack needs real user input, but typed primitives are safer and easier to validate than a generic renderer.

- Decision:
  - keep option hydration and input validation in the FleetGraph action service layer, not in the LLM node.
- Alternatives considered:
  - have the model emit options or free-form request bodies
  - hardcode options in the web client
- Rationale:
  - option sets and legal writes must be derived from current Ship state and validated server-side.

- Decision:
  - document execution adapters instead of assuming one action equals one raw endpoint.
- Alternatives considered:
  - keep a single `endpoint` contract for every action
- Rationale:
  - issue assignment and similar actions need fan-out or composed writes even though approvals and comments are single-request flows.

## Data Model / API Contracts
- Draft shape:
  - `actionType`, `targetType`, `targetId`, evidence, rationale, policy classification, and stable action identity
- Review shape:
  - typed `dialogSpec` with field definitions, hydrated options, review title/summary, and action-specific confirm label
- Apply shape:
  - typed `dialogSubmission` with validated values keyed to the dialog field definitions
- Execution shape:
  - `single_request`
  - `document_patch`
  - `multi_request`
  - `fleetgraph_composed`
- Compatibility rule:
  - the existing FleetGraph review/apply route family remains the public entry point; the payload grows compatibly rather than introducing a new action API

## Dependency Plan
- Existing dependencies used:
  - LangGraph interrupts/checkpointing model
  - existing FleetGraph review/apply route family
  - Ship REST mutation routes
  - Radix dialog patterns already used in the app
- New dependencies proposed:
  - none in this story
- Risk and mitigation:
  - risk: overcommitting to a generic form engine too early
  - mitigation: document schema-driven forms as a future extension path only
  - risk: action docs drift between workbook, architecture doc, and implementation pack
  - mitigation: define one action/dialog matrix and reference it from the other two docs

## Test Strategy
- Documentation acceptance:
  - terminology matches across workbook, architecture doc, and new pack
  - first action pack and roadmap are clearly separated
  - action/dialog matrix is decision complete
- Future contract tests derived from this pack:
  - shared draft/review/apply schemas validate the first action pack
  - invalid submissions are rejected
  - unsupported suggestions stay advisory-only
- Future review/apply scenarios derived from this pack:
  - confirm approvals
  - assign owner
  - assign issues
  - comment composition
  - stale-state, option drift, repeated apply, and empty text failures

## UI Implementation Plan
- Behavior logic modules:
  - one dialog renderer that maps `dialogKind` to typed controls
  - one review/apply controller that works for proactive and on-demand surfaces
- Component structure:
  - controlled modal or sheet stays the default review surface
  - review copy and confirm labels come from server review payloads
- Accessibility implementation plan:
  - explicit dialog title/description
  - action-specific confirm labels
  - validation feedback near the field source
- Design constraints:
  - calm default state
  - progressive disclosure for advanced actions
  - truthful mutation feedback only after confirmed results

## Rollout and Risk Mitigation
- Rollout strategy:
  - implement the first pack in waves: contracts -> review/apply service -> dialog renderer -> first actions
- Guardrails:
  - all Ship mutations stay human-approved
  - FleetGraph, not the browser, owns stale-state checks and composed execution
- Observability expectations:
  - action review and apply remain checkpoint-aware
  - debug surfaces can inspect typed action review state without pushing technical detail into the primary UI

## Validation Commands
```bash
git diff --check
```
