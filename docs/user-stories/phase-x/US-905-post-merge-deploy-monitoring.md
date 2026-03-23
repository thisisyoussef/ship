# US-905: Post-Merge Deploy Monitoring Rule

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-901`
- Related branch: `codex/workflow-post-merge-deploy-monitor`
- Related commit/PR: `693cb3a`, [PR #134](https://github.com/thisisyoussef/ship/pull/134)
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want deploy-relevant stories to include post-merge deployment observation so merge-to-master is not mistaken for a successful release.

## User Story

> As a maintainer, I want the workflow to require post-merge deployment monitoring and remediation so deploy-relevant stories are only considered done when the deployment actually goes green.

## Goal

Strengthen the checked-in workflow so deploy-relevant stories continue through deployment observation after `master` updates, and so any deployment failure is treated as same-story follow-through rather than a separate surprise.

## Scope

In scope:

1. Add a hard workflow rule for post-merge deployment observation on auto-deployed surfaces.
2. Update the completion contract so deploy-relevant stories record whether deployment was observed green or blocked.
3. Record the correction in workflow memory and the harness story ledgers.

Out of scope:

1. Building new deployment automation.
2. Changing actual Railway or AWS infrastructure.
3. Rewriting historical story records.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow and deployment rules
2. `docs/CONTEXT.md` — live deployment truth
3. `docs/WORKFLOW_MEMORY.md` — durable corrections and workflow decisions
4. `docs/DEFINITION_OF_DONE.md` — story completion gate
5. `docs/user-stories/TEMPLATE.md` — executable story contract
6. `docs/user-stories/README.md` — master queue
7. `docs/user-stories/phase-x/README.md` — harness story index

## Preparation Phase

1. Read the local workflow and story contract docs above.
2. Confirm the smallest durable set of contract updates.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/DEFINITION_OF_DONE.md`
5. `docs/user-stories/TEMPLATE.md`
6. `docs/user-stories/README.md`
7. `docs/user-stories/phase-x/README.md`

Expected contracts/data shapes:

1. `AGENTS.md` should carry the hard rule that deploy-relevant stories on auto-deployed surfaces require post-merge deployment observation.
2. `docs/DEFINITION_OF_DONE.md` and `docs/user-stories/TEMPLATE.md` should make deployment monitoring part of the story contract.
3. `docs/WORKFLOW_MEMORY.md` should remember that deployment failure remains part of the same story until resolved.

Planned failing tests:

1. The workflow does not explicitly require post-merge deployment monitoring after a `master` update.
2. The completion contract does not require recording successful deployment observation for auto-deployed surfaces.
3. The correction is not yet captured in workflow memory or the harness story ledger.

## UX Script

Happy path:

1. A deploy-relevant story merges to `master`.
2. The agent watches the auto-deployed surface until the deployment finishes.
3. The story is only treated as done once the deployment is green or a concrete external blocker is known.

Error path:

1. A deploy-relevant story merges to `master`.
2. The deployment fails after merge.
3. The agent investigates the deploy logs and ships the remediation as part of the same story follow-through until the deploy succeeds or the blocker is external.

## Preconditions

- [x] Harness docs were audited
- [x] Working branch exists
- [x] No runtime code changes are required

## TDD Plan

1. Update `AGENTS.md` with the new post-merge deployment monitoring rule.
2. Update the definition-of-done and story template to require deployment observation details.
3. Record the correction in workflow memory and the harness story ledgers.

## Step-by-step Implementation Plan

1. Patch `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/DEFINITION_OF_DONE.md`, and `docs/user-stories/TEMPLATE.md`.
2. Add this harness story and update the queue/checkpoint logs.
3. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: The workflow rules say deploy-relevant stories on auto-deployed surfaces must be monitored after merge until deployment completes or an exact blocker is known.
- [x] AC-2: The completion contract requires recording post-merge deployment observation for deploy-relevant stories.
- [x] AC-3: Workflow memory and the harness story ledgers record the correction.

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
- Route or URL: `AGENTS.md`, `docs/DEFINITION_OF_DONE.md`, `docs/user-stories/TEMPLATE.md`, and `docs/WORKFLOW_MEMORY.md`
- Interaction: inspect the updated workflow language for post-merge deployment observation
- Expected result: the docs state that deploy-relevant stories must be monitored after merge until deployment succeeds or an exact blocker is recorded
- Failure signal: the docs still allow deploy-relevant stories to stop at merge time without deployment observation

## User Checkpoint Test

1. Open `AGENTS.md` and confirm deploy-relevant stories require post-merge deployment monitoring on auto-deployed surfaces.
2. Open `docs/DEFINITION_OF_DONE.md` and confirm deployment observation is part of completion.
3. Run `bash scripts/check_ai_wiring.sh` and confirm the harness audit passes.

## What To Test

- Route or URL: `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/DEFINITION_OF_DONE.md`, and `docs/user-stories/TEMPLATE.md`
- Interaction: inspect the workflow language for deploy monitoring and remediation ownership
- Expected visible result: the workflow now says deploy-relevant stories continue through post-merge deployment observation, and deployment failures are fixed as same-story follow-through
- Failure signal: the workflow still treats merge-to-master as sufficient completion for deploy-relevant changes

## Checkpoint Result

- Outcome: Done
- Evidence: the workflow rulebook, live context, workflow memory, definition of done, and story template now all require post-merge deployment monitoring for deploy-relevant stories; `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed.
- Residual risk: actual deploy-log access still depends on the available provider credentials and tooling in the local environment.
