# Task Breakdown

## Story
- Story ID: FLEETGRAPH-ON-DEMAND-ACTION-FLOW-V1
- Story Title: FleetGraph on-demand action flow v1

## Execution Notes
- Keep proactive findings and V2 runtime unchanged.
- Do not introduce free-form dialog schemas in this story.
- Route all supported on-demand actions through FleetGraph-owned review/apply endpoints.

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T001 | Define the typed on-demand action draft/review contracts and update analyze/turn runtime state to carry supported action ids. | must-have | no | API and runtime tests prove supported actions serialize with stable action ids and unsupported actions do not |
| T002 | Implement FleetGraph review/apply endpoints for on-demand thread actions using same-origin request context forwarding. | blocked-by:T001 | no | Route tests prove review/apply success, invalid action rejection, workspace validation, and idempotent apply behavior |
| T003 | Update the on-demand reasoning prompt/sanitization so only `start_week`, `approve_week_plan`, and `approve_project_plan` become executable actions. | blocked-by:T001 | yes | Reason-node tests prove supported-path promotion and advisory-only abstention for unsupported cases |
| T004 | Rewire the FAB analysis hook/component to use FleetGraph review/apply endpoints and a controlled confirm dialog. | blocked-by:T002,T003 | no | Web tests prove dialog open/cancel/apply behavior and truthful error handling |

## TDD Mapping

- T001 tests:
  - [ ] test_supported_on_demand_actions_receive_stable_action_ids
  - [ ] test_analyze_response_omits_executable_action_for_unsupported_suggestion
- T002 tests:
  - [ ] test_thread_action_review_returns_server_backed_payload
  - [ ] test_thread_action_apply_forwards_ship_request_context
  - [ ] test_thread_action_apply_rejects_stale_or_unknown_action
- T003 tests:
  - [ ] test_reason_node_keeps_start_week_as_supported_action
  - [ ] test_reason_node_maps_project_and_week_approvals_to_supported_actions
  - [ ] test_reason_node_downgrades_stagnation_engagement_action_to_advisory_only
- T004 tests:
  - [ ] test_analysis_section_opens_confirm_dialog_for_supported_action
  - [ ] test_analysis_section_cancel_does_not_apply
  - [ ] test_analysis_section_apply_uses_fleetgraph_endpoint_and_surfaces_failures

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] On-demand browser code no longer calls Ship mutation routes directly
- [ ] Unsupported action ideas remain advisory-only
