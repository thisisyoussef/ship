# User Stories

Use this folder as the source of truth for execution order, the master queue, and checked-in implementation scope.

`docs/user-stories/README.md` on `master` is the joining source of truth for parallel work. If active-work visibility only exists on an unmerged feature branch, other agents do not have the real queue yet.

## Ground Rule

Work should resume from the repo by reading these files, not by reconstructing prior chat history.

## Build Workflow

1. Start with `AGENTS.md`.
2. Read `docs/CONTEXT.md`.
3. Use this file to find the next valid story based on status and dependencies.
4. Before choosing the next story, recommending a parallel lane, or creating a new branch, run a queue-truth preflight by comparing `master`'s checked-in queue with `git worktree list` and `git branch -vv`.
5. If the checked-in queue is stale, land a queue correction on `master` first or record the exact blocker before giving next-step guidance.
6. When the user asks to continue, choose the next story, or create a story, explicitly say whether another checked-in story can run in parallel right now.
7. If a parallel lane exists, include a ready-to-send copy-paste prompt inline in chat for the recommended other agent instead of creating a prompt file.
8. Create and switch to a fresh `codex/` branch from current `master` for that story before editing the story file or implementation.
9. Parallel work by multiple agents is expected, so keep one concern per branch and record any sibling-branch dependency or required merge order.
10. When a story becomes actively in flight on a parallel branch, update the queue and `Active Work` section in a way that lands on `master` promptly. If the feature branch is not ready to merge, make a small docs-only correction branch so `master` stays truthful.
11. Open the story file and use it as the execution contract.
12. Run the preparation phase before writing code.
13. Run the story's validation steps.
14. If sibling branches land first, refresh from latest `master` and rerun the story's validation steps before finalization.
15. Record outcome in the relevant checkpoint log.
16. Finish the default GitHub flow by merging the story branch to `master` once it is current with latest `master`, unless the user explicitly pauses or an exact blocker is recorded.

## Active Work

Use this section to show stories that are actually in flight right now, including parallel-agent work that has not merged yet.

| ID | State | Owner | Branch | Worktree | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | No active story work is currently recorded in this queue. |

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
| US-618 | FleetGraph assign-owner picker follow-through | `todo` | P1 | `US-615` |
| US-613 | FleetGraph panel gradient removal | `done` | P2 | `US-612` |
| US-614 | FleetGraph FAB guided-actions panel convergence | `todo` | P2 | `US-613` |
| US-616 | FleetGraph assign-issues review/apply follow-through | `todo` | P2 | `US-614` |

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
| US-908 | Parallel multi-agent branch workflow | `done` | P1 | `US-906` |
| US-909 | Parallel-lane callout and agent prompt | `done` | P1 | `US-908` |

## Execution Order

1. `US-901` completes the control-plane reset from the old `.ai` workspace to the checked-in docs model.
2. `US-601` completes the first FleetGraph completion-pack story by finishing the current-page approval preview use case on the smallest safe path.
3. `US-902` makes repeatable seeded verification entries part of the checked-in workflow for visible stories.
4. `US-903` adds a durable workflow-memory log for recurring corrections, decisions, and reusable patterns.
5. `US-904` aligns closeout behavior with Railway autodeploy and requires explicit `What to test` instructions in visible-story handoffs.
6. `US-905` makes post-merge deployment observation part of deploy-relevant story completion on auto-deployed surfaces.
7. `US-906` makes branch-before-start and merge-on-completion explicit for every checked-in story.
8. `US-907` removes agent-run browser walkthroughs as a default completion requirement and prefers lighter proof paths unless the story genuinely needs visual debugging.
9. `US-602` completes `T601A` by routing entry-card apply through the runtime review/execute path.
10. `US-603` closes the FleetGraph approval follow-up by making preview state-aware, refreshing the current page after apply, and darkening the result copy.
11. `US-604` pivots the visible FleetGraph proof lane to review-tab plan validation so the current-page guided step has explicit, user-visible evidence.
12. `US-605` adds a dedicated validation-ready demo week so the review-tab proof lane can be retested after prior validations consume the original seeded state.
13. `US-606` makes FleetGraph chat follow-ups conversational enough to use real user prompts, but it does not replace the original `T602` assignment story.
14. `US-607` tightens the inline FleetGraph shell so it starts collapsed, stays within the viewport, and signals proactive alerts more clearly, but it is still a sidecar polish story.
15. `US-608` restores the original assignment-critical `T602` lane by completing the context-aware page-analysis use case as a checked-in story.
16. `US-609` restores the original assignment-critical `T603` lane by widening FleetGraph’s proactive plumbing beyond `week_start_drift`.
17. `US-609.5` restores the lighter FleetGraph analysis flow by handing `Check this page` into the FAB chat while leaving guided-step preview on the embedded entry card.
18. `US-610` restores the original assignment-critical `T604` lane by shipping the sprint-owner gap use case.
19. `US-611` restores the original assignment-critical `T605` lane by shipping the unassigned sprint issues use case.
20. `US-612` restores the original assignment-critical `T606` lane by refreshing the workbook, traces, and audit path from shipped behavior.
21. `US-617` hardens the embedded FleetGraph entry contract against live nullable document-context metadata so current-page entry actions stop failing with `/api/fleetgraph/entry` `400` errors on seeded proof lanes.
22. `US-615` turns the shipped sprint-owner-gap advisory flow into a real FleetGraph review/apply path for assigning accountability in Ship on the live owner-gap proof lane.
23. `US-618` extends `US-615` by replacing the self-assignment shortcut with a Properties-tab-style owner picker so FleetGraph can assign the correct teammate from the review surface.
24. `US-613` removes the FleetGraph panel gradient after the assignment-critical sequence is complete, keeping the shell calmer without re-opening the core use-case work.
25. `US-614` moves `Preview next step` plus the guided-actions portion of FleetGraph quick actions into the FAB as a dedicated guided-actions panel, while preserving the existing review/apply flow and behavior instead of turning it into a hard graph rewrite.
26. `US-616` turns the shipped unassigned-issues advisory flow into a real FleetGraph review/apply path for closing the sprint coordination gap once the current tail stories are complete.
27. Active product packs continue to port into `docs/user-stories/` in dependency order.
28. `US-908` makes parallel multi-agent branch work explicit by treating separate per-agent branches as the default and requiring a re-sync with latest `master` before merge when sibling branches land first.
29. `US-909` makes continuation and story-selection responses explicitly say whether another checked-in story can run in parallel now and provide an inline copy-paste prompt for the recommended other agent when one exists.

## Files

- `TEMPLATE.md`: canonical story template
- `HOW_TO_CREATE_USER_STORIES.md`: story authoring guide
- `CHECKPOINT-LOG.md`: cross-phase checkpoint ledger
- `phase-1/`, `phase-2/`, `phase-3/`, `phase-x/`: themed story partitions

## Design vs Packaging

- Use `docs/plans/` for design and technical implementation docs.
- Use `docs/submissions/` for final packaging and review/demo bundles.
