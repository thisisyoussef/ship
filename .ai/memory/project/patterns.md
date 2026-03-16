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

- **Pattern**: Foundation-first graph platform phase
- **Use when**: A graph-agent project has clear user-facing use cases but still lacks the substrate for tracing, deployment, worker execution, provider abstraction, or durable graph state.
- **Approach**: Create a prerequisite phase that sequences reconnaissance, provider/runtime contracts, tracing bootstrap, graph skeleton, trigger/worker substrate, and deployment/auth planning before use-case implementation stories.
- **Benefits**: Prevents early feature work from hard-coding the wrong runtime assumptions and keeps deployment/tracing constraints visible from day one.
- **Tradeoffs**: Delays visible product behaviors slightly in exchange for a cleaner MVP path.
- **References**: `docs/assignments/fleetgraph/PRESEARCH.md`, `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/`

- **Pattern**: Repo-neighborhood reconnaissance before net-new agent infra
- **Use when**: The current repo sits inside a wider workspace that may already contain adjacent agent, tracing, or deployment experiments.
- **Approach**: Scan the broader workspace first, identify reusable patterns and anti-patterns, then decide what belongs in the current repo.
- **Benefits**: Avoids reinventing stack decisions and catches proven local patterns faster than external search alone.
- **Tradeoffs**: Adds an explicit discovery step before implementation starts.
- **References**: `/Users/youss/Development/gauntlet`, `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/task-breakdown.md`

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

- **Pattern**: Contract-level neighbor reuse
- **Use when**: A repository sits next to sibling projects that already solved parts of the same substrate problem.
- **Approach**: Identify the minimal reusable contract from each neighbor, copy the idea rather than the product-specific implementation, and write keep/avoid decisions before coding.
- **Benefits**: Speeds up architecture work without importing the wrong providers, prompts, or deployment assumptions.
- **Tradeoffs**: Requires more judgment than direct code copying.
- **References**: `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/reconnaissance-note.md`, `.ai/memory/project/architecture.md`

- **Pattern**: Provider factory outside graph nodes
- **Use when**: A graph or agent runtime must support more than one model provider without leaking provider-specific code into node logic.
- **Approach**: Resolve env/config once, create a provider-specific adapter through a factory, and expose one narrow `LLMAdapter` interface to the rest of the runtime.
- **Benefits**: Keeps provider switching, credentials, and API-shape differences out of graph logic and makes tracing easier to wrap centrally.
- **Tradeoffs**: Adds a small abstraction layer before any user-facing behavior exists.
- **References**: `api/src/services/fleetgraph/llm/factory.ts`, `.ai/memory/project/architecture.md`

- **Pattern**: Story branch rollover before new implementation
- **Use when**: One story is complete or paused and the next story is about to begin in the same local repo.
- **Approach**: Sync with remote, create or switch to a fresh `codex/` branch whose name matches the new story, and record the branch transition in handoff/finalization evidence.
- **Benefits**: Keeps story lineage obvious, prevents mixed PR diffs, and makes user audits easier to follow.
- **Tradeoffs**: Adds a short git step before each story.
- **References**: `AGENTS.md`, `.ai/workflows/feature-development.md`, `.ai/workflows/git-finalization.md`

- **Pattern**: Deployment impact review on every story
- **Use when**: Any story could touch runtime behavior, config, routing, background work, or user-facing capabilities that may alter release expectations.
- **Approach**: Check the story against Ship's canonical AWS deploy surfaces, update deploy scripts/docs when impacted, and otherwise record `deployment impact: none` in handoff.
- **Benefits**: Prevents silent runtime drift and keeps deploy assumptions aligned with the code that just changed.
- **Tradeoffs**: Adds a lightweight review step even for stories that end up changing nothing operationally.
- **References**: `.claude/CLAUDE.md`, `docs/core/application-architecture.md`, `.ai/workflows/feature-development.md`

- **Pattern**: Pack-level objectives before story drafting
- **Use when**: Planning a phase pack, foundation pack, or any coordinated multi-story effort.
- **Approach**: Define the higher-level objectives first, then draft the whole story set in one pass and map each story back to the objective set.
- **Benefits**: Keeps the pack cohesive, reduces overlap, and makes sequencing more intentional.
- **Tradeoffs**: Adds more upfront planning before implementation can begin.
- **References**: `.ai/workflows/spec-driven-delivery.md`, `.ai/skills/spec-driven-development.md`, `.ai/templates/spec/FEATURE_SPEC_TEMPLATE.md`

- **Pattern**: Explicit deployment execution status
- **Use when**: A story changes deployed runtime behavior or the user asks whether work is live.
- **Approach**: Record `deployed`, `not deployed`, or `blocked` explicitly, and attach environment plus command evidence when a deploy actually runs.
- **Benefits**: Prevents ambiguous release state and makes access blockers visible immediately.
- **Tradeoffs**: Adds a small handoff burden for deploy-relevant stories.
- **References**: `.ai/workflows/deployment-setup.md`, `.ai/workflows/story-handoff.md`, `.ai/workflows/git-finalization.md`

- **Pattern**: Repo-owned public demo deploy path
- **Use when**: The product has a sanctioned live demo environment that is separate from the canonical production hosting stack.
- **Approach**: Check in a dedicated deploy script, document the demo environment in the repo contract, and require deploy-relevant stories to either refresh that demo or explicitly record why it is blocked.
- **Benefits**: Keeps the live demo aligned with merged work and prevents provider-side tribal knowledge from becoming a release dependency.
- **Tradeoffs**: Adds another deployment surface to track alongside production.
- **References**: `scripts/deploy-render-demo.sh`, `.ai/workflows/deployment-setup.md`, `README.md`

- **Pattern**: Root trace metadata plus adapter child spans
- **Use when**: A FleetGraph story needs observability before full LangGraph orchestration exists.
- **Approach**: Stamp workspace, trigger, branch, outcome, provider, and model on the root `fleetgraph.run`, then decorate the provider-agnostic adapter so `generate()` emits a child `fleetgraph.llm.generate` span without leaking tracing into graph-node code.
- **Benefits**: Keeps branch-level visibility consistent from day one and gives future graph code a reusable tracing boundary instead of ad hoc spans.
- **Tradeoffs**: Adds a small composition layer around the adapter and requires one shared runtime helper for trace-link handling.
- **References**: `api/src/services/fleetgraph/tracing/runtime.ts`, `api/src/services/fleetgraph/tracing/types.ts`

- **Pattern**: Explicit branch shell before real graph behavior
- **Use when**: A LangGraph-based feature needs stable control flow and checkpoint semantics before real fetch, scoring, or mutation nodes exist.
- **Approach**: Define a typed runtime input, compile a `StateGraph` with explicit branch nodes (`quiet_exit`, `reason_and_deliver`, `approval_interrupt`, `fallback`), and persist thread-scoped checkpoints with `MemorySaver` so later stories inherit one control-flow contract.
- **Benefits**: Keeps future node work aligned to one state shape, makes quiet vs non-quiet paths testable early, and prevents feature stories from inventing ad hoc branching semantics.
- **Tradeoffs**: Adds substrate code that does not deliver end-user value by itself and must be kept intentionally minimal until real nodes arrive.
- **References**: `api/src/services/fleetgraph/graph/runtime.ts`, `api/src/services/fleetgraph/graph/state.ts`, `api/src/services/fleetgraph/graph/runtime.test.ts`
