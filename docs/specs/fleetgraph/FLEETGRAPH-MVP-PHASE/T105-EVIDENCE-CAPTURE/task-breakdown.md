# Task Breakdown

## Story
- Story ID: T105
- Story Title: MVP evidence capture and submission closeout

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T105-1 | Unblock the approval-preview evidence path by accepting the live document-context payload shape, including `ticket_number: null`. | must-have | no | Route test proves `/api/fleetgraph/entry` accepts the live payload shape |
| T105-2 | Capture the two distinct shared traces and assemble one submission-ready evidence artifact from the live Railway demo. | blocked-by:T105-1 | no | Evidence artifact contains the worker-generated proactive trace and approval-preview trace plus the public demo proof targets |
| T105-3 | Update `docs/assignments/fleetgraph/FLEETGRAPH.md`, related assignment guidance, and memory/docs so the Tuesday checklist is fully evidenced. | blocked-by:T105-2 | yes | Workbook and supporting docs no longer contain `Pending T105` placeholders and point to the captured evidence |

## TDD Mapping
- [ ] test_entry_accepts_nullable_ticket_numbers_from_live_context_payload
- [ ] test_evidence_artifact_includes_two_distinct_trace_urls
- [ ] test_workbook_no_longer_contains_pending_t105_placeholders

## Completion Criteria
- [ ] Approval-preview trace path is unblocked for real Ship context payloads
- [ ] Two distinct shared traces are captured and recorded
- [ ] Submission workbook is fully populated for the Tuesday MVP bar
- [ ] User audit includes prod UI inspection steps for both visible FleetGraph surfaces
