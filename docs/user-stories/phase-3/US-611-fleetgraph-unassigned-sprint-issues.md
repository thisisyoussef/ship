# US-611: FleetGraph Unassigned Sprint Issues

## Status

- State: `todo`
- Owner: Codex
- Depends on: `US-610`
- Related branch:
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**PM** wants FleetGraph to surface meaningful clusters of unassigned sprint work before execution stalls.

## User Story

> As a PM, I want FleetGraph to surface unassigned sprint-issue clusters proactively so ownership gaps are visible before work stalls.

## Goal

Ship the `unassigned_sprint_issues` workbook case end to end on the same shared proactive FleetGraph surface as the existing proof lane and sprint-owner gap case.

## Scope

In scope:

1. Turn the existing `unassigned_sprint_issues` scenario into a real proactive FleetGraph finding.
2. Persist, serialize, and render it on the shared proactive surface.
3. Support the normal finding lifecycle controls.

Out of scope:

1. Automatic issue assignment flows.
2. Broader capacity or workload balancing logic.
3. New mutation contracts beyond advisory output.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/graph/runtime.ts`
2. `api/src/services/fleetgraph/proactive/unassigned-issues.ts`
3. `api/src/services/fleetgraph/findings/store.ts`
4. `web/src/components/FleetGraphFindingsPanel.tsx`
5. `docs/assignments/fleetgraph/FLEETGRAPH.md`

## Preparation Phase

1. Confirm the current unassigned-issues candidate logic and thresholds.
2. Confirm what visible summary/evidence makes the cluster actionable.
3. Confirm the proof lane needed to test this case repeatably.

### Preparation Notes

Local docs/code reviewed:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/task-breakdown.md`
2. `api/src/services/fleetgraph/proactive/unassigned-issues.ts`
3. `api/src/services/fleetgraph/graph/runtime.ts`
4. `web/src/lib/fleetgraph-findings-presenter.ts`
5. `web/src/components/FleetGraphFindingsPanel.tsx`

Expected contracts/data shapes:

1. Runtime already knows about `unassigned_sprint_issues`.
2. Shared proactive plumbing from `US-609` should already be in place.
3. The new finding should stay advisory-only in this assignment pack.

Planned failing tests:

1. Candidate logic surfaces an unassigned-issues cluster.
2. Proactive storage accepts and preserves the new type.
3. Shared findings UI renders the unassigned-issues case clearly.

## UX Script

Happy path:

1. A week has a meaningful cluster of unassigned issues.
2. FleetGraph surfaces the cluster proactively.
3. The PM sees count, week context, and why ownership is needed.

Error path:

1. The week has many unassigned issues.
2. FleetGraph stays silent or produces a vague/unhelpful summary.
3. The workbook still lacks the final proactive use case.

## Preconditions

- [ ] Fresh story branch is checked out before edits begin
- [ ] Shared proactive multi-finding plumbing is complete
- [ ] Sprint-owner gap story is complete

## TDD Plan

1. Runtime/candidate tests for the unassigned-issues cluster.
2. Store/route tests for persistence and lifecycle.
3. UI test for visible rendering on the shared findings surface.

## Step-by-step Implementation Plan

1. Finish the `unassigned_sprint_issues` candidate and metadata contract if needed.
2. Thread it through the widened proactive store and route.
3. Render the new case on the shared proactive UI.
4. Update proof docs for the new workbook use case.

## Acceptance Criteria

- [ ] AC-1: FleetGraph surfaces `unassigned_sprint_issues` as a real proactive finding.
- [ ] AC-2: The finding persists with standard lifecycle behavior.
- [ ] AC-3: The shared proactive UI renders clear count/context/evidence for the cluster.
- [ ] AC-4: The workbook/proof docs reflect the shipped unassigned-issues use case truthfully.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/api exec vitest run src/services/fleetgraph/proactive/*.test.ts src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/lib/fleetgraph-findings*.test.ts
pnpm --filter @ship/api exec tsc --noEmit
pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the unassigned-issues proof lane on the public demo.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Project` plus a seeded unassigned-issues week
- Route or URL: `Documents` -> targeted unassigned-issues week
- Interaction: inspect the proactive FleetGraph panel and its lifecycle controls
- Expected result: FleetGraph surfaces an unassigned-issues summary with count, week context, and quick actions
- Failure signal: no proactive finding appears or the summary does not explain the ownership gap

## User Checkpoint Test

1. Open the seeded unassigned-issues week.
2. Confirm FleetGraph surfaces an unassigned-issues finding.
3. Read the count, summary, and evidence and confirm they explain why assignment is needed.

## What To Test

- Route or URL: `Documents` -> seeded unassigned-issues week
- Interaction: inspect the proactive panel and its quick actions
- Expected visible result: an unassigned-issues cluster appears with clear count and sprint context
- Failure signal: no finding, vague summary, or broken lifecycle controls

## Checkpoint Result

- Outcome: `pending`
- Evidence:
- Residual risk:
