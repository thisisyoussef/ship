# Ship Development Orchestrator (Codex)

`.ai/codex.md` is the canonical Ship orchestrator. Keep startup context small, route to the right workflow quickly, and let the workflow files hold the detailed procedure.

## Read First

Always read:
- `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
- `.ai/codex.md`

Then use as needed:
- `.ai/agents/claude.md` for Claude compatibility notes
- `.ai/memory/project/patterns.md`
- `.ai/memory/project/anti-patterns.md`
- `.ai/memory/session/active-context.md`

## Required Gates

- New story preflight: run `agent-preflight`, publish the brief, sync remotes, and move to a fresh `codex/` branch before edits.
- Feature stories: run `.ai/workflows/spec-driven-delivery.md`, apply `.ai/skills/spec-driven-development.md`, use `.ai/docs/research/spec-driven-tdd-playbook.md`, and create the required `.ai/templates/spec/` artifacts before coding.
- UI scope: use `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`, `.ai/skills/frontend-design.md`, and `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`.
- Story lookup: run `.ai/workflows/story-lookup.md` and publish the local + external lookup brief before coding.
- Narrow user corrections: run `.ai/workflows/user-correction-triage.md` before broadening scope.
- AI-behavior changes: run `.ai/workflows/eval-driven-development.md` and publish the eval brief before coding.
- Flight coordination: run `.ai/workflows/parallel-flight.md`, claim via `bash scripts/flight_slot.sh claim ...`, and release via `bash scripts/flight_slot.sh release ...`.
- Story finish: run `.ai/workflows/story-handoff.md`.
- Git finalization: run `.ai/workflows/git-finalization.md`; story completion requires a passing `bash scripts/git_finalize_guard.sh`.
- AI architecture changes: run `.ai/workflows/ai-architecture-change.md` and `bash scripts/check_ai_wiring.sh` when `.ai/**`, `AGENTS.md`, `.clauderc`, `.cursorrules`, or `scripts/check_ai_wiring.sh` change.

## Route by Task Type

- Feature implementation -> `.ai/workflows/feature-development.md`
- Bug fix -> `.ai/workflows/bug-fixing.md`
- Performance tuning -> `.ai/workflows/performance-optimization.md`
- Security review -> `.ai/workflows/security-review.md`
- Deployment/CI-CD -> `.ai/workflows/deployment-setup.md`
- Git finalization -> `.ai/workflows/git-finalization.md`
- AI architecture/orchestrator change -> `.ai/workflows/ai-architecture-change.md`
- Flight coordination (single/parallel) -> `.ai/workflows/parallel-flight.md`
- Mandatory pre-story lookup -> `.ai/workflows/story-lookup.md`
- Narrow user correction triage -> `.ai/workflows/user-correction-triage.md`
- Eval-driven development for AI-behavior changes -> `.ai/workflows/eval-driven-development.md`
- Spec-driven scaffolding (feature stories) -> `.ai/workflows/spec-driven-delivery.md`
- Mandatory post-story handoff -> `.ai/workflows/story-handoff.md`

## Implementation Defaults

- Use `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md` as the default operating lens.
- Practice TDD: red -> green -> refactor.
- Keep files under 250 lines and functions under 30 lines when practical.
- Use `.ai/skills/code-standards.md`, `.ai/skills/security-checklist.md`, and `.ai/skills/performance-checklist.md`.
- Follow `.claude/CLAUDE.md` and the active workflow for the current validation commands before handoff/commit.
- For story packs or phase packs, define the higher-level objectives first and draft the full story set in one planning pass.

## Quick Reference

- TDD loop:
  - red -> green -> refactor
  - validate against acceptance criteria, edge cases, error paths, and integration behavior
  - see `.ai/agents/tdd-agent.md`, `.ai/skills/tdd-workflow.md`, and `.ai/skills/testing-pyramid.md`
- Validation command set:
  - `pnpm test`
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm --filter @ship/api test -- --coverage`
  - `pnpm audit --prod`
- Memory update set:
  - `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
  - `.ai/memory/project/architecture.md`
  - `.ai/memory/project/patterns.md`
  - `.ai/memory/project/anti-patterns.md`
  - `.ai/memory/codex/`
  - `.ai/memory/session/decisions-today.md`
- Specialist references:
  - TDD: `.ai/agents/tdd-agent.md`
  - Architecture: `.ai/agents/architect-agent.md`
  - Security: `.ai/agents/security-agent.md`
  - Deployment: `.ai/agents/deployment-agent.md`

## Memory and Handoff

- Standard memory-update set:
  - `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
  - `.ai/memory/project/architecture.md`
  - `.ai/memory/project/patterns.md`
  - `.ai/memory/project/anti-patterns.md`
  - `.ai/memory/codex/`
  - `.ai/memory/session/decisions-today.md`
- Follow `.ai/workflows/story-handoff.md` for the exact handoff pack, including the **User Audit Checklist (Run This Now)** and explicit user approval before final git actions.

## Specialist References

- TDD: `.ai/agents/tdd-agent.md`
- Architecture: `.ai/agents/architect-agent.md`
- Security: `.ai/agents/security-agent.md`
- Deployment: `.ai/agents/deployment-agent.md`
- Claude compatibility mirror: `.ai/agents/claude.md`
