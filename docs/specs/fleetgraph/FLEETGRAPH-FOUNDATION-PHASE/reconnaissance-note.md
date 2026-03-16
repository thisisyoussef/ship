# T001 Reconnaissance Note

## Story

- Story ID: FLEETGRAPH-FOUNDATION-PHASE / T001
- Title: Recon the whole `gauntlet/` directory for reusable FleetGraph substrate patterns
- Date: 2026-03-16
- Scope: find reusable patterns for LangGraph runtime shape, LangSmith tracing, provider adapters, worker substrate, and deployment/auth contracts before FleetGraph implementation begins

## Scan Method

- Reviewed the current FleetGraph pack in:
  - `docs/assignments/fleetgraph/README.md`
  - `docs/assignments/fleetgraph/PRESEARCH.md`
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/`
- Scanned `/Users/youss/Development/gauntlet` for:
  - LangGraph / `StateGraph`
  - LangSmith tracing bootstrap and wrappers
  - OpenAI adapter code
  - queue / worker / enqueue / scheduler patterns
  - deployment and environment contract docs

## Repos Reviewed

- `ship`
- `agentforge/ghostfolio`
- `collab-board`
- `legacylens`
- `auto-procure`
- `1.3-langsmith-langfuse-main`

## Keep Decisions

| Area | Keep | Why | Evidence |
|---|---|---|---|
| LangGraph runtime skeleton | Use Ghostfolio's explicit `StateGraph` service shape as the main JS/TS reference for graph state, branch routing, and deterministic fallback boundaries. | It already shows a production-ish NestJS service with annotated state, graph routing, failure capture, and a split between deterministic and graph paths. | `agentforge/ghostfolio/apps/api/src/app/agent/orchestration/agent-graph.service.ts` |
| LangSmith env policy | Reuse the `LANGSMITH_TRACING` + `LANGCHAIN_TRACING_V2` compatibility policy and a single bootstrap helper that normalizes env aliases before runtime starts. | This gives FleetGraph one operator-facing toggle while preserving SDK compatibility. | `agentforge/ghostfolio/apps/api/src/app/agent/tracing/langsmith.config.ts`, `agentforge/ghostfolio/docs/agent-observability-runbook.md`, `legacylens/src/infra/tracing/langsmith.py` |
| Request/run observability | Reuse the idea of attaching request IDs, latency breakdowns, tool metrics, and trace metadata to every root run. | FleetGraph will need branch-level and trigger-level visibility from day one. | `agentforge/ghostfolio/apps/api/src/app/agent/observability/agent-observability.service.ts`, `agentforge/ghostfolio/docs/agent-observability-runbook.md` |
| Provider wrapper boundary | Reuse Collab Board's pattern of instantiating raw provider clients first and then wrapping them for LangSmith with explicit route/provider metadata. | It cleanly separates provider initialization, tracing, and routing decisions without forcing a graph node to know tracing details. | `collab-board/api/ai/generate.ts` |
| OpenAI adapter contract | Reuse LegacyLens's contract-first adapter style for OpenAI: one dedicated client, typed request/response handling, retryable vs terminal error split, and traceable model calls. | FleetGraph needs OpenAI as the preferred default, but behind a replaceable interface. | `legacylens/src/infra/generation/openai.py` |
| LangSmith middleware bootstrap | Reuse LegacyLens's process bootstrap and request middleware concept for root traces and env resolution. | FleetGraph will need one consistent place to turn tracing on, normalize env aliases, and stamp root request/worker spans. | `legacylens/src/infra/tracing/langsmith.py` |
| Queue claim semantics | Reuse Ship audit app's database-backed queue claim pattern, especially `FOR UPDATE SKIP LOCKED` and explicit run lifecycle rows. | FleetGraph proactive work needs durable claim/retry semantics more than a fancy queue technology on day one. | `ship/audit-app/src/server/store.ts`, `ship/audit-app/src/server/main.ts` |
| Deployment contract style | Reuse LegacyLens's runbook style for backend/frontend env contracts, fail-fast secret rules, smoke targets, and rollback instructions. | The exact hosting target will differ, but FleetGraph still needs a written deploy/env contract before public rollout. | `legacylens/docs/runbooks/deployment-env-contract.md` |

## Avoid Decisions

| Area | Avoid | Why | Evidence |
|---|---|---|---|
| Claude-locked graph implementation | Do not copy Ghostfolio's Anthropic-specific model wiring or prompts directly. | FleetGraph is provider-agnostic with OpenAI preferred; the reusable part is the graph/service structure, not the provider binding. | `agentforge/ghostfolio/apps/api/src/app/agent/orchestration/agent-graph.service.ts` |
| Serverless monolith for FleetGraph runtime | Do not copy Collab Board's Vercel-function-heavy AI runtime as-is. | FleetGraph needs same-origin Ship routes plus a background worker for proactive execution; serverless request handlers alone are not the right substrate. | `collab-board/api/ai/generate.ts`, `collab-board/README.md` |
| GitHub Actions as proactive executor | Do not copy Ship audit app's GitHub Actions dispatch model for FleetGraph proactive analysis. | It is useful as a durable run-lifecycle example, but it is too coarse and slow for sub-5-minute detection loops. | `ship/audit-app/src/server/github-actions.ts`, `ship/audit-app/src/server/worker.ts` |
| Celery as a direct FleetGraph template | Do not copy Auto Procure's Celery/Redis worker stack directly. | The conceptual queue controls are useful, but the language/runtime/infra mismatch would add unnecessary substrate drift to Ship. | `auto-procure/agents/celery_config.py` |
| Donor deployment topology | Do not inherit Railway/Vercel or Render/Vercel hosting choices just because nearby repos use them. | FleetGraph should borrow deployment contract discipline, not hosting defaults from unrelated products. | `legacylens/docs/runbooks/deployment-env-contract.md`, `collab-board/README.md` |

## Recommended Reuse Map by Next Task

| Next Task | Primary reuse | Notes |
|---|---|---|
| T002 `LLMAdapter` | LegacyLens OpenAI adapter + Collab Board provider wrapper style | Use OpenAI as the default adapter path; keep Anthropic/other providers behind the same interface. |
| T003 tracing bootstrap | LegacyLens tracing bootstrap + Ghostfolio env toggle/runbook | Standardize env aliases, trace metadata, request IDs, and shared trace-link workflow. |
| T004 graph runtime skeleton | Ghostfolio `StateGraph` service shape | Borrow state annotations and conditional routing concepts, but rebuild around Ship context and HITL boundaries. |
| T005 Ship normalization layer | No direct donor implementation | This is FleetGraph-specific because Ship's mixed REST relationship shapes are unique. |
| T006 proactive worker substrate | Ship audit DB claim loop + selective queue ideas from Auto Procure | Prefer a Ship-native durable claim loop before introducing heavier worker infrastructure. |
| T007 embedded entry + HITL | No direct donor implementation | This must be designed from Ship context and approval semantics, not copied from neighboring repos. |
| T008 deployment/auth | LegacyLens deployment contract style | Reuse the runbook structure and fail-fast secret policy, not the exact provider choices. |

## Fresh Design Still Required

- Ship REST normalization for canonical + legacy relationship shapes
- FleetGraph-specific `TriggerEnvelope`, `ShipContextEnvelope`, and `InsightLedger`
- Same-origin embedded chat and approval envelope inside Ship
- Consequential write gating tied to Ship permissions and context
- Worker cadence and dedupe policy tuned to the under-5-minute detection target

## Recon Summary

The strongest reusable substrate references are:

1. `agentforge/ghostfolio` for LangGraph structure and observability shape
2. `legacylens` for OpenAI adapter and LangSmith bootstrap contracts
3. `collab-board` for provider routing and tracing wrappers
4. `ship/audit-app` for durable run/claim mechanics

The biggest reuse trap is copying a donor repo's provider, deployment, or execution model instead of lifting only the contract-level patterns.
