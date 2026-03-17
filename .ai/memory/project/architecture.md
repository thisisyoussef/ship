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

- **ADR-ID**: ADR-0016
- **Date**: 2026-03-16
- **Context**: FleetGraph now has a provider-agnostic `LLMAdapter`, but T003 needs durable observability before LangGraph and worker behavior arrive. The trace contract must differentiate quiet versus non-quiet branches, preserve workspace/trigger metadata, and avoid making public trace exposure automatic.
- **Decision**: Add a FleetGraph-local tracing runtime under `api/src/services/fleetgraph/tracing/` with three parts: resolved LangSmith settings/client creation, an adapter decorator that emits `fleetgraph.llm.generate` spans, and a root `fleetgraph.run` helper that stamps workspace/trigger/branch/outcome metadata and creates share links only when `FLEETGRAPH_LANGSMITH_SHARE_TRACES=true`.
- **Alternatives Considered**: Wait until LangGraph exists before tracing anything; instrument only the future graph root and skip adapter-level spans; create public share links automatically whenever tracing is enabled.
- **Consequences**: Future FleetGraph nodes can inherit tracing from one entry point, quiet and advisory runs can be compared in LangSmith with consistent metadata, and public trace URLs remain an explicit operational choice instead of an accidental default.

- **ADR-ID**: ADR-0017
- **Date**: 2026-03-16
- **Context**: FleetGraph now has a provider boundary and trace contract, but T004 needs a durable graph shell before normalization, workers, or UI entry can be added safely. The runtime must distinguish quiet, reasoned, approval-required, and fallback outcomes while preserving checkpoint state by `thread_id`.
- **Decision**: Add a FleetGraph-local LangGraph runtime under `api/src/services/fleetgraph/graph/` that validates typed runtime input, compiles a `StateGraph` with `MemorySaver`, and routes through explicit `quiet_exit`, `reason_and_deliver`, `approval_interrupt`, and `fallback` nodes backed by one shared `FleetGraphState` contract.
- **Alternatives Considered**: Wait to add LangGraph until real REST fetch nodes exist; build the first feature as a prompt chain and retrofit branches later; implement human interrupts in T004 instead of keeping this story substrate-only.
- **Consequences**: Future stories can plug real fetch/normalize/worker logic into a stable branch taxonomy and checkpoint boundary, but graph-node implementations must continue using the shared state contract rather than inventing branch-local state shapes.

- **ADR-ID**: ADR-0018
- **Date**: 2026-03-16
- **Context**: FleetGraph now has a graph shell, but Ship still exposes live project context through a mixed set of canonical `belongs_to` relationships, route-derived context payloads, and legacy properties like `project_id` and `assignee_ids`. Letting future nodes reason over those raw shapes would reproduce existing route-specific assumptions inside the graph.
- **Decision**: Add a FleetGraph-local normalization boundary under `api/src/services/fleetgraph/normalize/` that validates raw Ship REST fragments, derives one `NormalizedShipDocument` contract, and packages on-demand page context into a typed `ShipContextEnvelope` plus `TriggerEnvelope` before any graph node consumes it.
- **Alternatives Considered**: Normalize ad hoc inside each future node; treat `belongs_to` as the only truth and ignore legacy fields; keep route-surface metadata implicit in frontend-only code.
- **Consequences**: Future worker and UI entry stories can operate on one internal model and one context envelope, but the normalization boundary must be updated intentionally whenever Ship route shapes evolve.

- **ADR-ID**: ADR-0019
- **Date**: 2026-03-16
- **Context**: FleetGraph now has a graph shell and normalized trigger/context contracts, but proactive execution still needs durable queue state, retry rules, sweep cadence, and a checkpoint-aware worker loop. Ship's `/events` socket remains non-durable delivery plumbing, and fresh database bootstrap must stay compatible with the current schema snapshot while adding the new worker tables.
- **Decision**: Add a FleetGraph-local worker substrate under `api/src/services/fleetgraph/worker/` backed by PostgreSQL queue jobs, a dedupe ledger, and sweep schedules. Route-facing enqueue hooks build stable dedupe keys and `thread_id`s, workers claim jobs with `FOR UPDATE SKIP LOCKED`, retries stay on the same queue row, and completed runs persist checkpoint summaries from the LangGraph runtime. Treat `schema.sql` as the fresh-install snapshot and bootstrap migrations from schema on empty databases before applying only truly pending migrations.
- **Alternatives Considered**: Keep proactive work in memory until later; reuse Ship's `/events` channel as the trigger substrate; introduce an external queue/worker stack before Ship-native persistence exists.
- **Consequences**: FleetGraph now has a durable substrate for proactive execution and DB-backed integration coverage, but live route wiring and deployed worker process management remain separate follow-on stories.

