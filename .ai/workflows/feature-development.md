# Feature Development Workflow

**Purpose**: Implement a new feature from story to handoff without assuming a language, framework, or deployment stack.

---

## Phase 0: Setup and Framing (Mandatory)

### Step 0: Run Story Preflight
- Run `agent-preflight`
- Deliver concise preflight brief before edits

### Step 0.2: Run Spec-Driven Delivery
- Run `.ai/workflows/spec-driven-delivery.md`
- Follow `.ai/skills/spec-driven-development.md`
- For UI stories, review `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`
- For UI stories, apply `.ai/skills/frontend-design.md`
- For strategic or reusable UI work, create `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`

### Step 0.3: Coordinate Flight Slot
- Run `.ai/workflows/parallel-flight.md`
- Claim slot before edits

### Step 0.5: Run Story Lookup
- Run `.ai/workflows/story-lookup.md`
- Gather local + external guidance for the chosen stack/providers
- Publish lookup brief before tests/code edits

### Step 0.7: Run Eval Design for AI-Behavior Changes
- Run `.ai/workflows/eval-driven-development.md` when prompts, tools, routing, retrieval, graders, or other AI behavior changes
- Publish eval brief before implementation

---

## Phase 1: Clarify the Story

### Step 1: Confirm Scope
- Goal and user outcome
- Acceptance criteria
- Edge cases and non-goals
- Affected modules, services, or screens

### Step 2: Confirm Project-Specific Context
- Source directories chosen during setup
- Test directories chosen during setup
- Validation commands chosen during setup
- Deployment/runtime targets chosen during setup

Do not assume defaults that have not been recorded.

---

## Phase 2: Design

### Step 3: Create the Smallest Viable Design
- Map affected modules and interfaces
- Reuse existing patterns where possible
- Keep boundaries explicit
- For UI scope, define typography/layout/color/motion constraints, not vague design adjectives

### Step 4: Define Test Plan
- Unit behavior
- Integration boundaries
- End-to-end or smoke path
- Error and edge cases
- Eval coverage for AI stories

---

## Phase 3: Implement with TDD

### Step 5: RED
- Write the smallest failing test for the next behavior slice
- Confirm it fails for the expected reason

### Step 6: GREEN
- Implement the minimum code to pass
- Avoid unnecessary abstractions

### Step 7: REFACTOR
- Remove duplication
- Improve naming and structure
- Keep behavior unchanged while tests stay green

---

## Phase 4: Validate

### Step 8: Run Validation Gates
Run the project-specific commands defined during setup:

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm --filter @ship/api test -- --coverage
pnpm audit --prod
```

### Step 9: Run Additional Checks as Needed
- Integration or smoke tests for touched boundaries
- Eval comparison for AI behavior changes
- Accessibility and visual regression for UI work
- Performance checks if the feature changes critical paths

---

## Phase 5: Handoff

### Step 10: Update Docs and Memory
- Update SSOT if the project state changed
- Record durable patterns or decisions
- Update design decisions when UI tradeoffs were made

### Step 11: Finalize
- Run `.ai/workflows/story-handoff.md`
- Run `.ai/workflows/git-finalization.md`
- Release the claimed flight slot

---

## Exit Criteria

- Spec artifacts are current
- Tests prove the delivered behavior
- Validation gates pass
- Relevant docs/memory are updated
- Handoff checklist delivered
