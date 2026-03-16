# Feature Development Workflow

**Purpose**: Implement a new feature from story to handoff without assuming a language, framework, or deployment stack.

---

## Phase 0: Setup and Framing (Mandatory)

### Step 0.1: Sync and Branch for the Story
- Run:
  - `git fetch --all --prune`
  - `git status -sb`
  - `git branch -vv`
- If this is a new story, create or switch to a fresh `codex/<short-task-name>` branch before any edits.
- Do not continue a new story on the previous story's branch. Reuse the branch only when handling feedback for the same story.

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

### Step 0.55: Review Deployment Impact
- Check the touched story against the repo's real deployment contract before coding.
- For Ship, treat the default production surfaces as:
  - API/runtime: AWS Elastic Beanstalk
  - Frontend/static assets: S3 + CloudFront
  - Config/secrets: AWS SSM/Secrets
- For Ship, also treat the sanctioned public demo surface as:
  - Render `ship-demo` deployed through `scripts/deploy-render-demo.sh`
- If the story changes deploy-relevant behavior, update the relevant scripts, env docs, or deployment notes in the same story.
- If the story changes deployed runtime behavior, plan to refresh the Render demo after merge or record why that demo deploy is blocked.
- If no deploy surface changes are needed, record `deployment impact: none` in handoff.

### Step 0.6: Triage Narrow User Corrections
- If the user gives a small corrective note or clarification during the story, run `.ai/workflows/user-correction-triage.md`
- Classify blast radius before editing
- Keep the response bounded unless the correction materially changes scope or architecture

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
- Record deployment impact review outcome

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
