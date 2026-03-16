# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-FOUNDATION-PHASE
- Story Title: Define the foundational FleetGraph build phase before feature implementation
- Author: Codex
- Date: 2026-03-16
- Related PRD/phase gate: FleetGraph PRD foundation planning and deployment readiness

## Problem Statement
FleetGraph has strong use-case and architecture direction in `docs/assignments/fleetgraph/PRESEARCH.md`, but the repo still lacks an explicit prerequisite phase that tells future agents what must be built before user-facing FleetGraph behaviors begin. Without that foundation pack, agents are likely to jump straight into features and accidentally hard-code provider choice, tracing shape, worker topology, or deployment assumptions.

## User Stories
- As a future FleetGraph implementer, I want a clear foundation-phase story pack so I know what infrastructure and contracts must exist before building proactive or on-demand agent behaviors.
- As a maintainer, I want the checked-in PRD references to reflect the live repo interpretation so the source PDF's stale Claude-only bullet does not mislead later agents.
- As a project lead, I want the foundational stories to require a scan of the whole `gauntlet/` directory so we reuse nearby LangGraph, LangSmith, deployment, or provider-adapter patterns before inventing new ones.

## Acceptance Criteria
- [ ] AC-1: The repo clearly points to the checked-in FleetGraph PDF, the approach reference, the markdown PRD reference, and `docs/assignments/fleetgraph/PRESEARCH.md`, and those docs no longer present Claude-only integration as the live implementation contract.
- [ ] AC-2: `docs/assignments/fleetgraph/PRESEARCH.md` explicitly defines the prerequisite platform work required before FleetGraph feature implementation, including tracing, graph runtime, normalization, worker triggering, deployment, and HITL entry contracts.
- [ ] AC-3: A foundation-phase story pack exists under `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/` with constitution check, feature spec, technical plan, and task breakdown.
- [ ] AC-4: The story pack includes an explicit reconnaissance story that tells future implementers to inspect the whole `/Users/youss/Development/gauntlet` directory for reusable patterns before adding new FleetGraph-specific infrastructure.
- [ ] AC-5: The foundation-phase stories reflect a provider-agnostic runtime with OpenAI as the preferred default, not a Claude-locked implementation.

## Edge Cases
- Empty/null inputs: the PDF may be present while markdown references are stale or contradictory.
- Boundary values: sibling repos in `gauntlet/` may contain partially relevant patterns that should inform decisions without being copied blindly.
- Invalid/malformed data: FleetGraph implementation may receive mixed-shape Ship REST payloads that cannot be reasoned over safely without normalization.
- External-service failures: tracing, model, or deployment services may be unavailable during bring-up, so the foundation stories need explicit fallback and verification expectations.

## Non-Functional Requirements
- Security: foundation stories must keep all provider, LangSmith, and service credentials in environment variables only.
- Performance: the prerequisite plan must preserve the under-5-minute proactive detection goal.
- Observability: tracing and branch metadata must be planned before behavior stories begin.
- Reliability: worker, checkpoint, and deployment contracts must be defined before proactive mode implementation.

## UI Requirements (if applicable)
- Required states: embedded contextual entry, loading, answer, approval-required, and failure fallback.
- Accessibility contract: keyboard-accessible chat trigger, focus-safe approval modal, readable evidence summaries.
- Design token contract: defer exact visuals to later UI stories; foundation phase only defines the contextual and HITL contract.
- Visual-regression snapshot states: deferred to the UI implementation phase.

## Out of Scope
- Building the actual LangGraph runtime or FleetGraph UI in this story
- Adding new production dependencies
- Implementing proactive detections or on-demand reasoning behaviors
- Finalizing deployment manifests or public URLs

## Done Definition
- The PRD reference surfaces are aligned with the live repo direction.
- The phase-1-3 submission brief is promoted into the docs surface through `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`.
- `docs/assignments/fleetgraph/PRESEARCH.md` contains an explicit foundation-phase prerequisite section.
- The FleetGraph foundation story pack exists and is specific enough to start implementation from.
- The story pack calls out the full `gauntlet/` reconnaissance requirement.
- SSOT and memory are updated so future agents enter through the foundation phase instead of skipping ahead.
