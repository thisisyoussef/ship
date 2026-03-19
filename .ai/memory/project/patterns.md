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

- **Pattern**: Normalize mixed Ship relationships before graph use
- **Use when**: FleetGraph needs to reason over Ship issues, projects, sprints, or weekly documents that may expose both canonical `belongs_to` links and legacy fields like `project_id` or `assignee_ids`.
- **Approach**: Parse raw route payloads at one boundary, preserve canonical associations, carry legacy hints separately, and emit a single `NormalizedShipDocument` plus `ShipContextEnvelope` contract for the graph/runtime to consume.
- **Benefits**: Prevents graph nodes from encoding route-specific quirks, keeps legacy compatibility visible, and makes context envelopes testable with fixtures instead of live routes.
- **Tradeoffs**: Adds one more translation layer that must evolve with Ship’s REST responses.
- **References**: `api/src/services/fleetgraph/normalize/documents.ts`, `api/src/services/fleetgraph/normalize/context.ts`, `api/src/services/fleetgraph/normalize/types.ts`

- **Pattern**: Durable dedupe ledger before proactive reasoning
- **Use when**: A proactive FleetGraph workflow needs hot-write enqueue, retry, and scheduled sweep behavior without duplicating work across worker ticks or process restarts.
- **Approach**: Keep a PostgreSQL dedupe ledger keyed by stable FleetGraph dedupe keys, lock that ledger row during enqueue, claim queued jobs with `FOR UPDATE SKIP LOCKED`, and persist checkpoint summaries plus next-eligible timestamps back into the ledger after each run.
- **Benefits**: Makes enqueue idempotent, keeps retries on one durable row, and gives later stories a visible substrate for cooldowns and checkpoint-aware execution.
- **Tradeoffs**: Adds internal tables and worker-store code before any user-facing proactive feature exists.
- **References**: `api/src/services/fleetgraph/worker/store.ts`, `api/src/services/fleetgraph/worker/runtime.ts`, `api/src/db/migrations/038_fleetgraph_worker_substrate.sql`

- **Pattern**: Same-origin entry through normalized page context
- **Use when**: FleetGraph needs to start from the current Ship document page without inventing a standalone UI or re-fetching raw context ad hoc.
- **Approach**: Let the document page provide `context`, `activeTab`, and `nestedPath`, build a normalized FleetGraph entry payload on the frontend, validate it server-side, derive a stable `thread_id`, and route it through the existing FleetGraph runtime behind `/api/fleetgraph/entry`.
- **Benefits**: Keeps on-demand entry consistent with Ship's page state, preserves the REST-only boundary, and gives future chat behavior one stable ingress path.
- **Tradeoffs**: Adds one more translation layer between the page shell and the graph/runtime.
- **References**: `api/src/routes/fleetgraph.ts`, `api/src/services/fleetgraph/entry/service.ts`, `web/src/components/FleetGraphEntryCard.tsx`

- **Pattern**: One canonical orchestrator with thin compatibility mirrors
- **Use when**: Multiple agent entrypoints need the same workflow contract, but startup token cost is climbing because each file restates the same rules.
- **Approach**: Keep one canonical orchestrator (`.ai/codex.md`) with the real routing contract, then turn agent-specific files into lightweight compatibility mirrors that point back to it and preserve only the tokens wiring scripts require.
- **Benefits**: Reduces startup duplication, keeps workflow ownership obvious, and makes future harness edits easier to audit.
- **Tradeoffs**: Requires discipline so mirrors stay thin instead of growing into a second source of truth.
- **References**: `.ai/codex.md`, `.ai/agents/claude.md`, `AGENTS.md`, `scripts/check_ai_wiring.sh`

- **Pattern**: Story sizing before full ceremony
- **Use when**: A story may be small enough that the full spec/eval/coordination path would add more friction than safety.
- **Approach**: Run story lookup first, then classify the work with `.ai/workflows/story-sizing.md`. Only one-file, non-API, non-AI stories may take the trivial lane; everything else stays standard.
- **Benefits**: Keeps quick fixes fast without weakening the heavier guardrails needed for public-contract, AI, schema, or deployment work.
- **Tradeoffs**: Requires disciplined classification instead of hand-wavy “this feels small” reasoning.
- **References**: `.ai/workflows/story-sizing.md`, `.ai/workflows/feature-development.md`, `.ai/workflows/bug-fixing.md`

