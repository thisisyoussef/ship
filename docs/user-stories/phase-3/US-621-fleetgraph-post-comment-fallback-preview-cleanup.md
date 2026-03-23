# US-621: FleetGraph Post-Comment Fallback Preview Cleanup

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-601`
- Related branch: `codex/us-621-post-comment-fallback-preview-cleanup`
- Related commit/PR: `91c4b4c`, [PR #180](https://github.com/thisisyoussef/ship/pull/180)
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants FleetGraph's current-page preview to stay truthful on unsupported page types so it never offers a broken comment action.

## User Story

> As an engineer or PM, I want FleetGraph to either show a real fallback preview or no fallback preview at all so unsupported pages do not promise a comment action that cannot be completed safely.

## Goal

Clean up the fallback `post_comment` preview introduced as the safe path in `US-601`. The current fallback points at `/api/documents/:id/comments`, but Ship's comment route requires comment payload that the shared FleetGraph preview flow does not currently draft or review, so the preview is misleading and likely broken at apply time.

## Scope

In scope:

1. Audit whether the `post_comment` fallback can be made real inside the current FleetGraph approval-preview contract.
2. If not, remove or replace the fallback so unsupported current-page types stop surfacing a broken preview.
3. Align payload builder, backend validation/apply behavior, copy, and tests with the chosen truthful path.

Out of scope:

1. Building a general-purpose comment composer inside FleetGraph unless that proves to be the narrowest safe fix.
2. Adding new current-page action families beyond the existing approval-preview surface.
3. Changing proactive findings behavior.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `docs/user-stories/phase-2/US-601-current-page-approval-preview.md` — original fallback contract and rationale.
2. `web/src/lib/fleetgraph-entry.ts` — fallback preview payload builder.
3. `web/src/lib/fleetgraph-entry.test.ts` — current fallback test coverage.
4. `web/src/components/FleetGraphEntryCard.tsx` — visible preview surface.
5. `web/src/components/FleetGraphEntryCard.test.tsx` — current-page preview rendering coverage.
6. `api/src/services/fleetgraph/entry/service.ts` — entry approval validation for `post_comment`.
7. `api/src/services/fleetgraph/entry/action-service.ts` — apply-time approval handling.
8. `api/src/services/fleetgraph/graph/runtime.ts` — generic action execution path.
9. `api/src/routes/comments.ts` — real Ship comment payload requirements.
10. `api/src/routes/fleetgraph.test.ts` — route-level FleetGraph preview/apply contracts.

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm whether FleetGraph can produce a valid comment payload without widening the current surface into a full compose flow.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/phase-3/README.md`
7. `docs/user-stories/phase-3/US-621-fleetgraph-post-comment-fallback-preview-cleanup.md`
8. `docs/DEFINITION_OF_DONE.md`
9. `docs/assignments/fleetgraph/README.md`
10. `docs/assignments/fleetgraph/PRESEARCH.md`
11. `docs/assignments/fleetgraph/FLEETGRAPH.md`
12. `.claude/CLAUDE.md`
13. `docs/user-stories/phase-2/US-601-current-page-approval-preview.md`
14. `web/src/lib/fleetgraph-entry.ts`
15. `web/src/lib/fleetgraph-entry.test.ts`
16. `web/src/components/FleetGraphEntryCard.tsx`
17. `web/src/components/FleetGraphEntryCard.test.tsx`
18. `web/src/hooks/useFleetGraphEntry.ts`
19. `api/src/services/fleetgraph/entry/service.ts`
20. `api/src/services/fleetgraph/entry/action-service.ts`
21. `api/src/routes/comments.ts`
22. `api/src/routes/fleetgraph.test.ts`

Expected contracts/data shapes:

1. The fallback currently builds a `post_comment` action with no comment body.
2. `/api/documents/:id/comments` requires at least `comment_id` and non-empty `content`, so the current fallback is not a truthful apply path.
3. `api/src/routes/comments.test.ts` is not present in the repo today, so the tighter FleetGraph-side rejection path plus entry-preview tests are the narrowest truthful proof surface for this cleanup.
4. If making comment preview real would require a larger compose UI, the smaller correct fix is to remove the fallback preview from unsupported page types.

Planned failing tests:

1. Unsupported page types no longer surface a broken `post_comment` preview path.
2. If `post_comment` remains supported, FleetGraph carries the required payload and apply succeeds through the real comments route.
3. Current supported approval-preview document types keep working after the fallback cleanup.

