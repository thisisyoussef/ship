# US-915: Organized `.ai` Compatibility Workspace

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-914`
- Related branch: `codex/us-915-ai-compat-workspace`
- Related commit/PR: `383e310`, [PR #199](https://github.com/thisisyoussef/ship/pull/199)
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want an organized `.ai` workspace so AI-facing workflow docs are easy to browse without undoing the repo's docs-first harness reset.

## User Story

> As a maintainer, I want the repo's AI workflows organized under `.ai/` so compatibility tooling has a clean home while `AGENTS.md` and `docs/` stay canonical.

## Goal

Add a structured `.ai` compatibility workspace that mirrors the live harness, documents the active workflow paths, and keeps the runtime state files in a clearer layout without restoring `.ai` as the primary source of truth.

## Scope

In scope:

1. Add an organized `.ai` index, workflow briefs, and compatibility entrypoints.
2. Keep `AGENTS.md` plus `docs/` as the canonical control plane.
3. Wire the new `.ai` compatibility surface into the harness checks so it does not drift.

Out of scope:

1. Reverting the repo back to a `.ai`-first harness.
2. Rewriting archived historical docs for perfect `.ai` consistency.
3. Changing product runtime behavior or deployment infrastructure.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — current harness contract and branch/finalization rules
2. `docs/CONTEXT.md` — confirms the docs-first harness and current `.ai` state
3. `docs/WORKFLOW_MEMORY.md` — durable workflow rules that the compatibility workspace must mirror
4. `docs/IMPLEMENTATION_STRATEGY.md` — broad execution model
5. `docs/user-stories/README.md` — master queue and dependency graph
6. `docs/DEFINITION_OF_DONE.md` — completion gate for harness changes
7. `docs/user-stories/phase-x/README.md` — Phase X sequence and execution notes
8. `scripts/check_ai_wiring.sh` — current harness validator
9. `scripts/verify_agent_contract.py` — required-file contract
10. `scripts/ai_arch_changed.sh` — AI-architecture change detection
11. `.ai/state/tdd-handoff/README.md` — existing `.ai` contract surface that must remain truthful

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm which `.ai` surfaces still exist and which workflow gaps make the directory feel disorganized.
3. Design the smallest compatibility workspace that improves navigation without displacing the checked-in docs control plane.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `docs/user-stories/phase-x/README.md`
8. `scripts/check_ai_wiring.sh`
9. `scripts/verify_agent_contract.py`
10. `scripts/ai_arch_changed.sh`
11. `.ai/state/tdd-handoff/README.md`

Expected contracts/data shapes:

1. `AGENTS.md` plus `docs/` remain canonical startup surfaces.
2. `.ai/` stays a compatibility workspace plus runtime state, not the primary harness.
3. Harness validation should fail if the organized `.ai` compatibility workspace drifts or disappears.

Planned failing tests:

1. The repo lacks an organized `.ai` workspace index and workflow map.
2. The required-file contract does not enforce the new `.ai` compatibility surface.
3. AI-architecture detection does not notice organized `.ai` harness changes.

## UX Script

Happy path:

1. A maintainer opens `.ai/`.
2. They find a clear workspace index, workflow briefs, and agent entrypoints.
3. Every `.ai` page points back to the canonical `AGENTS.md` and `docs/` control plane.

Error path:

1. A maintainer opens `.ai/`.
2. They see only raw state files and no explanation of how the active harness works.
3. Compatibility tooling or humans guess at outdated workflow structure.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Relevant harness docs and scripts were audited before implementation
- [x] This change is scoped to harness/workflow organization only

## TDD Plan

1. Add the organized `.ai` compatibility workspace.
2. Extend the harness checks to require and verify the new files.
3. Run `bash scripts/check_ai_wiring.sh` and `git diff --check`.

## Step-by-step Implementation Plan

1. Add this story to the Phase X queue.
2. Create a structured `.ai` index, workflow docs, agent entrypoints, and state map.
3. Update harness validation and architecture-change detection for the new `.ai` surface.
4. Refresh the live context docs so the compatibility model is explicit.
5. Validate and record the result in the checkpoint logs.

## Acceptance Criteria

- [x] AC-1: `.ai/` contains a clear compatibility index, workflow docs, agent entrypoints, and state map.
- [x] AC-2: The new `.ai` workspace explicitly points back to `AGENTS.md` plus `docs/` as canonical.
- [x] AC-3: `scripts/check_ai_wiring.sh`, `scripts/verify_agent_contract.py`, and `scripts/ai_arch_changed.sh` all recognize the organized `.ai` surface.
- [x] AC-4: `docs/CONTEXT.md` and `docs/WORKFLOW_MEMORY.md` describe the updated compatibility model truthfully.
- [x] AC-5: Validation passes with `bash scripts/check_ai_wiring.sh` and `git diff --check`.

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
3. Record validation evidence in the checkpoint logs and handoff.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, doc inspection, and harness validation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `.ai/README.md`, `.ai/docs/WORKSPACE_INDEX.md`, `.ai/workflows/`, `.ai/agents/`, `.ai/state/README.md`, `scripts/check_ai_wiring.sh`
- Interaction: inspect the `.ai` workspace layout, then run the harness audit
- Expected result: `.ai` is browseable and organized, still points to canonical docs, and the harness audit passes
- Failure signal: `.ai` still looks like a loose state dump, or the wiring audit misses/breaks the new compatibility files

## User Checkpoint Test

1. Open `.ai/README.md` and `.ai/docs/WORKSPACE_INDEX.md`.
2. Confirm they route back to `AGENTS.md` and the checked-in `docs/` control plane.
3. Run `bash scripts/check_ai_wiring.sh` and confirm the audit passes.

## What To Test

- Route or URL: `.ai/README.md`, `.ai/docs/WORKSPACE_INDEX.md`, and `.ai/workflows/README.md`
- Interaction: inspect the `.ai` directory organization and follow the workflow links back to canonical docs
- Expected visible result: the repo now has a clear, organized `.ai` compatibility workspace instead of only loose state files
- Failure signal: the `.ai` directory remains unclear, unindexed, or disconnected from the checked-in harness docs

## Checkpoint Result

- Outcome: `done`
- Evidence:
  - Added `.ai/README.md`, `.ai/docs/WORKSPACE_INDEX.md`, `.ai/workflows/`, `.ai/agents/`, and `.ai/state/README.md`.
  - Updated `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, and `docs/README.md` to describe the compatibility model truthfully.
  - Updated `scripts/check_ai_wiring.sh`, `scripts/verify_agent_contract.py`, and `scripts/ai_arch_changed.sh` to enforce the new `.ai` surface.
  - `bash scripts/check_ai_wiring.sh`
  - `python3 scripts/verify_agent_contract.py`
  - `git diff --check`
- Residual risk: If future harness changes update `AGENTS.md` and `docs/` without also updating `.ai`, the compatibility workspace could drift again unless the wiring audit stays strict.
