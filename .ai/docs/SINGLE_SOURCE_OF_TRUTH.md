# Ship - Single Source of Truth

**Last Updated**: 2026-03-16
**Current Phase**: AI harness TDD pipeline hardening
**Active Sprint**: Multi-agent TDD split, property tests, and mutation gating
**Project Status**: Active
**Canonical Deployment Baseline**: API on AWS Elastic Beanstalk, frontend on S3/CloudFront, config/secrets on AWS-native services
**Sanctioned Public Demo**: Render `ship-demo` at `https://ship-demo.onrender.com/`, deployed with `scripts/deploy-render-demo.sh`

---

## Current Focus

### Active Task
- **Title**: Replace single-agent TDD with an isolated three-agent pipeline and file-based handoff
- **Status**: In progress
- **Owner**: Codex

### Next Immediate Actions
1. Wire `.ai/workflows/tdd-pipeline.md` through startup docs, task workflows, and compatibility configs.
2. Keep `.ai/state/tdd-handoff/`, `scripts/tdd_handoff.sh`, and `scripts/run_targeted_mutation.sh` as the canonical file-based TDD substrate.
3. Validate the new contract with `bash scripts/check_ai_wiring.sh` plus smoke checks for the handoff helper and mutation tooling.

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
- `api/src/services/fleetgraph/llm/`
- `api/src/services/fleetgraph/tracing/`
- `api/src/services/fleetgraph/graph/`
- `api/src/services/fleetgraph/normalize/`
- `api/src/services/fleetgraph/worker/`
- `api/src/services/fleetgraph/entry/`
- `api/src/routes/fleetgraph.ts`
- `api/src/openapi/schemas/fleetgraph.ts`
- `web/src/components/FleetGraphEntryCard.tsx`
- `web/src/hooks/useFleetGraphEntry.ts`
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
- Keep the sanctioned public demo reference current: `scripts/deploy-render-demo.sh` -> `https://ship-demo.onrender.com/`.
- For deploy-relevant stories, deployment status must still be explicit: `deployed`, `not deployed`, or `blocked`.

---

## Read Order

1. `.claude/CLAUDE.md`
2. `docs/README.md`
3. `docs/assignments/fleetgraph/README.md`
4. `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
5. `.ai/docs/references/fleetgraph-prd.md`
6. `docs/assignments/fleetgraph/PRESEARCH.md`
7. `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/feature-spec.md`
8. `.ai/codex.md`
9. `.ai/agents/claude.md`
