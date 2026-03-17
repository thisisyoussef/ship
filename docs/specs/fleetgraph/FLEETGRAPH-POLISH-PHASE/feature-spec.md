# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-POLISH-PHASE
- Story Title: Finish the remaining FleetGraph UI polish after the feedback pack
- Author: Codex
- Date: 2026-03-17
- Related PRD/phase gate: Post-feedback polish sequence before the next user inspection

## Problem Statement
The FleetGraph MVP is now reachable and trustworthy enough to inspect from the live Railway demo, but the UI still has a few rough edges that make the experience feel more technical and less human than it should. The live review/apply lane still uses awkward phrasing in the approval-preview state, the worker-generated finding summary is denser and more system-shaped than necessary, and the overall card presentation could use a small amount of hierarchy and calm without turning into a redesign. The user also asked for a persistent, optional debug surface so technical details can stay available for QA without living in the main content flow. Before the next user inspection, we should finish these remaining polish items in one bounded pack and keep prod QA central to each story.

## Story Pack Objectives (for phase packs or multi-story planning)
- Objective 1: Make FleetGraph’s visible status and approval language read naturally to a human reviewer.
- Objective 2: Keep technical context available for QA through progressive disclosure or an optional debug surface instead of the main card copy.
- Objective 3: Improve the visual hierarchy and calm of the FleetGraph cards without redesigning Ship.
- Objective 4: Re-run and refresh live prod QA after the polish lands so the next user inspection starts from current behavior.
- How this story or pack contributes to the overall objective set: this pack closes the remaining product roughness surfaced by the feedback audit and user comments so the next inspection can focus on product quality rather than avoidable UI friction.

## User Stories
- As a reviewer, I want FleetGraph summaries and approval prompts to sound natural and clear so I can understand the recommended action quickly.
- As a QA user, I want technical details available in a dedicated debug surface so I can inspect internals without cluttering the primary UI.
- As a user, I want the FleetGraph panels to feel calmer and easier to scan so the proactive card and entry card support the page instead of competing with it.
- As a collaborator, I want the public demo QA path refreshed after these changes so I can inspect the final polished slice in one pass.

## Acceptance Criteria
- [ ] AC-1: Approval-preview copy no longer uses awkward system-facing phrasing such as breadcrumb-count language in the primary surface.
- [ ] AC-2: Worker-generated and review/apply summaries use clearer human-centered language while preserving the meaning of the underlying signal.
- [ ] AC-3: Technical details remain available through a clearly secondary debug surface that is easy to open during QA and easy to ignore during normal use.
- [ ] AC-4: The main FleetGraph cards gain modest hierarchy and visual polish that improves scanability without changing Ship’s overall design language.
- [ ] AC-5: Dismiss and snooze remain verified on the live demo as trustworthy regression checks, even though they are no longer the primary defect this pack is solving.
- [ ] AC-6: The live Railway demo is refreshed after each shipped runtime story so the user can inspect prod as the pack advances.
- [ ] AC-7: The final pack-level audit path is updated to match the polished live UI before handoff.

## Audit Findings This Pack Addresses
- [ ] Finding 1: The approval-preview summary still reads awkwardly and too technically on the live demo.
- [ ] Finding 2: The worker-generated proactive summary is denser and more system-shaped than a human reviewer wants.
- [ ] Finding 3: Debug details are now secondary, but QA would still benefit from a more persistent and easier-to-inspect debug surface.
- [ ] Finding 4: The FleetGraph cards are functional but still visually flatter and more bullet-heavy than they need to be.
- [ ] Finding 5: The next user inspection needs one refreshed live QA path after the polish ships.

## Edge Cases
- Empty/null inputs: the debug surface should stay hidden or empty when no FleetGraph result or finding metadata exists.
- Boundary values: long document titles and long evidence strings should not break the visual hierarchy or overflow the debug surface awkwardly.
- Invalid/malformed data: if a trace URL, endpoint detail, or debug field is missing, the UI should degrade cleanly instead of showing broken placeholders.
- External-service failures: if live dismiss/snooze/apply mutations fail during QA, the polished UI should still present honest and user-facing failure messaging.

## Non-Functional Requirements
- Security: do not expose new write capabilities or bypass existing auth/visibility rules.
- Performance: keep the debug surface lightweight and limited to already-fetched data; no new polling loop or heavyweight query should be added just for polish.
- Observability: preserve the current trace/debug evidence path while making it easier to inspect during QA.
- Reliability: keep the public demo stable and resettable for repeated inspection.

## UI Requirements (if applicable)
- Required states: polished review/apply finding, polished worker-generated finding, approval-preview with natural language, optional debug surface, and live regression-safe dismiss/snooze state.
- Accessibility contract: the debug surface must remain keyboard reachable and dismissible, and the main cards must preserve readable hierarchy and button focus order.
- Design token contract: calm over clever, earned complexity, and honest interfaces remain the governing principles.
- Visual-regression snapshot states: approval-preview open, review/apply open, worker-generated finding visible, debug surface open.

## Out of Scope
- New proactive detectors or new HITL action types
- Changes to the FleetGraph REST/data boundary
- Reworking Ship navigation or the document-page layout again
- A broad FleetGraph redesign outside the current card surfaces

## Done Definition
- The polish pack exists under `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/` with clear objectives and story boundaries.
- The story set stays grounded in live Railway behavior rather than stale pre-fix feedback.
- The next user inspection can happen directly from prod with one refreshed audit checklist.
