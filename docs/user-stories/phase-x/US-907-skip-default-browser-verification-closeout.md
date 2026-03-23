# US-907: Skip Default Browser-Verification Closeout

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-904`
- Related branch: `codex/remove-browser-step-workflow`
- Related commit/PR: pending finalization
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want visible-story closeout to avoid unnecessary agent-run browser walkthroughs so completion stays fast, reliable, and grounded in lighter proof paths.

## User Story

> As a maintainer, I want the workflow to stop treating browser walkthroughs as a default completion step so visible stories can close on seeded proof lanes, runtime checks, deploy observation, and explicit user test instructions unless visual debugging is actually needed.

## Goal

Update the checked-in harness so browser automation is optional by default rather than an implied requirement for visible stories.

## Scope

In scope:

1. Update the rulebook and completion contract to remove agent-run browser walkthroughs as a default closeout expectation.
2. Update the story template and authoring guide so new stories prefer lighter proof paths first.
3. Record the correction in workflow memory and the harness ledgers.

Out of scope:

1. Removing seeded proof lanes or `What To Test` instructions.
2. Forbidding browser automation when a story truly needs visual debugging.
3. Rewriting older story files that still mention direct product inspection.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md`
2. `docs/DEFINITION_OF_DONE.md`
3. `docs/user-stories/TEMPLATE.md`
4. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`
5. `docs/WORKFLOW_MEMORY.md`
6. `docs/user-stories/README.md`
7. `docs/user-stories/phase-x/README.md`

## Preparation Phase

1. Read the workflow and story-contract docs above.
2. Confirm the smallest durable set of wording changes needed.
3. Keep the change scoped to the harness only.

### Preparation Notes

Local docs reviewed:

1. `AGENTS.md`
2. `docs/DEFINITION_OF_DONE.md`
3. `docs/user-stories/TEMPLATE.md`
4. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`
5. `docs/WORKFLOW_MEMORY.md`
6. `docs/user-stories/README.md`
7. `docs/user-stories/phase-x/README.md`

Expected contract changes:

1. Visible-story handoffs should still require `What To Test`, seeded proof lanes, and deploy observation where relevant.
2. Browser automation should become optional by default.
3. The correction should be recorded in workflow memory and phase ledgers.

Planned failing checks:

1. The workflow currently leaves room to treat browser walkthroughs as part of the default closeout path.
2. The story template does not explicitly say to prefer lighter proof paths first.
3. The correction is not yet recorded in workflow memory or the harness story ledgers.

## Preconditions

- [x] Harness docs were audited
- [x] Working branch exists
- [x] No runtime code changes are required

## TDD Plan

1. Update `AGENTS.md` and `docs/DEFINITION_OF_DONE.md`.
2. Update `docs/user-stories/TEMPLATE.md` and `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`.
3. Record the correction in `docs/WORKFLOW_MEMORY.md` and the story ledgers.

## Step-by-step Implementation Plan

1. Patch the workflow rulebook and completion contract.
2. Patch the story template and story-authoring guide.
3. Add this harness story and update the queue and checkpoint logs.
4. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: `AGENTS.md` says browser automation is not the default completion gate for visible stories.
- [x] AC-2: The definition-of-done and story template prefer lighter proof paths first.
- [x] AC-3: The correction is recorded in workflow memory and the harness story ledgers.

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
- Route or URL: `AGENTS.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/TEMPLATE.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/WORKFLOW_MEMORY.md`
- Interaction: inspect the closeout language for visible stories
- Expected result: the workflow prefers seeded proof lanes, runtime or API checks, deploy observation, and explicit user test steps before any agent-run browser walkthrough
- Failure signal: the docs still imply browser automation is part of the default completion requirement

## User Checkpoint Test

1. Open `AGENTS.md` and confirm browser automation is no longer a default closeout gate for visible stories.
2. Open `docs/user-stories/TEMPLATE.md` and confirm `How To Verify` prefers lighter proof paths first.
3. Run `bash scripts/check_ai_wiring.sh` and confirm the harness audit passes.

## What To Test

- Route or URL: `AGENTS.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/TEMPLATE.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/WORKFLOW_MEMORY.md`
- Interaction: inspect the workflow language for visible-story verification
- Expected visible result: the harness still requires concrete user test steps and seeded proof lanes, but it no longer treats agent-run browser verification as a default closeout step
- Failure signal: the workflow still reads like a browser walkthrough is required for normal closeout

## Checkpoint Result

- Outcome: Done
- Evidence: the checked-in rulebook, definition-of-done, story template, story authoring guide, workflow memory, and story indexes now all say browser automation is optional by default; lighter proof paths are preferred first; `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed.
- Residual risk: older completed story files may still mention direct product inspection in their historical notes until they are touched again.
