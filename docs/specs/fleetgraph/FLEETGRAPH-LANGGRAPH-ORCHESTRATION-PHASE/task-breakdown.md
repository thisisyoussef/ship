# Task Breakdown

## Story
- Story ID: FLEETGRAPH-LANGGRAPH-ORCHESTRATION-PHASE
- Story Title: FleetGraph LangGraph orchestration pack

## Execution Notes
- Keep the Ship REST-only product data boundary intact.
- Do not replace the existing worker queue/sweep substrate.
- Keep the current visible FleetGraph proof lane alive while moving orchestration into the graph.
- Prefer one complete graph transformation of the existing week-start proof lane over partial support for multiple new scenarios.

## Story Pack Alignment
- Higher-level pack objectives:
  - move real FleetGraph orchestration into LangGraph nodes and subgraphs
  - make approvals resumable through durable checkpoints
  - expose graph history for debugging and QA
  - preserve existing MVP proof-lane behavior while improving architecture
- Planned stories in this pack:
  - `T501` durable checkpoint seam
  - `T502` proactive scenario node migration
  - `T503` on-demand scenario routing migration
  - `T504` interrupt/resume action execution
  - `T505` checkpoint debug surfacing
  - `T506` proof/docs refresh
- Why this story set is cohesive:
  - each task removes one layer of service-side orchestration and replaces it with graph-owned behavior, ending in visible proof and updated docs.
- Coverage check:
  - Objective 1 -> `T501`, `T502`, `T503`, `T504`
  - Objective 2 -> `T501`, `T504`
  - Objective 3 -> `T502`, `T503`, `T504`
  - Objective 4 -> `T505`, `T506`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T501 | Add the durable LangGraph checkpointer seam with production Postgres support and test-time memory injection. | must-have | no | Runtime tests prove memory injection still works and production/runtime can build a Postgres-backed saver |
| T502 | Move proactive week-start drift orchestration into graph tasks/nodes/subgraphs, including scenario selection, merge, rank, and finding persistence. | blocked-by:T501 | no | Proactive runtime tests prove the graph, not the service shell, selects and persists the current proof-lane finding |
| T503 | Move on-demand entry routing into graph-driven scenario selection so quiet/advisory/action outcomes come from graph facts rather than hardcoded service assumptions. | blocked-by:T501 | yes | Entry/runtime tests prove on-demand quiet/advisory/action branching from graph state |
| T504 | Replace the preview-only start-week approval path with real interrupt/resume execution and duplicate-safe Ship REST action tasks. | blocked-by:T502,T503 | no | Action and route tests prove review initializes an interrupt, approve resumes once, and dismiss skips Ship mutation |
| T505 | Surface checkpoint history and pending interrupts through FleetGraph debug APIs and the existing debug dock. | blocked-by:T504 | no | Route/UI tests prove checkpoint history is readable from the page-level debug surface |
| T506 | Refresh `FLEETGRAPH.md`, assignment/docs evidence, and the user audit path to match the implemented graph shape and debug/resume flow. | blocked-by:T505 | no | Workbook, inspection guide, and story handoff reflect the new graph path with concrete proof artifacts |

## TDD Mapping

- T501 tests:
  - [ ] test_runtime_uses_memory_saver_when_injected
  - [ ] test_runtime_can_build_postgres_checkpointer_in_production_context
  - [ ] test_route_tests_do_not_boot_postgres_saver_by_accident
- T502 tests:
  - [ ] test_proactive_graph_selects_week_start_scenario_and_persists_finding
  - [ ] test_proactive_graph_quiet_path_skips_llm_and_persist
  - [ ] test_scenario_results_merge_and_rank_before_branch_selection
- T503 tests:
  - [ ] test_on_demand_entry_can_exit_quiet_when_no_candidate_exists
  - [ ] test_on_demand_entry_returns_advisory_when_scenario_evidence_exists
  - [ ] test_on_demand_entry_returns_action_branch_when_reviewable_action_exists
- T504 tests:
  - [ ] test_review_route_creates_pending_interrupt_without_ship_write
  - [ ] test_apply_route_resumes_approved_once_without_duplicate_execution
  - [ ] test_dismissed_resume_records_non_execution_outcome
- T505 tests:
  - [ ] test_debug_route_returns_checkpoint_history_for_thread
  - [ ] test_debug_route_returns_pending_interrupt_summary
  - [ ] test_debug_dock_renders_checkpoint_entries_as_secondary_detail
- T506 tests:
  - [ ] test_fleetgraph_md_graph_outline_matches_runtime_shape
  - [ ] test_demo_inspection_guide_includes_debug_and_resume_checks
  - [ ] test_handoff_checklist_includes_ui_debug_inspection_steps

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] Ship product data remains REST-only
- [ ] Current FleetGraph proof-lane behavior remains inspectable on the sanctioned demo
- [ ] Checkpoint/debug history is visible from a secondary QA surface
- [ ] Docs and audit paths match the implemented graph, not the pre-refactor shell
