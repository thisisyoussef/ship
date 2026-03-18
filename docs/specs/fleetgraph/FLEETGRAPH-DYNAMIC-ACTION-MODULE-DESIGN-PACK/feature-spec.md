# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-DYNAMIC-ACTION-MODULE-DESIGN-PACK
- Story Title: FleetGraph dynamic action module design pack
- Author: Codex
- Date: 2026-03-18
- Related PRD/phase gate: FleetGraph post-MVP action-system expansion

## Problem Statement
FleetGraph now has a safe on-demand review/apply path, but the action model is still too narrow for the rest of the useful Ship mutation surface. Current docs and diagrams mostly describe confirm-only flows, while the shared FleetGraph action vocabulary already hints at richer actions like owner assignment, issue assignment, and comment posting. Without a docs-first design pass, the next implementation wave risks becoming another special-case action path instead of one flexible shared module.

## Story Pack Objectives
- Define one shared FleetGraph action module for both on-demand and proactive flows.
- Document typed dialog primitives that can support approvals, assignment, and comment composition without jumping to a fully generic schema engine.
- Update the main FleetGraph architecture docs so `approval_interrupt` becomes the typed human-action gate for dialog review, validation, and resumable execution.
- Publish a decision-complete first action pack plus a bounded near-term roadmap.

## User Stories
- As a PM using FleetGraph, I want the docs to describe one action system across proactive and on-demand flows so future action buttons behave consistently.
- As a reviewer, I want FleetGraph actions with user input to remain resumable and server-validated so assignment and comment flows are still safe.
- As a developer, I want an explicit action/dialog matrix so I can implement the next action families without inventing the contract as I go.

## Acceptance Criteria
- [ ] AC-1: `docs/assignments/fleetgraph/FLEETGRAPH.md` describes a shared action registry, dialog-capable `approval_interrupt`, and the first expanded action pack.
- [ ] AC-2: `docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md` updates its state schema and node definitions to cover action drafts, dialog specs, dialog submissions, and execution adapters.
- [ ] AC-3: A new FleetGraph spec pack exists with `constitution-check.md`, `feature-spec.md`, `technical-plan.md`, `task-breakdown.md`, and `action-dialog-matrix.md`.
- [ ] AC-4: The first action/dialog matrix is decision complete for `start_week`, `approve_week_plan`, `approve_project_plan`, `assign_owner`, `assign_issues`, and `post_comment`.
- [ ] AC-5: The docs name but do not over-specify the near-term roadmap for `request_plan_changes`, single-issue reassignment/state changes, carryover or bulk issue operations, and escalation flows.

## Edge Cases
- Empty/null inputs:
  - comment actions with empty text remain invalid even if the draft itself is valid.
- Boundary values:
  - repeated apply and stale-state checks must remain part of the design contract.
- Invalid/malformed data:
  - dialog submissions that reference an option no longer present in the hydrated option set are rejected.
- External-service failures:
  - option hydration or Ship execution failures should surface truthful FleetGraph errors and not imply that a mutation happened.

## Non-Functional Requirements
- Security:
  - FleetGraph review/apply stays server-backed and human-approved for Ship writes.
- Performance:
  - the model emits safe action intent only; option hydration and input validation remain deterministic.
- Observability:
  - thread identity, dialog review, and execution results remain compatible with LangGraph checkpoint/resume inspection.
- Reliability:
  - execution adapters document stale-state checks, idempotency expectations, and composed-write boundaries.

## UI Requirements
- Required states:
  - confirm-only review
  - picker-based review with hydrated options
  - text-entry review with validation
  - pending apply
  - success and failure feedback
- Accessibility contract:
  - dialogs expose explicit title/description, action-specific confirm labels, keyboard-close behavior, and a distinct cancel path.
- Design token contract:
  - reuse existing FleetGraph modal/review patterns and keep advanced controls progressively disclosed.
- Visual-regression snapshot states:
  - confirm action
  - person picker
  - issue multi-select + assignee picker
  - comment compose review

## Out of Scope
- Runtime implementation of the dynamic action module.
- A fully generic schema-driven form engine in this story.
- Autonomous Ship mutations.
- New standalone FleetGraph action APIs outside the existing review/apply route family.

## Done Definition
- The docs define one shared action module vocabulary across proactive and on-demand FleetGraph work.
- The first action pack is explicit, bounded, and implementation-ready.
- The architecture docs describe dialog specs, submissions, and execution adapters clearly enough to support follow-on implementation stories.
- The near-term roadmap is documented without forcing the first implementation wave to solve everything at once.