- **ADR-ID**: ADR-0020
- **Date**: 2026-03-16
- **Context**: FleetGraph now has graph, normalization, and worker substrate, but on-demand entry still needs a bounded same-origin API/UI contract. The document page already knows the active tab and nested path, while Ship's approval routes already establish the product expectation that consequential actions pause for human review.
- **Decision**: Add a same-origin FleetGraph entry boundary at `api/src/routes/fleetgraph.ts` backed by `api/src/services/fleetgraph/entry/`. The frontend sends normalized `ShipContextEnvelope` input from the current document page, the backend derives a stable `thread_id`, routes through the existing FleetGraph runtime, and maps consequential requests into a typed approval envelope with `Apply`, `Dismiss`, and `Snooze` options. Surface that contract through an embedded `FleetGraphEntryCard` on `UnifiedDocumentPage`.
- **Alternatives Considered**: Build a full chat UI before the entry contract exists; let FleetGraph fetch raw page context server-side through direct DB access; execute requested Ship writes immediately and add HITL later.
- **Consequences**: T007 gives FleetGraph a real contextual entry surface and a tangible approval-required pause state without yet executing live Ship writes, but future stories must preserve this boundary instead of bypassing it with ad hoc page- or route-specific logic.

- **ADR-ID**: ADR-0021
- **Date**: 2026-03-16
- **Context**: Ship's harness accumulated multiple near-canonical startup docs that repeated the same gate, routing, validation, and handoff rules. That increased startup token cost and made it unclear which file owned the live workflow contract.
- **Decision**: Make `.ai/codex.md` the canonical orchestrator, keep `AGENTS.md` as the repo-level constraint layer, and reduce `.ai/agents/claude.md` plus other entrypoint files to thin compatibility mirrors that point back to Codex and the workflow files.
- **Alternatives Considered**: Keep Claude as canonical and trim Codex instead; leave all three startup docs as full contracts; collapse all rules into AGENTS only.
- **Consequences**: Startup instructions become shorter and easier to maintain, but future harness edits must preserve Codex-first ownership and avoid regrowing duplicate orchestrators.

- **ADR-ID**: ADR-0022
- **Date**: 2026-03-16
- **Context**: The harness still treated trivial and complex stories the same, carried a multi-flight board that was heavier than current operating scale, relied on remembered AI wiring checks, allowed repeated correction loops without a circuit breaker, split review from finalization into two user-facing gates, and had no named recovery path when finalization failed.
- **Decision**: Add a post-lookup story-sizing gate with a trivial fast-track lane, retire the current parallel board in favor of one single writer lock, run AI wiring checks automatically from pre-commit and the finalization guard, add a persisted triage counter with a re-scope circuit breaker, treat story handoff as the single completion gate that includes the finalization plan, and route finalization failures into a named recovery workflow.
- **Alternatives Considered**: Keep the full ceremony for every story; preserve the richer flight-board state machine until it proved painful in practice; rely on manual `check_ai_wiring.sh` runs; keep handoff and finalization as separate human-touching steps; improvise on merge or guard failures.
- **Consequences**: Trivial work becomes cheaper, standard work keeps a lighter coordination model, AI wiring drift fails earlier, repeated correction churn escalates sooner, and finalization becomes more resilient through an explicit rollback/recovery path.

- **ADR-ID**: ADR-0023
- **Date**: 2026-03-16
- **Context**: The existing TDD contract used one agent context for writing tests, implementing code, and refactoring. That makes the red phase easy to fake, lets implementation plans leak into tests, and weakens edge-case coverage. The harness also lacked durable handoff artifacts, property-test guidance, and an objective post-green quality gate.
- **Decision**: Replace single-agent TDD with a file-isolated three-agent pipeline. Agent 1 writes adversarial tests from the spec and public API surface only; Agent 2 implements without editing Agent 1 tests; Agent 3 reviews/refactors without seeing Agent 2's debugging history. Use `.ai/state/tdd-handoff/<story-id>/` plus `scripts/tdd_handoff.sh` for stage handoff and RED/GREEN enforcement, generate `fast-check` property tests when story shape qualifies, and run targeted Stryker mutation testing after green with a 70% starting threshold.
- **Alternatives Considered**: Keep the single-agent loop and rely on prompting alone; use one shared agent but add stricter checklists; postpone property/mutation gates until after more stories expose failures.
- **Consequences**: TDD becomes more rigorous and auditable, but the harness gains new stage artifacts, helper scripts, and loop-limit escalation rules that must stay wired through startup and handoff surfaces.