- **Pattern**: Single writer lock until real contention
- **Use when**: The repo needs lightweight coordination for standard-lane implementation work, but real multi-agent contention is still rare.
- **Approach**: Keep `scripts/flight_slot.sh` as the stable entrypoint, but back it with one `.ai/state/flight-lock.json` active lock instead of the old richer board state machine.
- **Benefits**: Preserves single-writer safety with much lower coordination overhead.
- **Tradeoffs**: Gives up richer multi-flight metadata until the repo actually needs it again.
- **References**: `.ai/workflows/parallel-flight.md`, `scripts/flight_slot.sh`

- **Pattern**: One combined completion gate
- **Use when**: A story is ready for review and the team wants one human-facing approval step instead of separate handoff and finalization rounds.
- **Approach**: Put evidence, visible proof, the user audit checklist, and the finalization plan into `.ai/workflows/story-handoff.md`; after approval, let `.ai/workflows/git-finalization.md` execute atomically and route failures to recovery.
- **Benefits**: Fewer round-trips, clearer user review, and a more tangible completion packet.
- **Tradeoffs**: The completion gate has to be well-structured so it does not become vague or overloaded.
- **References**: `.ai/workflows/story-handoff.md`, `.ai/workflows/git-finalization.md`, `.ai/workflows/finalization-recovery.md`

- **Pattern**: File-isolated three-agent TDD
- **Use when**: A story changes both tests and implementation and the team wants a real red phase instead of implementation-aware tests.
- **Approach**: Let Agent 1 write adversarial tests from spec plus public API only, enforce RED on disk, let Agent 2 implement without touching those tests, run property and mutation gates when applicable, then let Agent 3 review/refactor with a fresh context and final GREEN enforcement.
- **Benefits**: Reduces fake-red cycles, improves edge-case pressure on the implementation, and leaves durable audit artifacts in `.ai/state/tdd-handoff/`.
- **Tradeoffs**: Adds orchestration overhead and more helper tooling before coding starts.
- **References**: `.ai/workflows/tdd-pipeline.md`, `scripts/tdd_handoff.sh`, `scripts/run_targeted_mutation.sh`, `.ai/state/tdd-handoff/README.md`

- **Pattern**: Human-centered UI critic after visible stories
- **Use when**: A story changes user-visible behavior and the team wants one lightweight, evidence-based pass for copy clarity, truthful feedback, debug-detail containment, and modest polish.
- **Approach**: Run `.ai/workflows/ui-qa-critic.md` after validation, inspect the best visible surface, record bounded findings neutrally, and append up to 3 non-blocking follow-on stories at the tail of the active sequence or pack.
- **Benefits**: Captures UX debt while it is still visible, keeps primary UI language calmer and more trustworthy, and turns ad hoc feedback into reusable next work.
- **Tradeoffs**: Adds one more visible-story step and requires discipline to keep the critic bounded instead of turning it into an endless redesign loop.
- **References**: `.ai/workflows/ui-qa-critic.md`, `.ai/workflows/story-handoff.md`, `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/user-audit-checklist.md`

- **Pattern**: Page-level debug dock for secondary QA detail
- **Use when**: A visible product surface needs technical QA detail such as endpoints, trace links, or thread ids without pushing that language back into the main card copy.
- **Approach**: Publish already-fetched technical state into a page-level secondary dock or overlay that stays easy to open, easy to ignore, and clearly separate from the primary human-facing surface.
- **Benefits**: Keeps the main UI calm and human-readable while still giving QA one consistent place to inspect internals.
- **Tradeoffs**: Adds a small shared state layer between visible cards and the secondary debug surface.
- **References**: `web/src/components/FleetGraphDebugDock.tsx`, `web/src/components/FleetGraphDebugSurface.tsx`, `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/task-breakdown.md`

