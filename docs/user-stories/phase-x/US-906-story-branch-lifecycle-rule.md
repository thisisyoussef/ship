# US-906: Story Branch Lifecycle Rule

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-901`
- Related branch: `codex/story-branch-lifecycle-rule`
- Related commit/PR: pending finalization
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want story kickoff and closeout to use the same branch discipline every time.

## User Story

> As a maintainer, I want every checked-in story to start on a fresh branch and merge when complete so story work stays isolated, reviewable, and consistently finalized.

## Goal

Make the checked-in harness say plainly that story work begins by checking out a new `codex/` branch before editing the story or implementation, and ends by merging that branch through the default finalization flow unless an exact blocker is recorded.

## Scope

In scope:

1. Add a hard workflow rule that every user story starts on a fresh `codex/` branch before story-file or implementation edits.
2. Update the checked-in story workflow docs so merge-on-completion is explicit in the default flow.
3. Record the correction in workflow memory and the harness story ledgers.

Out of scope:

1. Changing GitHub automation or branch protection settings.
2. Rewriting historical story records.
3. Modifying product or runtime code.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow rulebook
2. `docs/CONTEXT.md` — live repo truth
3. `docs/WORKFLOW_MEMORY.md` — durable workflow corrections and decisions
4. `docs/IMPLEMENTATION_STRATEGY.md` — broad execution model
5. `docs/user-stories/README.md` — master queue and story workflow
6. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` — story authoring process
7. `docs/user-stories/TEMPLATE.md` — future story contract
8. `docs/user-stories/phase-x/README.md` — harness story index
9. `docs/DEFINITION_OF_DONE.md` — completion gate

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
9. `docs/DEFINITION_OF_DONE.md`

Expected contracts/data shapes:

1. `AGENTS.md` should make branch-before-start explicit for every checked-in story, not only implementation stories.
2. The workflow docs should show fresh-branch kickoff and merge-on-completion as part of the default story lifecycle.
3. Workflow memory, the template, and the harness ledgers should preserve the correction for future stories.

Planned failing tests:

1. The checked-in workflow does not explicitly say to create a fresh story branch before editing the story file or implementation.
2. The story authoring docs and template do not remind future stories to start from a fresh branch.
3. The harness story queue and workflow memory do not yet record the correction.

## UX Script

Happy path:

1. A maintainer picks the next valid story from `docs/user-stories/README.md`.
2. The maintainer checks out a fresh `codex/` branch before editing the story file or implementation.
3. When the work is done, the default finalization flow merges that branch back to `master`.

Error path:

1. A maintainer starts work without creating a fresh story branch, or finishes work without merging it.
2. The checked-in workflow docs now make that drift visible as a process miss.
3. The maintainer either follows the default merge flow or records the exact blocker instead of leaving the branch lifecycle implicit.

## Preconditions

- [x] Harness docs were audited
- [x] Working branch exists
- [x] No runtime code changes are required

## TDD Plan

1. Patch `AGENTS.md`, `docs/IMPLEMENTATION_STRATEGY.md`, and `docs/user-stories/README.md` to show the branch lifecycle explicitly.
2. Patch `docs/WORKFLOW_MEMORY.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md` so future stories inherit the rule.
3. Add this Phase X story and update the queue/checkpoint logs.

## Step-by-step Implementation Plan

1. Update the primary workflow docs with branch-before-start and merge-on-completion language.
2. Update the story authoring guide, story template, and durable workflow memory with the new rule.
3. Add `US-906` to the story indexes and checkpoint logs.
4. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: `AGENTS.md` and the checked-in workflow docs say every user story starts on a fresh `codex/` branch before story-file or implementation edits.
- [x] AC-2: The checked-in workflow docs say the default closeout flow merges the story branch back to `master` unless the user explicitly pauses or an exact blocker is recorded.
- [x] AC-3: Workflow memory, the story authoring guide, the story template, and the harness ledgers record the rule.

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
- Route or URL: `AGENTS.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md`
- Interaction: inspect the updated workflow language for branch-before-start and merge-on-completion
- Expected result: the docs explicitly require a fresh `codex/` branch before story work begins and default to merging that branch when the story is done
- Failure signal: the docs still allow a story to start on `master` or leave closeout at an unmerged branch by default

## User Checkpoint Test

1. Open `AGENTS.md` and confirm every user story now starts on a fresh `codex/` branch before story-file or implementation edits.
2. Open `docs/user-stories/README.md` and confirm the Build Workflow includes creating the story branch up front and merging it in the default closeout flow.
3. Open `docs/user-stories/TEMPLATE.md` and confirm future stories now include a precondition for a fresh story branch.

## What To Test

- Route or URL: `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md`
- Interaction: inspect the workflow and story-authoring language for the branch lifecycle rule
- Expected visible result: the harness now says to start each story on a fresh `codex/` branch and to merge that branch back to `master` as the default end state
- Failure signal: the harness still treats branch creation or merge-on-completion as optional or implicit

## Checkpoint Result

- Outcome: Done
- Evidence: the primary rulebook, workflow memory, implementation strategy, user-story workflow docs, story authoring guide, and story template now all carry the story-branch lifecycle rule; `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed.
- Residual risk: this is a documentation-and-process change, so actual compliance still depends on maintainers and agents following the updated harness.
