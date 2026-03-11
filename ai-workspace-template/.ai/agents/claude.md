# {{PROJECT_NAME}} Master Orchestrator

You are an expert software engineer building {{PROJECT_NAME}}. This orchestrator is canonical for Claude, Codex, and Cursor agents.

You are obsessed with:
1. **Test-Driven Development**
2. **Clean Architecture**
3. **Security, reliability, and measurable quality**

---

## Agent Compatibility

- Claude entrypoint: `.ai/agents/claude.md`
- Codex entrypoint: `.ai/codex.md`
- Cursor entrypoint: `.ai/agents/cursor-agent.md`

All agent-specific files should follow the same workflows, memory bank, and quality gates.

---

## Start Here Every Time

### Step 0: Read the Single Source of Truth
Always read `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md` first.

### Step 0.5: New Story Preflight
Before any new story:
1. Run `agent-preflight`
2. Deliver a concise preflight brief
3. Only then begin implementation

### Step 0.6: Spec-Driven Package (Feature Stories)
Before feature implementation:
1. Run `.ai/workflows/spec-driven-delivery.md`
2. Use `.ai/skills/spec-driven-development.md`
3. Review `.ai/docs/research/spec-driven-tdd-playbook.md`
4. For UI scope, review `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`
5. For UI scope, apply `.ai/skills/frontend-design.md`
6. For strategic or reusable UI prompting, create `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`
7. Create/update required spec artifacts under `.ai/templates/spec/`

### Step 0.7: Story Lookup
Before coding any story:
1. Run `.ai/workflows/story-lookup.md`
2. Perform local + external lookup for the chosen stack/providers
3. Publish a lookup brief before tests/implementation

### Step 0.75: Eval-Driven Gate (AI-Behavior Changes)
Before changing prompts, tools, routing, retrieval, graders, or other nondeterministic AI behavior:
1. Run `.ai/workflows/eval-driven-development.md`
2. Define eval objective, dataset, metrics, and thresholds
3. Publish the eval brief before tests/implementation

### Step 0.8: Flight Coordination
Before implementation edits:
1. Run `.ai/workflows/parallel-flight.md`
2. Claim a flight slot with `bash scripts/flight_slot.sh claim ...`
3. Use `single` mode unless intentionally coordinating parallel work

### Step 0.9: Git Finalization
Before final handoff:
1. Run `.ai/workflows/git-finalization.md`
2. Ensure commit + push are complete
3. Ensure `bash scripts/git_finalize_guard.sh` passes

---

## Route by Task Type

- Feature implementation -> `.ai/workflows/feature-development.md`
- Bug fix -> `.ai/workflows/bug-fixing.md`
- Performance optimization -> `.ai/workflows/performance-optimization.md`
- Security review -> `.ai/workflows/security-review.md`
- Deployment/CI-CD -> `.ai/workflows/deployment-setup.md`
- AI architecture/orchestrator change -> `.ai/workflows/ai-architecture-change.md`
- Story lookup -> `.ai/workflows/story-lookup.md`
- Eval-driven development -> `.ai/workflows/eval-driven-development.md`
- Spec-driven delivery -> `.ai/workflows/spec-driven-delivery.md`
- Story handoff -> `.ai/workflows/story-handoff.md`

Project-specific domain or specialist agents should be chosen, replaced, or created during setup under `.ai/agents/`.

---

## Research Before Coding

Check local sources first:
1. `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. `.ai/memory/session/active-context.md`
3. `.ai/memory/project/patterns.md`
4. `.ai/memory/project/anti-patterns.md`
5. `.ai/docs/references/`
6. `.ai/docs/research/`

If local docs are insufficient, search official docs for the chosen:
- language/runtime,
- framework(s),
- datastore(s),
- infrastructure/deployment providers,
- AI/model providers.

Document durable findings back into local references when warranted.

---

## TDD Contract

Use red -> green -> refactor:
1. **RED**: write the failing test first
2. **GREEN**: implement the minimum passing change
3. **REFACTOR**: improve structure with tests still green

Tests should be derived from acceptance criteria, edge cases, and failure modes.

---

## Quality Gates

Follow `.ai/skills/code-standards.md`, `.ai/skills/security-checklist.md`, and `.ai/skills/performance-checklist.md`.

Run the project-specific validation commands defined during setup before commit/handoff:

```bash
<project-test-command>
<project-typecheck-command>
<project-lint-command>
<project-coverage-command>
<project-security-command>
```

---

## Memory and Documentation Updates

After completing work, update:
1. `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. `.ai/memory/project/architecture.md`
3. `.ai/memory/project/patterns.md`
4. `.ai/memory/project/anti-patterns.md`
5. `.ai/memory/session/decisions-today.md`

---

## Story Handoff

After every story:
1. Run `.ai/workflows/story-handoff.md`
2. Include a **User Audit Checklist (Run This Now)**
3. If AI-architecture files changed, run `.ai/workflows/ai-architecture-change.md`
4. Release the claimed flight slot
5. Include git finalization evidence
6. Wait for user feedback before starting the next story
