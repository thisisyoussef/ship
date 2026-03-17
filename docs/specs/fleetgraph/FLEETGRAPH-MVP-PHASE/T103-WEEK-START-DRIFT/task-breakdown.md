# Task Breakdown

## Story
- Story ID: T103
- Story Title: Implement proactive week-start drift detection and visible finding surface

## Execution Notes
- Keep the proactive slice narrow: week-start drift only.
- Reuse the existing worker/runtime/tracing substrate instead of inventing a second proactive path.
- Do not execute the real `start week` mutation in this story.

## Story Pack Alignment (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - satisfy the Tuesday proactive-detection MVP bar
  - keep the implementation on real Ship data
  - preserve a clean follow-on HITL action story
- Planned stories in this pack:
  - `T101` submission-contract docs
  - `T102` public deploy and real-data baseline
  - `T103` proactive week-start drift slice
  - `T104` real HITL execution path
  - `T105` trace capture and final evidence
- Why this story set is cohesive:
  - each story directly closes one or more explicit Tuesday requirements without drifting into breadth-first FleetGraph work
- Coverage check: which objective each story advances:
  - Objective 1 -> `T101`, `T102`, `T103`, `T104`, `T105`
  - Objective 2 -> `T102`, `T103`, `T104`
  - Objective 3 -> `T103`, `T104`, `T105`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T103-1 | Add durable proactive finding contracts and storage for active/dismissed/snoozed FleetGraph findings. | must-have | no | DB-backed tests prove finding records can be created and lifecycle state persists |
| T103-2 | Implement week-start drift candidate selection on real normalized Ship week/workspace data and thread it through the proactive runtime path. | blocked-by:T103-1 | no | Tests prove quiet vs surfaced-finding routing from real-route-shaped inputs |
| T103-3 | Surface active proactive findings through a Ship-visible same-origin FleetGraph UI/API path. | blocked-by:T103-1,T103-2 | no | Manual/UI tests show the week-start drift finding is visible and understandable in Ship |
| T103-4 | Add dismiss and snooze lifecycle actions that suppress duplicate surfaced findings during cooldown windows. | blocked-by:T103-1,T103-2,T103-3 | no | Repeated runs plus lifecycle action tests prove no duplicate visible findings within cooldown/snooze windows |
| T103-5 | Capture local story evidence and update FleetGraph docs/memory for the proactive MVP slice. | blocked-by:T103-1,T103-2,T103-3,T103-4 | yes | Handoff can point to visible proactive proof, tests, and the next-step boundary with `T104` |

## TDD Mapping

For each task, list associated tests first:

- T103-1 tests:
  - [ ] test_proactive_finding_record_persists_status_and_trace_metadata
  - [ ] test_proactive_finding_lifecycle_transitions_validate_allowed_states
- T103-2 tests:
  - [ ] test_week_start_drift_candidate_surfaces_one_proactive_finding
  - [ ] test_clean_or_pre_threshold_week_stays_quiet
  - [ ] test_sparse_week_context_does_not_false_positive
- T103-3 tests:
  - [ ] test_visible_fleetgraph_surface_renders_active_week_start_drift_finding
  - [ ] test_visible_surface_handles_quiet_state_without_noise
- T103-4 tests:
  - [ ] test_duplicate_week_start_drift_respects_cooldown
  - [ ] test_dismissed_finding_stays_suppressed_until_reopened
  - [ ] test_snoozed_finding_returns_only_after_snooze_expiry
- T103-5 tests:
  - [ ] test_story_evidence_records_visible_proactive_surface_and_real_data_path

## Completion Criteria
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Durable proactive finding contract implemented
- [ ] Week-start drift runs end to end through the proactive path
- [ ] Visible proactive finding exists in Ship
- [ ] Dismiss/snooze plus cooldown behavior tested and working
- [ ] Deferred follow-on work for `T104` documented explicitly
