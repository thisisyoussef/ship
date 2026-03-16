# Ship - Single Source of Truth

**Last Updated**: 2026-03-16
**Current Phase**: Docs information architecture cleanup
**Active Sprint**: Documentation reorganization
**Project Status**: Active

---

## Current Focus

### Active Task
- **Title**: Reorganize the repo docs surface so active references, assignments, evidence, and archive material are easier to navigate
- **Status**: In Progress
- **Owner**: Codex

### Next Immediate Actions
1. Keep FleetGraph assignment work routed through `docs/assignments/fleetgraph/`.
2. Preserve the new `docs/core`, `docs/guides`, `docs/evidence`, and `docs/archive` boundaries instead of re-flattening the docs surface.
3. Use `.ai/workflows/user-correction-triage.md` when a future correction is narrow instead of reopening broad replanning by default.

---

## Repo Baseline

- **Canonical repo handbook**: `.claude/CLAUDE.md`
- **Root agent entrypoints**: `AGENTS.md`, `CLAUDE.md`
- **Live AI workspace**: `.ai/`
- **Monorepo packages**:
  - `web/`: React + Vite frontend
  - `api/`: Express API + WebSocket collaboration server
  - `shared/`: shared TypeScript contracts
- **Primary data store**: PostgreSQL
- **Real-time layer**: TipTap + Yjs synced through the API collaboration server

---

## FleetGraph Assignment Constraints

- Use the Ship REST API as the data source. No direct database access.
- AI integration should stay provider-agnostic with OpenAI preferred, though Ship already has Bedrock Claude code that can be reused where appropriate.
- LangGraph is recommended. If another framework is used, manual LangSmith instrumentation is required.
- LangSmith tracing is required from day one.
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
- `docs/assignments/fleetgraph/PRESEARCH.md`
- `docs/assignments/fleetgraph/FLEETGRAPH.md`
- Shared LangSmith trace links showing different execution paths

---

## Validation Commands

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm --filter @ship/api test -- --coverage
pnpm audit --prod
```

---

## Read Order

1. `.claude/CLAUDE.md`
2. `docs/README.md`
3. `docs/assignments/fleetgraph/README.md`
4. `docs/assignments/fleetgraph/PRESEARCH.md`
5. `.ai/docs/references/fleetgraph-prd.md`
6. `.ai/agents/claude.md`
7. `.ai/workflows/user-correction-triage.md` when user feedback is a narrow correction or clarification
