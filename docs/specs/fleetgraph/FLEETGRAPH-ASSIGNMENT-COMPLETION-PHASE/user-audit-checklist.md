# FleetGraph Assignment Completion Pack Audit Checklist

Run this after `T606`.

## Goal

Verify that all five workbook use cases in `docs/assignments/fleetgraph/FLEETGRAPH.md` are inspectable from real FleetGraph surfaces and that the assignment docs match what shipped.

## Audit Route

1. Open the public or local Ship surface with FleetGraph enabled.
2. Inspect the FleetGraph entry surface on a supported current page.
3. Inspect the FleetGraph page-analysis surface on the same current page.
4. Inspect a page or demo lane with an active `week_start_drift` finding.
5. Inspect a page or demo lane with an active `sprint_no_owner` finding.
6. Inspect a page or demo lane with an active `unassigned_sprint_issues` finding.
7. Open the assignment workbook and confirm the traces and use-case table match the visible product.

## Expected Results

- Use case 1: `week_start_drift`
  - A proactive finding is visible with its evidence, lifecycle controls, and the established HITL path.
- Use case 2: `sprint_no_owner`
  - A proactive sprint-owner-gap finding is visible on the same findings surface without week-start-only copy.
- Use case 3: `unassigned_sprint_issues`
  - A proactive unassigned-issues finding is visible on the same findings surface with clear sprint context.
- Use case 4: current-page approval preview
  - FleetGraph can preview a consequential action from the current page and show that it remains pending human approval.
- Use case 5: context-aware page analysis
  - FleetGraph can analyze the current page and answer at least one follow-up question in the same thread without replaying a generic first-turn answer.
- Docs and evidence
  - `docs/assignments/fleetgraph/README.md` and `docs/assignments/fleetgraph/FLEETGRAPH.md` point to the completion pack and truthfully describe the shipped use cases.
