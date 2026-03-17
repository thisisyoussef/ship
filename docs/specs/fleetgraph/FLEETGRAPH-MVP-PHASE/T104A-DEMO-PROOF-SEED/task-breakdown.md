# Task Breakdown

## Story
- Story ID: T104A
- Story Title: Demo proof seed and bootstrap repair

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T104A-1 | Add a Railway demo bootstrap path that ensures FleetGraph-owned schema and demo seed state exist on the sanctioned demo host. | must-have | no | Local tests prove demo bootstrap detection and seed orchestration |
| T104A-2 | Seed one named FleetGraph demo proof lane with a visible proactive finding and resettable HITL state. | blocked-by:T104A-1 | no | Local integration tests prove the named demo week and visible FleetGraph finding are created idempotently |
| T104A-3 | Strengthen the Railway deploy smoke and inspection docs so future audits can verify the demo proof lane directly. | blocked-by:T104A-2 | yes | Deploy smoke checks authenticated FleetGraph behavior and docs list the exact inspection target |

## TDD Mapping
- [ ] test_railway_demo_bootstrap_applies_fleetgraph_seed_on_demo_hosts
- [ ] test_seed_creates_named_fleetgraph_demo_week_and_visible_finding
- [ ] test_railway_demo_deploy_smoke_verifies_demo_login_and_fleetgraph_surface

## Completion Criteria
- [ ] Named demo inspection target exists
- [ ] Visible proactive + HITL proof state is repeatable
- [ ] Deploy smoke checks more than `/health`
