# How To Create User Stories

This repo is built story-by-story.
Each meaningful implementation task should map to one checked-in story file.

## Goal

Write stories that are executable, testable, and resumable from the repo alone.

## Rules

1. Before branching for a new story, reconcile `master`'s queue against `git worktree list` and `git branch -vv`; if the queue is stale, fix that on `master` first or record the blocker.
2. Start the story on its own fresh `codex/` branch from current `master` before editing the story file or implementation.
3. Parallel work by multiple agents is expected; do not reuse a sibling branch for a new concern unless the user explicitly asks for stacked work.
4. One story should produce one coherent outcome.
5. Record any sibling-branch dependency or required merge order when stories are not independent.
6. Write dependencies clearly enough that a future continue or handoff response can say whether another story is safe to run in parallel.
7. Keep scope small enough to prepare, implement, validate, and hand off in one cycle.
8. Always include a Preparation Phase before coding.
9. Always include validation, deployment status, and user-facing verification steps.
10. Use `docs/DEFINITION_OF_DONE.md` as the hard completion gate.

## Process

1. Run the queue-truth preflight: compare `master`'s queue with `git worktree list` and `git branch -vv`, and correct any drift before saying a story is available.
2. Create and switch to a fresh `codex/` branch from current `master` for the story before editing the story file or implementation.
3. If other agent branches are already in flight, keep this story isolated and note any dependency or merge order in the story file.
4. Copy `TEMPLATE.md` into the right phase folder.
5. Fill status, ownership, dependencies, branch, and worktree fields first.
6. Define persona, user story, goal, and scope.
7. Make the dependency fields precise enough that a future agent can tell the user whether another checked-in story is parallel-safe or blocked.
8. List the local files and contracts to audit before coding.
9. Complete the Preparation Phase notes before implementation.
10. Write the TDD or validation plan before production edits.
11. Add acceptance criteria and concrete local validation commands.
12. Add deployment and user verification steps.
13. For visible stories, create or refresh a named seeded verification entry or proof lane when the product supports one, and record it explicitly in `How To Verify`.
14. Do not require agent-run browser verification by default; prefer seeded proof lanes, runtime or API checks, and explicit `What To Test` steps unless the story truly needs visual debugging.
15. If the story is used in a continue or next-step handoff, explicitly say whether another checked-in story can run in parallel now and provide a copy-paste prompt inline in chat when one exists.
16. If sibling branches land first, refresh from latest `master`, rerun validation, and only then finalize the story branch.
17. Update the relevant checkpoint log when the story advances or closes.
18. As soon as implementation starts, update `docs/user-stories/README.md` and the relevant phase README so the story is visibly marked `in-progress` with its current owner, branch, and worktree path when applicable.
19. Treat those queue updates as shared coordination data, not private branch notes. Make sure the active-work visibility lands on `master` promptly, even if that requires a separate small docs-only correction before the implementation branch is ready.
20. Before finalization, inspect the shared merge lock with `bash scripts/merge_lock.sh status`. If another branch holds it, wait, refresh from latest `master`, rerun validation, and only then continue.
21. Claim the merge lock for the current branch with explicit wait instructions before opening or merging the PR, then release it after finalization or record the exact blocker.

## Phase Folders

- `phase-1/`: core platform and product baseline work
- `phase-2/`: FleetGraph delivery and adjacent integration work
- `phase-3/`: reliability, UX, and productization follow-through
- `phase-x/`: harness and workflow evolution

## Checkpoint Logs

- `CHECKPOINT-LOG.md`: cross-phase ledger
- phase-level checkpoint logs: detailed progress inside a single wave when needed
