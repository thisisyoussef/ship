# US-917: Design Visual Evaluation Loop

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-916`
- Related branch: `codex/us-917-visual-eval-loop`
- Related commit/PR: `7e261fb`, [PR #203](https://github.com/thisisyoussef/ship/pull/203)
- Target environment: `repo-only`

## Persona

**Maintainers and coding agents** want a shared screenshot-driven evaluation loop so design-heavy work can iterate with explicit visual criteria instead of ad hoc taste checks.

## User Story

> As a maintainer, I want Ship's design workflow to include Playwright- or screenshot-driven visual evaluation so Codex and Claude can iteratively improve implementations and designs with a clear rubric.

## Goal

Extend the checked-in design harness with a reusable visual-evaluation loop that uses the repo's Playwright MCP surface when needed, keeps browser automation optional instead of mandatory, and gives both Codex and Claude a concrete rubric for screenshot-driven iteration.

## Scope

In scope:

1. Add a canonical guide for screenshot-driven visual evaluation and iteration.
2. Integrate that guide into the existing design workflow plus Codex and Claude compatibility surfaces.
3. Treat the tracked Playwright MCP setup as the default browser-based capture tool when the story needs visual debugging.
4. Add explicit evaluation criteria and recording guidance for design-heavy stories.
5. Extend harness validation so the new guide and MCP contract cannot silently drift.

Out of scope:

1. Making browser automation the default completion gate for all visible stories.
2. Shipping a new runtime UI change outside the harness/docs surface.
3. Adding tracked machine-local screenshot utilities beyond the repo-level Playwright MCP contract.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` - primary harness contract
2. `docs/CONTEXT.md` - current harness truth
3. `docs/WORKFLOW_MEMORY.md` - recurring workflow decisions
4. `docs/IMPLEMENTATION_STRATEGY.md` - execution model
5. `docs/user-stories/README.md` - queue and dependencies
6. `docs/user-stories/phase-x/US-916-agent-design-workflow.md` - prior design-harness baseline
7. `docs/DEFINITION_OF_DONE.md` - completion gate
8. `.claude/CLAUDE.md` - secondary appendix
9. `docs/guides/agent-design-workflow.md` - current design guide
10. `.ai/workflows/design-workflow.md` - compatibility mirror
11. `.mcp.json` - tracked Playwright MCP contract
12. `docs/guides/developer-workflow-guide.md` and `docs/guides/ship-claude-cli-integration.md` - workflow routing surfaces
13. `docs/reference/claude/testing.md` - existing Playwright/screenshot guidance
14. `scripts/check_ai_wiring.sh`, `scripts/verify_agent_contract.py`, and `scripts/ai_arch_changed.sh` - harness validators

## Preparation Phase

