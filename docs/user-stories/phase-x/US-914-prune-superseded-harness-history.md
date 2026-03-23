# US-914: Prune Superseded Harness History

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-913`
- Related branch: `codex/us-914-prune-harness-history`
- Related commit/PR: `9909a6f`, [PR #176](https://github.com/thisisyoussef/ship/pull/176)
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want the checked-in harness to only present current workflow truth so story selection stays easy to follow.

## User Story

> As a maintainer, I want retired workflow-history stories and their leftover narrative traces removed from the checked-in docs so the queue only shows the current harness path.

## Goal

Remove superseded harness-history story files and leftover historical narration from the queue surfaces so the checked-in docs stay focused on the current queue-first workflow.

## Scope

In scope:

1. Remove retired harness-history story files that no longer reflect the current workflow.
2. Trim queue and checkpoint surfaces so they stop recording the retired stories.
3. Remove the old narrative execution timeline from the master story queue.
4. Keep the current queue-first reset story and active harness docs truthful after the cleanup.

Out of scope:

1. Changing product-story order in Phase 2 or Phase 3.
2. Changing runtime code, deployment scripts, or FleetGraph behavior.
3. Reintroducing a second workflow history surface elsewhere in the repo.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — confirms the checked-in docs are the repo rulebook
2. `docs/WORKFLOW_MEMORY.md` — current durable workflow decisions
3. `docs/IMPLEMENTATION_STRATEGY.md` — current execution model
4. `docs/DEFINITION_OF_DONE.md` — completion gate for harness stories
5. `docs/user-stories/README.md` — master queue and the old execution narrative to remove
6. `docs/user-stories/CHECKPOINT-LOG.md` — cross-phase ledger entries to trim
7. `docs/user-stories/phase-x/README.md` — phase index to keep aligned
8. `docs/user-stories/phase-x/CHECKPOINT-LOG.md` — phase ledger entries to trim
9. `docs/user-stories/phase-x/US-913-queue-first-workflow-reset.md` — current queue-first story that should remain as the active workflow baseline
10. `scripts/check_ai_wiring.sh` — harness validator that must stay green after the cleanup

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm which story files and ledger entries are now only historical noise.
3. Confirm the smallest doc cleanup that leaves the queue truthful and easier to read.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/WORKFLOW_MEMORY.md`
3. `docs/IMPLEMENTATION_STRATEGY.md`
4. `docs/DEFINITION_OF_DONE.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/CHECKPOINT-LOG.md`
7. `docs/user-stories/phase-x/README.md`
8. `docs/user-stories/phase-x/CHECKPOINT-LOG.md`
9. `docs/user-stories/phase-x/US-913-queue-first-workflow-reset.md`
10. `scripts/check_ai_wiring.sh`

Expected contracts/data shapes:

1. The master queue should stay dependency-driven without a second narrative history section.
2. The phase and cross-phase checkpoint logs should only record stories that still exist in the checked-in harness history.
3. The queue-first workflow story should remain as the stable Phase X baseline after the cleanup.

Planned failing tests:

1. The queue still lists retired harness-history stories after the cleanup.
2. The checkpoint logs still record deleted stories.
3. The harness audit fails because the cleanup leaves stale references behind.

## UX Script

Happy path:

1. A maintainer opens the checked-in story queue.
2. They see the current story tables without retired workflow-history detours.
3. They can find the current queue-first guidance without scanning old narrative history.

Error path:

1. A maintainer opens the checked-in story queue.
2. Retired workflow-history stories and their log entries are still present.
3. The queue still reads like a history lesson instead of a current operating guide.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] The retired story files and ledger entries were audited before deletion
- [x] Harness validation will run before handoff

## TDD Plan

1. Remove the retired files and stale queue/log entries.
2. Run `bash scripts/check_ai_wiring.sh`.
3. Run `git diff --check`.

## Step-by-step Implementation Plan

1. Add this cleanup story to the queue and checkpoint ledgers.
2. Delete the retired harness-history story files.
3. Remove their entries from the queue and checkpoint surfaces.
4. Drop the old narrative execution timeline from the master queue.
5. Validate the trimmed harness and record the cleanup evidence.

## Acceptance Criteria

- [x] AC-1: The retired harness-history story files are removed from `docs/user-stories/phase-x/`.
- [x] AC-2: `docs/user-stories/README.md`, `docs/user-stories/CHECKPOINT-LOG.md`, `docs/user-stories/phase-x/README.md`, and `docs/user-stories/phase-x/CHECKPOINT-LOG.md` no longer record the removed stories.
- [x] AC-3: The old `Execution Order` section is removed from `docs/user-stories/README.md`.
- [x] AC-4: The current queue-first harness guidance remains truthful after the cleanup.
- [x] AC-5: `bash scripts/check_ai_wiring.sh` and `git diff --check` pass after the cleanup.

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
- Route or URL: `docs/user-stories/README.md`, `docs/user-stories/CHECKPOINT-LOG.md`, `docs/user-stories/phase-x/README.md`, `docs/user-stories/phase-x/CHECKPOINT-LOG.md`, and `scripts/check_ai_wiring.sh`
- Interaction: inspect the queue and checkpoint surfaces, then run the harness audit
- Expected result: retired workflow-history stories are absent, the narrative execution timeline is gone, and the harness audit passes
- Failure signal: deleted stories still appear in queue or checkpoint docs, or the harness audit fails

## User Checkpoint Test

1. Open `docs/user-stories/README.md`.
2. Confirm the old `Execution Order` section is gone.
3. Confirm the Phase X table only shows the current harness-history stories.
4. Run `bash scripts/check_ai_wiring.sh`.
5. Confirm the audit passes.

## What To Test

- Route or URL: `docs/user-stories/README.md` and `docs/user-stories/phase-x/README.md`
- Interaction: inspect the queue tables and verify the old execution-history section is absent
- Expected visible result: only the current queue-first harness path remains in the checked-in story surfaces
- Failure signal: retired workflow-history stories or the narrative execution timeline are still present

## Checkpoint Result

- Outcome: `done`
- Evidence:
  - Removed retired harness-history story files from `docs/user-stories/phase-x/`.
  - Removed the corresponding queue and checkpoint entries.
  - Removed the `Execution Order` section from `docs/user-stories/README.md`.
  - `bash scripts/check_ai_wiring.sh`
  - `git diff --check`
- Residual risk:
  - Future harness cleanup stories should keep the checked-in queue focused on current workflow truth so historical detours do not accumulate again.
