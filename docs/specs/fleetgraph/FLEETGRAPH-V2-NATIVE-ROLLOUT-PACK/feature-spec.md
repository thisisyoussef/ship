# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-V2-NATIVE-ROLLOUT-PACK
- Story Title: FleetGraph V2 native rollout pack
- Author: Codex
- Date: 2026-03-19
- Related PRD/phase gate: Post-MVP FleetGraph rollout hardening and closeout

## Problem Statement
FleetGraph V2 is already the real execution engine for several entrypoints, but the product is still running through V1-shaped wrappers, V1 follow-up chat state, a V1 worker adapter, and a confirm-only HITL contract. That leaves the rollout half-native, obscures the true API contract, and keeps rollout status/docs out of sync with the runtime that is actually default-enabled.

## Story Pack Objectives
- Objective 1: Make the canonical FleetGraph API and worker surfaces native V2 end to end.
- Objective 2: Preserve multi-turn on-demand chat on the V2 thread/checkpoint model instead of the old runtime state model.
- Objective 3: Complete the typed HITL contract so dialog-based actions, validation, and structured resume inputs work through the shared action registry.
- Objective 4: Reuse existing FleetGraph persistence tables for proactive findings and action outcomes instead of creating a parallel V2 store.
- Objective 5: Close the rollout operationally so readiness, docs, and audit surfaces match real default behavior.

## User Stories
- As a Ship user, I want FleetGraph entry and analysis responses to come from one stable V2 contract so the UI and backend stay aligned.
- As a user asking follow-up questions, I want FleetGraph to retain thread context and respond to my actual question on later turns.
- As a reviewer applying FleetGraph actions, I want typed review dialogs and validated submissions instead of a confirm-only shell.
- As an operator, I want readiness and rollout status to reflect actual default runtime behavior.

## Acceptance Criteria
- [ ] AC-1: `/api/fleetgraph/entry`, `/api/fleetgraph/analyze`, `/api/fleetgraph/thread/:threadId/turn`, and `/api/fleetgraph/thread/:threadId/actions/:actionId/review|apply` expose native V2 request/response contracts with no V1 mapping or V1 fallback in the route layer.
- [ ] AC-2: V2 state carries `conversationHistory`, `contextSummary`, `turnCount`, and the current user message so initial analysis and follow-up turns use one persisted thread model.
- [ ] AC-3: V2 on-demand reasoning uses the current user question and prior thread context to produce question-aware answers comparable to the old V1 reasoner.
- [ ] AC-4: `approval_interrupt`, `runtime-v2.resume`, and the review/apply services support typed dialog specs plus structured submissions, not only `approved | dismissed | snoozed`.
- [ ] AC-5: The shared action registry and execution service become the canonical review/apply path for V2 on-demand actions and typed dialog validation.
- [ ] AC-6: The FleetGraph worker no longer uses a V1 compatibility adapter and persists native V2 proactive findings and action outcomes through the existing FleetGraph finding/action stores.
- [ ] AC-7: Readiness and rollout docs report V2 status based on real default behavior, and the active Ship `.ai` status docs no longer mark the rollout as in progress once the pack is complete.

## Edge Cases
- Empty/null inputs:
  - on-demand follow-up without a thread must fail clearly instead of silently creating an invalid turn
  - advisory-only turns with no findings must still produce a stable chat response payload
- Boundary values:
  - repeat resume/apply calls must remain duplicate-safe
  - invalid dialog submissions must not execute Ship writes
  - review threads with existing completed action outcomes must return the saved result
- Invalid/malformed data:
  - V2 contracts must reject unsupported dialog kinds, action ids, and malformed resume payloads
  - conversation state loaded from old checkpoints must degrade safely if fields are missing
- External-service failures:
  - Ship REST or LLM failures must still yield fallback/degraded V2 response payloads without reintroducing V1 fallback behavior

## Non-Functional Requirements
- Security:
  - Ship writes remain server-backed and request-bound
  - request auth and CSRF context is not persisted in checkpoints
- Performance:
  - V2 follow-up turns must reuse the same thread/checkpoint path and avoid redundant contract translation
- Observability:
  - debug/state inspection remains thread-backed through existing V2 state/debug surfaces
- Reliability:
  - Ship writes stay post-interrupt and `task()`-wrapped for replay safety

## UI Requirements
- Required states:
  - native V2 analysis idle and initial response
  - follow-up turn appended from V2 state
  - typed review dialog open
  - typed validation error
  - apply success and apply failure
- Accessibility contract:
  - dialog title, description, field labels, keyboard close, and distinct cancel path remain explicit
- Design token contract:
  - reuse existing FleetGraph FAB, confirm dialog, and debug dock visual language
- Visual-regression snapshot states:
  - V2 advisory answer
  - V2 action-required answer
  - typed review dialog
  - action outcome notice/error

## Out of Scope
- New proactive scenario families beyond current supported FleetGraph findings.
- Replacing the worker queue/sweep substrate with LangGraph scheduling.
- Promoting `/api/fleetgraph/v2/*` from low-level debug/test routes into the main web integration surface.

## Done Definition
- Canonical FleetGraph entry/analyze/turn/review/apply routes are native V2.
- Worker execution is native V2 with real persistence wiring.
- Web FleetGraph hooks/components consume the native V2 contract.
- Typed HITL flows support dialog submission and validation.
- Rollout/readiness docs and active context are updated to match delivered behavior.
