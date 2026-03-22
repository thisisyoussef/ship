# Task Breakdown

## Story
- Story ID: FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE
- Story Title: FleetGraph assignment completion pack

## Execution Notes
- Finish the already-real on-demand surfaces before paying the shared proactive widening cost.
- Treat `week_start_drift` as the stable reference lane; the remaining stories should extend its patterns rather than replace them.
- Keep new proactive findings advisory-only unless an existing safe action contract can be reused without expanding mutation risk.
- Refresh the workbook and audit path only from implemented behavior, not aspirational scope.

## Story Pack Alignment
- Higher-level pack objectives:
  - finish the remaining workbook use cases in the current repo with minimal rework
  - reuse real runtime surfaces before adding new product breadth
  - close the shared proactive plumbing gap once, then land the remaining proactive cases
  - leave the assignment docs and proof artifacts fully aligned with what shipped
- Planned stories in this pack:
  - `T601` current-page approval preview completion
  - `T602` context-aware page analysis completion
  - `T603` shared proactive multi-finding plumbing
  - `T604` sprint-owner gap
  - `T605` unassigned sprint issues
  - `T606` completion evidence refresh
- Coverage check:
  - Objective 1 -> `T601`, `T602`, `T604`, `T605`
  - Objective 2 -> `T601`, `T602`, `T603`
  - Objective 3 -> `T603`, `T604`, `T605`
  - Objective 4 -> `T606`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T601 | Complete and evidence the current-page approval preview path on the FleetGraph entry surface, including correct approval-required state, visible controls, and a refreshed trace/evidence path. | must-have | no | Entry/API/web tests prove approval preview works on supported page contexts and the visible Ship surface matches the workbook use case |
| T602 | Complete the context-aware page-analysis use case by wiring the follow-up turn message into the graph, preserving thread continuity, and tightening the chosen visible analysis surface. | blocked-by:T601 | no | Analyze + follow-up tests pass and the chosen FleetGraph analysis surface can answer an initial page question and a real follow-up |
| T603 | Generalize proactive finding persistence and UI from `week_start_drift` only to shared multi-finding support. | blocked-by:T602 | no | DB/store/route/web contracts accept and render multiple proactive finding types without week-start-only assumptions |
| T604 | Ship `sprint_no_owner` end to end on the widened proactive surface with evidence, dismiss/snooze lifecycle, and trace capture. | blocked-by:T603 | no | Runtime/store/web tests prove sprint-owner gaps surface as real proactive findings and can be inspected in Ship |
| T605 | Ship `unassigned_sprint_issues` end to end on the widened proactive surface with evidence, dismiss/snooze lifecycle, and trace capture. | blocked-by:T604 | no | Runtime/store/web tests prove unassigned sprint-issue clusters surface as real proactive findings and can be inspected in Ship |
| T606 | Refresh workbook wording, README references, traces, screenshots/checklists, and the final user-audit path for all five workbook use cases. | blocked-by:T605 | yes | Assignment docs, trace references, and the pack-level audit checklist all match the visible completed FleetGraph surfaces |

## TDD Mapping

- T601 tests:
  - [ ] test_entry_preview_returns_approval_required_for_supported_current_page_actions
  - [ ] test_entry_card_renders_current_page_approval_preview_controls
  - [ ] test_approval_preview_trace_or_debug_path_is_recorded_for_assignment_evidence
- T602 tests:
  - [ ] test_thread_turn_passes_user_message_into_runtime
  - [ ] test_follow_up_turn_updates_analysis_text_in_same_thread
  - [ ] test_canonical_analysis_surface_handles_initial_and_follow_up_questions
- T603 tests:
  - [ ] test_fleetgraph_findings_store_accepts_multiple_finding_types
  - [ ] test_fleetgraph_findings_route_serializes_multi_type_results
  - [ ] test_findings_panel_and_presenter_render_without_week_start_only_copy
- T604 tests:
  - [ ] test_sprint_no_owner_candidate_surfaces_one_proactive_finding
  - [ ] test_duplicate_sprint_no_owner_respects_existing_active_finding_rules
  - [ ] test_visible_fleetgraph_surface_renders_sprint_owner_gap_finding
- T605 tests:
  - [ ] test_unassigned_sprint_issues_candidate_surfaces_one_proactive_finding
  - [ ] test_duplicate_unassigned_issue_cluster_respects_existing_active_finding_rules
  - [ ] test_visible_fleetgraph_surface_renders_unassigned_issue_cluster_finding
- T606 tests:
  - [ ] test_fleetgraph_workbook_and_readme_reference_completed_use_case_pack
  - [ ] test_completion_audit_checklist_covers_all_five_workbook_use_cases
  - [ ] test_refreshed_trace_links_or_blocked_state_are_recorded_truthfully

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] The remaining workbook use cases are mapped to implemented stories rather than planned placeholders
- [ ] Shared proactive multi-finding plumbing is complete before the proactive use-case stories are considered done
- [ ] Tests added and passing for each implemented story
- [ ] Workbook, README, traces, and audit steps all tell the same truth about the finished FleetGraph assignment slice

## Post-Pack Follow-On
- Defer cross-system finding prioritization until after the workbook use cases are complete and evidenced.
- Revisit deferred wishlist cases only after this pack lands:
  - missing standups as a FleetGraph-specific proactive lane
  - deadline risk
  - workload imbalance
