# US-619: FleetGraph Contract Hardening Sweep

## Status

- State: `todo`
- Owner: Codex
- Depends on: `US-617`
- Related branch:
- Active worktree:
- Parallel dependency / merge order: Keep this on its own reliability branch and refresh from latest `master` if any FleetGraph feature or follow-through stories land first.
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph to keep working when live Ship payloads include nullable, optional, or older-shape metadata so users do not keep finding new contract crashes one page at a time.

## User Story

> As an engineer or PM, I want FleetGraph's Ship-facing contract boundaries audited for similar nullable and optional-shape mismatches so the product fails gracefully instead of surfacing one-off schema or normalization errors in user-visible flows.

## Goal

Follow the `US-617` nullable-context fix with a broader audit and hardening sweep across FleetGraph's live Ship payload boundaries so other nullable, optional, or legacy-shape fields are normalized safely before they cause more `/api/fleetgraph/*` failures or user-visible crashes.

## Scope

In scope:

1. Audit the current FleetGraph ingest boundaries that accept live Ship data, starting with document context, current-page entry payloads, proactive finding hydration, and review/apply request payloads.
2. Identify similar failure classes to `US-617`, especially nullable optional fields, omitted metadata, and legacy-shape payload variants that should be tolerated.
3. Harden the relevant schemas and normalization layers at the smallest safe boundary instead of scattering defensive checks through the UI.
4. Add a focused regression matrix for every newly tolerated live payload shape discovered in the audit.
5. Refresh seeded proof-lane notes when the user-facing verification path for one of these failures changes.

Out of scope:

