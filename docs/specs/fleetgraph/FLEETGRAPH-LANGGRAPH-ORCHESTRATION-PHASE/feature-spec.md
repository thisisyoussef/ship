# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-LANGGRAPH-ORCHESTRATION-PHASE
- Story Title: FleetGraph LangGraph orchestration pack
- Author: Codex
- Date: 2026-03-17
- Related PRD/phase gate: Post-MVP FleetGraph architecture hardening

## Problem Statement
FleetGraph currently uses LangGraph as a thin four-way branch selector while the meaningful proactive, on-demand, and action-review behavior lives in ad hoc services outside the graph. That makes interrupts non-durable, checkpoint history shallow, scenario composition hard to inspect, and future scenario growth harder to reason about.

## Story Pack Objectives
- Objective 1: Move real FleetGraph orchestration into graph nodes and subgraphs instead of service-level branching.
- Objective 2: Introduce durable, Postgres-backed checkpointing and resumable approval flows.
- Objective 3: Keep Ship product reads and writes behind Ship REST while FleetGraph owns only its own state.
- Objective 4: Expose enough checkpoint/debug history to make runs inspectable in QA without leaking technical detail into the primary UI.
- How this story or pack contributes to the overall objective set:
  - It turns the existing MVP proof lane into a real workflow graph foundation that future scenarios can extend safely.

## User Stories
- As a PM using FleetGraph, I want proactive and on-demand findings to come from one inspectable graph so the behavior is easier to trust and debug.
- As a reviewer approving a FleetGraph action, I want the approval step to be resumable so retries and refreshes do not duplicate writes.
- As a developer or QA reviewer, I want checkpoint history surfaced in one secondary debug surface so I can verify what the graph actually did.

## Acceptance Criteria
- [ ] AC-1: Proactive week-start drift orchestration runs through graph nodes/subgraphs, not a service that only calls the base graph as a branch classifier.
- [ ] AC-2: On-demand FleetGraph entry uses graph-selected scenario results so it can return quiet, advisory, or approval-required outcomes from graph state instead of hardcoded service assumptions.
- [ ] AC-3: The `start_week` human gate uses real LangGraph interrupt/resume semantics with durable checkpoints, while Ship mutation still executes through Ship REST.
- [ ] AC-4: FleetGraph uses a durable Postgres-backed LangGraph checkpointer in production contexts and keeps memory-based injection available for tests.
- [ ] AC-5: A read-only debug surface exposes checkpoint history and pending interrupts for relevant FleetGraph threads without moving technical detail back into the primary user-facing cards.

## Edge Cases
- Empty/null inputs:
  - On-demand entry with no actionable scenario facts should still terminate cleanly as `quiet`.
- Boundary values:
  - A finding thread with an existing pending interrupt must resume without duplicating the Ship action.
- Invalid/malformed data:
  - Ship REST payload quirks must still be normalized before graph state is scored.
- External-service failures:
  - Ship REST or LLM failures must route to a fallback or failed action outcome without corrupting checkpoint history.

## Non-Functional Requirements
- Security:
  - Request auth/CSRF context for Ship writes must not be persisted into checkpoints.
- Performance:
  - Scenario fan-out should stay bounded to known FleetGraph scenarios; no unbounded tool-style exploration.
- Observability:
  - Checkpoint history, pending interrupts, and trace linkage should be inspectable from repo-owned surfaces.
- Reliability:
  - Side-effecting steps must be wrapped so replay/resume does not double-apply Ship writes.

## UI Requirements
- Required states:
  - debug dock closed
  - debug dock open with checkpoint history
  - finding review pending
  - approval preview / interrupt pending
- Accessibility contract:
  - debug details stay behind an explicit secondary control and remain keyboard reachable.
- Design token contract:
  - reuse existing FleetGraph debug dock styling rather than inventing a new debug surface family.
- Visual-regression snapshot states:
  - proactive card with debug dock closed/open
  - on-demand entry card with interrupt pending

## Out of Scope
- New proactive scenario families beyond the current week-start proof lane.
- Replacing the existing worker queue/sweep substrate with LangGraph scheduling.
- A standalone FleetGraph chat UI or product redesign.

## Done Definition
- The LangGraph runtime becomes the main orchestrator for the current FleetGraph proof lane.
- Durable checkpoints are active in production runtime paths and injectable in tests.
- Review/apply behavior uses interrupt/resume semantics end to end.
- Debug/checkpoint inspection is available through API + UI.
- Tests, docs, and proof guidance are updated to reflect the new graph shape.
