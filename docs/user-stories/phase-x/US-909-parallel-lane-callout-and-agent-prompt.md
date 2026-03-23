# US-909: Parallel-Lane Callout and Agent Prompt

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-908`
- Related branch: `codex/parallel-lane-callout`
- Parallel dependency / merge order: independent workflow branch; may merge separately from product branches already in flight
- Related commit/PR: pending finalization
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want continuation guidance to say when parallel work is available so they can spin up another agent immediately without guessing.

## User Story

> As a maintainer, I want continue and next-step responses to explicitly call out any safe parallel lane and hand me a copy-paste prompt for another agent so I can launch parallel story work without extra back-and-forth.

## Goal

Strengthen the checked-in workflow so continuation, story-selection, and story-creation responses explicitly say whether another checked-in story can run in parallel right now and, when one exists, provide a ready-to-send prompt inline in chat rather than writing a prompt file.

## Scope

In scope:

1. Add a hard workflow rule for explicit parallel-lane callouts during continue, next-story, and story-creation guidance.
2. Require an inline copy-paste prompt for the recommended parallel lane when one exists.
3. Record the rule in workflow memory, planning docs, harness audit, and the story ledgers.

Out of scope:

1. Building queue-scheduling automation.
2. Creating or storing prompt files in the repo.
3. Modifying product or runtime code.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow rulebook
2. `docs/WORKFLOW_MEMORY.md` — durable workflow corrections and decisions
3. `docs/IMPLEMENTATION_STRATEGY.md` — broad execution model
4. `docs/user-stories/README.md` — master queue and workflow
5. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` — story authoring process
6. `docs/DEFINITION_OF_DONE.md` — handoff gate
7. `scripts/check_ai_wiring.sh` — harness audit contract
8. `docs/user-stories/phase-x/README.md` — harness story index
9. `docs/user-stories/phase-x/US-908-parallel-multi-agent-branch-workflow.md` — closest workflow exemplar

## Preparation Phase

1. Read the local workflow and story contract docs above.
2. Confirm the smallest durable set of workflow-doc and harness-audit updates.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/WORKFLOW_MEMORY.md`
3. `docs/IMPLEMENTATION_STRATEGY.md`
4. `docs/user-stories/README.md`
5. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `scripts/check_ai_wiring.sh`
8. `docs/user-stories/phase-x/README.md`
9. `docs/user-stories/phase-x/US-908-parallel-multi-agent-branch-workflow.md`

Expected contracts/data shapes:

1. `AGENTS.md` should require explicit parallel-lane callouts during continue or next-story guidance.
2. The workflow docs should require a ready-to-send copy-paste prompt inline in chat when a parallel lane exists, while avoiding prompt files by default.
3. The harness audit should fail if the stronger planning and handoff wording is removed later.

Planned failing tests:

1. The checked-in workflow does not yet force continuation responses to say whether another story is available for parallel work.
2. The workflow does not yet require an inline copy-paste prompt for the recommended other agent.
3. The harness audit does not yet guard the new wording.

## UX Script

Happy path:

1. The user asks the agent to continue or choose the next story.
2. The agent checks the queue and dependencies, says whether another checked-in story is safe to run in parallel, and names the story ID.
3. If a lane exists, the agent includes a copy-paste prompt inline in chat for the other agent.

Error path:

1. The user asks to continue and the queue has no other unblocked story.
2. The agent stays silent about parallelism or makes the user infer the blocker.
3. The workflow docs now require the agent to say plainly that no other queued story is unblocked and to name the blocking dependency or merge-order reason.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Any sibling-branch dependency or required merge order is recorded
- [x] Harness docs were audited
- [x] No runtime code changes are required

## TDD Plan

1. Patch `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, and `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` with the new callout-and-prompt rule.
2. Patch `scripts/check_ai_wiring.sh` so the harness audit enforces the new wording.
3. Add this Phase X story and update the queue/checkpoint logs.

## Step-by-step Implementation Plan

1. Update the primary workflow docs with explicit parallel-lane callout language.
2. Update the planning and handoff docs so they require an inline copy-paste prompt when a parallel lane exists and a plain blocker statement when none exists.
3. Update the harness audit so future drift is caught automatically.
4. Add `US-909` to the story indexes and checkpoint logs.
5. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: `AGENTS.md` and the checked-in workflow docs say continue, next-story, and story-creation responses must explicitly state whether another checked-in story can run in parallel now.
- [x] AC-2: The checked-in workflow docs say that when a parallel lane exists, the response must include a ready-to-send copy-paste prompt inline in chat instead of writing a prompt file.
- [x] AC-3: Workflow memory, the handoff gate, the harness audit, and the story ledgers record the rule.

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
- Route or URL: `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `scripts/check_ai_wiring.sh`
- Interaction: inspect the workflow language for explicit parallel-lane callouts and inline copy-paste prompt guidance, then run the harness audit
- Expected result: the docs state that continue or next-story responses must say whether another checked-in story can run in parallel now and must include a ready-to-send prompt inline in chat when one exists
- Failure signal: the docs still leave parallel-lane availability implicit, still omit the inline prompt requirement, or the harness audit does not guard the rule

## User Checkpoint Test

1. Open `AGENTS.md` and confirm it now requires explicit parallel-lane callouts during continue and next-story guidance.
2. Open `docs/user-stories/README.md` and confirm the Build Workflow requires an inline copy-paste prompt when a parallel lane exists.
3. Run `bash scripts/check_ai_wiring.sh` and confirm the harness audit passes.

## What To Test

- Route or URL: `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `scripts/check_ai_wiring.sh`
- Interaction: inspect the workflow and handoff language for explicit parallel-lane callouts and inline copy-paste prompt guidance
- Expected visible result: the harness now requires continue or next-story responses to say whether another queued story can run in parallel now and to include a ready-to-send prompt inline in chat when one exists
- Failure signal: the harness still makes the user infer parallel availability or still expects prompts to be written elsewhere

## Checkpoint Result

- Outcome: Done
- Evidence: `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `scripts/check_ai_wiring.sh` now require explicit parallel-lane callouts plus inline copy-paste prompts; `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed.
- Residual risk: this is a documentation-and-process change, so the behavior still depends on maintainers and agents following the stronger handoff guidance consistently.
