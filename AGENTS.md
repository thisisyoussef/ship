# Ship Codex Agent Instructions

## Repo Handbook (Required)

1. Read `.claude/CLAUDE.md` for Ship-specific commands, architecture, testing, and deployment conventions.
2. If the task touches the FleetGraph assignment, read `docs/assignments/fleetgraph/README.md`, `docs/assignments/fleetgraph/PRESEARCH.md`, and `docs/assignments/fleetgraph/FLEETGRAPH.md`.
3. Treat the root `.ai/` directory as the live AI workspace. Treat `ai-workspace-template/` as archive/reference material only.

## Canonical Startup Sequence (Required)

1. Read `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. Read `.ai/codex.md` (canonical orchestrator)
3. Read `.ai/agents/claude.md` (compatibility mirror / agent-specific deltas)
4. Identify task type and route to the matching workflow under `.ai/workflows/`
5. Use the specialized agent playbooks under `.ai/agents/` as needed

Do not start implementation before completing steps 1-3.

---

## New Story Preflight Gate (Required)

Before starting **any new story**, run the `agent-preflight` skill and provide a concise preflight brief before code edits. Follow the skill as the canonical preflight workflow.

---

## Story Lookup Gate (Required)

Before implementing **any new story**, run `.ai/workflows/story-lookup.md` and publish the lookup brief it requires before coding.

---

## Story Sizing Gate (Required)

After story lookup and before implementation planning, run `.ai/workflows/story-sizing.md`.
Use the `trivial` lane only when the change is bounded to one file, does not change an API/public contract, and does not change AI behavior. Trivial stories go directly to focused TDD or the bounded edit plus the combined completion gate; standard stories continue through the normal lifecycle gates.

---

## User Correction Triage Gate (Required for Narrow Feedback and Clarifications)

When the user gives a narrow corrective note during a story or after handoff, run `.ai/workflows/user-correction-triage.md`, classify blast radius first, and keep low-blast-radius fixes bounded.

---

## Eval-Driven Development Gate (Required for AI-Behavior Changes)

Before implementing any story that changes prompts, tools, retrieval, routing, graders, or other AI behavior, run `.ai/workflows/eval-driven-development.md` and publish the required eval brief before coding.

---

## Spec-Driven Delivery Gate (Required for Feature Stories)

Before implementing any feature story, run `.ai/workflows/spec-driven-delivery.md` and apply `.ai/skills/spec-driven-development.md`.
Use `.ai/docs/research/spec-driven-tdd-playbook.md` as the methodology reference.
Follow the workflow and `.ai/templates/spec/` for the exact artifact set. When the work is a story pack, phase pack, or multi-story foundation plan, define the higher-level objectives for the whole pack first and write the full set of stories for the pack in one planning pass. For UI scope, use `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`, `.ai/skills/frontend-design.md`, and `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`.

---

## TDD Pipeline Gate (Required for Behavior Changes)

Before implementing any story that changes tests plus production code, run `.ai/workflows/tdd-pipeline.md`.
Use the three-agent split:
- Agent 1: `.ai/agents/tdd-spec-interpreter.md`
- Agent 2: `.ai/agents/tdd-implementer.md`
- Agent 3: `.ai/agents/tdd-reviewer.md`

Use `bash scripts/tdd_handoff.sh ...` for file-based handoff state, RED/GREEN guards, and loop-limit enforcement.
Use `bash scripts/run_targeted_mutation.sh ...` when the workflow calls for the mutation gate.

---

## Flight Lock Coordination (Standard Lane Only)

For standard-lane implementation stories, run `.ai/workflows/parallel-flight.md`, claim the single writer lock with `bash scripts/flight_slot.sh claim ...`, and release it with `bash scripts/flight_slot.sh release ...`. Trivial-lane stories skip this lock entirely.

---

## Branch and Commit Hygiene (Required)

Before starting work:
- Sync with remote first:
  - `git fetch --all --prune`
  - `git status -sb`
  - `git branch -vv`
- If this is a new story, create or switch to a fresh branch named `codex/<short-task-name>` before editing.
- Do not start story N+1 on story N's branch. The only time a branch may continue is when you are still addressing feedback for that same story.
- Stay in the single local Ship repo folder. Do not create helper worktrees unless the user explicitly asks for one.
- If the current branch has unrelated local edits, park them safely in this repo and switch branches here instead of mixing changes.
- Keep one concern per branch; do not combine unrelated fixes, docs, and feature work.
- Review deployment impact for every story against Ship's real deployment surfaces:
  - Production: API on AWS Elastic Beanstalk, frontend on S3/CloudFront, and AWS-backed config/secrets.
  - Public demo: Render `ship-demo` via `scripts/deploy-render-demo.sh`.
  Update those surfaces when impacted, or record `deployment impact: none` in handoff.
- If a story changes deployed runtime behavior in `api/`, `web/`, deployment scripts, or production/demo config contracts, record explicit deployment status in handoff:
  - `deployed` with environment + command evidence,
  - `not deployed` with reason,
  - or `blocked` with the exact missing access or prerequisite.
- For deploy-relevant stories, refresh the sanctioned Render public demo after merge with `scripts/deploy-render-demo.sh <commit>` unless the handoff explicitly records why that demo deploy is `blocked`.
While working and before merge, follow `.ai/workflows/git-finalization.md` for commit shape, push/PR flow, writable-remote fallback, merge readiness, remote re-sync, and cleanup.

---

## Git Finalization Gate (Required)

Use `.ai/workflows/story-handoff.md` as the single user-facing completion gate. It must include the finalization plan, proposed commit message, deploy status, and recovery path in the same review packet as the **User Audit Checklist (Run This Now)**. After the user explicitly approves that completion gate, run `.ai/workflows/git-finalization.md`. Use merge commits by default so PR lineage stays visible in GitHub history; only use squash or rebase when the user explicitly asks for it. Do not commit, push, open a PR, or merge before that approval, and do not mark the story finalized until `bash scripts/git_finalize_guard.sh` passes.
For stories that change visible behavior in `api/` or `web/`, establish or extend a Ship-facing UI surface early in the story and include explicit UI inspection steps in the completion gate so the user can verify behavior visually.

---

## Task Routing

- Feature work -> `.ai/workflows/feature-development.md`
- Bug fix -> `.ai/workflows/bug-fixing.md`
- Performance -> `.ai/workflows/performance-optimization.md`
- Security review -> `.ai/workflows/security-review.md`
- Deployment/CI-CD -> `.ai/workflows/deployment-setup.md`
- TDD execution -> `.ai/workflows/tdd-pipeline.md`
- Git finalization -> `.ai/workflows/git-finalization.md`
- Flight lock coordination -> `.ai/workflows/parallel-flight.md`
- Story lookup -> `.ai/workflows/story-lookup.md`
- Story sizing -> `.ai/workflows/story-sizing.md`
- Narrow user correction triage -> `.ai/workflows/user-correction-triage.md`
- Eval-driven development -> `.ai/workflows/eval-driven-development.md`
- AI architecture/orchestrator changes -> `.ai/workflows/ai-architecture-change.md`
- Feature spec scaffolding -> `.ai/workflows/spec-driven-delivery.md`
- Finalization recovery -> `.ai/workflows/finalization-recovery.md`

## Agentic Engineering Compression

Apply the following defaults from `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md`:

- Start from the smallest viable instruction set first; avoid adding tools, skills, and rules before the need is validated.
- Split research and implementation into separate flows so implementation context only includes the selected plan.
- Use neutral, evidence-oriented prompts when asking for bug/review tasks.
- Define and enforce completion contracts; do not rely on “looks done” as a stopping signal.

---

## Engineering Constraints

- TDD first via `.ai/workflows/tdd-pipeline.md` (Agent 1 tests -> Agent 2 implement -> Agent 3 review/refactor)
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

Follow `.ai/codex.md`, `.claude/CLAUDE.md`, and the active workflow for the current validation command set before commit.

---

## Post-Story User Audit Checklist (Required)

At the end of every story, follow `.ai/workflows/story-handoff.md` and include a **User Audit Checklist (Run This Now)** section plus the finalization plan in the same completion gate. Run `bash scripts/check_ai_wiring.sh` only when AI-architecture files are changed (per `.ai/workflows/ai-architecture-change.md`); the hook and finalization guard will also run it automatically for those changes. Wait for explicit user approval before final git actions or the next story.
If the story changed visible behavior, the audit checklist must include UI inspection steps with the route, interaction, and expected visible result, preferably on the sanctioned public demo when that surface is available.

---

## Memory Bank Updates (After Work)

Follow `.ai/codex.md` for the standard memory-update set after work.

---

## Codex + Claude Compatibility

- Codex canonical guide: `.ai/codex.md`
- Claude compatibility guide: `.ai/agents/claude.md`
- Cursor compatibility guide: `.ai/agents/cursor-agent.md`
- Shared source of truth: `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
- Project Codex skills: `.ai/docs/CODEX_SKILLS.md`

Both agents must follow the same workflows, memory bank, and quality gates.
