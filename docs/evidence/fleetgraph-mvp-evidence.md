# FleetGraph MVP Evidence

This file captures the final Tuesday MVP proof set from the live Railway demo.

## Public Demo

- URL: `https://ship-demo-production.up.railway.app`
- Demo account: `dev@ship.local / admin123`
- FleetGraph readiness at capture time: HTTP `200`
- Capture timestamp: `2026-03-17T12:36:53Z`

## Named Inspection Targets

- Review/apply lane:
  - Document ID: `77ae8e61-144a-4e05-a83a-f090eddb8caf`
  - Finding title: `Week start drift: FleetGraph Demo Week - Review and Apply`
- Worker-generated lane:
  - Document ID: `a1e33dd0-7bef-4a97-817e-f0eb1bde5343`
  - Finding title: `Week start drift: FleetGraph Demo Week - Worker Generated`

Use `docs/guides/fleetgraph-demo-inspection.md` for the exact inspection flow.

## Shared Trace Links

- Proactive worker advisory path:
  - Run ID: `019cfbca-b3b2-7000-8000-039b145de959`
  - Shared trace: [worker proactive trace](https://smith.langchain.com/public/d5f1a274-6f81-4c42-b8be-924791429323/r)
- On-demand approval-preview path:
  - Run ID: `019cfbcc-919b-7510-9c84-9b72267c1382`
  - Shared trace: [approval-preview trace](https://smith.langchain.com/public/e969f90a-ef5a-45e5-bded-9d6de7233311/r)

These traces show two different execution paths:

- proactive scheduled sweep -> worker-generated finding
- on-demand document entry -> approval-required preview

## UI Screenshot Artifacts

- Review/apply lane: [fleetgraph-review-apply-live.png](./screenshots/fleetgraph-review-apply-live.png)
- Approval-preview lane: [fleetgraph-approval-preview-live.png](./screenshots/fleetgraph-approval-preview-live.png)
- Worker-generated lane: [fleetgraph-worker-generated-live.png](./screenshots/fleetgraph-worker-generated-live.png)

## Live Trace Accounting

Captured from the `ship-fleetgraph` LangSmith project in the Tuesday evidence window (`2026-03-17T12:02:20Z` to `2026-03-17T12:32:47Z`):

- `fleetgraph.runtime` root traces: 13
- `fleetgraph.llm.generate` child invocations: 9
- Total tokens recorded on child runs: 6,310

Current limitation:

- The trace payload for these runs exposes `total_tokens`, but does not expose a reliable input/output token split or dollar-cost field.

## Source Artifacts

- Machine-readable capture: [fleetgraph-mvp-evidence.json](./fleetgraph-mvp-evidence.json)
- Submission workbook: [/Users/youss/Development/gauntlet/ship/docs/assignments/fleetgraph/FLEETGRAPH.md](/Users/youss/Development/gauntlet/ship/docs/assignments/fleetgraph/FLEETGRAPH.md)
- Demo inspection guide: [/Users/youss/Development/gauntlet/ship/docs/guides/fleetgraph-demo-inspection.md](/Users/youss/Development/gauntlet/ship/docs/guides/fleetgraph-demo-inspection.md)
