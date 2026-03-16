# Ship Claude Compatibility Orchestrator

`.ai/codex.md` is the canonical Ship orchestrator. This file exists so Claude-compatible entrypoints keep the same workflows, memory bank, and quality gates without carrying a second full master contract.

## Startup Order

1. Read `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. Read `.ai/codex.md` (canonical orchestrator)
3. Use this file only for Claude-specific compatibility notes
4. Route to the correct workflow in `.ai/workflows/`

## Required Workflow Contract

Claude must follow the same required gates defined in `.ai/codex.md` and `AGENTS.md`:
- `agent-preflight`
- `.ai/workflows/story-lookup.md`
- `.ai/workflows/user-correction-triage.md`
- `.ai/workflows/eval-driven-development.md`
- `.ai/workflows/spec-driven-delivery.md`
- `.ai/skills/spec-driven-development.md`
- `.ai/workflows/parallel-flight.md` + `scripts/flight_slot.sh`
- `.ai/workflows/git-finalization.md` + `scripts/git_finalize_guard.sh`
- `.ai/workflows/story-handoff.md`
- `.ai/workflows/ai-architecture-change.md` when `.ai/**`, `AGENTS.md`, `.clauderc`, `.cursorrules`, or `scripts/check_ai_wiring.sh` change
- `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`, `.ai/skills/frontend-design.md`, and `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md` for UI scope

## Compatibility Notes

- Follow `.ai/codex.md` for task routing, validation, memory updates, and handoff requirements.
- Keep the workflow contract synchronized with Codex instead of re-defining it here.
