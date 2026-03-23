# US-617: FleetGraph Entry Nullable-Context Hardening

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-612`
- Related branch: `codex/us-617-nullable-context-hardening`
- Active worktree:
- Parallel dependency / merge order: Independent of `US-613` and `US-615`; keep this contract-hardening work on its own branch and refresh from latest `master` if sibling stories land first.
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's current-page entry to open reliably on real Ship documents so page analysis and guided next-step checks do not fail on optional metadata gaps.

## User Story

> As an engineer or PM, I want FleetGraph entry to tolerate nullable Ship document-context metadata so the embedded FleetGraph surface can analyze the current page instead of failing with a 400 schema error.

## Goal

Stop `/api/fleetgraph/entry` from rejecting live document-context payloads when `/api/documents/:id/context` includes nullable optional metadata such as association color or other non-essential fields, so current-page FleetGraph actions degrade gracefully instead of surfacing `Expected string, received null` in `UnifiedDocumentPage`.

## Scope

In scope:

1. Audit the live `/api/documents/:id/context` payload fields that can legitimately be `null`.
2. Harden FleetGraph entry parsing and normalization so optional context metadata is accepted and normalized safely.
3. Add regression coverage for the exact nullable context shape that currently produces the `/api/fleetgraph/entry` 400.
4. Refresh the seeded proof steps for the affected FleetGraph entry lane if needed.

Out of scope:

1. New proactive finding logic or ranking behavior.
2. New review/apply flows such as `US-615` or `US-616`.
3. A broad redesign of Ship's document-context route.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `api/src/routes/associations.ts` — current `/api/documents/:id/context` payload shape and nullable fields.
2. `api/src/services/fleetgraph/normalize/types.ts` — Zod schemas that gate live entry payload parsing.
3. `api/src/services/fleetgraph/normalize/context.ts` — context-envelope normalization path used by FleetGraph entry.
4. `api/src/services/fleetgraph/normalize/context.test.ts` — current nullable-context coverage baseline.
5. `api/src/services/fleetgraph/entry/contracts.ts` — entry request/response schemas for `/api/fleetgraph/entry`.
6. `api/src/routes/fleetgraph.test.ts` — route-level regression coverage for entry payload acceptance.
7. `web/src/lib/fleetgraph-entry.ts` — current-page entry payload builder.
8. `web/src/hooks/useFleetGraphEntry.ts` — UI mutation path that currently surfaces the 400 failure.
9. `docs/guides/fleetgraph-demo-inspection.md` — seeded proof lane for visible verification.

## Preparation Phase

1. Trace the exact nullable field from `/api/documents/:id/context` into the FleetGraph entry request.
2. Confirm the smallest safe hardening point: schema tolerance, normalization fallback, or both.
3. Confirm the exact seeded page and interaction that reproduces the current 400/null error.

### Preparation Notes

Local docs/code reviewed:

1. `api/src/routes/associations.ts` returns raw `belongs_to` rows from SQL, which can legitimately include optional fields such as `color: null`.
2. `api/src/services/fleetgraph/normalize/types.ts` and `api/src/services/fleetgraph/entry/contracts.ts` already tolerate nullable ticket/program metadata, but they still reject some nullable association metadata.
3. `api/src/routes/fleetgraph.test.ts` and `api/src/services/fleetgraph/normalize/context.test.ts` cover nullable ticket numbers and program metadata, but not nullable `belongs_to` fields from the live context route.
4. `web/src/lib/fleetgraph-entry.ts` and `web/src/hooks/useFleetGraphEntry.ts` post the live document-context payload directly into `/api/fleetgraph/entry`, so schema rejection immediately surfaces as a user-visible mutation error.

Expected contracts/data shapes:

1. `/api/documents/:id/context` may return nullable optional metadata for `belongs_to` entries when a related document does not have color or similar display metadata set.
2. `/api/fleetgraph/entry` should normalize nullable optional context metadata to omitted values instead of rejecting the full entry payload.
3. Current-page FleetGraph entry interactions should return advisory or quiet responses when optional metadata is missing, not a 400 contract error.

Planned failing tests:

1. Route-level entry payload acceptance when a `belongs_to` entry carries `color: null`.
2. Context-envelope normalization when optional association metadata is nullable but relationship IDs remain present.
3. Seeded current-page FleetGraph verification on `FleetGraph Demo Week - Unassigned Issues` no longer hits the `Expected string, received null` error path.

## UX Script

Happy path:

1. User opens a seeded FleetGraph document page with incomplete optional association metadata.
2. User triggers `Check this page` from the embedded FleetGraph surface.
3. FleetGraph analyzes the page or returns a safe no-action state without surfacing a schema error.

Error path:

1. User opens the same seeded page.
2. User triggers FleetGraph entry.
3. `/api/fleetgraph/entry` returns `400`, and `UnifiedDocumentPage` surfaces `Expected string, received null`.

## Preconditions

- [ ] Fresh story branch is checked out from current `master` before edits begin
- [ ] Any sibling-branch dependency or required merge order is recorded
- [ ] `US-612` remains the latest landed dependency
- [ ] The seeded reproduction lane for the current-page FleetGraph entry error is identified before implementation
- [ ] FleetGraph entry and context-route contracts are audited before code changes

## TDD Plan

1. Add a FleetGraph route regression test for nullable live document-context association metadata.
2. Add a normalization test that preserves relationship extraction when optional metadata is `null`.
3. Re-run the current-page FleetGraph entry UI tests that cover the seeded document-page interaction.

## Step-by-step Implementation Plan

1. Reproduce the failing nullable payload by tracing the seeded page through `/api/documents/:id/context`.
2. Harden the FleetGraph context schemas and/or normalization layer at the smallest safe boundary.
3. Add the targeted regression tests before final cleanup.
4. Refresh proof-lane instructions if the visible verification path changes.

## Acceptance Criteria

- [ ] AC-1: `/api/fleetgraph/entry` accepts live Ship document-context payloads whose optional association metadata is `null`.
- [ ] AC-2: The affected current-page FleetGraph interaction no longer surfaces the `Expected string, received null` mutation failure.
- [ ] AC-3: Regression tests cover the tolerated nullable context shape and preserve relationship extraction.
- [ ] AC-4: The seeded proof lane and verification notes point to the exact route and interaction for this fix.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/normalize/context.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/web exec vitest run src/hooks/useFleetGraphEntry.test.tsx src/components/FleetGraphEntryCard.test.tsx
npx pnpm --filter @ship/api exec tsc --noEmit
npx pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

If sibling branches land first before finalization, rerun this section after syncing to latest `master`.

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion because this touches a visible current-page FleetGraph surface.
3. Re-run the seeded current-page verification on the affected FleetGraph demo lane after deploy.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: `FleetGraph Demo Week - Unassigned Issues`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Unassigned Issues`
- Interaction: open FleetGraph on the page and trigger `Check this page` from the embedded entry surface
- Expected result: FleetGraph returns page analysis or a safe no-action response without a `/api/fleetgraph/entry` `400`, and no inline `Expected string, received null` error appears
- Failure signal: the request still fails with `400`, the inline FleetGraph mutation error appears, or the current-page surface becomes unusable

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Unassigned Issues`.
2. Open the embedded FleetGraph surface on the page.
3. Trigger `Check this page`.
4. Confirm FleetGraph responds without the previous null-string mutation error.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Unassigned Issues`
- Interaction: click `Check this page` from the embedded FleetGraph entry surface
- Expected visible result: FleetGraph responds normally instead of showing an inline mutation failure
- Failure signal: `/api/fleetgraph/entry` returns `400` or the UI shows `Expected string, received null`

## Checkpoint Result

- Outcome: `done`
- Evidence:
  - `npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts`
  - `npx pnpm --filter @ship/api exec vitest run src/services/fleetgraph/normalize/context.test.ts --config vitest.fleetgraph.config.ts`
  - `npx pnpm --filter @ship/web exec vitest run src/hooks/useFleetGraphEntry.test.tsx src/components/FleetGraphEntryCard.test.tsx src/lib/fleetgraph-entry.test.ts`
  - `npx pnpm --filter @ship/api exec tsc --noEmit`
  - `npx pnpm --filter @ship/web exec tsc --noEmit`
  - `git diff --check`
- Residual risk:
  - This hardening covers nullable current-page association metadata at the FleetGraph contract boundary, but the live proof lane still needs post-merge inspection on Railway to confirm the seeded page no longer surfaces the inline mutation error.
