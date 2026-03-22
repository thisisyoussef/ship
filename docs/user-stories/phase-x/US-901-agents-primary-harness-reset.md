# US-901: AGENTS-First Harness Reset

## Status

- State: `done`
- Owner: Codex
- Depends on:
- Related branch: `codex/agents-primary-harness-reset`
- Related commit/PR:
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want a durable, checked-in control plane so work can resume from the repository instead of from a sidecar workspace.

## User Story

> As a maintainer, I want Ship's execution harness to live in `AGENTS.md` plus `docs/` so future work starts from one visible repo contract.

## Goal

Replace the previous `.ai`-centric workspace model with an `AGENTS.md`-first docs harness modeled on the local Ghostfolio reference, while preserving the scripts and checkpoints Ship still needs.

## Scope

In scope:

1. Add the docs-driven control plane.
2. Rewrite active startup and enforcement surfaces to the new model.
3. Retire the old `.ai` text workspace files.

Out of scope:

1. Rewriting historical archived docs for perfect consistency.
2. Porting every active product pack into full story files on this story.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — current harness contract
2. `scripts/check_ai_wiring.sh` — current enforcement surface
3. `scripts/verify_agent_contract.py` — required-file contract
4. `docs/specs/ai-harness/` — recent harness evolution decisions
5. `/Users/youss/Development/gauntlet/agentforge/ghostfolio/docs/` — reference harness shape

## Preparation Phase

1. Audit the current Ship harness and its script dependencies.
2. Compare the local Ghostfolio-style reference shape.
3. Decide which `.ai` surfaces can be retired and which runtime state files must remain.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`, `.claude/CLAUDE.md`, `docs/README.md`
2. `scripts/check_ai_wiring.sh`, `scripts/verify_agent_contract.py`, `scripts/ai_arch_changed.sh`
3. `docs/specs/ai-harness/*`

Expected contracts/data shapes:

1. `AGENTS.md` becomes the primary rulebook.
2. `docs/CONTEXT.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, and `docs/DEFINITION_OF_DONE.md` become the durable harness surfaces.

Planned failing tests:

1. Old harness audit fails until new required files and routing are in place.
2. Script contract fails until required-file checks are rewired.

## UX Script

Happy path:

1. An agent opens the repo.
2. It reads `AGENTS.md` and the `docs/` control plane.
3. It can find the next story and completion rules without the old `.ai` workspace.

Error path:

1. A harness change leaves docs or scripts out of sync.
2. `bash scripts/check_ai_wiring.sh` fails with a clear reason.
3. The maintainer uses `docs/guides/finalization-recovery.md` to recover.

## Preconditions

- [x] Reference repo is available locally
- [x] Current harness surfaces were audited
- [x] Working branch exists

## TDD Plan

1. Rewrite the harness audit to validate the new docs-driven model.
2. Update the required-file contract to the new set of canonical files.
3. Remove the old `.ai` text surfaces only after the new audit passes.

## Step-by-step Implementation Plan

1. Add the new docs control plane.
2. Rewrite startup and enforcement surfaces.
3. Retire the old `.ai` workspace files.
4. Run harness validation and diff checks.

## Acceptance Criteria

- [x] AC-1: `AGENTS.md` is the primary checked-in harness surface.
- [x] AC-2: The repo contains the docs-driven control plane described in this story.
- [x] AC-3: Active harness scripts validate the new contract instead of the old `.ai` workspace docs.

## Local Validation

Run these before handoff:

```bash
bash scripts/check_ai_wiring.sh
python3 scripts/verify_agent_contract.py
git diff --check
```

## Deployment Handoff

1. This is a repo-only harness story.
2. Deployment status should be `not deployed`.
3. Record validation evidence in the checkpoint log and handoff.

## How To Verify

- Route or URL: repo root
- Interaction: inspect `AGENTS.md`, `docs/CONTEXT.md`, `docs/IMPLEMENTATION_STRATEGY.md`, and `docs/user-stories/README.md`
- Expected result: they read as the primary harness surfaces and do not depend on the retired `.ai` workspace docs
- Failure signal: active startup docs or scripts still require `.ai` as canonical

## User Checkpoint Test

1. Open `AGENTS.md` and confirm it points to `docs/` as the primary harness.
2. Open `docs/user-stories/README.md` and confirm it acts as the queue and control plane.
3. Run `bash scripts/check_ai_wiring.sh` and confirm the harness audit passes.

## Checkpoint Result

- Outcome:
- Outcome: Done
- Evidence: `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed; old `.ai` workspace docs retired down to `.ai/state/`; FleetGraph assignment doc case mix updated to the easier planned set.
- Residual risk: Historical archived docs may still mention the older `.ai` model and should be cleaned up opportunistically rather than treated as active contract.