- **ADR-ID**: ADR-0024
- **Date**: 2026-03-16
- **Context**: FleetGraph now has an API route, worker substrate, tracing contract, and provider adapter, but those surfaces still lacked one shared production env contract, one service-auth smoke path, and one documented proof flow that ties deployed access to trace evidence. The API already loads core config from SSM in production, while the worker CLI had no corresponding production-secret bootstrap.
- **Decision**: Add a FleetGraph deployment module under `api/src/services/fleetgraph/deployment/` that resolves shared API/worker readiness from the same env surface, add a service-token-protected readiness route at `GET /api/fleetgraph/ready`, load optional FleetGraph/LangSmith/OpenAI settings from SSM in production, fail-fast the worker CLI on missing readiness requirements, and add `scripts/fleetgraph_deploy_smoke.sh` plus `docs/guides/fleetgraph-deployment-readiness.md` as the operator-facing proof path.
- **Alternatives Considered**: Keep API and worker env parsing separate; rely on `/health` plus tribal knowledge for FleetGraph deploy proof; defer worker secret/bootstrap work until the first AWS deployment.
- **Consequences**: Deployed FleetGraph surfaces can be checked through one authenticated readiness endpoint and one smoke command, API and worker now share the same secret/bootstrap contract, and AWS deployment remains explicitly blocked until credentials are available on the machine running the story.

- **ADR-ID**: ADR-0025
- **Date**: 2026-03-16
- **Context**: After T008, the Render public demo failed before boot because the production secret loader tried optional FleetGraph/LangSmith SSM reads even on a non-AWS host with explicit runtime env already present. The failure mode was `CredentialsProviderError`, which hid the real readiness state and blocked the sanctioned public demo.
- **Decision**: Treat explicit runtime environment variables as the primary FleetGraph config source on non-AWS hosts such as Render. Keep SSM as the AWS fallback for missing settings, but make optional FleetGraph/LangSmith SSM loading credential-tolerant so a non-AWS host can boot, expose readiness, and report missing required settings cleanly instead of crashing on credential lookup.
- **Alternatives Considered**: Keep optional SSM loading mandatory everywhere in production; disable FleetGraph on Render entirely; fork a separate Render-only config path outside the shared deployment module.
- **Consequences**: Render and other non-AWS hosts can boot FleetGraph-ready code without AWS credentials when explicit env is configured, while AWS-hosted Ship still retains SSM-backed fallback loading for missing settings.

- **ADR-ID**: ADR-0026
- **Date**: 2026-03-17
- **Context**: The Tuesday MVP requires one proactive detection running end to end on real Ship data, visible in Ship without first asking FleetGraph a question. The repo already has a worker substrate, tracing, and an on-demand entry surface, but it lacked a proactive finding contract and visible rendering path.
- **Decision**: Implement the MVP proactive slice as week-start drift detection sourced from `GET /api/weeks` through a FleetGraph REST client, persist surfaced findings in FleetGraph-owned durable tables, and render active findings on document pages by querying FleetGraph-owned findings tied to the current document plus related Ship context ids.
- **Alternatives Considered**: Query Ship product tables directly for proactive scoring; derive visible findings only from the latest worker checkpoint; keep proactive findings hidden until the full write path exists.
- **Consequences**: FleetGraph stays honest to the REST-only assignment contract for Ship data, gains durable dismiss/snooze/cooldown state for proactive findings, and leaves the actual `start week` write execution for `T104`.

- **ADR-ID**: ADR-0027
- **Date**: 2026-03-17
- **Context**: The FleetGraph MVP needs to stay visually reviewable on the public demo as each runtime story lands. Without an explicit UI-first rule, future stories could regress into backend-first execution where visible proof and audit steps arrive too late for practical monitoring.
- **Decision**: For FleetGraph MVP runtime stories, establish or extend the Ship-facing UI surface early in the story sequence and require future completion gates to include UI inspection steps, preferably against the sanctioned public demo when deployable.
- **Alternatives Considered**: Keep UI proof as a late-story concern; rely on traces/tests alone until final evidence capture; make UI inspection optional in handoff.
- **Consequences**: Future FleetGraph stories must preserve a visible proof lane and handoffs become more behavior-oriented, but story sequencing and completion packets need to be more deliberate about inspectable states and public demo availability.

