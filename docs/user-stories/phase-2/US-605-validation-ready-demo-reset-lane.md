# US-605: Validation-Ready Demo Reset Lane

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-604`
- Related branch: `codex/fleetgraph-unvalidated-demo-copy`
- Related commit/PR: `aca5270`, [PR #138](https://github.com/thisisyoussef/ship/pull/138)
- Target environment: `Railway demo via merged master`

## Persona

**Engineer or PM** wants a repeatable FleetGraph validation proof lane that starts unvalidated so they can test the guided action without manually repairing demo state first.

## User Story

> As an engineer or PM, I want the public demo to include a fresh validation-ready week so I can preview and apply FleetGraph plan validation on demand.

## Goal

Add a second named FleetGraph demo week that is seeded in a review-capable state with an unset week review, so the public demo always exposes a clean validation proof lane after bootstrap.

## Scope

In scope:

1. Extend the FleetGraph demo fixture with a named `Validation Ready` week.
2. Seed that week as `active` and attach a linked `weekly_review` with `plan_validated: null`.
3. Update the proof docs so the review-tab validation flow points at the new seeded lane.

Out of scope:

1. Reworking the week review product UI beyond the seeded proof lane.
2. Changing the existing seeded HITL week or worker-generated week behavior.
3. Broadening FleetGraph runtime behavior.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/demo/fixture.ts`
2. `api/src/services/fleetgraph/demo/fixture.test.ts`
3. `api/src/db/seed.ts`
4. `api/src/routes/weeks.ts`
5. `docs/guides/fleetgraph-demo-inspection.md`

## Preparation Phase

1. Confirm how the public demo bootstrap currently seeds FleetGraph proof lanes.
2. Confirm which sprint state exposes the `Review` tab.
3. Confirm how a `weekly_review` is stored and reset.

### Preparation Notes

Local docs/code reviewed:

1. `api/src/runtime-entry.ts`
2. `api/src/db/seed.ts`
3. `api/src/routes/weeks.ts`
4. `web/src/lib/document-tabs.tsx`
5. `web/src/lib/fleetgraph-entry.ts`

Expected contracts/data shapes:

1. Railway demo bootstrap reruns `api/src/db/seed.ts` when `SHIP_PUBLIC_DEMO_BOOTSTRAP=true`.
2. Sprint `Review` tab is available for `active` and `completed` weeks, not `planning`.
3. `weekly_review` documents are linked to sprints through `document_associations`.
4. The validation proof lane is reusable only if `plan_validated` is reset back to `null`.

Planned failing tests:

1. The FleetGraph demo fixture should create a dedicated validation-ready week.
2. The validation-ready week should stay `active` with a linked unvalidated review after reruns.
3. The documents surface and inspection guide should name the new proof lane.

## UX Script

Happy path:

1. User opens `FleetGraph Demo Week - Validation Ready`.
2. User goes to the `Review` tab and previews the next step.
3. FleetGraph offers `Validate week plan`.
4. User applies it and sees `Plan Validation` flip to `Validated`.

Error path:

1. User opens the old proof lane after it was already consumed.
2. FleetGraph cannot offer validation again because the week is already validated.
3. The user has no clean way to retest the new guided action.

## Preconditions

- [x] FleetGraph demo fixture was audited
- [x] Week review storage and visibility were audited
- [x] Railway public demo bootstrap path was confirmed

## TDD Plan

1. Extend the FleetGraph demo fixture integration test with the validation-ready lane.
2. Extend the lightweight documents/docs tests that reference named proof lanes.
3. Patch the fixture and docs only after the target state is explicit.

## Step-by-step Implementation Plan

1. Add a second named validation-ready sprint to the FleetGraph demo fixture.
2. Seed or reset a linked `weekly_review` document with `plan_validated: null`.
3. Update the proof docs and named-inspection references to use the new lane for review-tab validation.

## Acceptance Criteria

- [x] AC-1: Demo bootstrap creates `FleetGraph Demo Week - Validation Ready`.
- [x] AC-2: The new week is `active` and has a linked `weekly_review` whose `plan_validated` field is unset.
- [x] AC-3: The FleetGraph inspection docs point review-tab validation testing at the new week.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/api exec tsc --noEmit
npx pnpm --filter @ship/web exec vitest run src/pages/Documents.test.tsx
npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/polish/docs.test.ts --config vitest.fleetgraph.config.ts
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Let the Railway public demo auto-deploy from `master`.
3. Verify the new named document appears in the public demo and opens on a review tab with an unset `Plan Validation` state.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Validation Ready`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready` -> `Review`
- Interaction: click `Preview next step`, then `Apply`
- Expected result: FleetGraph previews `Validate week plan`, the page shows `Plan Validation` unset before apply and `Validated` after apply
- Failure signal: the document is missing, the `Review` tab is unavailable, or the validation step is already consumed before testing

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Validation Ready`.
2. Switch to the `Review` tab.
3. Confirm `Plan Validation` is not already `Validated`.
4. Click `Preview next step`, then `Apply`.
5. Confirm `Plan Validation` flips to `Validated`.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready` -> `Review`
- Interaction: inspect the review page before apply, then preview and apply FleetGraph validation
- Expected visible result: the week starts in an unvalidated state and becomes `Validated` only after the FleetGraph action
- Failure signal: the seeded week starts already validated or does not expose the review-tab validation flow

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - FleetGraph demo seeding now creates a dedicated active week for review-tab validation and resets its linked `weekly_review` state on rerun.
  - The inspection guide and story docs now point validation testing at `FleetGraph Demo Week - Validation Ready`.
  - The public demo bootstrap path already reruns the FleetGraph seed on Railway, so the new lane will refresh on deploy.
- Residual risk:
  - The fixture integration test still depends on Testcontainers, so it cannot run in shells without a container runtime.
