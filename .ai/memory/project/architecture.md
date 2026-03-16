# Architecture Decisions (ADR Log)

Record durable architecture decisions.

## Template
- **ADR-ID**:
- **Date**:
- **Context**:
- **Decision**:
- **Alternatives Considered**:
- **Consequences**:

## Seeded Decisions
- **ADR-ID**: ADR-0001
- **Date**: YYYY-MM-DD
- **Context**: AI behavior changes are nondeterministic and are poorly protected by traditional unit and integration checks alone.
- **Decision**: Require eval-driven planning for changes to prompts, routing, retrieval, tools, graders, and other model-facing behavior.
- **Alternatives Considered**: Ad hoc manual review only; generic benchmark scores without task-specific evals.
- **Consequences**: AI stories must define objectives, datasets, metrics, and regression plans before implementation, increasing rigor and reducing vibe-based releases.

- **ADR-ID**: ADR-0002
- **Date**: YYYY-MM-DD
- **Context**: Generated frontend code trends toward statistically average UI when design intent is expressed only in vague adjectives.
- **Decision**: For UI scope, require a frontend-design skill that translates aesthetic goals into concrete typography, layout, color, depth, and motion constraints.
- **Alternatives Considered**: Rely on generic "make it look good" prompting; rely only on high-level design philosophy text.
- **Consequences**: UI prompts/specs become more explicit and reusable, improving output quality while keeping the stronger design guidance isolated to UI stories.

- **ADR-ID**: ADR-0003
- **Date**: YYYY-MM-DD
- **Context**: Strong UI output often depends on prompt structure, not just extra style adjectives.
- **Decision**: Add a reusable UI prompt brief template based on WIRE and WIRE+FRAME so teams can capture role, context, constraints, output shape, and iteration logic before implementation.
- **Alternatives Considered**: Keep all prompt structure implicit in free-form story notes; rely only on the frontend-design skill text.
- **Consequences**: Important UI work gains a reusable briefing artifact and clearer handoff structure, while simple UI work can still use the lighter WIRE form.

- **ADR-ID**: ADR-0004
- **Date**: YYYY-MM-DD
- **Context**: The source workspace leaked Python/RAG/provider-specific assumptions into the generic template contract.
- **Decision**: Keep the template stack-agnostic by default and require the chosen language, framework, providers, directory layout, validation commands, and deployment targets to be selected during setup.
- **Alternatives Considered**: Ship a pre-selected default stack and ask users to edit around it later.
- **Consequences**: The base template stays reusable across projects, but setup must explicitly record stack decisions before implementation begins.

- **ADR-ID**: ADR-0005
- **Date**: 2026-03-15
- **Context**: FleetGraph must use Ship's REST API only, but Ship's live runtime model is a unified document graph with mixed relationship shapes. Canonical `document_associations` coexist with active legacy reads of `properties.project_id` and `assignee_ids`, and the current `/events` socket is browser delivery plumbing rather than a durable backend event bus.
- **Decision**: Put FleetGraph behind a REST normalization boundary and use a hybrid trigger model: route-level dirty-context enqueue hooks for hot writes plus a scheduled sweep for time-based drift detection. Keep on-demand chat same-origin inside Ship and run proactive work in a separate background worker process.
- **Alternatives Considered**: Assume `document_associations` is the only truth; pure polling; websocket-only triggering; fully separate cross-origin FleetGraph service from day one.
- **Consequences**: FleetGraph needs its own insight and checkpoint state, explicit normalization of Ship REST payloads, and a human-in-the-loop path for all consequential Ship writes.

- **ADR-ID**: ADR-0006
- **Date**: 2026-03-16
- **Context**: User feedback often arrives as a narrow correction or clarification during handoff or mid-story. The existing workflow had no explicit proportionality route, which made it too easy to overreact and expand a small correction into a broader planning or documentation cycle.
- **Decision**: Add a user-correction triage workflow that classifies blast radius before editing. Low-blast-radius corrections should patch only directly affected surfaces; only material scope or architecture changes should re-enter the full story gates.
- **Alternatives Considered**: Treat all user feedback as equally heavy; rely on agent judgment without a named workflow; always reopen spec/planning artifacts after any correction.
- **Consequences**: The harness now has an explicit route for bounded feedback handling, which should reduce unnecessary scope growth and keep corrective diffs smaller.

- **ADR-ID**: ADR-0007
- **Date**: 2026-03-16
- **Context**: The repo's docs surface mixed living references, assignment work, screenshots, PR artifacts, and historical submissions at the same level, which made both human onboarding and agent navigation harder than necessary.
- **Decision**: Reorganize `docs/` by reader intent and lifecycle: `core/`, `guides/`, `assignments/`, `reference/`, `research/`, `solutions/`, `evidence/`, and `archive/`, while moving FleetGraph working docs under `docs/assignments/fleetgraph/`.
- **Alternatives Considered**: Keep the flat docs surface and rely on a better top-level README only; move everything into an archive-heavy taxonomy with more nesting.
- **Consequences**: Entry navigation becomes clearer and future agents can distinguish active guidance from support material, but path references must be maintained carefully during future moves.

