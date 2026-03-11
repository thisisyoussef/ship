# {{PROJECT_NAME}} Codex Agent Instructions

## Canonical Startup Sequence (Required)

1. Read `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. Read `.ai/agents/claude.md` (canonical orchestrator)
3. Read `.ai/codex.md` (Codex-specific mirror)
4. Identify task type and route to the matching workflow under `.ai/workflows/`
5. Use the specialized agent playbooks under `.ai/agents/` as needed

Do not start implementation before completing steps 1-3.

---

## New Story Preflight Gate (Required)

Before starting **any new story**, run the `agent-preflight` skill and provide a concise preflight brief before code edits.

Minimum preflight output:
- Constraints checklist
- Architecture/runtime path summary
- Key risks/open questions
- Implementation + test plan

Do not begin story implementation until preflight is complete.

---

## Story Lookup Gate (Required)

Before implementing **any new story**, run `.ai/workflows/story-lookup.md`.

Minimum lookup output:
- local findings from project docs/memory,
- external findings from official docs/best-practice sources,
- concise lookup brief with implementation and test implications.

Do not begin story implementation until lookup brief is complete.

---

## Eval-Driven Development Gate (Required for AI-Behavior Changes)

Before implementing any story that changes prompts, tools, retrieval, routing, graders, or other AI behavior, run `.ai/workflows/eval-driven-development.md`.

Minimum eval brief output:
- eval objective,
- dataset slices (production-like, edge, adversarial),
- evaluator/metric choice,
- threshold or baseline comparison,
- regression/continuous-eval plan.

Do not begin AI-behavior implementation until the eval brief is complete.

---

## Spec-Driven Delivery Gate (Required for Feature Stories)

Before implementing any feature story, run `.ai/workflows/spec-driven-delivery.md` and apply `.ai/skills/spec-driven-development.md`.
Use `.ai/docs/research/spec-driven-tdd-playbook.md` as the methodology reference.

Minimum required artifacts (using `.ai/templates/spec/`):
- constitution check,
- feature spec,
- technical plan,
- task breakdown,
- UI component spec when UI scope exists.
- `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md` when UI scope needs explicit design prompting or reuse.
For UI scope, use `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md` as the ambiguity tiebreaker, apply `.ai/skills/frontend-design.md`, and log non-obvious tradeoffs.

Do not begin feature implementation until these artifacts exist and align with acceptance criteria.

---

## Flight Slot Coordination (Flexible Single/Parallel)

Before implementation edits for a flight, run `.ai/workflows/parallel-flight.md`.

- Default mode is `single` (existing one-flight behavior).
- Switch to `parallel` mode only when intentionally running multiple chats/agents.
- Claim slot before edits with `bash scripts/flight_slot.sh claim ...`.
- Release slot at handoff with `bash scripts/flight_slot.sh release ...`.

This adds parallel-flight flexibility without removing existing preflight/lookup/handoff gates.

---

## Git Finalization Gate (Required)

Before final story handoff, run `.ai/workflows/git-finalization.md`.

Minimum required outcome:
- commit created for story changes,
- push completed to upstream,
- `bash scripts/git_finalize_guard.sh` passes.

Do not mark story handoff complete without this gate.

---

## Task Routing

- Feature work -> `.ai/workflows/feature-development.md`
- Bug fix -> `.ai/workflows/bug-fixing.md`
- Performance -> `.ai/workflows/performance-optimization.md`
- Security review -> `.ai/workflows/security-review.md`
- Deployment/CI-CD -> `.ai/workflows/deployment-setup.md`
- Git finalization -> `.ai/workflows/git-finalization.md`
- Flight coordination (single/parallel) -> `.ai/workflows/parallel-flight.md`
- Story lookup -> `.ai/workflows/story-lookup.md`
- Eval-driven development -> `.ai/workflows/eval-driven-development.md`
- AI architecture/orchestrator changes -> `.ai/workflows/ai-architecture-change.md`
- Feature spec scaffolding -> `.ai/workflows/spec-driven-delivery.md`

## Agentic Engineering Compression

Apply the following defaults from `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md`:

- Start from the smallest viable instruction set first; avoid adding tools, skills, and rules before the need is validated.
- Split research and implementation into separate flows so implementation context only includes the selected plan.
- Use neutral, evidence-oriented prompts when asking for bug/review tasks.
- Define and enforce completion contracts; do not rely on “looks done” as a stopping signal.

---

## Engineering Constraints

- TDD first (red -> green -> refactor)
- Spec-first for features (constitution -> specify -> plan -> tasks)
- Choose the stack during project setup; do not assume language, framework, datastore, or hosting before requirements are known
- For UI scope, translate design intent into concrete typography/layout/color/motion constraints instead of vague taste words
- File limit: <250 lines (target 150)
- Function limit: <30 lines (target 15)
- Coverage target: >90%
- Type hints required for public functions
- No hardcoded secrets; environment variables only
- Prefer async I/O and connection pooling for external calls

---

## Required Checks Before Commit

Run the project-specific validation commands defined during setup.

Typical categories:
- tests
- type checking (if applicable)
- linting/format validation
- coverage (if applicable)
- security scanning (if applicable)

```bash
<project-test-command>
<project-typecheck-command>
<project-lint-command>
<project-coverage-command>
<project-security-command>
```

---

## Post-Story User Audit Checklist (Required)

At the end of every story, follow `.ai/workflows/story-handoff.md` and include a **User Audit Checklist (Run This Now)** section.

Minimum required content:
- exact commands and URLs the user should run/open,
- expected result per step,
- quick "if this fails, check" hints,
- changed behavior vs unchanged behavior.

Run `bash scripts/check_ai_wiring.sh` only when AI-architecture files are changed (per `.ai/workflows/ai-architecture-change.md`), not for every story.

Do not begin the next story until the user audits and says to proceed.

---

## Memory Bank Updates (After Work)

Update the following:
- `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
- `.ai/memory/project/architecture.md`
- `.ai/memory/project/patterns.md`
- `.ai/memory/project/anti-patterns.md`
- `.ai/memory/session/decisions-today.md`

---

## Codex + Claude Compatibility

- Codex canonical guide: `.ai/codex.md`
- Claude canonical guide: `.ai/agents/claude.md`
- Cursor canonical guide: `.ai/agents/cursor-agent.md`
- Shared source of truth: `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
- Project Codex skills: `.ai/docs/CODEX_SKILLS.md`

Both agents must follow the same workflows, memory bank, and quality gates.