1. New product features or UX redesigns unrelated to this contract-hardening sweep.
2. Changing Ship's upstream payload contracts unless a narrow upstream fix is clearly safer than FleetGraph-side hardening.
3. General cleanup of unrelated FleetGraph technical debt.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/services/fleetgraph/normalize/types.ts` — current schema tolerance boundaries for live Ship context data.
2. `api/src/services/fleetgraph/normalize/context.ts` — shared normalization path for current-page context envelopes.
3. `api/src/services/fleetgraph/entry/contracts.ts` — entry contract and request-shape assumptions.
4. `api/src/routes/fleetgraph.ts` — request boundaries for entry, analyze, and review/apply flows.
5. `api/src/services/fleetgraph/findings/store.ts` — finding hydration and persistence shape assumptions.
6. `api/src/services/fleetgraph/actions/service.ts` — review/apply request assumptions for Ship mutations.
7. `api/src/routes/associations.ts` and related Ship context routes — live nullable and optional field sources.
8. `api/src/routes/fleetgraph.test.ts` and `api/src/services/fleetgraph/normalize/context.test.ts` — current regression baseline after `US-617`.
9. `web/src/lib/fleetgraph-entry.ts`, `web/src/lib/fleetgraph-findings.ts`, and related hooks — user-visible surfaces that immediately reflect contract failures.
10. `docs/guides/fleetgraph-demo-inspection.md` — seeded proof lanes that can expose similar regressions on the Railway demo.

## Preparation Phase

1. Build a concrete audit matrix of FleetGraph boundaries that ingest live Ship payloads and note which ones already tolerate nullable or optional values.
2. Reproduce or simulate at least one additional near-miss beyond the `US-617` case so the sweep is driven by real failure shapes, not generic hardening.
3. Decide the smallest safe hardening boundary for each discovered issue: schema preprocess, normalizer fallback, or narrow route-level coercion.

### Preparation Notes

Local docs/code reviewed:

1. Pending implementation.

Expected contracts/data shapes:

1. Live Ship payloads may contain nullable display metadata, omitted relationship helpers, or older-shape optional fields even when the core IDs remain valid.
2. FleetGraph should normalize optional data to omitted values when it is not needed for reasoning or display, rather than rejecting the full request or persisted finding.
3. User-visible FleetGraph surfaces should degrade to advisory or empty states, not schema-crash messages, when optional metadata is missing.

Planned failing tests:

1. A regression for each newly discovered nullable or optional-shape contract boundary.
2. At least one end-to-end route-level proof that a user-facing FleetGraph surface no longer returns a contract failure for the audited payload.
3. A focused regression matrix or table-driven test when multiple similar fields need the same tolerance pattern.

## UX Script

Happy path:

1. User opens a seeded FleetGraph proof lane whose live Ship payload includes incomplete optional metadata.
2. User triggers the relevant FleetGraph surface, such as `Check this page`, a proactive finding load, or a review/apply preview.
3. FleetGraph responds normally or degrades safely without showing an internal contract error.

Error path:

1. User opens the same FleetGraph surface before the hardening sweep.
2. Live Ship payload shape does not match a strict schema assumption.
3. FleetGraph surfaces a 400, a crash, or an opaque inline error instead of handling the optional field safely.

## Preconditions

- [ ] Fresh story branch is checked out from current `master` before edits begin
- [ ] Any sibling-branch dependency or required merge order is recorded
- [ ] `US-617` is merged and treated as the first concrete example in this issue class
- [ ] The audit matrix for FleetGraph ingest boundaries is written before production edits begin
- [ ] At least one seeded proof lane or API reproduction exists for each discovered failure class

## TDD Plan

1. Add failing regressions for each discovered nullable, optional, or legacy-shape contract gap before hardening the production code.
2. Prefer table-driven tests when several fields share the same tolerance pattern.
3. Re-run the visible FleetGraph tests tied to the affected surfaces after the hardening changes land.

## Step-by-step Implementation Plan

1. Audit FleetGraph's live Ship-facing boundaries and record the discovered high-risk fields or payload variants.
2. Reproduce the most user-visible failures first and add targeted regressions.
3. Harden the smallest safe boundary for each issue, favoring shared schema or normalization utilities over scattered UI guards.
4. Re-run the regression matrix plus the relevant visible-surface tests.
5. Refresh seeded proof-lane instructions if the visible verification path changes.

## Acceptance Criteria

- [ ] AC-1: A concrete audit matrix exists for the FleetGraph boundaries that ingest live Ship payloads and identifies similar nullable or optional-shape risks.
- [ ] AC-2: The discovered contract mismatches are hardened at the smallest safe boundary and no longer surface as user-visible FleetGraph failures.
- [ ] AC-3: Regression coverage exists for every issue fixed in the sweep, including at least one route-level or end-to-end proof for a user-facing surface.
- [ ] AC-4: The seeded proof-lane guidance is updated anywhere the visible verification path changes.

## Local Validation

Run these before handoff:

```bash
# Fill in the exact API, web, and typecheck commands once the audited boundaries are known.
git diff --check
```

If sibling branches land first before finalization, rerun this section after syncing to latest `master`.

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion because this story targets user-visible FleetGraph reliability.
3. Re-run the affected proof lanes after deploy and record which ones were exercised.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: pending audit matrix
- Route or URL: pending audit matrix
- Interaction: trigger the affected FleetGraph surfaces that previously failed on nullable or optional metadata
- Expected result: FleetGraph returns a normal or safe degraded response instead of schema or normalization errors
- Failure signal: any audited FleetGraph surface still surfaces a user-visible contract failure for the documented payload shapes

## User Checkpoint Test

1. Use the audit matrix to pick the affected FleetGraph proof lane.
2. Trigger the relevant FleetGraph surface.
3. Confirm the audited nullable or optional-shape failure no longer appears.

## What To Test

- Route or URL: pending audit matrix
- Interaction: exercise each affected FleetGraph surface called out in the story handoff
- Expected visible result: no user-facing schema or normalization errors for the audited payload shapes
- Failure signal: FleetGraph still shows a contract error, crashes, or refuses the request because an optional field is missing or null

## Checkpoint Result

- Outcome: `pending`
- Evidence:
- Residual risk:
