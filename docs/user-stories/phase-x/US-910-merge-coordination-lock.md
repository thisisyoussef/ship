# US-910: Shared Merge Coordination Lock

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-909`
- Related branch: `codex/us-910-merge-coordination-lock`
- Active worktree: `/Users/youss/Development/gauntlet/ship`
- Parallel dependency / merge order: Independent workflow branch. If another story claims the shared merge lock first during finalization, wait for release, refresh from latest `master`, rerun this story's validation, and then continue finalization.
- Related commit/PR: `pending finalization`
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want a shared merge lock so only one branch finalizes at a time and waiting branches know exactly who is merging and what to do next.

## User Story

> As a maintainer, I want a single source of truth for merge coordination so agents can see whether another branch is currently finalizing, from which branch, and what instructions to follow before they merge.

## Goal

Add a durable merge-coordination workflow that gives Ship a single shared lock file for in-progress merges, tells waiting agents exactly how to proceed, and prevents finalization from silently racing across parallel branches.

## Scope

In scope:

1. Add a shared merge-lock file flow that works across parallel worktrees for the same repo.
2. Add a small helper script to read, claim, and release the merge lock.
3. Update finalization guidance and guardrails so agents must wait when another branch already holds the merge lock.
4. Record the workflow in the checked-in harness docs, story queue, and checkpoint logs.

Out of scope:

1. GitHub branch protection or server-side merge queues.
2. Cross-machine coordination outside this local shared repo clone.
3. Product or runtime behavior changes.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow contract
2. `docs/CONTEXT.md` — live repo truth
3. `docs/WORKFLOW_MEMORY.md` — durable workflow decisions
4. `docs/IMPLEMENTATION_STRATEGY.md` — execution model
5. `docs/user-stories/README.md` — master queue and active-work visibility
6. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` — story authoring process
7. `docs/user-stories/TEMPLATE.md` — story execution contract
8. `docs/user-stories/phase-x/README.md` — harness story index
9. `docs/user-stories/phase-x/US-908-parallel-multi-agent-branch-workflow.md` — closest branch-coordination exemplar
10. `docs/user-stories/phase-x/US-909-parallel-lane-callout-and-agent-prompt.md` — closest coordination-language exemplar
11. `docs/guides/finalization-recovery.md` — failure handling
12. `scripts/git_finalize_guard.sh` — merge-time enforcement point
13. `scripts/check_ai_wiring.sh` — harness audit contract
14. `scripts/flight_slot.sh` — closest existing lock helper pattern

## Preparation Phase

