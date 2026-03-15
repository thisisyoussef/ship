# Ship - Single Source of Truth

**Last Updated**: 2026-03-15
**Current Phase**: FleetGraph assignment setup
**Active Sprint**: Pre-search and scaffolding
**Project Status**: Active

---

## Current Focus

### Active Task
- **Title**: Promote the AI workspace to the repo root and prepare FleetGraph assignment artifacts
- **Status**: In Progress
- **Owner**: Codex

### Next Immediate Actions
1. Complete `PRESEARCH.md` before writing FleetGraph implementation code.
2. Define FleetGraph agent responsibility, trigger model, and at least 5 use cases in `FLEETGRAPH.md`.
3. Start implementation only after preflight, story lookup, and a defended trigger-model decision.

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
- AI integration must use the Claude API.
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
- `PRESEARCH.md`
- `FLEETGRAPH.md`
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
4. `.ai/docs/references/fleetgraph-prd.md`
5. `.ai/agents/claude.md`
