# Proven Patterns

Capture reusable patterns that repeatedly work in this project.

## Pattern Template
- **Pattern**:
- **Use when**:
- **Approach**:
- **Benefits**:
- **Tradeoffs**:
- **References**:

## Seeded Patterns
- **Pattern**: Eval-driven AI story contract
- **Use when**: A story changes prompts, retrieval, tool-use, routing, graders, or any nondeterministic AI behavior.
- **Approach**: Define objective, dataset slices, evaluator types, thresholds, and regression plan before implementation; keep accepted cases in the regression set.
- **Benefits**: Catches nondeterministic regressions early and gives a measurable release decision.
- **Tradeoffs**: Adds upfront design work and requires calibration for automated graders.
- **References**: `.ai/workflows/eval-driven-development.md`

- **Pattern**: Anti-mediocrity frontend spec
- **Use when**: A story includes meaningful UI scope and the agent needs stronger design intelligence.
- **Approach**: Use `.ai/skills/frontend-design.md` to convert the desired vibe into a role-based type system, whitespace/layout rules, semantic color/material tokens, motion rules, and explicit anti-patterns.
- **Benefits**: Produces more distinct, intentional interfaces without loading non-UI stories with design context.
- **Tradeoffs**: Requires better upfront articulation of visual direction and may reduce breadth of exploration.
- **References**: `.ai/skills/frontend-design.md`, `.ai/templates/spec/UI_COMPONENT_SPEC_TEMPLATE.md`

- **Pattern**: WIRE-first UI prompt brief
- **Use when**: A UI story needs stronger briefing structure, reuse across iterations, or a shared artifact for handoff.
- **Approach**: Capture Who/What, Input Context, Rules, and Expected Output first; add FRAME elements only when the task is strategic, multi-step, or quality-sensitive.
- **Benefits**: Improves prompt quality without forcing every UI task into an oversized brief.
- **Tradeoffs**: Adds one more artifact for higher-stakes UI work.
- **References**: `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`, `.ai/skills/frontend-design.md`

- **Pattern**: Setup-time stack selection
- **Use when**: Bootstrapping a new project from the template.
- **Approach**: Decide the language, framework, runtime, providers, validation commands, deployment targets, and directory layout during setup, then record them in the repo contract docs.
- **Benefits**: Prevents silent inheritance of an unrelated stack and keeps downstream workflows consistent.
- **Tradeoffs**: Adds a small upfront setup step before implementation can start.
- **References**: `README.md`, `AGENTS.md`, `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`

- **Pattern**: REST normalization boundary for unified documents
- **Use when**: Building features that reason across Ship projects, issues, weeks, people, and weekly docs through the public API.
- **Approach**: Fetch only from Ship REST, then normalize canonical `document_associations`, `belongs_to`, legacy `project_id`, and `assignee_ids` into one internal graph state before reasoning or rendering.
- **Benefits**: Prevents feature logic from drifting with Ship's mixed live data shapes and keeps the runtime honest to the REST-only contract.
- **Tradeoffs**: Adds an adapter layer that must be kept current as the API evolves.
- **References**: `docs/assignments/fleetgraph/PRESEARCH.md`, `api/src/routes/team.ts`, `api/src/utils/allocation.ts`, `api/src/routes/weekly-plans.ts`

- **Pattern**: Rule-gated proactive reasoning
- **Use when**: An AI workflow needs to monitor Ship continuously without turning every sweep into an LLM call.
- **Approach**: Run deterministic thresholding and dedupe first, then invoke the model only for candidate findings or on-demand user questions.
- **Benefits**: Keeps proactive cost predictable, reduces noise, and creates clearer branch traces in LangSmith.
- **Tradeoffs**: Some intelligence moves into rules instead of the model.
- **References**: `docs/assignments/fleetgraph/PRESEARCH.md`, `api/src/routes/accountability.ts`, `api/src/services/accountability.ts`

- **Pattern**: Narrow user correction triage
- **Use when**: The user gives a small corrective note or clarification during a story or after handoff.
- **Approach**: Restate the correction, classify blast radius, patch only the directly affected surfaces for low-blast-radius corrections, and escalate to full story gates only when the change materially alters scope or architecture.
- **Benefits**: Keeps diffs focused, respects user intent, and prevents unnecessary replanning churn.
- **Tradeoffs**: Requires deliberate classification before editing instead of reflexively expanding the task.
- **References**: `.ai/workflows/user-correction-triage.md`, `.ai/workflows/story-handoff.md`

- **Pattern**: Documentation by intent and lifecycle
- **Use when**: Repo docs have started to mix active references, working deliverables, evidence, and historical artifacts in one flat surface.
- **Approach**: Keep living references under stable buckets like `core/` and `guides/`, group assignment work with its source material, and separate `evidence/` from `archive/`.
- **Benefits**: Faster onboarding, clearer agent routing, and less chance of treating historical output as current guidance.
- **Tradeoffs**: Requires deliberate path maintenance when files move.
- **References**: `docs/README.md`, `docs/archive/README.md`, `docs/evidence/README.md`
