# Ship - Single Source of Truth

**Last Updated**: 2026-03-17
**Current Phase**: FleetGraph LangGraph orchestration pack
**Active Sprint**: Finish the LangGraph-orchestrated runtime, debug surfacing, and docs refresh
**Project Status**: Active
**Canonical Deployment Baseline**: API on AWS Elastic Beanstalk, frontend on S3/CloudFront, config/secrets on AWS-native services
**Sanctioned Public Demo**: Railway public demo, deployed with `scripts/deploy-railway-demo.sh`

---

## Current Focus

### Active Task
- **Title**: Complete the FleetGraph LangGraph orchestration refactor pack
- **Status**: In progress
- **Owner**: Codex

### Next Immediate Actions
1. Finish the local LangGraph orchestration pack while keeping Ship product data REST-only.
2. Refresh the workbook, inspection guide, and proof notes to match the graph-owned review/debug flow.
3. Hand off the LangGraph pack for audit before any deploy or finalization step.

---

## Repo Baseline

- **Canonical repo handbook**: `.claude/CLAUDE.md`
- **Canonical orchestrator**: `.ai/codex.md`
- **Compatibility mirrors**: `.ai/agents/claude.md`, `.ai/agents/cursor-agent.md`
- **Root agent entrypoints**: `AGENTS.md`, `CLAUDE.md`
- **Live AI workspace**: `.ai/`
- **Story branch rule**: every new story starts on a fresh `codex/` branch after remote sync; do not continue a new story on the previous story's branch
- **Monorepo packages**:
  - `web/`: React + Vite frontend
  - `api/`: Express API + WebSocket collaboration server
  - `shared/`: shared TypeScript contracts
- **Primary data store**: PostgreSQL
- **Real-time layer**: TipTap + Yjs synced through the API collaboration server

---

## FleetGraph Assignment Constraints

- Use the Ship REST API as the data source. No direct database access.
- Working presearch assumption: FleetGraph is provider-agnostic with OpenAI as the preferred default, though Ship already has Bedrock Claude code that can be reused as fallback/reference.
- LangGraph is recommended. If another framework is used, manual LangSmith instrumentation is required.
- LangSmith tracing is required from day one.
- Public LangSmith share links must be explicit opt-in because anyone with the link can view the trace.
- Implement both proactive and on-demand modes through the same graph architecture.
- The chat interface must be embedded in Ship context. No standalone chatbot page.
- Consequential actions require a human-in-the-loop confirmation gate.
- Detection latency target: under 5 minutes from Ship event to surfaced finding.

## FleetGraph Architecture Snapshot

- Ship runtime is a unified document graph exposed through REST, not a resource-silo app.
- Live relationship data is mixed between canonical `document_associations` and legacy properties such as `project_id` and `assignee_ids`.
- The current realtime layer is delivery-oriented WebSocket plumbing, not a durable trigger bus.
- The recommended MVP shape is same-origin FleetGraph API routes for chat plus a separate background worker for proactive runs.
- The current local refactor moves orchestration into LangGraph itself: scenario fan-out, ranking, interrupts, and action resume now live in graph nodes and tasks.

---

## FleetGraph Deliverables

- `docs/assignments/fleetgraph/FleetGraph_PRD.pdf`
- `docs/assignments/fleetgraph/README.md`
- `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
- `.ai/docs/references/fleetgraph-prd.md`
- `docs/assignments/fleetgraph/PRESEARCH.md`
- `docs/assignments/fleetgraph/FLEETGRAPH.md`
- `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/reconnaissance-note.md`
- `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-LANGGRAPH-ORCHESTRATION-PHASE/`
- `api/src/services/fleetgraph/llm/`
- `api/src/services/fleetgraph/tracing/`
- `api/src/services/fleetgraph/graph/`
- `api/src/services/fleetgraph/normalize/`
- `api/src/services/fleetgraph/worker/`
- `api/src/services/fleetgraph/deployment/`
- `api/src/services/fleetgraph/entry/`
- `api/src/services/fleetgraph/findings/`
- `api/src/services/fleetgraph/actions/`
- `api/src/services/fleetgraph/proactive/`
- `api/src/services/fleetgraph/contracts/`
- `api/src/routes/fleetgraph.ts`
- `api/src/openapi/schemas/fleetgraph.ts`
- `web/src/components/FleetGraphEntryCard.tsx`
- `web/src/components/FleetGraphDebugDock.tsx`
- `web/src/components/FleetGraphFindingsPanel.tsx`
- `web/src/hooks/useFleetGraphEntry.ts`
- `web/src/hooks/useFleetGraphFindings.ts`
- `scripts/fleetgraph_deploy_smoke.sh`
- `docs/guides/fleetgraph-deployment-readiness.md`
- Shared LangSmith trace links showing different execution paths

---

## Story Execution Guardrails

- Follow `AGENTS.md`, `.ai/codex.md`, and the active workflow for validation commands, branch rollover, deployment review, and handoff requirements.
- Run story lookup first, then `.ai/workflows/story-sizing.md`, before deciding whether the story is trivial or standard.
- Use the trivial lane only for one-file, non-API, non-AI changes; standard stories continue through the normal spec/eval/lock gates.
- Standard-lane implementation work uses the single writer lock in `.ai/workflows/parallel-flight.md`; trivial stories skip it.
- AI-architecture diffs trigger `bash scripts/check_ai_wiring.sh` automatically in pre-commit and again in `bash scripts/git_finalize_guard.sh`.
- `.ai/workflows/story-handoff.md` is the single user-facing completion gate; after approval, `.ai/workflows/git-finalization.md` executes or routes to `.ai/workflows/finalization-recovery.md`.
- Use `.ai/workflows/tdd-pipeline.md` for behavior stories that change tests plus production code; do not fall back to a single shared-context TDD loop.
- Visible UI stories should run `.ai/workflows/ui-qa-critic.md` after validation, and completed visible packs should publish `user-audit-checklist.md`.
- Keep the sanctioned public demo reference current: `scripts/deploy-railway-demo.sh` -> the active Railway public URL.
- For deploy-relevant stories, deployment status must still be explicit: `deployed`, `not deployed`, or `blocked`.
- For FleetGraph architecture work, keep the worker queue as the scheduler and keep Ship product reads/writes on REST even when FleetGraph-owned state stays in Postgres.

---

## Read Order

1. `.claude/CLAUDE.md`
2. `docs/README.md`
3. `docs/assignments/fleetgraph/README.md`
4. `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
5. `.ai/docs/references/fleetgraph-prd.md`
6. `docs/assignments/fleetgraph/PRESEARCH.md`
7. `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/feature-spec.md`
8. `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/feature-spec.md`
9. `.ai/codex.md`
10. `.ai/agents/claude.md`
