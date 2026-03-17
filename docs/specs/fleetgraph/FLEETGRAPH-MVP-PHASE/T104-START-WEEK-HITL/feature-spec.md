# Feature Spec

## Metadata
- Story ID: T104
- Story Title: Execute the real week-start action through a human-in-the-loop FleetGraph gate
- Author: Codex
- Date: 2026-03-17
- Related PRD/phase gate: FleetGraph Tuesday MVP HITL requirement

## Problem Statement
`T103` proves a real proactive FleetGraph finding and visible Ship-facing surface, but the recommended `start_week` action is still advisory only. The Tuesday MVP requires at least one real human-in-the-loop gate, so FleetGraph now needs to let a user explicitly review and approve that action, execute the existing Ship week-start route through the same-origin boundary, and show the result visibly in Ship.

## Story Pack Objectives (for phase packs or multi-story planning)
- Objective 1: Satisfy every Tuesday MVP pass item exactly.
- Objective 2: Deliver one proactive end-to-end FleetGraph slice on real Ship data.
- Objective 3: Deliver one real HITL action path plus public deploy/trace/docs evidence.
- Objective 4: Keep the MVP visually inspectable from Ship as each runtime story lands.
- How this story or pack contributes to the overall objective set: `T104` turns the visible proactive finding into one real user-confirmed Ship action, which is the remaining runtime requirement before trace/evidence closeout.

## User Stories
- As a PM, I want FleetGraph to let me explicitly approve the recommended `start week` action from the visible proactive finding so I stay in control of the mutation.
- As a reviewer, I want duplicate or retried applies to be safe and one-time so FleetGraph cannot start the same week twice.
- As an assignment evaluator, I want the action result to be visible in Ship so the MVP proves a real HITL path, not just a preview shell.

## Acceptance Criteria
- [ ] AC-1: The visible proactive FleetGraph surface offers a real review-and-apply path for `start_week` instead of advisory-only messaging.
- [ ] AC-2: The actual week-start mutation executes only after explicit human confirmation and uses the existing Ship REST route, not direct FleetGraph SQL writes to Ship product tables.
- [ ] AC-3: Duplicate apply attempts for the same finding are durably suppressed and do not trigger the Ship week-start route more than once.
- [ ] AC-4: Reject/cancel leaves Ship state unchanged and preserves the proactive finding for later review.
- [ ] AC-5: Success, already-started, and failure outcomes are visibly rendered in Ship and persisted strongly enough that retries and refreshes behave predictably.
- [ ] AC-6: The story preserves the proactive finding/document-page UI proof lane established in `T103` and extends it rather than replacing it.

## Edge Cases
- Empty/null inputs: applying a missing or already-resolved finding should fail safely with a typed error.
- Boundary values: a week may already be active by the time the user approves; FleetGraph should close the finding without re-executing the write.
- Invalid/malformed data: a finding missing a valid `start_week` recommended action must not execute.
- External-service failures: same-origin REST execution may fail due to auth, CSRF, or route errors; the UI must surface the failure cleanly and avoid duplicate execution.

## Non-Functional Requirements
- Security: preserve user-authenticated same-origin execution and do not widen write capability beyond the existing Ship route.
- Reliability: duplicate clicks, retries, and refreshes must not start the same week twice.
- Observability: action result state should remain traceable to the originating finding/thread.
- UX: the review/apply state and final result must be visibly understandable on the document page.

## UI Requirements (if applicable)
- Required states: review-ready finding, confirmation state, apply success, already-started/resolved, apply failure, and reject/cancel.
- Accessibility contract: confirmation flow must be keyboard accessible, have semantic labels, and make the action consequence understandable before apply.
- Design token contract: extend the current document-page FleetGraph panel; do not spawn a separate page or detached modal flow unless needed for accessibility.
- Visual-regression snapshot states: active finding with review CTA, confirmation open, success notice, failure notice.

## Out of Scope
- New proactive detectors beyond week-start drift
- Generalized arbitrary FleetGraph write tools beyond `start_week`
- Broad on-demand chat expansion
- Final trace capture and workbook evidence closeout (`T105`)

## Done Definition
- One real `start_week` action can be approved and executed from the visible FleetGraph surface.
- Execution uses the same-origin Ship REST path, not direct FleetGraph product-table writes.
- Duplicate execution protection is durable.
- Success/failure/reject states are visible in Ship and covered by tests.
