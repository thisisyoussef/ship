# Task Breakdown

## Story
- Story ID: AI-HARNESS-TDD-PIPELINE-HARDENING
- Story Title: Multi-agent TDD pipeline with property and mutation gates

## Execution Notes
- Keep tasks small and verifiable.
- Mark dependencies explicitly.
- Mark parallelizable tasks explicitly.

## Story Pack Alignment (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - isolate test authoring from implementation
  - add property-testing guidance and file conventions
  - add mutation-testing quality gates with bounded feedback loops
- Planned stories in this pack:
  - Phase 1: three-agent TDD split + handoff artifacts
  - Phase 2: property-based test generation and execution
  - Phase 3: targeted mutation-testing feedback loop
- Why this story set is cohesive:
  - each phase adds one stronger quality layer on top of the same TDD handoff contract
- Coverage check: which objective each story advances:
  - Phase 1 -> objective 1 and 3
  - Phase 2 -> objective 2 and 3
  - Phase 3 -> objective 2 and 3

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T001 | Create the TDD pipeline story-pack artifacts and align pack objectives | must-have | no | `test -f docs/specs/ai-harness/TDD-PIPELINE-HARDENING/feature-spec.md` |
| T002 | Add three-agent TDD specialist docs and update TDD workflow/feature workflow for file-based handoff | blocked-by:T001 | no | `bash scripts/check_ai_wiring.sh` |
| T003 | Add `.ai/state/tdd-handoff/` contract docs plus `scripts/tdd_handoff.sh` helpers and loop-limit/escalation support | blocked-by:T002 | no | `bash scripts/tdd_handoff.sh init --story SAMPLE-STORY --spec docs/specs/ai-harness/TDD-PIPELINE-HARDENING/feature-spec.md` |
| T004 | Add `fast-check` guidance and separate property-test conventions to the TDD pipeline | blocked-by:T002 | yes | `rg -n \"fast-check|property\" .ai docs scripts` |
| T005 | Add Stryker config and targeted mutation script for changed files | blocked-by:T003,T004 | yes | `pnpm exec stryker --version` |
| T006 | Thread the new contract through startup docs, memory, and AI wiring checks | blocked-by:T002,T003,T004,T005 | no | `bash scripts/check_ai_wiring.sh` |

## TDD Mapping

For each task, list associated tests first:

- T001 tests:
  - [ ] story-pack artifacts exist and describe all three phases
- T002 tests:
  - [ ] wiring requires the three-agent TDD workflow references
  - [ ] feature workflow no longer treats TDD as one black-box step
- T003 tests:
  - [ ] handoff init command creates the expected directory layout
  - [ ] stage metadata writes validate stage names and statuses
- T004 tests:
  - [ ] property-test convention is documented separately from example tests
  - [ ] counterexample capture is wired into escalation output
- T005 tests:
  - [ ] mutation config resolves and supports targeted mutate lists
  - [ ] threshold/feedback loop guidance is present
- T006 tests:
  - [ ] startup/orchestrator docs point at the new TDD contract
  - [ ] `check_ai_wiring.sh` fails when required TDD tokens are missing

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] Deferred tasks documented with rationale
