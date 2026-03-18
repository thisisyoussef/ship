# FleetGraph Studio Integration Phase

## Goal

Expose the real FleetGraph LangGraph runtime through local LangGraph Studio so node traversal, graph structure, and checkpoint behavior can be inspected natively.

## Success Criteria

- `langgraph.json` points at a compiled FleetGraph graph export.
- `pnpm fleetgraph:studio:dev` boots a local Studio-compatible server.
- Studio preview works without requiring live local Postgres by default.
- The repo ships starter example payloads and one inspection guide.

## Constraints

- Do not duplicate orchestration logic outside the real FleetGraph runtime.
- Keep Ship product reads and writes REST-only.
- Do not change Railway/public demo behavior for this local tooling story.