- **Pattern**: Labeled secondary-actions sidecar for FleetGraph cards
- **Use when**: A FleetGraph card needs to keep the main narrative focused on the signal and suggested next step while still offering low-stakes lifecycle actions like dismiss or snooze.
- **Approach**: Keep the main card flow as finding -> evidence -> suggested next step, then place secondary lifecycle controls in a clearly labeled quick-actions panel with supportive copy.
- **Benefits**: Improves scanability, reduces button clutter in the main narrative, and keeps secondary actions visually subordinate without hiding them.
- **Tradeoffs**: Uses a little more vertical and horizontal space than a bare button row.
- **References**: `web/src/components/FleetGraphFindingCard.tsx`, `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/task-breakdown.md`

- **Pattern**: Shared deploy contract plus service-auth readiness route
- **Use when**: A feature now spans an authenticated UI route, a background worker process, provider secrets, and tracing configuration, and the team needs one deploy-readiness proof path.
- **Approach**: Resolve API and worker readiness from the same env contract, expose a token-protected readiness endpoint that reports both surfaces together, and pair it with a smoke script that requires both the readiness response and an explicit trace URL.
- **Benefits**: Prevents API/worker config drift, makes deploy proof reproducible, and keeps trace evidence part of the definition of “ready”.
- **Tradeoffs**: Adds one more internal route and one more shared secret to manage.
- **References**: `api/src/services/fleetgraph/deployment/config.ts`, `api/src/routes/fleetgraph.ts`, `scripts/fleetgraph_deploy_smoke.sh`, `docs/guides/fleetgraph-deployment-readiness.md`

- **Pattern**: Explicit-env primary on non-AWS deploy hosts
- **Use when**: The same runtime must boot on AWS-hosted production and on a non-AWS demo or preview host such as Render.
- **Approach**: Treat explicit runtime environment variables as the primary config source on non-AWS hosts, keep secret-store reads as fallback for missing settings, and tolerate credential-provider failures for optional settings so the process can still expose readiness.
- **Benefits**: Prevents non-AWS demo hosts from crashing on optional AWS credential lookups and keeps one shared deploy contract instead of host-specific forks.
- **Tradeoffs**: The readiness route must still surface missing required settings clearly, because boot success alone no longer proves full deploy readiness.
- **References**: `api/src/config/ssm.ts`, `docs/guides/fleetgraph-deployment-readiness.md`, `api/src/config/ssm.test.ts`

- **Pattern**: REST-scored proactive finding with FleetGraph-owned lifecycle state
- **Use when**: A FleetGraph story needs one real proactive signal from Ship without violating the assignment rule that Ship REST is the data source.
- **Approach**: Fetch Ship workspace/week state through the Ship REST API, do deterministic candidate selection first, then persist only the resulting FleetGraph finding, lifecycle state, and trace linkage in FleetGraph-owned tables.
- **Benefits**: Keeps Ship product data on the REST boundary while still giving proactive findings durable dedupe, dismiss, snooze, and cooldown behavior.
- **Tradeoffs**: Adds a second layer of state that must be kept clearly separated from Ship product data.
- **References**: `api/src/services/fleetgraph/proactive/ship-client.ts`, `api/src/services/fleetgraph/proactive/runtime.ts`, `api/src/services/fleetgraph/findings/store.ts`

- **Pattern**: Context-aware proactive rendering on Ship document pages
- **Use when**: A proactive FleetGraph finding is anchored to a related Ship document like a sprint, but the user may be viewing a surrounding project or program page.
- **Approach**: Query FleetGraph-owned findings for the current document id plus related `belongs_to` ids from Ship context, then render the active findings inline on `UnifiedDocumentPage` with dismiss and snooze controls.
- **Benefits**: Makes proactive findings visible where PMs already work without inventing a standalone chatbot or requiring a manual FleetGraph question first.
- **Tradeoffs**: The visible surface depends on high-quality context envelopes from the document page.
- **References**: `web/src/components/FleetGraphFindingsPanel.tsx`, `web/src/hooks/useFleetGraphFindings.ts`, `api/src/routes/fleetgraph.ts`

