# US-904: Autodeploy And Test Handoff Rule

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-901`
- Related branch: `codex/workflow-autodeploy-handoff`
- Related commit/PR: pending finalization
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want closeout guidance that matches how Ship really deploys and how the user really verifies changes.

## User Story

> As a maintainer, I want the harness to treat Railway demo updates as auto-deployed from `master` and require explicit user test steps in handoff so closeout stays accurate and useful.

## Goal

Fix two workflow mismatches in one narrow harness story: stop treating manual Railway demo deploys as the default post-merge step when the demo already auto-deploys from `master`, and require final handoffs to say exactly what the user should test.

## Scope

In scope:

1. Update the checked-in workflow rules to reflect Railway demo auto-deploy from `master`.
2. Strengthen the handoff contract so visible stories must include an explicit `What to test` section.
3. Record the correction in workflow memory and the harness story ledger.

Out of scope:

1. Changing product behavior.
2. Changing the actual Railway deployment pipeline.
3. Rewriting historical story handoffs.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow and closeout rules
2. `docs/CONTEXT.md` — live deployment truth
3. `docs/WORKFLOW_MEMORY.md` — durable corrections and decisions
4. `docs/DEFINITION_OF_DONE.md` — completion gate
5. `docs/user-stories/TEMPLATE.md` — story/handoff contract
6. `docs/user-stories/README.md` — master queue
7. `docs/user-stories/phase-x/README.md` — harness-story index

## Preparation Phase

1. Read the local workflow and story contract docs above.
2. Confirm the smallest durable set of docs to patch.
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

1. `AGENTS.md` should hold the hard workflow rule for auto-finalization, deployment handling, and user-facing verification expectations.
2. `docs/CONTEXT.md` should carry the live truth that Railway demo updates flow from merged `master` changes.
3. The definition-of-done and story template should require explicit user test instructions for visible changes.

Planned failing tests:

1. The workflow still implies manual Railway demo deploy is the default closeout path.
2. The handoff contract does not explicitly require a `What to test` section.
3. The workflow memory log does not capture this correction yet.

## UX Script

Happy path:

1. A visible story finishes and merges to `master`.
2. The final handoff tells the user exactly what route to open, what interaction to perform, and what result to expect.
3. The closeout does not claim manual deploy work that is unnecessary because Railway auto-deploys from `master`.

Error path:

1. The handoff only links a guide or mentions a proof lane without explicit test steps.
2. The closeout attempts a manual Railway deploy even though the platform already auto-deploys from `master`.
3. The same confusion repeats until the harness rules are corrected.

## Preconditions

- [x] Harness docs were audited
- [x] Working branch exists
- [x] No runtime code changes are required

## TDD Plan

1. Update the hard workflow rules in `AGENTS.md`.
2. Update the definition-of-done and story template to require explicit user test instructions.
3. Record the correction in workflow memory and the harness story ledgers.

## Step-by-step Implementation Plan

1. Patch `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/DEFINITION_OF_DONE.md`, and `docs/user-stories/TEMPLATE.md`.
2. Add this harness story and update the queue/checkpoint logs.
3. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Acceptance Criteria

- [x] AC-1: The workflow rules state that Railway demo updates flow automatically from merged `master` changes unless a story explicitly needs manual deploy work.
- [x] AC-2: The final handoff contract requires an explicit `What to test` section for visible behavior changes.
- [x] AC-3: Workflow memory and the harness queue/logs record the correction.

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
- Route or URL: repo root docs surfaces
- Interaction: open `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, and `docs/user-stories/TEMPLATE.md`
- Expected result: the workflow docs now say Railway demo updates follow merged `master` automatically and visible-story handoffs require an explicit `What to test` section
- Failure signal: the docs still imply manual Railway demo deploy is the default closeout path, or visible-story handoffs still lack a required `What to test` contract

## User Checkpoint Test

1. Open `AGENTS.md` and confirm the deployment rules no longer treat manual Railway demo deploys as the default.
2. Open `docs/user-stories/TEMPLATE.md` and confirm it includes `What To Test`.
3. Run `bash scripts/check_ai_wiring.sh` and confirm the harness audit passes.

## What To Test

- Route or URL: `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/DEFINITION_OF_DONE.md`, and `docs/user-stories/TEMPLATE.md`
- Interaction: inspect the updated workflow language for deployment and handoff expectations
- Expected visible result: the docs say Railway demo updates flow from merged `master` changes and future visible-story handoffs must say exactly what to test
- Failure signal: the workflow still tells agents to manually deploy Railway by default or still allows vague final handoffs

## Checkpoint Result

- Outcome: Done
- Evidence: workflow rules, live context, definition-of-done, and the story template now all encode the autodeploy and explicit-test-handoff corrections; `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed.
- Residual risk: historical handoffs still reflect the older wording until touched again.
