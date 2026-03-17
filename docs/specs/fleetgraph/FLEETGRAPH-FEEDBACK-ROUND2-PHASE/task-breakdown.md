# Task Breakdown

## Story
- Story ID: FLEETGRAPH-FEEDBACK-ROUND2-PHASE
- Story Title: FleetGraph second live-inspection follow-on pack

## Execution Notes
- Keep the pack narrow and user-facing.
- Preserve the Ship REST-only runtime data boundary.
- Keep the public Railway demo as the main inspection surface.
- Append only non-blocking follow-ons at the tail.

## Story Pack Alignment
- Higher-level pack objectives:
  - restore natural page inspection on the named FleetGraph week pages
  - make the review/apply step safely inspectable before mutation
  - remove the screenshoted label/contrast roughness without redesigning the cards
  - refresh the live audit path for the next inspection
- Planned stories in this pack:
  - `T401` FleetGraph safe review and scroll recovery
  - `T402` FleetGraph round-two audit refresh
- Coverage check:
  - Objective 1 -> `T401`
  - Objective 2 -> `T401`
  - Objective 3 -> `T401`
  - Objective 4 -> `T402`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T401 | Fix the FleetGraph week-page scroll trap, make `Review and apply` safe against accidental confirmation, and clean up the duplicated/weak suggested-action UI. | must-have | no | Focused web tests pass, the page scrolls naturally, and the review/apply lane requires a distinct confirmation step on Railway |
| T402 | Refresh the live inspection guide, screenshots, and whole-pack checklist after the fixes ship. | blocked-by:T401 | no | The inspection path matches the deployed Railway UI and records any tail follow-ons |

## TDD Mapping

- T401 tests:
  - [x] test_fleetgraph_week_page_supports_reachable_scroll_after_panels_mount
  - [x] test_review_action_does_not_apply_from_same_click_gesture
  - [x] test_suggested_action_section_does_not_repeat_the_default_label
  - [x] test_inline_review_state_uses_stronger_readable_emphasis
- T402 tests:
  - [x] test_round_two_demo_inspection_guide_matches_current_named_targets
  - [x] test_round_two_user_audit_checklist_matches_live_ui_path

## Completion Criteria
- [x] All must-have tasks complete
- [x] Acceptance criteria mapped to completed tasks
- [x] Tests added and passing for each implemented task
- [x] The named week page no longer feels clipped or trapped on Railway
- [x] Review/apply stays inspectable before Ship mutation occurs
- [x] The screenshoted label and emphasis issues are resolved
- [x] The refreshed audit path is ready for the next user inspection