- **ADR-ID**: ADR-0008
- **Date**: 2026-03-16
- **Context**: The FleetGraph source PDF still says Claude-only integration, but the active repo direction is provider-agnostic with OpenAI preferred. At the same time, the next implementation risk is not missing features but missing substrate: tracing, graph runtime, trigger worker, deployment, and a scan of the broader `gauntlet/` workspace for reusable patterns.
- **Decision**: Treat FleetGraph as a foundation-first phase. Before feature implementation, require a gauntlet-wide reconnaissance pass, a provider adapter with OpenAI as the default path, LangSmith tracing bootstrap, LangGraph runtime scaffolding, trigger/worker substrate, and deployment/auth planning.
- **Alternatives Considered**: Jump straight into individual FleetGraph use cases; hard-code a single provider into the runtime; defer tracing and deployment until after the first proactive behavior works locally.
- **Consequences**: The next implementation stories should focus on platform readiness rather than user-facing FleetGraph behaviors, and future agents should enter through the foundation story pack instead of improvising the build order.

- **ADR-ID**: ADR-0009
- **Date**: 2026-03-16
- **Context**: The gauntlet workspace contains strong neighboring examples for LangGraph, LangSmith, provider routing, queue claims, and deployment contracts, but each donor repo also carries product-specific assumptions that would misfit FleetGraph if copied wholesale.
- **Decision**: Reuse neighboring repos at the contract and pattern level only. Lift Ghostfolio's graph/observability shape, LegacyLens's tracing and OpenAI adapter contracts, Collab Board's provider-wrapping pattern, and Ship audit app's durable claim semantics, while avoiding donor-specific provider lock-in, serverless-only runtimes, GitHub Actions execution, and foreign deployment defaults.
- **Alternatives Considered**: Rebuild all substrate decisions from scratch; copy the most complete neighboring implementation directly into Ship.
- **Consequences**: FleetGraph gets faster substrate convergence with less donor leakage, but implementers must translate patterns intentionally instead of copy-pasting code.

- **ADR-ID**: ADR-0010
- **Date**: 2026-03-16
- **Context**: FleetGraph needs a concrete provider entry point before LangGraph or tracing work begins. Ship already contains Claude/Bedrock-specific analysis code, but using that directly would leak the wrong provider contract into the new runtime.
- **Decision**: Introduce a dedicated FleetGraph `LLMAdapter` factory under `api/src/services/fleetgraph/llm/` that resolves provider config from env, defaults to OpenAI Responses, and keeps Bedrock Anthropic available behind the same interface.
- **Alternatives Considered**: Call OpenAI directly from future graph nodes; reuse `api/src/services/ai-analysis.ts`; defer provider abstraction until after the graph skeleton exists.
- **Consequences**: Future graph and tracing work can depend on one adapter interface, provider switching stays outside node logic, and the existing Bedrock path remains available as compatibility rather than as the default contract.

- **ADR-ID**: ADR-0011
- **Date**: 2026-03-16
- **Context**: The local workflow drifted into starting T002 work on a T001-named branch and into guessing at deployment providers from unrelated repo artifacts. That makes story state hard to track and weakens release discipline.
- **Decision**: Require every new story to begin with a remote sync and a fresh `codex/` branch whose name matches the active story. Also require every story, even non-deployment stories, to review impact against Ship's real deployment contract: API on Elastic Beanstalk, frontend on S3/CloudFront, and AWS-native config/secrets.
- **Alternatives Considered**: Allow branch reuse until merge time; require deployment review only on explicit deploy stories; infer provider choice from historical or neighboring repo files.
- **Consequences**: Story lineage stays easier to audit, deployment assumptions become explicit, and handoffs must record either the deploy updates made or `deployment impact: none`.

- **ADR-ID**: ADR-0012
- **Date**: 2026-03-16
- **Context**: Story packs can drift into a sequence of locally reasonable but globally inconsistent stories when they are drafted one at a time. That weakens sequencing, creates overlap, and leaves pack-level objectives implicit.
- **Decision**: When planning a story pack or phase pack, define the higher-level objectives first and draft the full planned story set in one pass before implementation begins.
- **Alternatives Considered**: Write one story at a time and backfill the rest later; rely on a technical plan alone to imply pack objectives.
- **Consequences**: Story packs should become more cohesive and comprehensive, but upfront planning discipline increases before implementation starts.

- **ADR-ID**: ADR-0013
- **Date**: 2026-03-16
- **Context**: Deployment state was easy to leave ambiguous, especially when the repo contains old references to unrelated hosting providers and the current machine may not have provider access.
- **Decision**: For stories that affect deployed runtime surfaces, require explicit deployment execution status in handoff and workflow state: `deployed`, `not deployed`, or `blocked`, with environment and command evidence when deployment occurs.
- **Alternatives Considered**: Treat deployment as implied by merge; only mention deploys when they succeed; leave provider access failures out of the story record.
- **Consequences**: Release state becomes more trustworthy, but handoffs must carry one more explicit status field for runtime-impacting stories.

- **ADR-ID**: ADR-0014
- **Date**: 2026-03-16
- **Context**: Ship's canonical production deployment remains AWS-native, but the team also relies on a real public demo at `ship-demo.onrender.com`. That demo path existed only in provider state, which made it easy to forget, misclassify as non-canonical, or leave undeployed after story completion.
- **Decision**: Keep AWS as the production baseline and formalize Render `ship-demo` as the sanctioned public demo environment, deployed through a checked-in script (`scripts/deploy-render-demo.sh`) and referenced in story/finalization workflows.
- **Alternatives Considered**: Ignore the Render demo because it is not production; repoint production documentation to Render; keep the demo path as an unwritten manual provider-side detail.
- **Consequences**: Deploy-relevant stories now need both production-path review and public-demo status, but future releases are less likely to drift away from the live demo the team actually uses.
