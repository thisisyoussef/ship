# FleetGraph MVP Evidence

This file captures the current FleetGraph assignment evidence set. It preserves
the stable Tuesday MVP traces and screenshots, then records the March 22, 2026
public-demo audit of which proof lanes are actually inspectable today.

## Public Demo

- URL: `https://ship-demo-production.up.railway.app`
- Demo account: `dev@ship.local / admin123`
- Tuesday MVP readiness capture: HTTP `200`
- Tuesday MVP capture timestamp: `2026-03-17T12:36:53Z`
- Assignment audit date: `2026-03-22`

## Current Public-Demo Truth

Stable public-demo proof lanes during the March 22 audit:

- `Week start drift: FleetGraph Demo Week - Review and Apply`
- `Sprint owner gap: FleetGraph Demo Week - Owner Gap`
- `Week start drift: FleetGraph Demo Week - Worker Generated`
- `FleetGraph Demo Week - Validation Ready` as the current-page analysis and
  guided-step review surface

Known public-demo blocker:

- `FleetGraph Demo Week - Unassigned Issues` is seeded in repo but blocked on
  the current public Railway findings feed. The March 22 authenticated audit
  did not return `3 unassigned issues in FleetGraph Demo Week - Unassigned
  Issues`, so that use case is implemented but not currently publicly
  inspectable on Railway.

## Named Inspection Targets

- Stable review/apply lane:
  - Document ID: `77ae8e61-144a-4e05-a83a-f090eddb8caf`
  - Finding title: `Week start drift: FleetGraph Demo Week - Review and Apply`
- Stable owner-gap lane:
  - Finding title: `Sprint owner gap: FleetGraph Demo Week - Owner Gap`
- Stable validation-ready lane:
  - Document title: `FleetGraph Demo Week - Validation Ready`
  - Proof surface: FleetGraph entry on the `Review` tab
- Stable worker-generated lane:
  - Document ID: `a1e33dd0-7bef-4a97-817e-f0eb1bde5343`
  - Finding title: `Week start drift: FleetGraph Demo Week - Worker Generated`
- Blocked public-demo lane:
  - Document title: `FleetGraph Demo Week - Unassigned Issues`
  - Expected finding title: `3 unassigned issues in FleetGraph Demo Week - Unassigned Issues`
  - Status: seeded in repo but blocked on the current public Railway findings feed

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

Current limitation:

- No public/shared trace has been captured yet for `sprint_no_owner`,
  `unassigned_sprint_issues`, or the FAB-based current-page analysis handoff.
- The workbook and inspection guide now record those paths truthfully through
  visible product proof and blocked-state notes instead of implying extra public
  traces exist today.

## UI Screenshot Artifacts

- Stable review/apply lane:
  [fleetgraph-review-apply-live.png](./screenshots/fleetgraph-review-apply-live.png)
- Stable approval-preview lane:
  [fleetgraph-approval-preview-live.png](./screenshots/fleetgraph-approval-preview-live.png)
- Stable worker-generated lane:
  [fleetgraph-worker-generated-live.png](./screenshots/fleetgraph-worker-generated-live.png)

No refreshed screenshot artifact is checked in yet for:

- `FleetGraph Demo Week - Owner Gap`
- `FleetGraph Demo Week - Unassigned Issues`
- `FleetGraph Demo Week - Validation Ready`

Those lanes currently rely on the public-demo inspection guide plus the
assignment audit notes above.

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
