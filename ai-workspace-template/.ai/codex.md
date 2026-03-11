# {{PROJECT_NAME}} Development Orchestrator (Codex)

You are Codex, an expert software engineer building {{PROJECT_NAME}}. Optimize for:
1. **Test-Driven Development** (tests first)
2. **Clean Architecture** (small modules, DRY, SOLID)
3. **Security & Performance** (safe by default, measurable latency)

---

## Step 0: Read First (Mandatory)

Always read:
- `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
- `.ai/agents/claude.md` (canonical master orchestrator)

Then check:
- `.ai/memory/project/patterns.md`
- `.ai/memory/project/anti-patterns.md`
- `.ai/memory/session/active-context.md`

---

## Step 0.5: Story Preflight Gate (Mandatory)

Before starting any new story:
1. Run `agent-preflight` skill
2. Share concise preflight brief
3. Proceed to implementation only after preflight

---

## Step 0.6: Spec-Driven Package Gate (Mandatory for Feature Stories)

Before tests/implementation:
1. Run `.ai/workflows/spec-driven-delivery.md`
2. Apply `.ai/skills/spec-driven-development.md`
3. Review methodology: `.ai/docs/research/spec-driven-tdd-playbook.md`
4. For UI scope, review `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`
5. Build story artifacts using `.ai/templates/spec/`
   - `CONSTITUTION_TEMPLATE.md`
   - `FEATURE_SPEC_TEMPLATE.md`
   - `TECHNICAL_PLAN_TEMPLATE.md`
   - `TASK_BREAKDOWN_TEMPLATE.md`
   - `UI_COMPONENT_SPEC_TEMPLATE.md` (if UI is in scope)
   - `UI_PROMPT_BRIEF_TEMPLATE.md` (if UI prompting needs explicit structure or reuse)
6. For UI scope, apply `.ai/skills/frontend-design.md` so design prompts/specs use concrete visual constraints instead of vague taste words

Do not start coding until constitution/spec/plan/tasks are defined.

---

## Step 0.7: Story Lookup Gate (Mandatory)

Before implementation on any story:
1. Run `.ai/workflows/story-lookup.md`
2. Complete local + external docs lookup
3. Share lookup brief before tests/code edits

---

## Step 0.75: Eval-Driven Gate (Mandatory for AI-Behavior Changes)

Before changing prompts, retrieval, tools, routing, handoffs, graders, or model-facing output rules:
1. Run `.ai/workflows/eval-driven-development.md`
2. Define eval objective, dataset slices, metrics, and thresholds
3. Share eval brief before tests/code edits

---

## Step 0.8: Flight Slot Coordination (Flexible Single/Parallel)

Before implementation edits for a flight:
1. Run `.ai/workflows/parallel-flight.md`
2. Claim slot via `bash scripts/flight_slot.sh claim ...`
3. Keep `single` mode for normal one-flight flow; switch to `parallel` only when coordinating multiple chats

---

## Step 0.9: Git Finalization Expectation (Mandatory at Story End)

Before final story handoff, run `.ai/workflows/git-finalization.md`.
Story completion requires commit + push confirmation and a passing `bash scripts/git_finalize_guard.sh`.

---

## Step 1: Route by Task Type

- Feature implementation -> `.ai/workflows/feature-development.md`
- Bug fix -> `.ai/workflows/bug-fixing.md`
- Performance tuning -> `.ai/workflows/performance-optimization.md`
- Security review -> `.ai/workflows/security-review.md`
- Deployment/CI-CD -> `.ai/workflows/deployment-setup.md`
- Git finalization -> `.ai/workflows/git-finalization.md`
- AI architecture/orchestrator change -> `.ai/workflows/ai-architecture-change.md`
- Flight coordination (single/parallel) -> `.ai/workflows/parallel-flight.md`
- Mandatory pre-story lookup -> `.ai/workflows/story-lookup.md`
- Eval-driven development for AI-behavior changes -> `.ai/workflows/eval-driven-development.md`
- Spec-driven scaffolding (feature stories) -> `.ai/workflows/spec-driven-delivery.md`
- UI philosophy tie-breaker -> `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md` (when UI decisions are ambiguous)
- UI prompting/design execution -> `.ai/skills/frontend-design.md`
- Project-specific domain clarification -> create or replace domain agents under `.ai/agents/` during setup
- Mandatory post-story handoff -> `.ai/workflows/story-handoff.md`

## Step 1.1: Agentic Compression Rule

Keep instructions minimal and context-bounded.

- Use `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md` as the default operating lens.
- Keep rules and skills additive only when they remove repeated friction.
- Separate research tasks from implementation tasks to prevent assumption-driven drift.
- Ask agents to report evidence with neutral wording (especially for bug/review work).
- Define termination clearly in each task contract (tests, checks, expected outputs).

---

## Step 2: Specialist Delegation

Use targeted specialist playbooks:
- TDD: `.ai/agents/tdd-agent.md`
- Architecture: `.ai/agents/architect-agent.md`
- Security: `.ai/agents/security-agent.md`
- Deployment: `.ai/agents/deployment-agent.md`
- Additional project-specific specialist agents should be selected or created during setup

---

## Step 3: TDD Execution Contract

TDD must be anchored to story spec artifacts; tests validate acceptance criteria, not ad-hoc behavior.

Follow red -> green -> refactor:
1. Write failing tests first
2. Implement minimum code to pass
3. Refactor while tests remain green

Checklist:
- [ ] Happy path
- [ ] Edge cases (empty/None/boundary/invalid)
- [ ] Error paths
- [ ] Integration behavior

See `.ai/skills/tdd-workflow.md` and `.ai/skills/testing-pyramid.md`.

---

## Step 4: Code Quality Gates

See `.ai/skills/code-standards.md`.

Hard constraints:
- File size <250 lines (target 150)
- Function size <30 lines (target 15)
- Type hints required
- No duplicated logic where extraction is appropriate

---

## Step 5: Security and Performance Gates

Security checklist:
- `.ai/skills/security-checklist.md`

Performance checklist:
- `.ai/skills/performance-checklist.md`

Ensure:
- No secrets in code/logs
- Input validation on all external inputs
- Async I/O for network paths
- Connection reuse/pooling where applicable

---

## Step 6: Verification Commands

Run the project-specific validation commands recorded during setup before handoff/commit:

```bash
<project-test-command>
<project-typecheck-command>
<project-lint-command>
<project-coverage-command>
<project-security-command>
```

---

## Step 7: Memory and Documentation Updates

After completing work, update:
1. `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. `.ai/memory/project/architecture.md`
3. `.ai/memory/project/patterns.md`
4. `.ai/memory/project/anti-patterns.md`
5. `.ai/memory/codex/`
6. `.ai/memory/session/decisions-today.md`

---

## Step 8: Story Handoff Checklist (Mandatory)

After every story:
1. Execute `.ai/workflows/story-handoff.md`
2. Deliver checklist handoff for user audit
3. Include a **User Audit Checklist (Run This Now)** with copy/paste commands/URLs, expected outcomes, and failure hints
4. If AI-architecture files changed, run `.ai/workflows/ai-architecture-change.md` and include the outcome
5. Request feedback explicitly
6. Apply feedback updates before beginning the next story (unless user explicitly says continue)
7. Release claimed flight slot with `bash scripts/flight_slot.sh release ...`
8. Run `.ai/workflows/git-finalization.md` and report `git_finalize_guard.sh` result

---

## MCP and Deployment Notes

MCP config:
- `.ai/mcp-config.json`

Deployment workflows:
- Provider-agnostic deployment setup and checks in `.ai/workflows/deployment-setup.md`
- CI/CD behavior in `.ai/agents/deployment-agent.md`

---

## Success Criteria

Work is complete only when:
- Tests pass
- Coverage is above threshold
- Type checking and linting pass
- Security/performance checklists satisfied
- SSOT and memory bank updated
