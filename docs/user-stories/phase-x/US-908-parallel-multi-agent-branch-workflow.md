# US-908: Parallel Multi-Agent Branch Workflow

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-906`
- Related branch: `codex/parallel-agent-workflow`
- Parallel dependency / merge order: independent workflow branch; should merge separately from product branches already in flight
- Related commit/PR: pending finalization
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want the harness to assume multiple agents can work at once so parallel branches stay isolated and merge back safely.

## User Story

> As a maintainer, I want parallel branch-based agent work to be an explicit default so multiple in-flight branches can progress safely without muddling merge order or finalization.

## Goal

Extend the checked-in workflow so parallel agent work on separate branches is expected, each concern stays isolated on its own branch from `master`, and stories say what to do when sibling branches merge first.

## Scope

In scope:

1. Add a hard workflow rule that parallel agent work on separate branches is expected.
2. Update the merge/finalization procedure so in-flight branches refresh from latest `master` and rerun validation when sibling branches land first.
3. Record the rule in the story-authoring surfaces and harness ledgers.

Out of scope:

1. Changing GitHub automation or branch protection settings.
2. Building worktree automation or branch-discovery tooling.
3. Modifying product or runtime code.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow rulebook
2. `docs/CONTEXT.md` — live repo truth
3. `docs/WORKFLOW_MEMORY.md` — durable workflow corrections and decisions
4. `docs/IMPLEMENTATION_STRATEGY.md` — broad execution model
5. `docs/user-stories/README.md` — master queue and workflow
6. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` — story authoring process
7. `docs/user-stories/TEMPLATE.md` — future story contract
8. `docs/user-stories/phase-x/README.md` — harness story index
9. `docs/user-stories/phase-x/US-906-story-branch-lifecycle-rule.md` — closest workflow exemplar
10. `docs/DEFINITION_OF_DONE.md` — completion gate

## Preparation Phase

1. Read the local workflow and story contract docs above.
2. Confirm the smallest durable set of workflow-doc updates.
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
9. `docs/user-stories/phase-x/US-906-story-branch-lifecycle-rule.md`
10. `docs/DEFINITION_OF_DONE.md`

Expected contracts/data shapes:

1. `AGENTS.md` should say parallel branch-based agent work is expected and still keep one concern per branch.
2. The workflow docs should explain what to do when sibling branches merge first: refresh from latest `master`, resolve conflicts, rerun validation, then finalize.
3. Story-authoring surfaces should make room to record sibling-branch dependencies or merge order when parallel work is not independent.

Planned failing tests:

1. The checked-in workflow does not yet explicitly say that multiple agents may work in parallel on separate branches.
2. The closeout flow does not yet say to refresh from latest `master` and rerun validation when sibling branches land first.
3. The story template and completion contract do not yet prompt maintainers to record sibling-branch dependency or merge order.

## UX Script

Happy path:

1. Multiple agents start separate stories from fresh branches off current `master`.
2. One branch merges first.
3. Remaining branches refresh from latest `master`, rerun validation, and then merge independently without collapsing into one shared branch.

Error path:

1. An agent reuses another in-flight branch or tries to merge a stale branch after sibling work lands.
2. The workflow docs now make that drift visible as a process miss.
3. The agent either re-syncs and reruns validation or records the exact dependency/blocker before finalization.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Any sibling-branch dependency or required merge order is recorded
- [x] Harness docs were audited
- [x] No runtime code changes are required

## TDD Plan

1. Patch `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, and `docs/user-stories/README.md` with the new parallel-branch rule and merge procedure.
2. Patch `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` and `docs/user-stories/TEMPLATE.md` so future stories inherit the rule.
3. Add this Phase X story and update the queue/checkpoint logs.

## Step-by-step Implementation Plan

1. Update the primary workflow docs with explicit parallel-branch expectations.
2. Update finalization and completion language so stale in-flight branches must refresh from latest `master` and rerun validation before merge.
3. Update story-authoring guidance and the story template to record sibling-branch dependency or merge order.
4. Add `US-908` to the story indexes and checkpoint logs.
5. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: `AGENTS.md` and the checked-in workflow docs say parallel branch-based work by multiple agents is expected and each concern still lives on its own branch from `master`.
- [x] AC-2: The checked-in workflow docs say branches must refresh from latest `master` and rerun validation before finalization when sibling branches land first.
- [x] AC-3: Workflow memory, the completion contract, the story authoring guide, the story template, and the harness ledgers record the rule.

## Local Validation

Run these before handoff:

```bash
bash scripts/check_ai_wiring.sh
git diff --check
```

## Deployment Handoff

1. This is a repo-only workflow story.
2. Deployment status should be `not deployed`.
3. Record validation evidence in the checkpoint log and handoff.

## How To Verify

- Seeded verification entry or proof lane: not applicable
- Route or URL: `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md`
- Interaction: inspect the updated workflow language for parallel branch expectations and re-sync-before-merge guidance
- Expected result: the docs state that multiple agents may work on separate branches in parallel, keep one concern per branch, and refresh from latest `master` plus rerun validation before merging when sibling branches land first
- Failure signal: the docs still imply single-agent serial work or still allow stale branches to merge without re-sync and validation

## User Checkpoint Test

1. Open `AGENTS.md` and confirm it now says parallel branch-based work by multiple agents is expected.
2. Open `docs/user-stories/README.md` and confirm the Build Workflow tells in-flight branches to refresh from latest `master` and rerun validation before finalization when sibling branches land first.
3. Open `docs/user-stories/TEMPLATE.md` and confirm future stories now record any sibling-branch dependency or merge order.

## What To Test

- Route or URL: `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md`
- Interaction: inspect the workflow and story-authoring language for parallel-branch handling and merge procedure
- Expected visible result: the harness now treats separate per-agent branches as normal, requires one concern per branch, and says stale branches must re-sync with latest `master` and rerun validation before merge
- Failure signal: the harness still leaves parallel work implicit or leaves merge procedure ambiguous once sibling branches land first

## Checkpoint Result

- Outcome: Done
- Evidence: `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md` now all carry the parallel-branch workflow rule; `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed.
- Residual risk: this is a documentation-and-process change, so safe parallel execution still depends on maintainers and agents following the updated branch isolation and re-sync-before-merge guidance.
