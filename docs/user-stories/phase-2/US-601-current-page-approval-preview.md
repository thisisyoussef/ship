# US-601: Current-Page Approval Preview

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-901`
- Related branch: `codex/fleetgraph-t601-approval-preview`
- Related commit/PR: pending
- Target environment: `local first`, `Railway demo if needed for visual verification`

## Persona

**Engineer or PM** wants a trustworthy approval preview from the page they are already on.

## User Story

> As an engineer or PM, I want FleetGraph to preview a consequential action from the current page so that I can see the exact next step before anything is executed.

## Goal

Complete the first remaining on-demand FleetGraph workbook use case on the lightest path: keep the approval preview flow embedded in the current page, make it meaningful for the supported page types we can represent safely today, and improve the visible evidence/trust surface without expanding into the later runtime-apply convergence story.

## Scope

In scope:

1. Make current-page approval preview meaningful for `project`, `sprint`, and `weekly_plan` contexts.
2. Preserve safe fallback preview behavior for other current-page types.
3. Improve visible approval-preview trust details and test coverage across web and API layers.
4. Add the checked-in story and queue updates required for this implementation slice.

Out of scope:

1. Routing the final `Apply` step through the FleetGraph runtime. That is `T601A`.
2. Adding first-class `weekly_retro` approval preview that requires extra action payload such as rating/comment.
3. Changing proactive findings or multi-finding plumbing.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/task-breakdown.md` — defines `T601` scope and its planned split from `T601A`.
2. `docs/assignments/fleetgraph/FLEETGRAPH.md` — workbook contract for the approval-preview use case.
3. `web/src/lib/fleetgraph-entry.ts` — current-page approval payload builder.
4. `web/src/hooks/useFleetGraphEntry.ts` — entry mutation and current direct-apply behavior.
5. `web/src/components/FleetGraphEntryCard.tsx` — visible approval-preview surface.
6. `web/src/components/FleetGraphEntryCard.test.tsx` — current frontend approval-preview assertions.
7. `api/src/services/fleetgraph/entry/service.ts` — backend entry validation and summary contract.
8. `api/src/routes/fleetgraph.test.ts` — route-level approval-preview contract coverage.
9. `api/src/routes/associations.ts` — document-context source for `belongs_to` sprint/project/program relationships.

## Preparation Phase

1. Read the local code and contracts listed above.
2. Check the FleetGraph workbook and completion pack before coding.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/*`
2. `docs/assignments/fleetgraph/FLEETGRAPH.md`
3. `web/src/lib/fleetgraph-entry.ts`
4. `web/src/hooks/useFleetGraphEntry.ts`
5. `web/src/components/FleetGraphEntryCard.tsx`
6. `web/src/components/FleetGraphEntryCard.test.tsx`
7. `api/src/routes/fleetgraph.test.ts`
8. `api/src/routes/associations.ts`

Expected contracts/data shapes:

1. `DocumentContext.belongs_to` can include a related `sprint` for weekly docs, which is enough to preview a week-plan approval action safely.
2. `FleetGraphApprovalEnvelope` already supports `approve_project_plan`, `approve_week_plan`, and `post_comment`, so `weekly_plan` can reuse `approve_week_plan` without widening the action schema.
3. `weekly_retro` approval is not a safe fit for this story because Ship review approval needs extra payload that the current shared action contract does not carry.

Planned failing tests:

1. `buildFleetGraphEntryPayload` should map `weekly_plan` to `approve_week_plan` using the related sprint from context.
2. `FleetGraphEntryCard` should render human-readable approval rationale/evidence for the approval preview state.
3. `/api/fleetgraph/entry` should accept the weekly-plan approval-preview payload shape.

## UX Script

Happy path:

1. User opens a project, sprint, or weekly plan page inside `UnifiedDocumentPage`.
2. User clicks `Preview approval step`.
3. FleetGraph shows the approval title, summary, why it is suggesting this, and the visible `Apply`, `Dismiss`, and `Snooze` controls.

Error path:

1. User opens a page with missing workspace or missing current context.
2. FleetGraph refuses the preview with a clear inline error or disabled state.
3. Unsupported current-page types fall back to a safer consequential preview instead of inventing an approval action.

## Preconditions

- [ ] Local API/web dependencies are installed
- [ ] Current FleetGraph tests can run locally
- [ ] No deploy-only secrets are required for local validation

## TDD Plan

1. Add a focused payload-builder test for `weekly_plan` plus fallback behavior.
2. Extend the route test to accept the supported weekly-plan approval-preview shape.
3. Extend the entry-card test to cover the visible trust/evidence details in the approval-preview state.

## Step-by-step Implementation Plan

1. Add story/queue docs for `US-601`.
2. Add failing tests for weekly-plan payload mapping and richer approval-preview rendering.
3. Update the payload builder to derive a sprint-backed approval action from `weekly_plan` context.
4. Update the entry card to show the approval rationale/evidence cleanly without surfacing raw technical details.
5. Run targeted FleetGraph tests, then `git diff --check`.

## Acceptance Criteria

- [ ] AC-1: `Preview approval step` produces a meaningful approval action for `project`, `sprint`, and `weekly_plan`.
- [ ] AC-2: Unsupported current-page types still take a safe fallback path instead of inventing unsupported approval actions.
- [ ] AC-3: The visible approval-preview UI includes enough human-readable detail to inspect why FleetGraph is suggesting the action.
- [ ] AC-4: API and web tests cover the supported preview path and the weekly-plan mapping.

## Local Validation

Run these before handoff:

```bash
pnpm --filter @ship/web exec vitest run web/src/components/FleetGraphEntryCard.test.tsx web/src/lib/fleetgraph-entry.test.ts
pnpm --filter @ship/api exec vitest run api/src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts
git diff --check
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. Record the runtime proof path if blocked or not deployed.

## How To Verify

- Route or URL: open any supported `UnifiedDocumentPage` surface with FleetGraph enabled, ideally one `project`, one `sprint`, and one `weekly_plan`.
- Interaction: click `Preview approval step`.
- Expected result: FleetGraph shows a human-readable approval preview with the exact action title/summary plus supporting rationale/evidence, and supported weekly plans resolve to a week approval preview rather than a generic comment fallback.
- Failure signal: weekly plans still preview a generic `Post comment` action, or the approval panel lacks enough detail to understand why FleetGraph is suggesting the action.

## User Checkpoint Test

1. Open a project or sprint page and confirm `Preview approval step` shows a meaningful approval preview.
2. Open a weekly plan page and confirm FleetGraph previews a week-plan approval step rather than a generic fallback.
3. Confirm the approval preview explains why the action is being suggested without exposing raw debug-only endpoint text in the main card.

## Checkpoint Result

- Outcome: complete
- Evidence:
  - `weekly_plan` now previews `approve_week_plan` from its related sprint context.
  - approval-preview UI now shows rationale and evidence in the main FleetGraph card without surfacing raw endpoint details there.
  - focused web and API FleetGraph tests passed locally.
- Residual risk: `weekly_retro` remains on the safer fallback path until `T601A` or a later action-contract story widens review-action support.
