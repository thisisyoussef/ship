# US-913: Queue-First Workflow Reset

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-910`
- Related branch: `codex/us-913-queue-first-workflow-reset`
- Related commit/PR: `pending finalization`
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want the checked-in harness to stay easy to follow so the queue model does not get buried under extra coordination ceremony.

## User Story

> As a maintainer, I want to roll back the recent parallel-agent workflow additions and return to the simpler queue-first model so story work is easier to understand and maintain.

## Goal

Remove the recently added parallel-agent coordination layer from the checked-in harness and return Ship to the earlier queue-first workflow. Keep the story-driven model, branch-per-story rule, deploy/test guidance, and harness audit, but drop the extra rules around queue-truth preflights, `Active Work` tracking, inline agent-launch prompts, and merge-lock coordination.

## Scope

In scope:

1. Revert the core workflow docs to the simpler queue-first guidance.
2. Remove merge-lock-specific scripts, guides, and harness checks.
3. Restore the user-story template and creation guide to the lighter queue model.
4. Clean up queue/story status that only existed to support the parallel-agent drafting workflow.

Out of scope:

1. Reverting the checked-in story model itself.
2. Reverting deploy-truth, proof-lane, or browser-verification rules that are unrelated to the parallel-agent workflow.
3. Changing FleetGraph product behavior.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary harness rules to simplify
2. `docs/CONTEXT.md` — current workflow truth summary
3. `docs/WORKFLOW_MEMORY.md` — durable decisions that need the rollback recorded cleanly
4. `docs/IMPLEMENTATION_STRATEGY.md` — broad execution model to reset
5. `docs/DEFINITION_OF_DONE.md` — completion gate to simplify
6. `docs/user-stories/README.md` — master queue and workflow steps to restore
7. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` — story-authoring process that picked up the extra coordination layer
8. `docs/user-stories/TEMPLATE.md` — story fields and checklist that picked up active-work and merge-lock requirements
9. `docs/user-stories/phase-3/README.md` and `docs/user-stories/phase-x/README.md` — phase queue surfaces carrying `Active Work`
10. `docs/user-stories/CHECKPOINT-LOG.md` and `docs/user-stories/phase-x/CHECKPOINT-LOG.md` — story ledger updates for the rollback
11. `scripts/check_ai_wiring.sh` — harness audit that currently enforces merge-lock and inline-prompt language
12. `scripts/git_finalize_guard.sh` — finalization guard that currently requires the merge lock
13. `docs/guides/finalization-recovery.md` and `docs/guides/merge-coordination.md` — recovery guidance touched by the merge-lock flow
14. `scripts/merge_lock.sh` — merge-lock helper to remove
15. `git show e33c67d:<path>` for the workflow docs and scripts — pre-parallel baseline used as the queue-first reference

## Preparation Phase

1. Compare the current docs and scripts against the simpler pre-parallel baseline.
2. Identify which recent workflow changes were specifically added for parallel-agent coordination.
3. Confirm which queue/story statuses should collapse back to normal queue entries once `Active Work` goes away.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/DEFINITION_OF_DONE.md`
6. `docs/user-stories/README.md`
7. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`
8. `docs/user-stories/TEMPLATE.md`
9. `docs/user-stories/phase-3/README.md`
10. `docs/user-stories/phase-x/README.md`
11. `docs/user-stories/CHECKPOINT-LOG.md`
12. `docs/user-stories/phase-x/CHECKPOINT-LOG.md`
13. `scripts/check_ai_wiring.sh`
14. `scripts/git_finalize_guard.sh`
15. `docs/guides/finalization-recovery.md`
16. `docs/guides/merge-coordination.md`
17. `scripts/merge_lock.sh`
18. The live local git worktree/branch state, which had already drifted away from the checked-in `Active Work` view

Expected contracts/data shapes:

1. `bash scripts/check_ai_wiring.sh` should continue to audit the checked-in harness after the rollback, but it should stop requiring merge-lock and inline prompt wording.
2. `bash scripts/git_finalize_guard.sh` should go back to checking clean git state and upstream sync without requiring a separate merge-lock claim.
3. The master queue should remain the source of truth, but blocked future stories should stay in the normal queue instead of being surfaced through an extra `Active Work` layer.

Planned failing tests:

