# Feature Spec

## Metadata
- Story ID: T103
- Story Title: Implement proactive week-start drift detection and visible finding surface
- Author: Codex
- Date: 2026-03-17
- Related PRD/phase gate: FleetGraph Tuesday MVP proactive-detection requirement

## Problem Statement
FleetGraph has the runtime, worker, tracing, readiness, and embedded entry substrate, but it still does not prove a real proactive Ship intelligence loop. The Tuesday MVP specifically requires one proactive detection running end to end on real Ship data. Right now there is no implemented week-start drift detector, no durable proactive finding contract, and no visible Ship-facing surface that shows a finding without first asking FleetGraph a question.

## Story Pack Objectives (for phase packs or multi-story planning)
- Objective 1: Satisfy every Tuesday MVP pass item exactly.
- Objective 2: Deliver one proactive FleetGraph slice on real Ship data.
- Objective 3: Leave one clean path for the later HITL execution story.
- How this story or pack contributes to the overall objective set: `T103` is the MVP's proactive proof point. It turns the FleetGraph substrate into one real detected and surfaced project-state finding.

## User Stories
- As a PM, I want FleetGraph to notice that a week should be active but is still in planning or empty so I do not have to discover week-start drift manually.
- As a reviewer, I want the proactive result to be visible inside Ship with enough evidence and controls to understand, dismiss, or snooze it.
- As the later `T104` implementer, I want the surfaced finding to carry a stable recommended action contract that can be upgraded into a real approval-required mutation path.

## Acceptance Criteria
- [ ] AC-1: A proactive worker run against real Ship data can detect a week-start drift candidate and route it through the FleetGraph runtime on a non-mocked code path.
- [ ] AC-2: When a week-start drift candidate survives deterministic gating, FleetGraph persists one surfaced finding with stable dedupe identity, cooldown metadata, and trace linkage.
- [ ] AC-3: Repeated proactive runs within cooldown do not create duplicate surfaced findings for the same week-start drift condition.
- [ ] AC-4: Ship exposes a visible proactive FleetGraph surface that renders the active week-start drift finding and its evidence without requiring an on-demand entry request first.
- [ ] AC-5: Users can dismiss or snooze the surfaced finding, and that choice is persisted so the next proactive cycle respects it.
- [ ] AC-6: The proactive story stops short of executing consequential Ship mutations directly; any recommended action remains advisory until `T104`.

## Edge Cases
- Empty/null inputs: workspaces with no current week or no qualifying planning week should produce a quiet result, not a broken surfaced finding.
- Boundary values: a week can be `planning` with legitimate zero issues before the start threshold; the detector must respect the configured time boundary.
- Invalid/malformed data: mixed Ship payloads may omit owner/project context; FleetGraph should still surface only if evidence remains sufficient.
- External-service failures: Ship REST, LangSmith, or LLM failures must fall back without producing a false positive finding.

## Non-Functional Requirements
- Security: surfaced findings must not leak secrets or internal config in user-visible text or trace metadata.
- Performance: sweeps must preserve the under-5-minute detection target and avoid LLM usage on obviously clean weeks.
- Observability: every surfaced finding run must stamp branch/outcome metadata and be eligible for later shared trace capture.
- Reliability: dedupe, cooldown, dismiss, and snooze states must survive worker retries and repeated sweeps.

## UI Requirements (if applicable)
- Required states: quiet/no finding, active finding, dismissed, snoozed, and fallback/error-safe rendering.
- Accessibility contract: the proactive finding surface must be keyboard reachable, use semantic button labels, and describe why the week was flagged.
- Design token contract: preserve existing Ship surfaces and avoid inventing a standalone chatbot UI for proactive findings.
- Visual-regression snapshot states: active finding visible, dismissed state, snoozed state, and quiet state.

## Out of Scope
- Executing `POST /api/weeks/:id/start`
- Broad on-demand answer improvements outside the existing entry surface
- Multiple proactive use cases beyond week-start drift
- Push delivery channels outside the visible Ship surface chosen for the MVP

## Done Definition
- Week-start drift detection runs through the durable FleetGraph worker/runtime path.
- One surfaced proactive finding contract exists and is rendered in Ship.
- Dedupe/cooldown plus dismiss/snooze behavior are implemented and tested.
- The story leaves a clean recommended-action path for `T104` instead of performing the mutation here.
