# Task Breakdown

## Story
- Story ID: FLEETGRAPH-POLISH-PHASE
- Story Title: FleetGraph remaining UI polish pack

## Execution Notes
- Keep the pack narrow and product-facing.
- Preserve the Ship REST-only runtime boundary; this pack is UI polish, not a new data-source or graph-capability sequence.
- Refresh the Railway demo after each shipped runtime story so prod remains the primary inspection surface.
- Keep one tail slot for QA critic follow-ons instead of letting polish sprawl indefinitely.

## Story Pack Alignment (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - Improve the remaining human-facing FleetGraph language.
  - Provide a better optional debug surface for QA.
  - Add modest visual hierarchy and calm without redesigning Ship.
  - End with a current prod QA pass and updated checklist.
- Planned stories in this pack:
  - `T301` FleetGraph human-language summary polish
  - `T302` FleetGraph debug-console surface
  - `T303` FleetGraph light visual hierarchy polish
  - `T304` FleetGraph polish QA refresh
- Why this story set is cohesive:
  - it closes the remaining live UI roughness surfaced after the feedback pack without reopening navigation, scrolling, or the REST/runtime boundaries.
- Coverage check: which objective each story advances:
  - Objective 1 -> `T301`
  - Objective 2 -> `T302`
  - Objective 3 -> `T303`
  - Objective 4 -> `T304`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T301 | Rewrite the remaining awkward approval-preview and proactive summary copy so the FleetGraph UI speaks clearly to a human reviewer while preserving meaning. | must-have | no | The review/apply lane and approval-preview lane use natural language on the public Railway demo and focused UI tests pass |
| T302 | Add a small persistent debug surface for FleetGraph pages so QA can inspect technical details without putting them back into the main cards. | blocked-by:T301 | no | A clearly secondary debug surface is visible and usable on the named FleetGraph demo pages |
| T303 | Apply modest visual hierarchy polish to the FleetGraph cards: calmer evidence layout, clearer section rhythm, and better action grouping without redesigning the page. | blocked-by:T302 | no | The FleetGraph surfaces feel calmer and easier to scan on the live demo and the focused UI regression tests pass |
| T304 | Refresh the live demo inspection guide, polish-pack audit checklist, screenshots, and regression notes after the polish ships. | blocked-by:T303 | no | The whole-pack prod QA path matches the polished live UI and records any remaining non-blocking follow-ons |

## TDD Mapping

For each task, list associated tests first:

- T301 tests:
  - [x] test_entry_approval_preview_uses_human_language_summary
  - [x] test_worker_generated_finding_summary_stays_clear_without_system_jargon
  - [x] test_primary_copy_preserves_meaning_while_removing_awkward_phrasing
- T302 tests:
  - [x] test_debug_console_surfaces_secondary_fleetgraph_details_without_replacing_main_copy
  - [x] test_debug_console_is_keyboard_reachable_and_dismissible
  - [x] test_debug_console_handles_missing_optional_fields_cleanly
- T303 tests:
  - [x] test_fleetgraph_cards_group_evidence_and_actions_with_clearer_hierarchy
  - [x] test_visual_polish_preserves_existing_action_behavior
  - [x] test_dismiss_and_snooze_remain_truthful_regression_checks
- T304 tests:
  - [ ] test_polish_demo_inspection_guide_matches_current_named_targets
  - [ ] test_polish_pack_user_audit_checklist_matches_live_ui_path
  - [ ] test_follow_on_feedback_items_append_at_tail_not_mid_sequence

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] Approval-preview language feels natural and non-technical on prod
- [ ] Technical FleetGraph details are easy to inspect without dominating the main UI
- [ ] The visible FleetGraph cards are modestly calmer and easier to scan
- [ ] The public Railway demo remains the inspection surface after each story
- [ ] The refreshed pack-level audit checklist is ready for the next user pass