- **ADR-ID**: ADR-0028
- **Date**: 2026-03-17
- **Context**: `T104` needs one real human-in-the-loop Ship write path for the Tuesday MVP, but the assignment constraint still says Ship REST is the data source and the visible proactive panel already exists as the review surface from `T103`.
- **Decision**: Execute the MVP `start_week` action by forwarding the user-approved apply request through the existing same-origin Ship REST route `POST /api/weeks/:id/start`, while storing duplicate-suppression and outcome history in a FleetGraph-owned `fleetgraph_finding_action_runs` ledger. Surface the persisted execution state back through `/api/fleetgraph/findings` and the inline `FleetGraphFindingsPanel`.
- **Alternatives Considered**: Call shared week-start database logic directly from FleetGraph; resolve successful findings immediately and hide the outcome; keep the action advisory-only until the evidence story.
- **Consequences**: FleetGraph preserves the REST-only boundary for Ship product writes, gains durable one-time execution behavior and refresh-safe result rendering, and keeps the visible document-page panel as the canonical HITL lane for the MVP.

- **ADR-ID**: ADR-0029
- **Date**: 2026-03-17
- **Context**: The public FleetGraph proof lane needs to stay visually inspectable as MVP stories merge, but the prior Render demo path failed operationally because FleetGraph-owned tables were missing there and the workspace seed did not guarantee a named page with a visible finding/HITL state. The repo already has a container boot path we control, including migrations and optional seed/bootstrap.
- **Decision**: Move the sanctioned public FleetGraph demo path to Railway, add a repo-owned `scripts/deploy-railway-demo.sh` workflow, and create a deterministic demo proof lane seeded through `api/src/db/seed.ts` plus `api/src/services/fleetgraph/demo/fixture.ts`. The fixture creates a named FleetGraph demo project/week, resets the week to `planning`, seeds a visible week-start drift finding, and clears prior action-execution state so the `Review and apply` path is repeatable.
- **Alternatives Considered**: Keep Render and repair it with provider-side manual DB intervention; rely on incidental seeded data and arbitrary existing weeks for UI audits; make the proof lane depend on a fresh proactive worker sweep instead of deterministic seed/bootstrap state.
- **Consequences**: Public-demo UI audits become predictable and provider-managed instead of incidental, but future deploy-relevant stories must keep the Railway demo contract current and preserve the named inspection target unless the guide/docs are updated in the same story.

- **ADR-ID**: ADR-0030
- **Date**: 2026-03-17
- **Context**: The MVP still needed one proactive detection running end to end on the public demo. Railway now hosts both the API and a dedicated FleetGraph worker, but the first live worker pass exposed two issues: the proactive client schema did not match the real Ship `/api/weeks` payload, and stale demo-worker ledger state could hide the worker-generated proof lane even after redeploys.
- **Decision**: Keep the Railway demo on a shared image with explicit `SHIP_RUNTIME_ROLE=api|worker`, normalize the real Ship weeks payload into FleetGraph's canonical week schema, and have the demo bootstrap both preserve the seeded HITL lane and enqueue one fresh proactive worker job after clearing stale FleetGraph-owned worker ledger state for the named demo workspace.
- **Alternatives Considered**: Depend only on due sweep schedules for the worker proof lane; keep the stricter mocked `/api/weeks` schema and fix prod by hand; seed the worker-generated finding directly instead of letting the worker produce it.
- **Consequences**: The public demo now proves a real worker-generated finding on real Ship REST data, and repeated deploys stay inspectable without manual DB cleanup, but the demo fixture and proactive client schema must stay aligned with the live Ship API shape.

- **ADR-ID**: ADR-0031
- **Date**: 2026-03-17
- **Context**: The Tuesday MVP needs a submission-ready evidence set from the live Railway demo, but the deployed findings API does not always carry a pre-shared `tracePublicUrl`, and the current LangSmith payload for FleetGraph traces exposes total tokens without a reliable prompt/completion split or dollar-cost field.
- **Decision**: Capture FleetGraph MVP evidence through a repo-owned script that can authenticate to the live Railway demo, verify FleetGraph readiness, promote matching LangSmith run ids to shared links when the API surface only exposes ids, and record usage honestly as total-token counts when finer-grained cost fields are unavailable.
- **Alternatives Considered**: Depend on the findings API to always return a ready-made public trace URL; fill the workbook with estimated token/cost splits; treat screenshots and trace links as manual post-story chores.
- **Consequences**: Evidence capture becomes reproducible and less brittle, and the workbook can stay truthful about the current observability limits, but the capture script must stay aligned with live trace metadata and demo fixture names.
