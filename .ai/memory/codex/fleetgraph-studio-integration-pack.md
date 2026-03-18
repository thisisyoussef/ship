# FleetGraph Studio Integration Pack

## Summary

- Added a repo-owned LangGraph Studio path for FleetGraph.
- Exposed the real compiled FleetGraph graph through `langgraph.json`.
- Added preview-safe Studio export helpers plus example payload printing.

## Key Decisions

- Keep Studio on the same compiled graph as the runtime wrapper.
- Default Studio to an in-memory checkpointer so preview works even when local DB access is unavailable.
- Allow real local thread inspection only through explicit Postgres opt-in.

## Validation

- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts src/services/fleetgraph/graph/runtime.test.ts src/services/fleetgraph/studio/graph.test.ts src/services/fleetgraph/studio/examples.test.ts`
- `pnpm --filter @ship/api fleetgraph:studio:examples`
- `pnpm fleetgraph:studio:dev`

## Handoff Notes

- Studio preview should no longer fail with the old compiled-graph error.
- Use `FLEETGRAPH_STUDIO_CHECKPOINTER=postgres` only when you actually want to inspect persisted local threads.
