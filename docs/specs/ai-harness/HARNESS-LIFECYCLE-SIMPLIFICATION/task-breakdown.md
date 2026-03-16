# Task Breakdown

## Story
- Story ID: AI-HARNESS-LIFECYCLE-SIMPLIFICATION
- Story Title: Simplify harness lifecycle, finalization, and recovery paths

## Execution Notes
- Keep tasks small and verifiable.
- Mark dependencies explicitly.
- Mark parallelizable tasks explicitly.

## Story Pack Alignment (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - proportionate lifecycle routing
  - lighter coordination
  - automatic wiring enforcement
  - bounded correction loops
  - one completion gate
  - explicit recovery path
- Planned stories in this pack:
  - T001 spec pack and lifecycle routing design
  - T002 trivial-lane classifier and workflow routing
  - T003 single-lock flight coordination simplification
  - T004 automatic wiring checks in hooks/guard
  - T005 bounded correction triage
  - T006 unified completion gate plus recovery workflow
- Why this story set is cohesive: every task changes the same end-to-end harness lifecycle and reduces the same user-facing friction.
- Coverage check: each task advances at least one of the six pack objectives and no requested change is left unowned.

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T001 | Create the spec pack and route-design artifacts for this harness story | must-have | no | spec files exist and are internally aligned |
| T002 | Add story sizing and fast-track routing after lookup | blocked-by:T001 | no | workflows/docs show trivial vs standard lane |
| T003 | Replace flight board logic with a single active lock while keeping `scripts/flight_slot.sh` stable | blocked-by:T001 | no | claim/release/status smoke checks pass |
| T004 | Wire AI-architecture checks into pre-commit and finalization guard | blocked-by:T001 | yes | staged/branch AI-architecture checks run automatically |
| T005 | Add persisted triage loop counting and a re-scope circuit breaker | blocked-by:T001 | yes | third-cycle smoke check escalates |
| T006 | Collapse handoff + finalization into one completion gate and add recovery workflow routing | blocked-by:T002,T003,T004,T005 | no | completion workflow and recovery path are both wired |

## TDD Mapping

For each task, list associated tests first:

- T001 tests:
  - [ ] story artifact paths exist and match requested scope
- T002 tests:
  - [ ] trivial classifier accepts only single-file, non-API, non-AI changes
  - [ ] standard lane remains required when any trivial condition fails
- T003 tests:
  - [ ] single lock claim/release cycle works
  - [ ] second claim fails while the lock is active
- T004 tests:
  - [ ] pre-commit runs `check_ai_wiring.sh` when AI-architecture files are staged
  - [ ] finalization guard runs wiring checks when branch diffs touch AI-architecture files
- T005 tests:
  - [ ] triage count persists per story
  - [ ] third triage cycle triggers re-scope escalation
- T006 tests:
  - [ ] handoff template includes finalization plan before approval
  - [ ] git finalization routes into recovery workflow when guard or merge steps fail

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] Deferred tasks documented with rationale
