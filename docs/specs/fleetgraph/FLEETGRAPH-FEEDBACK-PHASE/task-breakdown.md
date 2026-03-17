# Task Breakdown

## Story
- Story ID: FLEETGRAPH-FEEDBACK-PHASE
- Story Title: FleetGraph post-MVP feedback implementation pack

## Execution Notes
- Keep tasks small and visibly testable on the public Railway demo.
- Fix normal navigation reachability before expanding more FleetGraph behavior.
- Preserve the Ship REST-only runtime boundary; this pack is UI/navigation/usability work, not a data-source change.
- End the pack with a refreshed whole-pack UI audit path so the next feedback round can start immediately.

## Story Pack Alignment (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - Make the FleetGraph MVP proof lanes discoverable from standard UI navigation.
  - Make the affected week pages comfortably usable for live prod QA.
  - Make the visible FleetGraph surface more trustworthy and human-centered without a redesign.
  - Refresh the pack-level UI audit path after the fixes land.
- Planned stories in this pack:
  - `T201` FleetGraph proof-lane discoverability
  - `T202` FleetGraph week-page scroll recovery
  - `T203` FleetGraph action-state trust and human-facing copy cleanup
  - `T204` FleetGraph QA refresh and feedback tail capture
- Why this story set is cohesive:
  - it addresses the first real live-audit failures in the shipped MVP slice without changing FleetGraph’s core intelligence or data boundary.
- Coverage check: which objective each story advances:
  - Objective 1 -> `T201`
  - Objective 2 -> `T202`
  - Objective 3 -> `T203`
  - Objective 4 -> `T204`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T201 | Make the named FleetGraph week proof lanes discoverable from standard Ship navigation and document-list surfaces, with clear rows/labels so they are no longer popup-only targets. | must-have | no | A user can reach the named FleetGraph review/apply and worker-generated weeks from normal navigation on the public demo |
| T202 | Fix the document-page scroll/layout trap on the FleetGraph week pages so the proactive and entry surfaces do not clip the main page in the deployed UI. | blocked-by:T201 | no | The named FleetGraph week pages scroll normally on the public demo and the UI regression test coverage passes |
| T203 | Make the FleetGraph surface more trustworthy and human-centered: ground dismiss/snooze feedback in actual mutation outcomes, replace primary-surface technical jargon, move debug details behind an optional diagnostic affordance, and add modest visual hierarchy/polish. | blocked-by:T202 | no | The main FleetGraph panels no longer lead with endpoint/thread jargon, dismiss/snooze feedback matches actual mutation results, and the UI reads as calmer and more human without a redesign |
| T204 | Refresh the FleetGraph demo inspection guide, pack-level user audit checklist, and any screenshot/proof artifacts after the fixes land; append any non-blocking QA critic follow-ons at the tail of the next sequence. | blocked-by:T203 | no | The whole-pack UI audit path matches the new live behavior and captures any tail follow-ons cleanly |

## TDD Mapping

For each task, list associated tests first:

- T201 tests:
  - [x] test_docs_navigation_surfaces_named_fleetgraph_week_rows
  - [x] test_documents_list_includes_fleetgraph_demo_weeks_through_standard_ui_path
  - [x] test_navigation_keeps_existing_visibility_rules
- T202 tests:
  - [ ] test_week_document_page_scroll_container_remains_reachable_with_fleetgraph_panels
  - [ ] test_seeded_review_apply_week_page_renders_without_scroll_trap
  - [ ] test_worker_generated_week_page_renders_without_scroll_trap
- T203 tests:
  - [ ] test_dismiss_and_snooze_success_copy_waits_for_confirmed_mutation_success
  - [ ] test_primary_fleetgraph_ui_hides_endpoint_and_thread_details_by_default
  - [ ] test_fleetgraph_panels_use_human_friendly_action_copy
- T204 tests:
  - [ ] test_demo_inspection_guide_matches_current_named_targets
  - [ ] test_pack_level_user_audit_checklist_matches_live_ui_path
  - [ ] test_follow_on_feedback_items_append_at_tail_not_mid_sequence

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] The public Railway demo supports normal navigation to the named FleetGraph proof lanes
- [ ] The affected FleetGraph week pages are comfortably scrollable in prod
- [ ] The main FleetGraph UI no longer exposes technical route/thread details by default
- [ ] Dismiss and snooze feedback reflects actual outcome instead of optimistic local success text
- [ ] The refreshed pack-level UI audit checklist is ready for the next feedback round
