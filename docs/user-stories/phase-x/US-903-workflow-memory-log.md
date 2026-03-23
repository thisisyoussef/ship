# US-903: Workflow Memory Log

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-901`
- Related branch: `codex/workflow-memory-log`
- Related commit/PR: `c417243`, [PR #130](https://github.com/thisisyoussef/ship/pull/130)
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want a durable place to keep recurring corrections and execution patterns so future stories start from repo memory instead of chat memory.

## User Story

> As a maintainer, I want a checked-in workflow memory log so repeated corrections, decisions, and patterns stay visible across stories.

## Goal

Add a lightweight docs surface for recurring workflow memory and wire it into the checked-in harness so future implementation stories can recover that context directly from the repo.

## Scope

In scope:

1. Add a checked-in workflow memory document under `docs/`.
2. Add the new document to the harness read order and validation contract.
3. Seed the document with the current durable corrections, decisions, and useful patterns.

Out of scope:

1. Rewriting historical stories to reference the new doc.
2. Changing FleetGraph product behavior.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — harness read order and maintenance rule
2. `docs/README.md` — top-level docs map
3. `docs/CONTEXT.md` — current live context surface
4. `docs/IMPLEMENTATION_STRATEGY.md` — control-plane description
5. `scripts/check_ai_wiring.sh` — startup and control-plane audit
6. `scripts/verify_agent_contract.py` — required-file contract
7. `docs/user-stories/phase-x/US-902-seeded-verification-entry-rule.md` — recent harness-refinement exemplar

## Preparation Phase

1. Read the local docs and scripts above.
2. Decide where the new memory surface should sit in the harness.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/CONTEXT.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `scripts/check_ai_wiring.sh`
6. `scripts/verify_agent_contract.py`
7. `docs/user-stories/README.md`

Expected contracts/data shapes:

1. The new file should live in `docs/` so it is visible alongside the rest of the harness.
2. The read order should include the new file early enough that it influences planning.
3. Harness validation should fail if the new file is missing or not referenced from the startup surfaces.

Planned failing tests:

1. The harness audit does not yet know about `docs/WORKFLOW_MEMORY.md`.
2. The top-level read order does not yet instruct future stories to read it.
3. There is no checked-in place to record recurring corrections and reusable patterns.

## UX Script

Happy path:

1. A future story starts.
2. The agent reads `docs/WORKFLOW_MEMORY.md` during startup.
3. Recent corrections and durable execution patterns are available without reconstructing them from chat history.

Error path:

1. A repeated correction is only mentioned in chat.
2. A future story misses it and repeats the same mistake.
3. The missing pattern should be promoted into `docs/WORKFLOW_MEMORY.md` and, if needed, a stronger rule surface.

## Preconditions

- [x] Harness docs were audited
- [x] Harness validation scripts were audited
- [x] Working branch exists

## TDD Plan

1. Add the workflow memory doc and seed it with current recurring guidance.
2. Update the harness read order and docs map to reference it.
3. Update the harness validator so the new surface becomes part of the contract.

## Step-by-step Implementation Plan

1. Create `docs/WORKFLOW_MEMORY.md`.
2. Update `AGENTS.md`, `docs/README.md`, `docs/CONTEXT.md`, and `docs/IMPLEMENTATION_STRATEGY.md`.
3. Update `scripts/check_ai_wiring.sh` and `scripts/verify_agent_contract.py`.
4. Update the story queue and checkpoint logs.
5. Run harness validation and diff checks.

## Acceptance Criteria

- [x] AC-1: The repo contains a checked-in workflow memory doc for recurring corrections, decisions, and patterns.
- [x] AC-2: The startup read order and docs map reference the new memory surface.
- [x] AC-3: The harness validator enforces the new memory surface as part of the contract.

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
- Interaction: open `AGENTS.md`, `docs/WORKFLOW_MEMORY.md`, and run `bash scripts/check_ai_wiring.sh`
- Expected result: the new memory doc exists, is part of the read order, and the harness audit passes with it wired in
- Failure signal: the doc is missing from the read order, missing from the validator, or not present at all

## User Checkpoint Test

1. Open `docs/WORKFLOW_MEMORY.md` and confirm it contains recurring corrections, decisions, and patterns.
2. Open `AGENTS.md` and confirm the read order includes `docs/WORKFLOW_MEMORY.md`.
3. Run `bash scripts/check_ai_wiring.sh` and confirm the harness audit passes.

## Checkpoint Result

- Outcome: Done
- Evidence: `docs/WORKFLOW_MEMORY.md` now exists and is part of the harness read order; `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed; startup surfaces and harness validation now enforce the workflow-memory doc.
- Residual risk: The memory log will only stay useful if repeated corrections keep getting promoted into it, so future harness/story follow-through still matters.
