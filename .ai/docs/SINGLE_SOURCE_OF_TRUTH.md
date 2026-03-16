# Ship - Single Source of Truth

**Last Updated**: 2026-03-16
**Current Phase**: FleetGraph foundation-phase execution
**Active Sprint**: T002 provider adapter and runtime config
**Project Status**: Active
**Canonical Deployment Baseline**: API on AWS Elastic Beanstalk, frontend on S3/CloudFront, config/secrets on AWS-native services
**Sanctioned Public Demo**: Render `ship-demo` at `https://ship-demo.onrender.com/`, deployed with `scripts/deploy-render-demo.sh`

---

## Current Focus

### Active Task
- **Title**: Execute FleetGraph foundation story T002 by adding the provider-agnostic `LLMAdapter` with OpenAI as the default path
- **Status**: In Progress
- **Owner**: Codex

### Next Immediate Actions
1. Use the new `LLMAdapter` boundary as the only provider entry point for FleetGraph nodes.
2. Bootstrap LangSmith tracing and trace metadata taxonomy around the adapter boundary before graph implementation begins.
3. Start the LangGraph skeleton only after adapter and tracing decisions are locked.

---

## Repo Baseline

- **Canonical repo handbook**: `.claude/CLAUDE.md`
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

## Story Execution Guardrails

- Sync remotes before and after every new story or branch transition with:
  - `git fetch --all --prune`
  - `git status -sb`
  - `git branch -vv`
- Review deployment impact on every story against Ship's AWS production surfaces and the sanctioned Render public demo path.
- If a story does not affect deployment surfaces, record `deployment impact: none` in handoff instead of skipping the review silently.
- For deploy-relevant stories, deployment status must be explicit: `deployed`, `not deployed`, or `blocked`.
- For deploy-relevant stories, refresh the Render public demo after merge with `scripts/deploy-render-demo.sh <commit>` unless the handoff records an explicit block.
- For story packs or phase packs, define the higher-level objectives first and write the whole story set together before implementation starts.

---

## Read Order

1. `.claude/CLAUDE.md`
2. `docs/README.md`
3. `docs/assignments/fleetgraph/README.md`
4. `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
5. `.ai/docs/references/fleetgraph-prd.md`
6. `docs/assignments/fleetgraph/PRESEARCH.md`
7. `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/feature-spec.md`
8. `.ai/agents/claude.md`
