# User Stories

Use this folder as the source of truth for execution order, the master queue, and checked-in implementation scope.

## Ground Rule

Work should resume from the repo by reading these files, not by reconstructing prior chat history.

## Build Workflow

1. Start with `AGENTS.md`.
2. Read `docs/CONTEXT.md`.
3. Use this file to find the next valid story based on status and dependencies.
4. Create and switch to a fresh `codex/` branch from current `master` for that story before editing the story file or implementation.
5. Open the story file and use it as the execution contract.
6. Run the preparation phase before writing code.
7. Run the story's validation steps.
8. Record outcome in the relevant checkpoint log.
9. Finish the default GitHub flow by merging the story branch to `master` unless the user explicitly pauses or an exact blocker is recorded.

## Story Index

### Phase 1: Core Ship Baseline

This phase will hold core product and platform stories as they are ported into the story-driven model.

| ID | Title | Status | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-101 | Current product spec pack | `done` | P0 | — |
| US-102 | Expanded current product spec blueprint | `done` | P0 | `US-101` |
| US-103 | Current product spec implementation-contract deepening | `done` | P0 | `US-102` |
| US-104 | Current product spec developer build queue | `in-progress` | P0 | `US-103` |

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

| ID | Title | Status | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-606 | FleetGraph chat follow-up reasoning | `done` | P1 | `US-605` |
| US-607 | FleetGraph panel visibility polish | `done` | P1 | `US-606` |
| US-608 | FleetGraph context-aware page analysis completion | `done` | P0 | `US-605` |
| US-609 | FleetGraph shared proactive multi-finding plumbing | `done` | P0 | `US-608` |
| US-609.5 | FleetGraph FAB analysis handoff | `done` | P1 | `US-609` |
| US-610 | FleetGraph sprint-owner gap | `done` | P0 | `US-609.5` |
| US-611 | FleetGraph unassigned sprint issues | `done` | P0 | `US-610` |
| US-612 | FleetGraph assignment evidence refresh | `done` | P0 | `US-611` |
| US-617 | FleetGraph entry nullable-context hardening | `done` | P1 | `US-612` |
| US-615 | FleetGraph assign-owner review/apply follow-through | `done` | P1 | `US-612` |
| US-618 | FleetGraph assign-owner picker follow-through | `done` | P1 | `US-615` |
| US-620 | FleetGraph finding-review thread scoping fix | `done` | P1 | `US-618` |
| US-621 | FleetGraph post-comment fallback preview cleanup | `done` | P1 | `US-601` |
| US-622 | FleetGraph route-trigger enqueue and sweep bootstrap | `done` | P1 | `US-612` |
| US-613 | FleetGraph panel gradient removal | `done` | P2 | `US-612` |
| US-614 | FleetGraph FAB guided-actions panel convergence | `done` | P2 | `US-613` |
| US-616 | FleetGraph assign-issues review/apply follow-through | `done` | P2 | `US-614` |
| US-623 | FleetGraph guided-actions floating overlay | `done` | P2 | `US-614`, `US-617` |
| US-619 | FleetGraph left-sidebar global findings queue | `done` | P2 | `US-616`, `US-618`, `US-623` |
| US-624 | FleetGraph auto analysis once per page context | `done` | P2 | `US-623` |

### Phase X: Harness and Workflow Evolution

| ID | Title | Status | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-901 | AGENTS-first harness reset | `done` | P0 | — |
| US-902 | Seeded verification entry rule | `done` | P1 | `US-901` |
| US-903 | Workflow memory log | `done` | P1 | `US-901` |
| US-904 | Autodeploy and test handoff rule | `done` | P1 | `US-901` |
| US-905 | Post-merge deploy monitoring rule | `done` | P1 | `US-901` |
| US-906 | Story branch lifecycle rule | `done` | P1 | `US-901` |
| US-907 | Skip default browser-verification closeout | `done` | P1 | `US-904` |
| US-913 | Queue-first workflow reset | `done` | P1 | `US-907` |
| US-914 | Prune superseded harness history | `done` | P1 | `US-913` |
| US-915 | Organized `.ai` compatibility workspace | `done` | P1 | `US-914` |
| US-916 | Agent design workflow | `done` | P1 | `US-915` |
| US-917 | Design visual evaluation loop | `done` | P1 | `US-916` |

## Files

- `TEMPLATE.md`: canonical story template
- `HOW_TO_CREATE_USER_STORIES.md`: story authoring guide
- `CHECKPOINT-LOG.md`: cross-phase checkpoint ledger
- `phase-1/`, `phase-2/`, `phase-3/`, `phase-x/`: themed story partitions

## Design vs Packaging

- Use `docs/plans/` for design and technical implementation docs.
- Use `docs/submissions/` for final packaging and review/demo bundles.
