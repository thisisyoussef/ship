# Spec-Driven Development Skill

## Purpose
Use this skill to make every story execution spec-anchored and test-driven.

Reference playbook:
- `.ai/docs/research/spec-driven-tdd-playbook.md`
- `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`

This workspace follows:
1. **Constitution -> Specify -> Plan -> Tasks** (SDD)
2. **Red -> Green -> Refactor** (TDD)

SDD defines the contract. TDD proves the contract.

---

## Non-Negotiable Rules

1. Do not write implementation code before a spec exists for the story.
2. Do not write production code before failing tests exist for the next behavior.
3. Do not add behavior not present in the spec (YAGNI).
4. Keep spec and implementation synchronized; if behavior changes, update spec first.
5. Refactor only after tests are green.

---

## Four-Artifact Contract (Per Story)

Create/update the following artifacts before implementation:

1. **Constitution Check**
   - Use `.ai/templates/spec/CONSTITUTION_TEMPLATE.md`
   - Confirm story constraints against architecture, quality, security, and performance principles.

2. **Feature Spec**
   - Use `.ai/templates/spec/FEATURE_SPEC_TEMPLATE.md`
   - Define what/why, acceptance criteria, edge cases, out-of-scope.

3. **Technical Plan**
   - Use `.ai/templates/spec/TECHNICAL_PLAN_TEMPLATE.md`
   - Define architecture, data contracts, dependencies, risks, and test strategy.

4. **Task Breakdown**
   - Use `.ai/templates/spec/TASK_BREAKDOWN_TEMPLATE.md`
   - Break into executable units with dependencies and parallelization flags.

Recommended location:
- `docs/specs/<phase>/<story-id>/`

---

## SDD -> TDD Handoff

Before coding, produce a test list derived from acceptance criteria:

- happy-path behaviors
- edge conditions
- failure modes
- integration boundaries

Then run TDD cycles in behavioral chunks:

1. RED: write failing tests for one acceptance criterion or tight criterion slice.
2. GREEN: implement the minimum code to pass.
3. REFACTOR: remove duplication and improve design with tests still green.

---

## AI Agent Adaptation Guidance

Use larger behavioral test chunks instead of ultra-micro one-line cycles:

- Prefer one test group per acceptance criterion.
- Keep each step small enough to reason clearly.
- Re-check architecture boundaries after each logical milestone.

---

## UI and Frontend Guidance

### Behavior vs Visual Boundary

For UI work, separate:
- **Behavior layer (TDD mandatory)**: state transitions, event handlers, validation, conditional rendering, a11y behavior.
- **Visual layer (fiddling zone)**: spacing, layout polish, typography tuning, animation feel.

Keep fiddling code isolated. Do not mix core behavior logic into visual-tweak loops.
Use `.ai/skills/frontend-design.md` when UI intent is under-specified or the output risks collapsing into generic design patterns.
Use `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md` when the UI task needs a reusable WIRE or WIRE+FRAME prompt brief before implementation.

### UI Spec Contract

For UI scope, include `UI_COMPONENT_SPEC_TEMPLATE.md` with:
- purpose and props contract,
- behavioral requirements,
- state model,
- accessibility requirements,
- design-token contract,
- visual-regression snapshot states.

When UI spec ambiguity exists, use design philosophy principles as the tiebreaker and record the decision.
Translate adjectives like "premium", "retro", or "technical" into concrete type/layout/color/motion rules before implementation.

Add `UI_PROMPT_BRIEF_TEMPLATE.md` when the team needs:
- a reusable design brief,
- stronger role/context/rules/output structure,
- an explicit iteration loop to reduce generic UI output.

### UI Test Layering

1. **Behavioral unit/integration tests** (required in TDD cycle)
2. **Visual regression snapshots** (required at PR gate for UI stories)
3. **E2E flows** for critical user paths

Do not unit-test pixel-perfect styling values; test behavior + token contract + accessibility.

---

## Pre-Implementation Checklist

- [ ] Constitution constraints reviewed for this story
- [ ] Feature spec created/updated
- [ ] Technical plan created/updated
- [ ] Task list created with dependencies
- [ ] Test list mapped to acceptance criteria
- [ ] Edge cases enumerated
- [ ] No out-of-scope behavior planned
- [ ] For UI scope: component spec includes behavior/a11y/tokens/snapshot states
- [ ] For UI scope: design philosophy principles and precedents reviewed

Do not begin implementation until all boxes are checked.

---

## Done Criteria

A story is done only when:

- Spec artifacts are complete and current.
- Tests pass and cover acceptance criteria.
- Refactoring completed without breaking behavior.
- Story handoff includes user-run audit checklist.
- Memory/SSOT updates reflect final behavior.
