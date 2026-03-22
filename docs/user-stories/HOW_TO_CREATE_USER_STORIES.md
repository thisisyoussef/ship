# How To Create User Stories

This repo is built story-by-story.
Each meaningful implementation task should map to one checked-in story file.

## Goal

Write stories that are executable, testable, and resumable from the repo alone.

## Rules

1. One story should produce one coherent outcome.
2. Keep scope small enough to prepare, implement, validate, and hand off in one cycle.
3. Always include a Preparation Phase before coding.
4. Always include validation, deployment status, and user-facing verification steps.
5. Use `docs/DEFINITION_OF_DONE.md` as the hard completion gate.

## Process

1. Copy `TEMPLATE.md` into the right phase folder.
2. Fill status, ownership, dependencies, and target environment first.
3. Define persona, user story, goal, and scope.
4. List the local files and contracts to audit before coding.
5. Complete the Preparation Phase notes before implementation.
6. Write the TDD or validation plan before production edits.
7. Add acceptance criteria and concrete local validation commands.
8. Add deployment and user verification steps.
9. Update the relevant checkpoint log when the story advances or closes.

## Phase Folders

- `phase-1/`: core platform and product baseline work
- `phase-2/`: FleetGraph delivery and adjacent integration work
- `phase-3/`: reliability, UX, and productization follow-through
- `phase-x/`: harness and workflow evolution

## Checkpoint Logs

- `CHECKPOINT-LOG.md`: cross-phase ledger
- phase-level checkpoint logs: detailed progress inside a single wave when needed
