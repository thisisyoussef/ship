# Task Breakdown

## Story
- Story ID: T104B
- Story Title: Railway worker deployment lane

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T104B-1 | Add a shared runtime-role boot path so the same Railway image can start either the Ship API service or the FleetGraph worker service. | must-have | no | Local tests and build output prove API and worker roles boot through the intended commands |
| T104B-2 | Extend demo seed/bootstrap so one named lane stays seeded for HITL inspection and a second named lane is reserved for worker-generated findings with due sweep work registered. | blocked-by:T104B-1 | no | Integration tests prove the worker lane starts clean and is ready for live worker generation |
| T104B-3 | Extend the Railway deploy script and docs to deploy/verify both services and confirm the worker-generated proof lane on the public demo. | blocked-by:T104B-2 | no | Deploy smoke verifies the seeded lane, worker-ready status, and worker-generated finding lane |

## TDD Mapping
- [ ] test_runtime_role_selects_api_or_worker_boot_path
- [ ] test_demo_seed_preserves_hitl_lane_and_registers_worker_lane
- [ ] test_railway_demo_smoke_verifies_worker_generated_lane

## Completion Criteria
- [ ] Railway demo uses separate API and worker lanes from the same repo-owned image
- [ ] Seeded HITL lane remains intact
- [ ] Worker-generated proactive lane is named and inspectable
- [ ] Deploy smoke verifies both lanes
