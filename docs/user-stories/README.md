# User Stories

Use this folder as the source of truth for execution order, the master queue, and checked-in implementation scope.

## Ground Rule

Work should resume from the repo by reading these files, not by reconstructing prior chat history.

## Build Workflow

1. Start with `AGENTS.md`.
2. Read `docs/CONTEXT.md`.
3. Use this file to find the next valid story based on status and dependencies.
4. Create and switch to a fresh `codex/` branch for that story before editing the story file or implementation.
5. Open the story file and use it as the execution contract.
6. Run the preparation phase before writing code.
7. Run the story's validation steps.
8. Record outcome in the relevant checkpoint log.
9. Finish the default GitHub flow by merging the story branch to `master` unless the user explicitly pauses or an exact blocker is recorded.

## Story Index

### Phase 1: Core Ship Baseline

This phase will hold core product and platform stories as they are ported into the story-driven model.

### Phase 2: FleetGraph Delivery

This phase will hold FleetGraph product and integration stories as the active packs are ported into story files.

| ID | Title | Status | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-601 | Current-page approval preview | `done` | P0 | `US-901` |
| US-602 | Entry apply through runtime | `done` | P0 | `US-601` |
| US-603 | Entry approval follow-up fixes | `done` | P0 | `US-602` |
| US-604 | Review-tab plan validation proof lane | `done` | P0 | `US-603` |
| US-605 | Validation-ready demo reset lane | `done` | P1 | `US-604` |

### Phase 3: Reliability and Productization

This phase will hold proof-lane, UX, deployment, and reliability follow-through stories.

### Phase X: Harness and Workflow Evolution

| ID | Title | Status | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-901 | AGENTS-first harness reset | `done` | P0 | — |
| US-902 | Seeded verification entry rule | `done` | P1 | `US-901` |
| US-903 | Workflow memory log | `done` | P1 | `US-901` |
| US-904 | Autodeploy and test handoff rule | `done` | P1 | `US-901` |
| US-905 | Post-merge deploy monitoring rule | `done` | P1 | `US-901` |
| US-906 | Story branch lifecycle rule | `done` | P1 | `US-901` |

## Execution Order

1. `US-901` completes the control-plane reset from the old `.ai` workspace to the checked-in docs model.
2. `US-601` completes the first FleetGraph completion-pack story by finishing the current-page approval preview use case on the smallest safe path.
3. `US-902` makes repeatable seeded verification entries part of the checked-in workflow for visible stories.
4. `US-903` adds a durable workflow-memory log for recurring corrections, decisions, and reusable patterns.
5. `US-904` aligns closeout behavior with Railway autodeploy and requires explicit `What to test` instructions in visible-story handoffs.
6. `US-905` makes post-merge deployment observation part of deploy-relevant story completion on auto-deployed surfaces.
7. `US-906` makes branch-before-start and merge-on-completion explicit for every checked-in story.
8. `US-602` completes `T601A` by routing entry-card apply through the runtime review/execute path.
9. `US-603` closes the FleetGraph approval follow-up by making preview state-aware, refreshing the current page after apply, and darkening the result copy.
10. `US-604` pivots the visible FleetGraph proof lane to review-tab plan validation so the current-page guided step has explicit, user-visible evidence.
11. `US-605` adds a dedicated validation-ready demo week so the review-tab proof lane can be retested after prior validations consume the original seeded state.
12. Active product packs continue to port into `docs/user-stories/` in dependency order.

## Files

- `TEMPLATE.md`: canonical story template
- `HOW_TO_CREATE_USER_STORIES.md`: story authoring guide
- `CHECKPOINT-LOG.md`: cross-phase checkpoint ledger
- `phase-1/`, `phase-2/`, `phase-3/`, `phase-x/`: themed story partitions

## Design vs Packaging

- Use `docs/plans/` for design and technical implementation docs.
- Use `docs/submissions/` for final packaging and review/demo bundles.
