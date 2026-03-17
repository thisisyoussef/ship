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
- Story sizing: run `.ai/workflows/story-sizing.md` after `.ai/workflows/story-lookup.md`; trivial stories skip spec/eval/flight and go straight to focused TDD or the bounded edit plus the combined completion gate.
- Feature stories: run `.ai/workflows/spec-driven-delivery.md`, apply `.ai/skills/spec-driven-development.md`, use `.ai/docs/research/spec-driven-tdd-playbook.md`, and create the required `.ai/templates/spec/` artifacts before coding.
- UI scope: use `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`, `.ai/skills/frontend-design.md`, and `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`.
- Story lookup: run `.ai/workflows/story-lookup.md` and publish the local + external lookup brief before coding.
- Narrow user corrections: run `.ai/workflows/user-correction-triage.md` before broadening scope.
- AI-behavior changes: run `.ai/workflows/eval-driven-development.md` and publish the eval brief before coding.
- Behavior changes that touch tests plus production code: run `.ai/workflows/tdd-pipeline.md`, initialize file handoff state with `bash scripts/tdd_handoff.sh`, and use the isolated three-agent split.
- Flight lock coordination: standard-lane stories run `.ai/workflows/parallel-flight.md`, claim the single writer lock via `bash scripts/flight_slot.sh claim ...`, and release it via `bash scripts/flight_slot.sh release ...`; trivial-lane stories skip the lock.
- Story finish: run `.ai/workflows/story-handoff.md` as the combined completion gate.
- Visible behavior stories: establish or extend an inspectable UI surface early and include UI inspection steps in the completion gate.
- Git finalization: after user approval of the completion gate, run `.ai/workflows/git-finalization.md`; use merge commits by default and require a passing `bash scripts/git_finalize_guard.sh`.
- AI architecture changes: run `.ai/workflows/ai-architecture-change.md`; AI-architecture diffs trigger `bash scripts/check_ai_wiring.sh` automatically in pre-commit and again in the finalization guard.

## Route by Task Type

- Feature implementation -> `.ai/workflows/feature-development.md`
- Bug fix -> `.ai/workflows/bug-fixing.md`
- Performance tuning -> `.ai/workflows/performance-optimization.md`
- Security review -> `.ai/workflows/security-review.md`
- Deployment/CI-CD -> `.ai/workflows/deployment-setup.md`
- TDD execution -> `.ai/workflows/tdd-pipeline.md`
- Git finalization -> `.ai/workflows/git-finalization.md`
- AI architecture/orchestrator change -> `.ai/workflows/ai-architecture-change.md`
- Flight lock coordination -> `.ai/workflows/parallel-flight.md`
- Mandatory pre-story lookup -> `.ai/workflows/story-lookup.md`
- Mandatory post-lookup sizing -> `.ai/workflows/story-sizing.md`
- Narrow user correction triage -> `.ai/workflows/user-correction-triage.md`
- Eval-driven development for AI-behavior changes -> `.ai/workflows/eval-driven-development.md`
- Spec-driven scaffolding (feature stories) -> `.ai/workflows/spec-driven-delivery.md`
- Mandatory post-story completion gate -> `.ai/workflows/story-handoff.md`
- Finalization recovery -> `.ai/workflows/finalization-recovery.md`

## Implementation Defaults

- Use `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md` as the default operating lens.
- Practice TDD through the isolated pipeline in `.ai/workflows/tdd-pipeline.md`.
- Keep files under 250 lines and functions under 30 lines when practical.
- Use `.ai/skills/code-standards.md`, `.ai/skills/security-checklist.md`, and `.ai/skills/performance-checklist.md`.
- Follow `.claude/CLAUDE.md` and the active workflow for the current validation commands before handoff/commit.
- For story packs or phase packs, define the higher-level objectives first and draft the full story set in one planning pass.

## Quick Reference

- TDD loop:
  - Agent 1 writes adversarial tests from the spec without implementation context
  - `bash scripts/tdd_handoff.sh check --expect red` must prove the contract is genuinely failing
  - Agent 2 implements without editing Agent 1 tests
  - run `bash scripts/run_targeted_mutation.sh ...` when the workflow calls for mutation coverage
  - Agent 3 reviews/refactors and leaves the suite green
  - see `.ai/workflows/tdd-pipeline.md`, `.ai/agents/tdd-agent.md`, `.ai/agents/tdd-spec-interpreter.md`, `.ai/agents/tdd-implementer.md`, `.ai/agents/tdd-reviewer.md`, `.ai/skills/tdd-workflow.md`, and `.ai/skills/testing-pyramid.md`
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
  - TDD coordinator: `.ai/agents/tdd-agent.md`
  - TDD test author: `.ai/agents/tdd-spec-interpreter.md`
  - TDD implementer: `.ai/agents/tdd-implementer.md`
  - TDD reviewer: `.ai/agents/tdd-reviewer.md`
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
- Follow `.ai/workflows/story-handoff.md` for the exact combined completion gate, including the **User Audit Checklist (Run This Now)**, finalization plan, and explicit user approval before final git actions.
- For stories that change visible behavior, make the user audit include UI inspection steps against the best available visible surface, preferably the sanctioned public demo.

## Specialist References

- TDD coordinator: `.ai/agents/tdd-agent.md`
- TDD test author: `.ai/agents/tdd-spec-interpreter.md`
- TDD implementer: `.ai/agents/tdd-implementer.md`
- TDD reviewer: `.ai/agents/tdd-reviewer.md`
- Architecture: `.ai/agents/architect-agent.md`
- Security: `.ai/agents/security-agent.md`
- Deployment: `.ai/agents/deployment-agent.md`
- Claude compatibility mirror: `.ai/agents/claude.md`