1. Read the local code and contracts listed above.
2. Identify the smallest durable place to add screenshot-driven visual evaluation without conflicting with the existing "no default browser gate" rule.
3. Define the rubric and evidence path before editing the workflow docs.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `.claude/CLAUDE.md`
8. `docs/user-stories/phase-x/US-916-agent-design-workflow.md`
9. `docs/guides/agent-design-workflow.md`
10. `.ai/workflows/design-workflow.md`
11. `.mcp.json`
12. `docs/reference/claude/testing.md`
13. `docs/guides/developer-workflow-guide.md`
14. `docs/guides/ship-claude-cli-integration.md`
15. `.ai/README.md`
16. `.ai/codex.md`
17. `.ai/agents/claude.md`
18. `.ai/docs/WORKSPACE_INDEX.md`
19. `.ai/workflows/README.md`
20. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`
21. `scripts/check_ai_wiring.sh`
22. `scripts/verify_agent_contract.py`
23. `scripts/ai_arch_changed.sh`

Expected contracts/data shapes:

1. The design workflow should keep the story and chosen canvas as the source of truth; screenshots are evidence and critique inputs, not the source of truth.
2. The repo-level Playwright MCP config in `.mcp.json` should be treated as the default browser-based capture surface when visual debugging is warranted.
3. Visual evaluation should stay optional and story-scoped, consistent with the existing browser-automation guardrails.
4. Codex and Claude compatibility surfaces should both point to the same rubric and loop.

Planned failing tests:

1. There is no canonical guide for screenshot-driven visual evaluation in design-heavy stories.
2. The design workflow does not explain when to use Playwright MCP versus lighter proof paths.
3. The compatibility workspace does not expose a reusable visual-eval brief.
4. The harness validators do not enforce the new guide or the tracked `.mcp.json` contract.

## UX Script

Happy path:

1. A maintainer starts a design-heavy story and chooses Paper or Pencil as the design canvas.
2. After the first implementation or design pass, they use the visual-evaluation guide to capture targeted screenshots with Playwright MCP.
3. They score the result against a small rubric, make the smallest useful change, and re-capture until the critical issues are gone.
4. Codex and Claude users can follow the same loop and record the proof in the story.

Error path:

1. A maintainer starts a design-heavy story and relies on vague taste checks.
2. Browser automation is either skipped entirely or overused as a heavy default gate.
3. Visual quality drifts, screenshots are not comparable, and the next agent cannot tell what was judged good enough.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Relevant harness docs and scripts were audited before implementation
- [x] The repo already tracks a Playwright MCP server in `.mcp.json`

## TDD Plan

1. Add the new visual-evaluation guide and `.ai` compatibility brief.
2. Thread them through the design workflow and active Codex/Claude routing surfaces.
3. Extend the harness validators to require the new docs and `.mcp.json` contract.
4. Run `bash scripts/check_ai_wiring.sh`, `python3 scripts/verify_agent_contract.py`, and `git diff --check`.

## Step-by-step Implementation Plan

1. Add this story to the Phase X queue.
2. Create the canonical visual-evaluation guide in `docs/guides/`.
3. Add the matching `.ai` workflow brief.
4. Update the design workflow guide to explain where the visual loop fits.
5. Update AGENTS, Claude, `.ai`, and story-authoring docs to route to the new guide.
6. Extend validators so the new guide and `.mcp.json` are part of the harness contract.
7. Validate and record final metadata in the queue and checkpoint logs.

## Acceptance Criteria

- [x] AC-1: The repo contains a canonical guide for screenshot-driven visual evaluation in design-heavy stories.
- [x] AC-2: The existing design workflow explains how Playwright MCP and screenshot capture fit without becoming the default closeout gate.
- [x] AC-3: Codex and Claude compatibility surfaces both point to the same visual-eval loop and rubric.
- [x] AC-4: Harness validation enforces the new guide and the tracked `.mcp.json` contract.
- [x] AC-5: `bash scripts/check_ai_wiring.sh`, `python3 scripts/verify_agent_contract.py`, and `git diff --check` pass.

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
3. Record doc-inspection and validator evidence in the checkpoint logs and handoff.

## How To Verify

- Prefer the lightest reliable proof path first: doc inspection and harness validation.
- Use Playwright or screenshot capture only as the workflow being documented, not as an extra product gate.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/guides/agent-design-workflow.md`, `docs/guides/design-visual-evaluation.md`, `.ai/workflows/design-workflow.md`, `.ai/workflows/visual-eval-loop.md`, `.mcp.json`
- Interaction: inspect the workflow docs, confirm the visual-eval rubric and loop are routed from Codex and Claude surfaces, and run the harness validators
- Expected result: design-heavy stories now have a documented screenshot-driven improvement loop with explicit criteria and a tracked Playwright MCP path
- Failure signal: visual evaluation is undocumented, contradictory, or the Playwright MCP contract can drift without the harness noticing

## User Checkpoint Test

1. Open `docs/guides/agent-design-workflow.md` and confirm it points to the visual-evaluation loop.
2. Open `docs/guides/design-visual-evaluation.md` and confirm it explains when to use Playwright MCP, what to evaluate, and how to iterate.
3. Open `.ai/workflows/design-workflow.md` and `.ai/workflows/visual-eval-loop.md` and confirm the same flow is visible to Codex and Claude-oriented tooling.
4. Run `bash scripts/check_ai_wiring.sh` and confirm the audit passes.

## What To Test

- Route or URL: `docs/guides/design-visual-evaluation.md` plus `.mcp.json`
- Interaction: inspect the guide and repo MCP contract together
- Expected visible result: the repo now documents a concrete visual-iteration loop with screenshot capture, rubric criteria, and recording guidance
- Failure signal: the guide lacks actionable criteria, ignores Playwright MCP, or conflicts with the repo's lighter default proof rules

## Checkpoint Result

- Outcome: `done`
- Evidence:
  - Added `docs/guides/design-visual-evaluation.md` as the canonical screenshot-driven design-iteration guide.
  - Added `.ai/workflows/visual-eval-loop.md` and threaded it through the `.ai` compatibility workspace.
  - Updated `docs/guides/agent-design-workflow.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `.clauderc`, `CLAUDE.md`, `docs/guides/developer-workflow-guide.md`, and `docs/guides/ship-claude-cli-integration.md` so the visual-eval loop is routed across Codex and Claude workflows.
  - Updated `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`, and the story queue so screenshot-driven iteration is part of the checked-in harness.
  - Updated `scripts/check_ai_wiring.sh`, `scripts/verify_agent_contract.py`, and `scripts/ai_arch_changed.sh` so the new guide and tracked `.mcp.json` Playwright MCP contract are enforced.
  - `bash scripts/check_ai_wiring.sh`
  - `python3 scripts/verify_agent_contract.py`
  - `git diff --check`
- Residual risk:
  - Claude-local Playwright registration remains user-scoped. The repo now defines the loop and contract clearly, but individual Claude environments may still need local MCP setup outside the checked-in repo.
