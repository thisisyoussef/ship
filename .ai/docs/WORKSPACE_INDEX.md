# AI Workspace Index

This index organizes the compatibility-facing `.ai` surface without changing the live repo contract.

## Start Here

Canonical sources:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`

Compatibility surfaces:

- `.ai/README.md`: explains the role of `.ai/`
- `.ai/codex.md`: Codex-oriented entrypoint
- `.ai/agents/claude.md`: Claude-oriented entrypoint
- `.ai/agents/cursor-agent.md`: Cursor-oriented entrypoint

## Workflow Briefs

- `.ai/workflows/README.md`
- `.ai/workflows/story-lookup.md`
- `.ai/workflows/feature-development.md`
- `.ai/workflows/spec-driven-delivery.md`
- `.ai/workflows/design-workflow.md`
- `.ai/workflows/visual-eval-loop.md`
- `.ai/workflows/parallel-flight.md`
- `.ai/workflows/user-correction-triage.md`
- `.ai/workflows/story-handoff.md`
- `.ai/workflows/git-finalization.md`

## Runtime State

- `.ai/state/README.md`: state directory map
- `.ai/state/flight-lock.json`: single-flight coordination lock
- `.ai/state/flight-board.json`: legacy flight-board compatibility file
- `.ai/state/correction-triage.json`: repeated correction counter state
- `.ai/state/tdd-handoff/README.md`: file-only TDD handoff contract

## Canonical Routing Notes

- Use `docs/user-stories/README.md` to choose the next valid story and open the active story file before editing.
- Use `docs/plans/` for design and `docs/submissions/` for packaged outputs.
- Use `docs/guides/design-visual-evaluation.md` when a design-heavy story needs screenshot-driven iteration.
- Run `bash scripts/check_ai_wiring.sh` whenever the harness contract changes.
