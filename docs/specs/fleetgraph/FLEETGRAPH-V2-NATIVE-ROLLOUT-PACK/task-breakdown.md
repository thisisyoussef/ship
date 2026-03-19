# Task Breakdown

## Story
- Story ID: FLEETGRAPH-V2-NATIVE-ROLLOUT-PACK
- Story Title: FleetGraph V2 native rollout pack

## Execution Notes
- Keep Ship product reads/writes REST-only.
- Do not introduce another compatibility adapter or second persistence surface.
- Remove route-level V1 mapping as each canonical V2 contract lands; do not leave dead wrapper code behind.

## Story Pack Alignment
- Higher-level pack objectives:
  - native canonical contract cutover
  - multi-turn V2 chat parity
  - typed HITL completion
  - worker/persistence native cutover
  - rollout closeout
- Planned stories in this pack:
  - `T601` V2 contract and route cutover
  - `T602` V2 conversation-state migration
  - `T603` typed HITL and structured resume
  - `T604` worker adapter removal and persistence wiring
  - `T605` web contract migration
  - `T606` rollout/docs closeout

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T601 | Replace V1-shaped entry/analyze route mapping and V1 fallback logic with native V2 request/response schemas and OpenAPI updates. | must-have | no | Route tests assert native V2 fields and no V1 fallback path |
| T602 | Extend V2 state and reasoning to support multi-turn conversation memory and user-question-aware follow-up turns on the same thread. | blocked-by:T601 | no | Runtime/route tests prove follow-up turns persist context and answer the user question |
| T603 | Wire V2 approvals to the shared action registry and execution service with typed `dialogSpec`, structured resume payloads, and submission validation. | blocked-by:T601 | yes | Review/apply tests prove typed dialog flow, validation, and duplicate-safe apply |
| T604 | Remove the worker V1 adapter and wire V2 persistence nodes to existing findings/action-run stores. | blocked-by:T601,T603 | no | Worker/store tests prove native V2 enqueue/completion and proactive persistence |
| T605 | Update the web FleetGraph hooks/types/components to consume native V2 contracts and server-backed apply flows only. | blocked-by:T601,T602,T603 | no | Web tests prove native rendering, follow-up turns, typed dialogs, and no direct Ship mutation |
| T606 | Refresh readiness semantics, `.ai` status docs, and rollout proof/audit surfaces so the pack closes operationally. | blocked-by:T604,T605 | yes | Docs/readiness tests and artifacts match delivered runtime behavior |

## TDD Mapping
- T601 tests:
  - [ ] test_entry_route_returns_native_v2_contract_without_v1_wrapper
  - [ ] test_analyze_route_returns_native_v2_contract_without_v1_mapping
  - [ ] test_readiness_reports_default_enabled_v2_truthfully
- T602 tests:
  - [ ] test_v2_follow_up_turn_uses_user_question_and_saved_history
  - [ ] test_v2_initial_turn_and_follow_up_share_same_thread_state
  - [ ] test_missing_thread_for_turn_returns_clear_error
- T603 tests:
  - [ ] test_review_route_returns_registry_backed_dialog_spec
  - [ ] test_resume_with_invalid_submission_rejects_without_ship_write
  - [ ] test_repeat_apply_reuses_existing_outcome_without_duplicate_execution
- T604 tests:
  - [ ] test_worker_uses_native_v2_runtime_without_adapter
  - [ ] test_v2_persist_run_state_upserts_proactive_findings
  - [ ] test_v2_persist_action_outcome_updates_existing_finding_lifecycle
- T605 tests:
  - [ ] test_analysis_section_renders_native_v2_answer_and_follow_up
  - [ ] test_analysis_section_handles_typed_dialog_submissions
  - [ ] test_entry_hook_no_longer_calls_ship_endpoint_directly
- T606 tests:
  - [ ] test_single_source_of_truth_no_longer_marks_v2_rollout_in_progress
  - [ ] test_active_context_no_longer_points_to_studio_pack_as_current_task
  - [ ] test_rollout_audit_artifacts_reference_native_v2_contract

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] V1 wrappers/fallbacks removed from canonical FleetGraph surfaces
- [ ] V2 follow-up chat persists memory on thread-backed state
- [ ] Worker path is native V2 and persists results
- [ ] Web uses native V2 contracts only
- [ ] Rollout docs/status reflect completion