## UX Script

Happy path:

1. User opens an unsupported current-page type such as `weekly_retro`.
2. User asks FleetGraph to preview the next step.
3. FleetGraph either gives no preview or shows a truthful action that can really be applied.

Error path:

1. User opens an unsupported page.
2. FleetGraph shows `Post comment` as the fallback preview.
3. The action cannot actually be reviewed/applied because the required comment payload does not exist.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] The current-page preview flow from `US-601` is current repo truth
- [x] Local FleetGraph entry-preview and route tests run in this shell

## TDD Plan

1. Add failing payload-builder coverage for unsupported-page fallback behavior.
2. Add failing route/apply coverage to prove the current fallback is either repaired or removed truthfully.
3. Update visible preview tests so the entry card reflects the chosen truthful path.

## Step-by-step Implementation Plan

1. Reproduce the broken fallback contract in tests.
2. Decide whether to repair or remove the fallback based on the smallest truthful path.
3. Update the payload builder, backend action contract, and UI copy together.
4. Re-verify supported project/week validation preview flows after the cleanup.

## Acceptance Criteria

- [x] AC-1: FleetGraph no longer offers a broken `post_comment` fallback preview on unsupported page types.
- [x] AC-2: The entry preview contract now rejects hand-crafted `post_comment` preview payloads instead of pretending they are supported.
- [x] AC-3: Supported current-page preview flows for project, week approval, and week validation remain intact.
- [x] AC-4: Web and API tests cover the chosen fallback behavior truthfully.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/web exec vitest run src/lib/fleetgraph-entry.test.ts src/components/FleetGraphEntryCard.test.tsx
npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
npx pnpm --filter @ship/api exec tsc --noEmit
npx pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Spot-check a supported preview lane plus an unsupported page type on the live surface so FleetGraph stays truthful.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: an unsupported current-page type such as a `weekly_retro` document, plus `FleetGraph Demo Week - Validation Ready` for regression checking
- Route or URL: `Documents` -> an unsupported page type, then `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: use `Preview approval step` on the unsupported page, then verify a supported week-validation preview still behaves normally
- Expected result: unsupported pages no longer show a broken generic `Post comment` preview, while supported preview surfaces still work
- Failure signal: FleetGraph still offers a comment fallback it cannot execute, or the supported preview lanes regress

## User Checkpoint Test

1. Open an unsupported current-page type such as `weekly_retro`.
2. Use `Preview approval step`.
3. Confirm FleetGraph does not offer a broken `Post comment` fallback.
4. Open `FleetGraph Demo Week - Validation Ready`.
5. Confirm the supported week-validation preview still works.

## What To Test

- Route or URL: `Documents` -> an unsupported current-page type such as `weekly_retro`
- Interaction: click `Preview approval step`
- Expected visible result: FleetGraph either shows no fallback preview or shows a truthful action it can really execute, but not the broken generic `Post comment` preview
- Failure signal: `Post comment` still appears as a preview without a real comment draft/apply path

## Checkpoint Result

- Outcome: `pass`
- Evidence:
  - Removed the unsupported `post_comment` fallback from the FleetGraph entry payload builder, so unsupported page types like `weekly_retro` no longer draft a fake comment action.
  - Added a local no-guided-step response for preview requests with no supported action, which keeps `Preview next step` truthful without routing unsupported pages through the entry API.
  - Tightened the backend entry contract to reject hand-crafted `post_comment` preview payloads with `400 Unsupported FleetGraph action type` instead of treating them as valid approvals.
  - Updated web and route regressions to cover unsupported-page preview cleanup plus supported project/week preview preservation.
  - Local validation passed:
    - `npx pnpm --filter @ship/web exec vitest run src/lib/fleetgraph-entry.test.ts src/components/FleetGraphEntryCard.test.tsx`
    - `npx pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts`
    - `npx pnpm --filter @ship/api exec tsc --noEmit`
    - `npx pnpm --filter @ship/web exec tsc --noEmit`
    - `git diff --check`
  - Deployment status: `not deployed`
- Residual risk:
  - Live Railway proof still depends on merge-to-`master` auto-deploy plus an authenticated check of an unsupported page type and `FleetGraph Demo Week - Validation Ready` to confirm the truthful no-preview behavior and the supported week-validation lane on the sanctioned demo surface.
