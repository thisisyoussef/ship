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
