# Ship Codex Agent Instructions

## Repo Handbook (Required)

1. Read `.claude/CLAUDE.md` for Ship-specific commands, architecture, testing, and deployment conventions.
2. If the task touches the FleetGraph assignment, read `docs/assignments/fleetgraph/README.md`, `docs/assignments/fleetgraph/PRESEARCH.md`, and `docs/assignments/fleetgraph/FLEETGRAPH.md`.
3. Treat the root `.ai/` directory as the live AI workspace. Treat `ai-workspace-template/` as archive/reference material only.

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

## User Correction Triage Gate (Required for Narrow Feedback and Clarifications)

When the user gives a narrow corrective note during a story or after handoff, such as "ignore that bullet", "use OpenAI instead", or "that assumption is wrong":
- run `.ai/workflows/user-correction-triage.md`,
- classify the correction's blast radius before editing,
- patch only the minimum affected surfaces for low-blast-radius corrections,
- escalate back to the full preflight/lookup/spec flow only if the change is truly architectural or scope-shaping.

Do not turn a small correction into a new broad planning cycle unless the blast radius justifies it.

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

## Branch and Commit Hygiene (Required)

Before starting work:
- Start each discrete task on a fresh branch named `codex/<short-task-name>`.
- If the current branch has unrelated local edits, create a fresh worktree/branch instead of mixing changes.
- Keep one concern per branch; do not combine unrelated fixes, docs, and feature work.

While working:
- Make small, reviewable commits once the relevant checks for that slice pass.
- Use clear, descriptive, imperative commit messages that explain the outcome.
- Good: `Add FleetGraph pre-search scaffolding`
- Good: `Clarify sprint risk detection routing`
- Bad: `updates`
- Bad: `misc fixes`

Before merge:
- Push the branch and create or update a PR with scope, verification, and any remaining risks.
- Sync remotes first with `git fetch --all --prune` and confirm branch tracking status before PR update or merge.
- If the canonical upstream is archived or read-only, switch PR/merge operations to the writable remote and record that fallback in handoff notes.
- Resolve review comments on the branch, rerun required checks, and keep the PR diff focused.
- Do not rewrite shared history or force-push unless explicitly requested.

After approval:
- Merge only after required checks pass and the branch is up to date with its base branch.
- Prefer a clean final history: one focused commit or a small set of meaningful commits.
- Delete stale worktrees/branches after merge when safe.

---

## Git Finalization Gate (Required)

Before final story handoff, run `.ai/workflows/git-finalization.md`.

Minimum required outcome:
- work performed on a dedicated `codex/` branch,
- clear commit(s) created for the story changes,
- remotes fetched and branch sync status checked,
- push completed to a writable remote,
- PR created or updated with verification notes,
- review feedback resolved before merge,
- merge completed only after checks pass and the branch is current,
- merged branch cleaned up locally/remotely when safe,
- `bash scripts/git_finalize_guard.sh` passes.

Do not commit, push, open a PR, or merge until the user has completed the User Audit Checklist and explicitly approved finalization.

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
- Narrow user correction triage -> `.ai/workflows/user-correction-triage.md`
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
pnpm test
pnpm type-check
pnpm lint
pnpm --filter @ship/api test -- --coverage
pnpm audit --prod
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

After the audit, pause and wait for explicit user permission before:
- creating the final commit,
- pushing the branch,
- opening or updating the PR,
- merging the PR.

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