1. Confirm the smallest durable workflow change that creates truly shared merge state across worktrees.
2. Confirm the right guardrail location for enforcement before merge.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`
7. `docs/user-stories/TEMPLATE.md`
8. `docs/user-stories/phase-x/README.md`
9. `docs/user-stories/phase-x/US-908-parallel-multi-agent-branch-workflow.md`
10. `docs/user-stories/phase-x/US-909-parallel-lane-callout-and-agent-prompt.md`
11. `docs/guides/finalization-recovery.md`
12. `scripts/git_finalize_guard.sh`
13. `scripts/check_ai_wiring.sh`
14. `scripts/flight_slot.sh`

Expected contracts/data shapes:

1. The shared merge state should live outside individual worktrees so parallel branches see the same file.
2. The merge lock must record the active branch plus wait instructions for other agents.
3. The finalization guard should fail clearly when the current branch has not claimed the merge lock or another branch already holds it.

Planned failing tests:

1. The checked-in workflow does not yet give agents a single shared merge-state file to inspect before finalization.
2. The finalization guard does not yet enforce waiting for another branch's merge to finish.
3. The harness docs do not yet say how to claim, inspect, and release merge coordination.

## UX Script

Happy path:

1. An agent is ready to finalize a story branch.
2. The agent checks the shared merge lock, sees no active merge, and claims it with wait instructions.
3. Other agents see the active branch and instructions, wait, then refresh from latest `master`, rerun validation, and finalize after the lock is released.

Error path:

1. Two agents try to finalize at roughly the same time.
2. The first claim succeeds and the second branch sees a clear wait message naming the active branch and instructions.
3. After the lock is released, the waiting branch refreshes from latest `master`, reruns validation, and only then finalizes.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Any sibling-branch dependency or required merge order is recorded
- [x] Story ownership visibility is updated in the root queue, this story file, and the phase README
- [x] Harness docs and guard scripts were audited before implementation

## TDD Plan

1. Add a shared merge-lock helper script and fail-first guard coverage by making `scripts/git_finalize_guard.sh` require the current branch to hold the lock.
2. Update the checked-in workflow docs and story authoring guidance to require merge-lock inspection and wait behavior before finalization.
3. Update the harness audit so future drift is caught automatically.

## Step-by-step Implementation Plan

1. Add `scripts/merge_lock.sh` to manage a merge lock file in the repo's git common directory.
2. Update `scripts/git_finalize_guard.sh` to require the current branch to hold the merge lock before finalization.
3. Add a merge-coordination guide and update the core workflow docs to reference it.
4. Update the story indexes and checkpoint logs for `US-910`.
5. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: Ship has a single shared merge-lock file for this repo clone that records the active branch and wait instructions for other agents.
- [x] AC-2: Finalization fails clearly when another branch holds the merge lock or the current branch has not claimed it first.
- [x] AC-3: `AGENTS.md`, the workflow docs, and the harness audit tell agents how to inspect, claim, wait on, and release merge coordination.

## Local Validation

Run these before handoff:

```bash
bash scripts/check_ai_wiring.sh
git diff --check
```

If sibling branches land first before finalization, rerun this section after syncing to latest `master`.

## Deployment Handoff

1. This is a repo-only workflow story.
2. Deployment status should be `not deployed`.
3. Record validation evidence in the checkpoint log and handoff.

## How To Verify

- Prefer the lightest reliable proof path first: inspect the guide and guard behavior locally.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/guides/merge-coordination.md`, `scripts/merge_lock.sh`, `scripts/git_finalize_guard.sh`, `AGENTS.md`
- Interaction: inspect the merge-coordination workflow and run the helper plus guard locally
- Expected result: the repo has one shared merge-lock file for the clone, waiting agents can see branch plus instructions, and finalization requires the current branch to hold the lock
- Failure signal: the merge state only exists per worktree, the wait instructions are unclear, or finalization can still proceed without the current branch holding the merge lock

## User Checkpoint Test

1. Run `bash scripts/merge_lock.sh status` and confirm it prints the shared merge-lock file path and current holder information.
2. Claim the merge lock for a test branch and confirm `bash scripts/git_finalize_guard.sh` only passes from the claiming branch.
3. Release the merge lock and confirm `bash scripts/merge_lock.sh status` shows no active merge.

## What To Test

- Route or URL: `docs/guides/merge-coordination.md`, `scripts/merge_lock.sh`, `scripts/git_finalize_guard.sh`, `AGENTS.md`
- Interaction: inspect the workflow language and run the merge-lock helper commands
- Expected visible result: there is a single merge coordination source of truth, it names the active branch plus wait instructions, and the finalization guard blocks branches that do not hold the lock
- Failure signal: the workflow still leaves merge races ambiguous or the guard ignores the shared lock

## Checkpoint Result

- Outcome: `implemented locally`
- Evidence:
  - `bash scripts/merge_lock.sh status` created and reported the shared merge-lock file in the repo's git common dir.
  - `bash scripts/merge_lock.sh claim --owner Codex --story US-910 --instructions "..."`
    succeeded for `codex/us-910-merge-coordination-lock`.
  - `bash scripts/merge_lock.sh assert-held --branch codex/other-branch` failed with the active branch plus wait instructions, proving the shared wait path.
  - `bash scripts/merge_lock.sh release --status completed --summary "Validation exercise complete"` cleared the lock cleanly.
  - `bash scripts/check_ai_wiring.sh` passed.
  - `git diff --check` passed.
- Residual risk:
  - The shared merge lock coordinates worktrees inside this local clone, not separate clones or separate machines.
  - Full end-to-end `git_finalize_guard.sh` proof still depends on the normal clean-tree plus upstream-ready finalization stage.
