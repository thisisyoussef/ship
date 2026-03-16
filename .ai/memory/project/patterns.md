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

- **Pattern**: Documentation by intent and lifecycle
- **Use when**: Repo docs have started to mix active references, working deliverables, evidence, and historical artifacts in one flat surface.
- **Approach**: Keep living references under stable buckets like `core/` and `guides/`, group assignment work with its source material, and separate `evidence/` from `archive/`.
- **Benefits**: Faster onboarding, clearer agent routing, and less chance of treating historical output as current guidance.
- **Tradeoffs**: Requires deliberate path maintenance when files move.
- **References**: `docs/README.md`, `docs/archive/README.md`, `docs/evidence/README.md`
