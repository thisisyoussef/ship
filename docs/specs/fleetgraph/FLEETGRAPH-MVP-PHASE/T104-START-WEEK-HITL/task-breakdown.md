# Task Breakdown

## Story
- Story ID: T104
- Story Title: Execute the real week-start action through a human-in-the-loop FleetGraph gate

## Execution Notes
- Reuse the `T103` visible findings panel as the proof lane.
- Execute `start_week` through the existing Ship REST route only.
- Keep the action scope to one finding/action pair.

## Story Pack Alignment (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - satisfy the Tuesday HITL pass item
  - preserve the visible Ship proof lane
  - leave `T105` as an evidence-capture story, not a product-completion scramble
- Planned stories in this pack:
  - `T101` submission-contract docs
  - `T102` public deploy and real-data baseline
  - `T103` proactive week-start drift slice
  - `T104` real HITL execution path
  - `T105` trace capture and final submission evidence

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T104-1 | Add FleetGraph-owned durable execution state for one finding/action pair with duplicate suppression. | must-have | no | Tests prove one finding cannot execute the same apply path twice |
| T104-2 | Add the same-origin FleetGraph apply route that validates the finding and executes `POST /api/weeks/:id/start` through the existing Ship REST contract. | blocked-by:T104-1 | no | Route tests prove apply success, already-started handling, and no direct Ship SQL path inside FleetGraph |
| T104-3 | Extend the visible findings panel with review/apply/result states and mutation refresh behavior. | blocked-by:T104-1,T104-2 | no | UI tests prove apply/reject/result rendering on the document page |
| T104-4 | Sync docs/memory and capture the visible proof path for the eventual Render audit. | blocked-by:T104-1,T104-2,T104-3 | yes | Completion gate can point to visible Ship behavior and the exact T105 evidence follow-up |

## TDD Mapping

- T104-1 tests:
  - [ ] test_finding_action_execution_is_persisted_once
  - [ ] test_duplicate_apply_is_suppressed_durably
- T104-2 tests:
  - [ ] test_apply_requires_explicit_user_request_before_week_start_executes
  - [ ] test_apply_returns_already_started_when_week_is_not_planning_anymore
  - [ ] test_apply_rejects_findings_without_start_week_action
- T104-3 tests:
  - [ ] test_findings_panel_renders_review_and_apply_controls
  - [ ] test_findings_panel_shows_success_notice_after_apply
  - [ ] test_findings_panel_shows_failure_notice_without_hiding_the_finding
- T104-4 tests:
  - [ ] test_story_handoff_can_point_to_visible_apply_result_surface

## Completion Criteria
- [ ] Acceptance criteria mapped to completed tasks
- [ ] One real `start_week` HITL path works from the visible document-page FleetGraph surface
- [ ] Duplicate execution protection is durable
- [ ] Success/failure/reject states are visible and tested
- [ ] Deferred `T105` evidence capture boundary is documented clearly
