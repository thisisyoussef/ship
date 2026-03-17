# Task Breakdown

## Story
- Story ID: FLEETGRAPH-MVP-PHASE
- Story Title: FleetGraph MVP execution pack

## Execution Notes
- Keep tasks small and verifiable.
- Lock the Tuesday checklist items that live in `FLEETGRAPH.md` before starting implementation-heavy stories.
- Build on the merged FleetGraph readiness baseline before starting MVP feature stories.
- Prefer one narrow, complete proactive slice over multiple partial feature surfaces.
- Establish or extend the visible Ship-facing UI proof surface early in each runtime story so progress can be monitored on the public demo as stories land.
- Do not put broader on-demand expansion on the Tuesday critical path unless it becomes necessary to satisfy an explicit pass item.

## Story Pack Alignment (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - Satisfy every Tuesday MVP pass requirement exactly.
  - Deliver one proactive end-to-end FleetGraph slice on real Ship data.
  - Deliver one real HITL action path plus public deploy/trace/docs evidence.
  - Keep the MVP visually inspectable from Ship as each runtime story lands.
- Planned stories in this pack:
  - `T101` submission-contract docs
  - `T102` public deploy and real-data baseline
  - `T103` proactive week-start drift slice
  - `T104` real HITL execution path
  - `T104A` demo proof seed and bootstrap repair
  - `T104B` Railway worker deployment lane
  - `T105` trace capture and final submission evidence
- Why this story set is cohesive:
  - every story advances one or more explicit Tuesday pass items directly and avoids non-required breadth.
- Coverage check: which objective each story advances:
  - Objective 1 -> `T101`, `T102`, `T103`, `T104`, `T104A`, `T104B`, `T105`
  - Objective 2 -> `T102`, `T103`, `T104`, `T104B`
  - Objective 3 -> `T102`, `T104`, `T104A`, `T104B`, `T105`
  - Objective 4 -> `T103`, `T104`, `T104A`, `T104B`, `T105`

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T101 | Complete the required `FLEETGRAPH.md` planning sections up front: Agent Responsibility, at least 5 use cases, trigger model decision/defense, and graph outline with node types, edges, and branching conditions. | must-have | no | `FLEETGRAPH.md` contains the required Tuesday sections and stops being a placeholder for the design-defining content |
| T102 | Validate and fix the public deploy and real-data baseline on top of the merged FleetGraph readiness contract, including the current public-demo blocker and any required real-data auth/config path. | blocked-by:T101 | no | The MVP runtime is either publicly reachable on the sanctioned surface or recorded as explicitly `blocked` with the exact missing prerequisite |
| T103 | Implement the proactive MVP slice for week-start drift from hybrid trigger to surfaced finding, including dedupe/cooldown behavior and the first visible Ship-facing output on real Ship data. | blocked-by:T102 | no | Integration tests prove trigger -> reasoning -> surfaced finding on real-data code paths, and manual/demo proof shows the finding is visible and actionable |
| T104 | Extend the visible FleetGraph surface first, then turn the MVP path into one real human-confirmed action with duplicate-execution protection, approval UX, and result handling. | blocked-by:T103 | no | Tests prove confirm/deny behavior, one-time execution, and real HITL gating for the chosen action, with the result visible in Ship |
| T104A | Repair the public demo proof lane: move the sanctioned FleetGraph demo to Railway, seed named Ship inspection targets plus a repeatable visible finding/apply state, and strengthen deploy proof beyond `/health`. | blocked-by:T104 | no | The public demo can log in with the demo user, open a named FleetGraph demo week, and see a visible proactive finding with the HITL apply path ready for UI inspection |
| T104B | Deploy a dedicated Railway worker lane, preserve the seeded HITL proof lane, and expose a second named week whose finding is produced by the live worker path on real Ship data. | blocked-by:T104A | no | The public demo reaches worker-ready status, and a named worker-generated FleetGraph finding appears through the deployed proactive path rather than direct seed insertion |
| T105 | Capture the Tuesday evidence set from the visible deployed MVP path: at least two shared traces with different execution paths, public deploy proof, final `FLEETGRAPH.md` evidence sections, and submission-ready links/screenshots/checklists. | blocked-by:T104B | yes | Trace URLs, deploy status, visible UI proof, and final workbook evidence are all recorded in the story handoff and assignment docs |

## TDD Mapping

For each task, list associated tests first:

- T101 tests:
  - [ ] test_fleetgraph_md_contains_agent_responsibility_section
  - [ ] test_fleetgraph_md_lists_at_least_five_use_cases
  - [ ] test_fleetgraph_md_documents_trigger_model_and_graph_outline
- T102 tests:
  - [ ] test_readiness_contract_requires_api_worker_and_trace_settings
  - [ ] test_readiness_route_rejects_invalid_service_auth
  - [ ] test_public_demo_path_is_deployable_or_explicitly_blocked
- T103 tests:
  - [ ] test_week_start_drift_candidate_surfaces_one_proactive_finding
  - [ ] test_duplicate_week_start_drift_respects_cooldown
  - [ ] test_proactive_finding_surface_can_dismiss_or_snooze
- T104 tests:
  - [ ] test_recommendation_requires_explicit_approval_before_ship_write
  - [ ] test_approved_action_executes_once_and_records_result
  - [ ] test_denied_or_timed_out_action_leaves_ship_state_unchanged
- T104A tests:
  - [ ] test_railway_demo_bootstrap_applies_fleetgraph_schema_on_demo_hosts
  - [ ] test_seed_creates_named_fleetgraph_demo_week_and_visible_finding
  - [ ] test_railway_demo_deploy_smoke_verifies_demo_login_and_fleetgraph_surface
- T104B tests:
  - [ ] test_worker_role_boots_fleetgraph_worker_on_railway
  - [ ] test_seed_registers_named_worker_demo_target_without_direct_finding_insert
  - [ ] test_railway_demo_smoke_waits_for_worker_generated_finding
- T105 tests:
  - [ ] test_trace_capture_includes_distinct_execution_paths
  - [ ] test_demo_or_blocked_deploy_status_is_recorded_with_evidence
  - [ ] test_fleetgraph_md_final_submission_sections_reference_trace_and_deploy_evidence

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] Trace/demo/workbook evidence captured, not implied
- [ ] Every Tuesday MVP pass item has a concrete artifact or proof link
- [ ] The public demo includes at least one named FleetGraph inspection target that future user audits can open directly
- [ ] Deferred post-MVP use cases documented with rationale

## Post-Pack QA Follow-Ons
- The first feedback implementation pack for shipped MVP audit findings lives in `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-PHASE/`.
- The second live-inspection follow-on pack lives in `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/`.
- Current verified user-audit findings feeding that pack:
  - FleetGraph demo week pages are not discoverable from standard documents navigation.
  - The affected FleetGraph week page can become non-scrollable on the public demo.
