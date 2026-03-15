# Cursor Agent - Ship Entry Guide

## Purpose
Ensure Cursor follows the same orchestration contract as Claude and Codex.

## Required Startup Order
1. Read `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. Read `.ai/agents/claude.md` (canonical orchestrator)
3. Route to the correct workflow in `.ai/workflows/`
4. Use specialist agents in `.ai/agents/` for task-specific execution

## New Story Preflight Gate (Required)
Before starting any new story:
1. Run `agent-preflight`
2. Deliver concise preflight brief
3. Only then begin implementation

## Spec-Driven Package Gate (Required for Feature Stories)
Before tests/code edits for features:
1. Run `.ai/workflows/spec-driven-delivery.md`
2. Follow `.ai/skills/spec-driven-development.md`
3. Review `.ai/docs/research/spec-driven-tdd-playbook.md`
4. For UI scope, review `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`
5. Create/update artifacts under `.ai/templates/spec/`
   - constitution check
   - feature spec
   - technical plan
   - task breakdown
   - UI component spec (when UI scope exists)
   - `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md` (when UI prompting needs explicit structure or reuse)
6. For UI scope, apply `.ai/skills/frontend-design.md` before implementation

## Story Lookup Gate (Required)
Before implementing any story:
1. Run `.ai/workflows/story-lookup.md`
2. Complete local + external docs lookup
3. Deliver concise lookup brief before tests/code edits

## Eval-Driven Gate (Required for AI-Behavior Changes)
Before changing prompts, retrieval, tools, routing, handoffs, graders, or model-facing output behavior:
1. Run `.ai/workflows/eval-driven-development.md`
2. Define eval objective, dataset slices, metrics, and thresholds
3. Deliver concise eval brief before tests/code edits

## Flight Slot Coordination (Flexible Single/Parallel)
Before implementation edits for a flight:
1. Run `.ai/workflows/parallel-flight.md`
2. Claim slot with `bash scripts/flight_slot.sh claim ...`
3. Use default `single` mode for normal flow; enable `parallel` mode only for intentional multi-chat execution

## Git Finalization Gate (Required)
Before final story handoff:
1. Run `.ai/workflows/git-finalization.md`
2. Confirm commit + push are complete
3. Run `bash scripts/git_finalize_guard.sh` and include result in handoff

## Task Routing
- Feature: `.ai/workflows/feature-development.md`
- Bug fix: `.ai/workflows/bug-fixing.md`
- Performance: `.ai/workflows/performance-optimization.md`
- Security: `.ai/workflows/security-review.md`
- Deployment: `.ai/workflows/deployment-setup.md`
- Git finalization: `.ai/workflows/git-finalization.md`
- Flight coordination: `.ai/workflows/parallel-flight.md`
- AI architecture/orchestrator: `.ai/workflows/ai-architecture-change.md`
- Story lookup: `.ai/workflows/story-lookup.md`
- Eval-driven development: `.ai/workflows/eval-driven-development.md`
- Spec-driven delivery: `.ai/workflows/spec-driven-delivery.md`
- Story handoff: `.ai/workflows/story-handoff.md`
- Frontend design skill (UI only): `.ai/skills/frontend-design.md`

## Quality Gates
Run the project-specific validation commands defined during setup before any commit:
```bash
pnpm test
pnpm type-check
pnpm lint
pnpm --filter @ship/api test -- --coverage
pnpm audit --prod
```

## Shared Standards
Cursor must follow the same standards in:
- `.ai/skills/tdd-workflow.md`
- `.ai/skills/spec-driven-development.md`
- `.ai/skills/code-standards.md`
- `.ai/skills/security-checklist.md`
- `.ai/skills/performance-checklist.md`

## Memory Bank Updates
After completing work, update:
- `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
- `.ai/memory/project/architecture.md`
- `.ai/memory/project/patterns.md`
- `.ai/memory/project/anti-patterns.md`
- `.ai/memory/session/decisions-today.md`

## Post-Story User Audit Handoff (Required)
After each story completion:
1. Run `.ai/workflows/story-handoff.md`
2. Include a **User Audit Checklist (Run This Now)** with:
   - copy/paste commands + URLs,
   - expected outcomes for each step,
   - failure-triage hints.
3. If AI-architecture files changed, run `.ai/workflows/ai-architecture-change.md` and include the outcome.
4. Release claimed flight slot with `bash scripts/flight_slot.sh release ...`.
5. Run `.ai/workflows/git-finalization.md` and include `git_finalize_guard.sh` outcome.
6. Wait for user feedback before starting the next story.
