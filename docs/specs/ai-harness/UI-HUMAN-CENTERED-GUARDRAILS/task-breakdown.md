# Task Breakdown

## Story
- Story ID: UI-HUMAN-CENTERED-GUARDRAILS
- Story Title: Add human-centered UI workflow guardrails and pack-level QA artifacts

## Execution Notes
- Keep the workflow addition minimal.
- Preserve the current story-level UI audit behavior.
- Do not auto-create implementation packs from critic findings.
- Keep the first checklist grounded in the live FleetGraph MVP demo.

## Story Pack Alignment
- Higher-level pack objectives:
  - add one post-UI critic path
  - make human-centered UI checks explicit
  - add one pack-level audit artifact rule
  - publish the FleetGraph MVP pack checklist
- Planned stories in this pack:
  - `T001` add the human-centered UI QA critic workflow
  - `T002` wire the workflow into startup, feature, spec, handoff, and prompt-brief surfaces
  - `T003` add the FleetGraph MVP pack-level user audit checklist artifact
- Why this story set is cohesive:
  - it adds the reusable workflow and immediately proves it on the completed FleetGraph MVP pack
- Coverage check:
  - Objective 1 -> `T001`
  - Objective 2 -> `T001`, `T002`
  - Objective 3 -> `T002`, `T003`
  - Objective 4 -> `T003`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T001 | Add a post-UI QA critic workflow that explicitly checks human-centered copy, truthful feedback, debug-detail containment, and modest visual polish. | must-have | no | `bash scripts/check_ai_wiring.sh` |
| T002 | Wire the new workflow into startup/feature/spec/handoff/prompt-brief surfaces and enforce it in the AI wiring audit. | blocked-by:T001 | no | `bash scripts/check_ai_wiring.sh` and `python3 scripts/verify_agent_contract.py` |
| T003 | Add the FleetGraph MVP pack-level `user-audit-checklist.md` artifact and align it to the current public Railway demo QA path. | blocked-by:T002 | no | checklist doc exists and references the live public demo flow |

## TDD Mapping

- T001 tests:
  - [ ] test_ui_qa_critic_workflow_checks_human_centered_copy_and_feedback_truth
  - [ ] test_ui_qa_critic_workflow_limits_follow_on_stories_to_tail_suggestions
- T002 tests:
  - [ ] test_core_harness_files_reference_ui_qa_critic_workflow
  - [ ] test_ui_prompt_brief_template_captures_copy_feedback_and_diagnostic_policy
  - [ ] test_ai_wiring_audit_enforces_ui_qa_critic_contract
- T003 tests:
  - [ ] test_fleetgraph_mvp_pack_has_user_audit_checklist_artifact
  - [ ] test_pack_level_checklist_uses_visible_routes_interactions_and_expected_states

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] Deferred tasks documented with rationale
