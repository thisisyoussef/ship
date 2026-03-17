# Feature Spec

## Metadata
- Story ID: T105
- Story Title: MVP evidence capture and submission closeout
- Author: Codex
- Date: 2026-03-17
- Related pack: `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`

## Problem Statement
FleetGraph now has a live Railway demo, a visible proactive panel, a real HITL apply lane, and a deployed worker-generated finding. The Tuesday MVP can still fail, though, if the final submission artifacts do not show those behaviors clearly. Right now `docs/assignments/fleetgraph/FLEETGRAPH.md` still contains `Pending T105` placeholders, there is only one easily discoverable shared trace URL, and the approval-preview path used to capture the second trace rejects live document-context payloads when `ticket_number` is `null`.

## User Stories
- As an evaluator, I want one place where I can verify the live demo URL, named UI proof targets, and the trace links that back the claimed MVP behavior.
- As a reviewer, I want the second shared trace to come from a distinct execution path, not from a duplicate of the existing worker-generated advisory run.
- As a user testing from prod, I want the `Preview approval gate` path to work against the real document-context payload so UI inspection matches the code and docs.

## Acceptance Criteria
- [ ] AC-1: FleetGraph can capture and document at least two shared LangSmith traces with different execution paths, including the live worker-generated proactive path and a distinct approval-preview path.
- [ ] AC-2: The live `Preview approval gate` flow accepts the real document-context payload returned by Ship, including `ticket_number: null`.
- [ ] AC-3: `docs/assignments/fleetgraph/FLEETGRAPH.md` no longer contains `Pending T105` placeholders for required Tuesday evidence sections.
- [ ] AC-4: A submission-ready evidence artifact records the public demo URL, named UI proof targets, trace URLs, and checklist mapping.
- [ ] AC-5: The story handoff includes prod UI inspection steps that verify both the proactive panel and the approval-preview surface.

## Edge Cases
- Live Ship context payloads contain nullable optional fields such as `ticket_number`.
- The worker-generated finding exists but its trace URL is the only currently surfaced public trace.
- The live approval-preview request succeeds functionally but the matching LangSmith runtime trace has not yet been shared.
- Cost or token totals are partially available from traces and need a bounded documented interpretation rather than an invented aggregate.

## Done Definition
- Two distinct shared traces are captured and documented.
- The approval-preview UI path works against the live demo context payload.
- Submission docs are complete enough that a reviewer can verify the Tuesday checklist end to end.
