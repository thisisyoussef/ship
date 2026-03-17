# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-FEEDBACK-PHASE
- Story Title: Restore FleetGraph MVP inspectability after live user audit
- Author: Codex
- Date: 2026-03-17
- Related PRD/phase gate: Post-MVP feedback pack following the shipped Tuesday MVP slice

## Problem Statement
FleetGraph now meets the MVP bar on the public Railway demo, but the first live UI audit exposed a small cluster of proof-lane usability failures: the seeded FleetGraph week pages are not discoverable from normal document navigation, the affected document page can become non-scrollable in the deployed layout, and the FleetGraph UI still exposes too much system-facing language and action-state behavior that feels technical or untrustworthy to a human reviewer. Those issues weaken the public demo because the FleetGraph slice is technically live but still awkward to monitor, interpret, and QA in the normal product flow. Before building more FleetGraph behavior, the next pack should restore inspectability, interaction trust, and modest human-centered polish so future feedback is grounded in the real UI rather than workaround routes or internal terminology.

## Story Pack Objectives (for phase packs or multi-story planning)
- Objective 1: Make the shipped FleetGraph proof lanes reachable from standard Ship navigation without relying on popup-only entry points.
- Objective 2: Restore reliable scrolling and document-page usability on the affected FleetGraph week surfaces in the public demo.
- Objective 3: Make the visible FleetGraph UI more human-friendly by removing primary-surface technical jargon, grounding action feedback in real outcomes, and limiting debug detail to an optional diagnostic surface.
- Objective 4: Refresh the FleetGraph pack-level audit path so future UI feedback can be gathered from the live demo in one pass.
- How this story or pack contributes to the overall objective set: this pack protects the usefulness of the shipped MVP by fixing the first real user-audit failures before we extend FleetGraph with more behavior.

## User Stories
- As a reviewer, I want to reach the FleetGraph demo weeks from normal Ship navigation so I can inspect the MVP slice without hidden paths.
- As a user, I want the FleetGraph week page to scroll normally so I can read and test the full document instead of seeing a clipped view.
- As a user, I want FleetGraph copy and action feedback to sound human and trustworthy instead of exposing internal routes, thread ids, or system jargon.
- As a collaborator, I want a refreshed end-to-end UI audit path after these fixes land so feedback can turn into the next implementation pack cleanly.

## Acceptance Criteria
- [ ] AC-1: The live FleetGraph demo weeks are reachable from standard Ship navigation, not only from popup or command-palette flows.
- [ ] AC-2: The deployed FleetGraph week page scrolls normally on the sanctioned public demo for the seeded review/apply lane and the worker-generated lane.
- [ ] AC-3: The navigation fix preserves Ship access rules and uses existing REST-backed document/week surfaces rather than special-case hidden routes.
- [ ] AC-4: Dismiss and snooze interaction feedback is grounded in the actual mutation outcome instead of optimistic success copy that can contradict real error state.
- [ ] AC-5: Primary FleetGraph UI copy uses human-friendly language and no longer exposes internal endpoint paths, thread ids, or system-centric jargon by default.
- [ ] AC-6: Any technical execution details that remain useful for debugging are moved into an optional diagnostic surface rather than the primary user-facing copy.
- [ ] AC-7: The UI improvements stay modest: better hierarchy, clearer action framing, and cleaner evidence presentation without a broad redesign.
- [ ] AC-8: The scroll and interaction fixes are covered by focused UI regression tests and verified on the live demo with explicit UI inspection steps.
- [ ] AC-9: The FleetGraph pack-level user audit checklist is refreshed after the fixes land so the whole shipped slice can be re-verified in one UI pass.

## Audit Findings This Pack Addresses
- [ ] Finding 1: The FleetGraph demo week pages do not show up in normal document navigation and are currently easiest to reach through popup/dialog flows.
- [ ] Finding 2: The FleetGraph demo document page can become non-scrollable on the public demo, blocking comfortable UI inspection.
- [ ] Finding 3: The dismiss and snooze controls surface failure language in the UI audit, while the current frontend interaction model sets local success copy optimistically and does not clearly separate transport errors from confirmed mutation results.
- [ ] Finding 4: Primary FleetGraph UI copy exposes technical details such as endpoint paths, thread ids, “same-origin” phrasing, and route-oriented action language that is not human-friendly.
- [ ] Finding 5: The visible information hierarchy and evidence bullets are functional but visually underpowered and overly technical for an MVP product surface.

## Edge Cases
- Empty/null inputs: a workspace with no FleetGraph demo weeks should still show a clear empty state rather than a broken or hidden sidebar/list.
- Boundary values: long document titles, many documents, or narrow viewport heights must not reintroduce the scroll trap or hide the relevant week rows.
- Invalid/malformed data: mixed document types in the left-nav surface must not mis-route to broken tabs or ghost rows.
- External-service failures: the public demo may still be healthy while one navigation or context query fails, so the UI should show a meaningful error state instead of silently hiding everything.

## Non-Functional Requirements
- Security: navigation changes must not bypass the existing auth or visibility model.
- Performance: list/query changes should stay bounded to existing page surfaces and avoid large unnecessary fan-out.
- Observability: visible UI changes should remain paired with live-demo inspection steps and screenshotable proof, while technical diagnostics stay available in a secondary debug surface.
- Reliability: the public proof lane should remain stable across refreshes and redeploys, and visible action-state feedback must reflect real mutation outcomes.

## UI Requirements (if applicable)
- Required states: reachable FleetGraph demo week rows from standard navigation, normal scroll behavior on the week page, trusted dismiss/snooze feedback, human-friendly approval copy, and an optional debug/details affordance for technical information.
- Accessibility contract: keyboard-reachable navigation rows, preserved focus behavior, and no hidden scroll traps.
- Design token contract: preserve Ship’s current UI language; this pack is about inspectability, trust, and modest polish, not a visual redesign.
- Visual-regression snapshot states: reachable week rows in navigation, scrollable FleetGraph week page, friendlier review/apply state, and improved action-result/error state.

## Out of Scope
- New proactive rules or additional FleetGraph intelligence
- New autonomous actions or new HITL action types
- Broad redesign of the full information architecture or a full FleetGraph UI redesign
- Replacing Railway as the sanctioned public demo for this pack

## Done Definition
- The feedback pack exists under `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-PHASE/` with explicit objectives, sequence, and validation.
- The pack starts from the verified live audit findings instead of speculative improvements.
- The pack keeps future FleetGraph work anchored to visible, reachable, and scrollable prod UI proof.
