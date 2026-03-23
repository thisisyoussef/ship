# US-913: Queue-First Workflow Reset

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-907`
- Related branch: `codex/us-913-queue-first-workflow-reset`
- Related commit/PR: `pending finalization`
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want the checked-in harness to stay easy to follow so the queue model does not get buried under extra coordination ceremony.

## User Story

> As a maintainer, I want the checked-in harness to return to the simpler queue-first model so story work is easier to understand and maintain.

## Goal

Simplify the checked-in harness back to the queue-first workflow. Keep the story-driven model, branch-per-story rule, deploy/test guidance, and harness audit, while removing the extra coordination-only workflow layer that had accumulated around story selection and finalization.

## Scope

In scope:

1. Revert the core workflow docs to the simpler queue-first guidance.
2. Remove the extra coordination-specific artifacts from scripts, guides, and harness checks.
3. Restore the user-story template and creation guide to the lighter queue model.
4. Clean up queue/story status that only existed to support the heavier workflow layer.

Out of scope:

1. Reverting the checked-in story model itself.
2. Reverting deploy-truth, proof-lane, or browser-verification rules that are unrelated to the queue-first reset.
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
8. `docs/user-stories/TEMPLATE.md` — story fields and checklist that picked up the extra coordination language
9. `docs/user-stories/phase-3/README.md` and `docs/user-stories/phase-x/README.md` — phase queue surfaces that needed to return to the lighter model
10. `docs/user-stories/CHECKPOINT-LOG.md` and `docs/user-stories/phase-x/CHECKPOINT-LOG.md` — story ledger updates for the rollback
11. `scripts/check_ai_wiring.sh` — harness audit that needed to keep validating the simpler control plane
12. `scripts/git_finalize_guard.sh` — finalization guard that needed to stay aligned with the lighter workflow
13. `docs/guides/finalization-recovery.md` — recovery guidance that needed to remain truthful after the reset
14. `git show e33c67d:<path>` for the workflow docs and scripts — earlier queue-first baseline used as the reference

## Preparation Phase

1. Compare the current docs and scripts against the earlier queue-first baseline.
2. Identify which recent workflow changes were specifically adding coordination-only ceremony.
3. Confirm which queue/story statuses should collapse back to normal queue entries once the extra layer goes away.

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
16. The live local git worktree/branch state, which had already drifted away from the heavier coordination-oriented docs

Expected contracts/data shapes:

1. `bash scripts/check_ai_wiring.sh` should continue to audit the checked-in harness after the rollback while staying focused on the current control plane.
2. `bash scripts/git_finalize_guard.sh` should go back to checking clean git state and upstream sync without requiring extra coordination-only steps.
3. The master queue should remain the source of truth, and blocked future stories should stay in the normal queue.

Planned failing tests:

1. Harness audit fails if docs still require the extra coordination-only workflow layer.
2. Harness audit fails if removed workflow artifacts leave stale references behind.
3. Queue docs still imply `US-619` is actively underway instead of waiting in the normal dependency queue.

## UX Script

Happy path:

1. A maintainer opens the checked-in harness docs to start or continue story work.
2. They see the simpler queue-first workflow: choose from the queue, start a story branch, follow the story file, validate, and finalize.
3. They are not asked to do extra coordination-only setup before ordinary story work.

Error path:

1. A maintainer opens the harness docs after the rollback.
2. The docs still mention superseded coordination-heavy workflow rules.
3. The harness still feels split between the simple queue model and obsolete workflow detours.

## Preconditions

- [ ] Fresh story branch is checked out from current `master` before edits begin
- [ ] The queue-first baseline is identified from checked-in history before patching
- [ ] Harness change validation will run before handoff

## TDD Plan

1. Use targeted doc/script diffs against the earlier queue-first baseline to drive the rollback.
2. Run `bash scripts/check_ai_wiring.sh` after the docs/script cleanup.
3. Run `git diff --check` before handoff and finalization.

## Step-by-step Implementation Plan

1. Add this rollback story to the queue and checkpoint ledgers.
2. Patch the core harness docs back to the simpler queue-first workflow language.
3. Remove the extra coordination artifacts and restore the finalization guard plus audit to the lighter model.
4. Clean story and queue metadata that only existed for the superseded higher-ceremony workflow.
5. Validate the simplified harness and record the rollback evidence.

## Acceptance Criteria

- [ ] AC-1: `AGENTS.md`, the strategy docs, and the story docs no longer require superseded coordination-only workflow rules.
- [ ] AC-2: Obsolete coordination artifacts are removed, and the harness scripts no longer depend on them.
- [ ] AC-3: Story authoring surfaces return to the simpler queue-first model without active-worktree or merge-order metadata.
- [ ] AC-4: The queue reflects blocked future work like `US-619` as normal queued work.
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
- Expected result: the docs describe the simpler queue-first workflow and the harness audit passes without any superseded coordination-only workflow requirements
- Failure signal: the docs still describe the older coordination-heavy workflow or the harness audit still expects retired guidance

## User Checkpoint Test

1. Open `AGENTS.md` and `docs/user-stories/README.md`.
2. Confirm the startup flow reads like the simpler queue-first model.
3. Run `bash scripts/check_ai_wiring.sh`.
4. Confirm the audit passes without obsolete coordination-only guidance remaining.

## What To Test

- Route or URL: `AGENTS.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `scripts/check_ai_wiring.sh`
- Interaction: read the workflow steps, then run the harness audit
- Expected visible result: the workflow returns to queue-first guidance and the audit succeeds
- Failure signal: the workflow still asks for obsolete coordination-only steps or the harness audit fails

## Checkpoint Result

- Outcome: `done`
- Evidence:
  - `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/README.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and `docs/user-stories/TEMPLATE.md` now describe the simpler queue-first workflow.
  - Obsolete coordination artifacts were removed.
  - `docs/user-stories/phase-3/README.md` and `docs/user-stories/phase-3/US-619-fleetgraph-left-sidebar-global-findings-queue.md` now treat `US-619` as blocked queued work.
  - `bash scripts/check_ai_wiring.sh`
  - `git diff --check`
- Residual risk:
  - Future harness cleanups should keep the checked-in docs focused on current workflow truth so retired guidance does not build back up in the queue surfaces.
