# US-916: Agent Design Workflow

## Status

- State: `in-progress`
- Owner: Codex
- Depends on: `US-915`
- Related branch: `codex/us-915-design-agent-canvas`
- Related commit/PR: pending
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want a shared design workflow so design-heavy stories can move through inspiration, canvas work, and implementation without ad hoc tool choices.

## User Story

> As a maintainer, I want Ship's harness to define how Paper, Pencil, Variant, Mobbin, Awwwards, and Cosmos fit into Codex and Claude workflows so design work is repeatable and resumable.

## Goal

Add one canonical design-workflow guide and wire it into the checked-in harness plus the `.ai` compatibility layer so both Codex and Claude users can follow the same design phases.

## Scope

In scope:

1. Research the listed design tools and classify them by role in the workflow.
2. Add a checked-in design-workflow guide for inspiration, canvas, build, and proof phases.
3. Mirror that workflow into the `.ai` compatibility workspace.
4. Update the active Codex and Claude workflow docs to point to the new guide.
5. Extend harness validation so the new design workflow cannot silently drift.

Out of scope:

1. Shipping machine-local Paper or Pencil config into the repo by default.
2. Reworking product UI or design tokens in runtime code.
3. Treating inspiration-only tools as canonical design sources.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` - primary harness contract
2. `docs/CONTEXT.md` - live harness truth
3. `docs/WORKFLOW_MEMORY.md` - durable workflow decisions
4. `docs/IMPLEMENTATION_STRATEGY.md` - broad execution model
5. `docs/README.md` - doc routing surface
6. `docs/guides/developer-workflow-guide.md` - existing workflow summary
7. `docs/guides/ship-claude-cli-integration.md` - Claude-specific integration pattern
8. `.claude/CLAUDE.md` - Claude appendix
9. `.ai/docs/WORKSPACE_INDEX.md` and `.ai/workflows/README.md` - compatibility routing surfaces
10. `scripts/check_ai_wiring.sh`, `scripts/verify_agent_contract.py`, and `scripts/ai_arch_changed.sh` - harness validators

## Preparation Phase

1. Read the local code and contracts listed above.
2. Research which tools are directly agent-wireable versus inspiration-only.
3. Decide the smallest docs-first change that makes the design workflow durable without forcing machine-local setup into the repo.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/README.md`
6. `docs/guides/developer-workflow-guide.md`
7. `docs/guides/ship-claude-cli-integration.md`
8. `.claude/CLAUDE.md`
9. `.ai/docs/WORKSPACE_INDEX.md`
10. `.ai/workflows/README.md`
11. `scripts/check_ai_wiring.sh`
12. `scripts/verify_agent_contract.py`
13. `scripts/ai_arch_changed.sh`
14. `.gitignore`

Expected contracts/data shapes:

1. Paper and Pencil should be documented as the editable canvas layer.
2. Variant, Mobbin, Awwwards, and Cosmos should be documented as inspiration/reference inputs unless a stronger official integration path exists.
3. The new workflow should be visible from both the canonical docs and the `.ai` compatibility mirror.

Planned failing tests:

1. The repo lacks a canonical guide for design-heavy stories.
2. Claude and Codex compatibility surfaces do not route to the same design workflow.
3. The harness validators do not enforce the new design-workflow docs.

## UX Script

Happy path:

1. A maintainer starts a design-heavy story.
2. They open the design-workflow guide and follow the same phases across inspiration, canvas, and implementation.
3. Codex and Claude users can both find the same setup and repo-routing rules.

Error path:

1. A maintainer starts a design-heavy story.
2. They guess which design tool should be canonical and which one is only reference input.
3. Setup and workflow drift across agents and the story becomes hard to resume.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Relevant harness docs and scripts were audited before implementation
- [x] This story is scoped to workflow and compatibility docs

## TDD Plan

1. Add the new guide and compatibility workflow brief.
2. Thread them through the active routing surfaces.
3. Update the harness validators.
4. Run `bash scripts/check_ai_wiring.sh`, `python3 scripts/verify_agent_contract.py`, and `git diff --check`.

## Step-by-step Implementation Plan

1. Add this story to the Phase X queue.
2. Create the canonical design-workflow guide in `docs/guides/`.
3. Create the matching `.ai` workflow brief.
4. Update AGENTS, Claude, and `.ai` routing surfaces to reference the new guide.
5. Update workflow docs and harness validators.
6. Validate and then record final metadata in the queue and checkpoint logs.

## Acceptance Criteria

- [ ] AC-1: The repo contains a canonical guide for agent-driven design phases.
- [ ] AC-2: Codex and Claude workflow surfaces both route to the same design guide.
- [ ] AC-3: The `.ai` compatibility workspace mirrors the new design workflow cleanly.
- [ ] AC-4: Harness validation recognizes the new design-workflow files.
- [ ] AC-5: `bash scripts/check_ai_wiring.sh`, `python3 scripts/verify_agent_contract.py`, and `git diff --check` pass.

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

- Prefer the lightest reliable proof path first: doc inspection and harness validation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/guides/agent-design-workflow.md`, `.ai/workflows/design-workflow.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `docs/guides/developer-workflow-guide.md`, `docs/guides/ship-claude-cli-integration.md`
- Interaction: inspect the design workflow references and run the harness validators
- Expected result: design-heavy work now has one shared route across inspiration, canvas, and implementation, and both Codex and Claude surfaces point to it
- Failure signal: the workflow is only documented in one surface, or the harness validators do not know about it

## User Checkpoint Test

1. Open `docs/guides/agent-design-workflow.md`.
2. Confirm it explains how inspiration tools, Paper, Pencil, Codex, and Claude fit together.
3. Open `.ai/workflows/design-workflow.md` and confirm it mirrors the same flow.
4. Run `bash scripts/check_ai_wiring.sh` and confirm the audit passes.

## What To Test

- Route or URL: `docs/guides/agent-design-workflow.md` and `.ai/workflows/design-workflow.md`
- Interaction: inspect the workflow and follow the setup references for Codex and Claude
- Expected visible result: the repo now has a clear, shared design workflow instead of scattered notes
- Failure signal: design guidance is missing, contradictory, or not routed from the main harness docs

## Checkpoint Result

- Outcome: pending
- Evidence: pending
- Residual risk: pending
