# US-612: FleetGraph Assignment Evidence Refresh

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-611`
- Related branch:
- Related commit/PR: `e8d0286`, [PR #156](https://github.com/thisisyoussef/ship/pull/156)
- Target environment: `docs plus Railway demo verification`

## Persona

**Assignment reviewer** wants the FleetGraph workbook, traces, and proof steps to match the actually shipped product.

## User Story

> As an assignment reviewer, I want the FleetGraph workbook and evidence path to reflect the real completed use cases so I can audit the submission end to end without guessing.

## Goal

Refresh the assignment workbook, README references, traces, screenshots, and user audit path only after the remaining use cases are truly implemented, so the final FleetGraph submission tells the truth.

## Scope

In scope:

1. Update workbook wording and use-case truth from shipped behavior.
2. Refresh README and pack-level audit references.
3. Refresh shared traces, screenshots, and proof-lane instructions as needed.

Out of scope:

1. New FleetGraph behavior.
2. Additional workbook cases beyond the planned five.
3. Broader product redesign.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `docs/assignments/fleetgraph/FLEETGRAPH.md`
2. `docs/assignments/fleetgraph/README.md`
3. `docs/guides/fleetgraph-demo-inspection.md`
4. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/`
5. Current shared trace and evidence artifacts

## Preparation Phase

1. Confirm which use cases are actually shipped by the time this story starts.
2. Confirm which shared traces and screenshot artifacts still represent current truth.
3. Confirm the single user audit path that should be used for submission review.

### Preparation Notes

Local docs/code reviewed:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/task-breakdown.md`
2. `docs/assignments/fleetgraph/FLEETGRAPH.md`
3. `docs/guides/fleetgraph-demo-inspection.md`
4. `docs/evidence/`

Expected contracts/data shapes:

1. All five workbook use cases should be mapped to real visible/proof surfaces.
2. Shared/public trace links should exist where the workbook claims they exist, or blocked state must be recorded explicitly.
3. The final audit path should let a reviewer inspect all completed use cases without code context.

Planned failing tests:

1. Workbook/README references reflect the completed use-case set.
2. Pack-level audit checklist covers all five workbook use cases.
3. Trace/evidence references are truthful or explicitly blocked.

## UX Script

Happy path:

1. Reviewer opens the workbook and demo inspection guide.
2. The docs match the live FleetGraph surfaces.
3. The reviewer can inspect all shipped use cases with traceable evidence.

Error path:

1. The docs still describe planned or stale behavior.
2. The live demo and workbook disagree.
3. The submission becomes hard to trust even if the code works.

## Preconditions

- [ ] Fresh story branch is checked out before edits begin
- [ ] Remaining assignment-critical FleetGraph stories are complete
- [ ] The relevant demo proof lanes and traces are available or explicitly blocked

## TDD Plan

1. Add/update docs truthfulness tests where available.
2. Refresh proof docs and audit checklist only from observed shipped behavior.
3. Recheck the public demo proof lanes after docs refresh.

## Step-by-step Implementation Plan

1. Audit the shipped FleetGraph use cases against the workbook.
2. Update workbook/README/audit references from observed runtime truth.
3. Refresh traces, screenshots, and proof steps or record exact blockers.
4. Leave a single final audit path for assignment submission.

## Acceptance Criteria

- [ ] AC-1: `FLEETGRAPH.md` truthfully reflects the completed use-case pack.
- [ ] AC-2: README and proof-lane references align with the completed assignment slice.
- [ ] AC-3: Trace and screenshot references are refreshed or explicitly marked blocked.
- [ ] AC-4: A reviewer can follow one coherent audit path across the completed FleetGraph submission.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/polish/docs.test.ts --config vitest.fleetgraph.config.ts
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion if any visible proof docs changed.
3. Re-run the final public-demo audit path against the completed FleetGraph slice.

## How To Verify

- Seeded verification entry or proof lane: final pack-level FleetGraph audit checklist
- Route or URL: public Railway demo plus the workbook and demo inspection guide
- Interaction: follow the final audit checklist end to end
- Expected result: the docs and live surfaces agree on the stable public-demo
  lanes, and the unassigned-issues lane is explicitly recorded as a seeded but
  currently blocked public-demo proof lane
- Failure signal: stale workbook wording, broken trace links, or mismatched proof instructions

## User Checkpoint Test

1. Open the workbook and demo inspection guide.
2. Follow the final FleetGraph audit path.
3. Confirm each workbook use case has a visible product/evidence mapping, even
   when one lane is represented by an explicit blocked-state note instead of a
   live Railway finding.

## What To Test

- Route or URL: workbook, demo inspection guide, and public Railway demo
- Interaction: run the final audit path from docs to live product
- Expected visible result: docs, traces, and live surfaces agree on the stable
  proof lanes, and the unassigned-issues lane is called out as seeded in repo
  but blocked on the current public Railway findings feed
- Failure signal: stale docs, missing traces, or proof lanes that no longer match the product

## Checkpoint Result

- Outcome: `done`
- Evidence:
  - Workbook, README references, demo inspection guide, and evidence bundle now
    distinguish stable public-demo proof lanes from the seeded-but-blocked
    unassigned-issues lane.
  - `docs/evidence/fleetgraph-mvp-evidence.json` now records the assignment
    audit state in machine-readable form.
  - `api/src/services/fleetgraph/polish/docs.test.ts` now guards the blocked
    public-demo note so the docs cannot drift back into overstating live proof.
- Residual risk:
  - The current public Railway demo still needs a future seed/feed refresh
    before the unassigned-issues lane becomes publicly inspectable again.