- **Pattern**: UI-first proof lane for visible MVP stories
- **Use when**: A story changes user-visible product behavior and the team needs to monitor progress from a live Ship surface as stories merge.
- **Approach**: Establish or extend the thinnest useful Ship-facing UI surface early in the story, then evolve backend/runtime behavior behind that visible lane instead of adding UI only at the end.
- **Benefits**: Progress stays visually reviewable on the sanctioned demo, user audits become more concrete, and runtime stories are less likely to disappear into backend-only diffs.
- **Tradeoffs**: Requires earlier UI coordination even for backend-heavy stories.
- **References**: `.ai/workflows/feature-development.md`, `.ai/workflows/story-handoff.md`, `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/technical-plan.md`

- **Pattern**: Same-origin REST apply with FleetGraph-owned execution ledger
- **Use when**: FleetGraph needs to execute a real Ship write after explicit human approval without violating the rule that Ship product state must stay behind Ship REST.
- **Approach**: Keep the recommendation on the visible FleetGraph panel, confirm inline, then forward the approved write through the existing Ship REST endpoint while storing apply status, attempts, and outcome messaging in a FleetGraph-owned action-run table keyed to the finding.
- **Benefits**: Preserves the Ship REST boundary, prevents duplicate execution, and gives refresh-safe UI rendering for success, already-applied, and failure states.
- **Tradeoffs**: Adds one more FleetGraph-owned persistence layer and requires careful request-header forwarding for same-origin auth/CSRF.
- **References**: `api/src/services/fleetgraph/actions/service.ts`, `api/src/routes/fleetgraph.ts`, `web/src/components/FleetGraphFindingsPanel.tsx`

- **Pattern**: Named demo proof lane with resettable FleetGraph state
- **Use when**: A visible FleetGraph story needs a public-demo inspection target that stays testable across repeated audits and deploys.
- **Approach**: Seed one clearly named Ship project/week through the normal seed/bootstrap path, attach a FleetGraph-owned finding to that exact week, and clear prior action-execution state whenever the demo bootstrap reruns so the same `Review and apply` path is visible again.
- **Benefits**: Gives user audits one stable page and one stable finding title, avoids “go search around” testing, and keeps UI proof tangible as new stories extend the same lane.
- **Tradeoffs**: Demo fixtures add intentional non-product data that must stay clearly named and documented so reviewers do not confuse them with organic workspace content.
- **References**: `api/src/services/fleetgraph/demo/fixture.ts`, `api/src/db/seed.ts`, `docs/guides/fleetgraph-demo-inspection.md`

- **Pattern**: Repo-owned Railway public demo deploy
- **Use when**: The team needs a sanctioned public demo surface that can run the containerized boot path, including migrations and optional demo seed/bootstrap, without free-plan provider workarounds.
- **Approach**: Keep AWS as production, but deploy the public demo through `scripts/deploy-railway-demo.sh` with Railway project/service/url envs, then verify demo login plus FleetGraph findings instead of relying on `/health` alone.
- **Benefits**: Moves deploy proof into the repo, reduces provider-side tribal knowledge, and makes the demo smoke check visible-product aware.
- **Tradeoffs**: Requires local Railway access plus public-demo env variables to be present before deploys can succeed.
- **References**: `scripts/deploy-railway-demo.sh`, `railway.json`, `docs/guides/fleetgraph-deployment-readiness.md`

- **Pattern**: Preserve the seeded HITL lane, queue the worker proof lane
- **Use when**: The public demo needs one deterministic UI audit target and one live worker-generated proof target at the same time.
- **Approach**: Seed the named HITL finding directly for stable review/apply inspection, but clear stale FleetGraph worker ledger state and enqueue one fresh proactive worker job so the second named finding is produced by the live worker path.
- **Benefits**: Keeps the demo visually stable while still proving end-to-end proactive execution on real Ship REST data.
- **Tradeoffs**: Demo bootstrap has to manage two proof lanes intentionally instead of assuming one lane can cover every audit need.
- **References**: `api/src/services/fleetgraph/demo/fixture.ts`, `api/src/services/fleetgraph/proactive/runtime.ts`, `docs/guides/fleetgraph-demo-inspection.md`

