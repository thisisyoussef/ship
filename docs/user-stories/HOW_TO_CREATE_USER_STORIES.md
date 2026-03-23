# How To Create User Stories

This repo is built story-by-story.
Each meaningful implementation task should map to one checked-in story file.

## Goal

Write stories that are executable, testable, and resumable from the repo alone.

## Rules

1. Start the story on its own fresh `codex/` branch from current `master` before editing the story file or implementation.
2. Parallel work by multiple agents is expected; do not reuse a sibling branch for a new concern unless the user explicitly asks for stacked work.
3. One story should produce one coherent outcome.
4. Record any sibling-branch dependency or required merge order when stories are not independent.
5. Write dependencies clearly enough that a future continue or handoff response can say whether another story is safe to run in parallel.
6. Keep scope small enough to prepare, implement, validate, and hand off in one cycle.
7. Always include a Preparation Phase before coding.
8. Always include validation, deployment status, and user-facing verification steps.
9. Use `docs/DEFINITION_OF_DONE.md` as the hard completion gate.

## Process

1. Create and switch to a fresh `codex/` branch from current `master` for the story before editing the story file or implementation.
2. If other agent branches are already in flight, keep this story isolated and note any dependency or merge order in the story file.
3. Copy `TEMPLATE.md` into the right phase folder.
4. Fill status, ownership, dependencies, branch, and worktree fields first.
5. Define persona, user story, goal, and scope.
6. Make the dependency fields precise enough that a future agent can tell the user whether another checked-in story is parallel-safe or blocked.
7. List the local files and contracts to audit before coding.
8. Complete the Preparation Phase notes before implementation.
9. Write the TDD or validation plan before production edits.
10. Add acceptance criteria and concrete local validation commands.
11. Add deployment and user verification steps.
12. For visible stories, create or refresh a named seeded verification entry or proof lane when the product supports one, and record it explicitly in `How To Verify`.
13. Do not require agent-run browser verification by default; prefer seeded proof lanes, runtime or API checks, and explicit `What To Test` steps unless the story truly needs visual debugging.
14. If the story is used in a continue or next-step handoff, explicitly say whether another checked-in story can run in parallel now and provide a copy-paste prompt inline in chat when one exists.
15. If sibling branches land first, refresh from latest `master`, rerun validation, and only then finalize the story branch.
16. Update the relevant checkpoint log when the story advances or closes.
17. As soon as implementation starts, update `docs/user-stories/README.md` and the relevant phase README so the story is visibly marked `in-progress` with its current owner, branch, and worktree path when applicable.
18. Treat those queue updates as shared coordination data, not private branch notes. Make sure the active-work visibility lands on `master` promptly, even if that requires a separate small docs-only correction before the implementation branch is ready.

## Phase Folders

- `phase-1/`: core platform and product baseline work
- `phase-2/`: FleetGraph delivery and adjacent integration work
- `phase-3/`: reliability, UX, and productization follow-through
- `phase-x/`: harness and workflow evolution

## Checkpoint Logs

- `CHECKPOINT-LOG.md`: cross-phase ledger
- phase-level checkpoint logs: detailed progress inside a single wave when needed
