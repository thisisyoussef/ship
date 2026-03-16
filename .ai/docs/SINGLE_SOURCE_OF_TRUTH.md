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
1. Finish moving FleetGraph working docs under `docs/assignments/fleetgraph/`.
2. Update repo entrypoints so they point at the new docs structure first.
3. Verify references and markdown links before finalizing the reorg.

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
- AI integration should stay provider-agnostic with OpenAI preferred.
- LangGraph is recommended. If another framework is used, manual LangSmith instrumentation is required.
- LangSmith tracing is required from day one.
- Implement both proactive and on-demand modes through the same graph architecture.
- The chat interface must be embedded in Ship context. No standalone chatbot page.
- Consequential actions require a human-in-the-loop confirmation gate.
- Detection latency target: under 5 minutes from Ship event to surfaced finding.

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