- **Pattern**: Normalize real Ship REST payloads before proactive scoring
- **Use when**: FleetGraph consumes a Ship route whose live payload shape includes extra fields or a different root metadata contract than the narrow test fixture shape.
- **Approach**: Let the proactive client accept the live response shape, strip or ignore fields FleetGraph does not use, and explicitly normalize required metadata like `workspace_sprint_start_date` into one canonical output contract.
- **Benefits**: Prevents deploy-only failures caused by mocked schemas being stricter than the real Ship API, while keeping the worker/detector logic strongly typed.
- **Tradeoffs**: Response schemas must be maintained against real API shape drift instead of assuming tests alone define the contract.
- **References**: `api/src/services/fleetgraph/proactive/types.ts`, `api/src/services/fleetgraph/proactive/ship-client.ts`, `api/src/services/fleetgraph/proactive/ship-client.test.ts`

- **Pattern**: Repo-owned live evidence capture with trace-share fallback
- **Use when**: A deployed FleetGraph story needs submission-ready proof from the live public demo, including shared traces and visible UI evidence.
- **Approach**: Use a checked-in capture script that logs into the public demo, verifies readiness, captures named inspection targets, and promotes LangSmith run ids to shared URLs when the live API surface does not already include a public trace link.
- **Benefits**: Keeps evidence capture reproducible, reduces manual audit chores, and avoids false failures when the runtime stores a run id before a shared URL exists.
- **Tradeoffs**: The script must stay aligned with live trace metadata and demo fixture names.
- **References**: `scripts/capture_fleetgraph_mvp_evidence.sh`, `docs/evidence/fleetgraph-mvp-evidence.json`, `docs/evidence/fleetgraph-mvp-evidence.md`

- **Pattern**: Outer document shell owns FleetGraph page scroll
- **Use when**: FleetGraph panels are inserted above an existing tabbed or editor-based document surface that already relies on nested flex layouts.
- **Approach**: Let the outer `UnifiedDocumentPage` shell own vertical scrolling, keep the FleetGraph panels and the main document surface in the same scroll container, and avoid trapping the content behind an inner `overflow-hidden` wrapper.
- **Benefits**: The page feels like one continuous document again and the top FleetGraph surfaces remain reachable during live inspection.
- **Tradeoffs**: Inner editor/tab shells still need careful sizing so the outer scroll container does not fight them.
- **References**: `web/src/pages/UnifiedDocumentPage.tsx`, `web/src/pages/UnifiedDocumentPage.test.tsx`, `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/feature-spec.md`

- **Pattern**: Gesture-safe inline confirmation
- **Use when**: A user-facing FleetGraph action escalates from `Review and apply` to a real Ship mutation inline rather than through a separate modal.
- **Approach**: Open a distinct review state first, strengthen the review copy, put `Cancel` before the confirm action, and add a short gesture guard so the same click or fast double-click cannot immediately trigger the Ship mutation.
- **Benefits**: Keeps the interaction lightweight while making intent clearer and preventing accidental confirmation.
- **Tradeoffs**: Adds a tiny delay before a deliberate confirmation and requires explicit tests to keep the interaction stable.
- **References**: `web/src/components/FleetGraphFindingsPanel.tsx`, `web/src/components/FleetGraphFindingCard.tsx`, `web/src/components/FleetGraphFindingsPanel.test.tsx`

- **Pattern**: Treat the native V2 thread payload as the only canonical FleetGraph contract
- **Use when**: FleetGraph routes, worker code, or web hooks need to exchange analysis, action review, or resume data.
- **Approach**: Keep canonical surfaces on `responsePayload`, `reasonedFindings`, `actionDrafts`, `pendingApproval`, `dialogSpec`, and structured resume input. Let the same V2 runtime/thread/checkpointer back initial analysis, follow-up turns, review threads, and worker executions instead of mapping results back into V1-shaped envelopes.
- **Benefits**: Removes route/web adapter drift, keeps follow-up chat and HITL on one persisted thread model, and makes richer typed dialogs possible without special-case contracts.
- **Tradeoffs**: Any API/UI/schema change now has to update the native V2 contract everywhere instead of hiding behind a compatibility layer.
- **References**: `api/src/routes/fleetgraph.ts`, `api/src/services/fleetgraph/graph/runtime-v2.ts`, `api/src/services/fleetgraph/actions/runtime-v2-store.ts`, `web/src/hooks/useFleetGraphAnalysis.ts`