1. Harness audit fails if docs still require queue-truth preflights, inline prompt rules, or merge-lock coordination.
2. Harness audit fails if the merge-lock artifacts are removed but the supporting docs/scripts still reference them.
3. Queue docs still imply `US-619` is actively underway instead of waiting in the normal dependency queue.

## UX Script

Happy path:

1. A maintainer opens the checked-in harness docs to start or continue story work.
2. They see the simpler queue-first workflow: choose from the queue, start a story branch, follow the story file, validate, and finalize.
3. They are not asked to reconcile worktrees, publish `Active Work`, draft another agent prompt inline, or claim a merge lock first.

Error path:

1. A maintainer opens the harness docs after the rollback.
2. The docs still mention queue-truth preflights, active-work visibility, inline prompt requirements, or merge-lock steps.
3. The harness still feels split between the older queue model and the newer parallel-agent coordination layer.

## Preconditions

- [ ] Fresh story branch is checked out from current `master` before edits begin
- [ ] The queue-first baseline is identified from checked-in history before patching
- [ ] Harness change validation will run before handoff

## TDD Plan

1. Use targeted doc/script diffs against the pre-parallel baseline to drive the rollback.
2. Run `bash scripts/check_ai_wiring.sh` after the docs/script cleanup.
3. Run `git diff --check` before handoff and finalization.

## Step-by-step Implementation Plan

1. Add this rollback story to the queue and checkpoint ledgers.
2. Patch the core harness docs back to the simpler queue-first workflow language.
3. Remove merge-lock artifacts and restore the finalization guard plus audit to the lighter model.
4. Clean story and queue metadata that only existed for the parallel-agent workflow.
5. Validate the simplified harness and record the rollback evidence.

## Acceptance Criteria

- [ ] AC-1: `AGENTS.md`, the strategy docs, and the story docs no longer require queue-truth preflights, `Active Work` tracking, inline agent-launch prompts, or merge-lock coordination.
- [ ] AC-2: `docs/guides/merge-coordination.md` and `scripts/merge_lock.sh` are removed, and the harness scripts no longer depend on them.
- [ ] AC-3: Story authoring surfaces return to the simpler queue-first model without active-worktree or merge-order metadata.
- [ ] AC-4: The queue reflects blocked future work like `US-619` as normal queued work instead of active parallel drafting.
- [ ] AC-5: `bash scripts/check_ai_wiring.sh` and `git diff --check` pass after the rollback.

## Local Validation

Run these before handoff:

```bash
bash scripts/check_ai_wiring.sh
git diff --check
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. Record the runtime proof path if blocked or not deployed.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, `docs/user-stories/TEMPLATE.md`, `scripts/check_ai_wiring.sh`, and `scripts/git_finalize_guard.sh`
- Interaction: inspect the workflow docs for the queue-first path and run the harness audit
- Expected result: the docs describe the simpler queue-first workflow and the harness audit passes without any merge-lock or inline prompt requirements
- Failure signal: the docs still describe the parallel-agent coordination layer or the harness audit still expects merge-lock/prompt language

## User Checkpoint Test

1. Open `AGENTS.md` and `docs/user-stories/README.md`.
2. Confirm the startup flow reads like the simpler queue-first model.
3. Run `bash scripts/check_ai_wiring.sh`.
4. Confirm the audit passes without any merge-lock or active-work guidance remaining.

## What To Test

- Route or URL: `AGENTS.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `scripts/check_ai_wiring.sh`
- Interaction: read the workflow steps, then run the harness audit
- Expected visible result: the workflow returns to queue-first guidance and the audit succeeds
- Failure signal: the workflow still asks for active-work/parallel coordination steps or the harness audit fails

## Checkpoint Result

- Outcome: `done`
- Evidence:
  - `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md` now describe the simpler queue-first workflow.
  - `docs/guides/merge-coordination.md` and `scripts/merge_lock.sh` were removed.
  - `docs/user-stories/phase-3/README.md` and `docs/user-stories/phase-3/US-619-fleetgraph-left-sidebar-global-findings-queue.md` now treat `US-619` as blocked queued work instead of active parallel drafting.
  - `bash scripts/check_ai_wiring.sh`
  - `git diff --check`
- Residual risk:
  - `US-908`, `US-909`, and `US-910` remain in the phase history as completed stories, so future readers should follow the current harness docs and `US-913`, not those superseded workflow details.
