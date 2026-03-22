# US-613: FleetGraph Panel Gradient Removal

## Status

- State: `todo`
- Owner: Codex
- Depends on: `US-612`
- Related branch:
- Related commit/PR:
- Target environment: `local first`, `Railway demo via merged master`

## Persona

**Engineer or PM** wants the FleetGraph panel shell to feel calmer and less decorative.

## User Story

> As an engineer or PM, I want the FleetGraph panel header to use a flatter background instead of a gradient so the shell feels more product-like and less visually noisy.

## Goal

Remove the gradient treatment from the FleetGraph panel shell while keeping the collapse/expand affordance, status visibility, and proactive alert signaling intact.

## Scope

In scope:

1. Replace the FleetGraph panel shell gradient backgrounds with a flatter background treatment.
2. Preserve alert-state differentiation without relying on a gradient.
3. Update any tests or proof notes that explicitly assume the gradient styling.

Out of scope:

1. Reworking the FleetGraph shell layout or hierarchy.
2. Changing entry-card or proactive-panel behavior.
3. Broader FleetGraph visual redesign.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `web/src/components/FleetGraphPanelShell.tsx` — owns the shell header background styling.
2. `web/src/components/FleetGraphPanelShell.test.tsx` — existing regression coverage for the shell.
3. `docs/guides/fleetgraph-demo-inspection.md` — public demo proof guidance for the shell surface.

## Preparation Phase

1. Confirm exactly which classes create the current gradient treatment.
2. Choose a flatter replacement that still distinguishes alert vs non-alert states.
3. Note whether any proof copy references the gradient explicitly.

### Preparation Notes

Local docs/code reviewed:

1. `web/src/components/FleetGraphPanelShell.tsx`
2. `web/src/components/FleetGraphPanelShell.test.tsx`

Expected contracts/data shapes:

1. The open/close button remains the single clickable shell header.
2. Alert-state differentiation still depends on `activeFindingCount > 0`.

Planned failing tests:

1. Shell header no longer renders the gradient utility classes.
2. Alert-state shell still communicates a proactive state without the gradient.

## UX Script

Happy path:

1. User opens a FleetGraph document page.
2. The FleetGraph shell looks calmer and flatter.
3. The alert state is still noticeable without feeling decorative.

Error path:

1. The gradient is removed.
2. The alert state becomes too subtle or the shell loses contrast.

## Preconditions

- [ ] Fresh story branch is checked out before edits begin
- [ ] FleetGraph shell is visible on the current document page
- [ ] Existing FleetGraph shell tests are passing before changes

## TDD Plan

1. Update `FleetGraphPanelShell` tests to assert the flatter shell styling.
2. Adjust implementation only after the style expectation is explicit.

## Step-by-step Implementation Plan

1. Remove the gradient classes from the shell header button.
2. Replace them with flatter alert/non-alert background classes.
3. Re-run FleetGraph shell UI tests.
4. Update proof notes only if the visual description needs it.

## Acceptance Criteria

- [ ] AC-1: The FleetGraph panel shell no longer uses a gradient background.
- [ ] AC-2: Alert-state signaling remains visible and understandable.
- [ ] AC-3: FleetGraph shell tests cover the flatter styling.

## Local Validation

Run these before handoff:

```bash
npx pnpm --filter @ship/web exec vitest run src/components/FleetGraphPanelShell.test.tsx src/pages/UnifiedDocumentPage.test.tsx
npx pnpm --filter @ship/web exec tsc --noEmit
git diff --check
```

## Deployment Handoff

1. Merge to `master`.
2. Monitor the Railway demo auto-deploy through completion.
3. Verify the FleetGraph shell on the public demo document page.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Validation Ready`
- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: open the FleetGraph panel shell
- Expected result: the shell uses a flatter background treatment without the old gradient
- Failure signal: the gradient remains or the shell loses too much visual separation

## User Checkpoint Test

1. Open `FleetGraph Demo Week - Validation Ready`.
2. Open the FleetGraph panel shell.
3. Confirm the header background is flatter and calmer than before.

## What To Test

- Route or URL: `Documents` -> `FleetGraph Demo Week - Validation Ready`
- Interaction: inspect the FleetGraph shell before opening and after opening it
- Expected visible result: no gradient background, but the shell still reads as a distinct FleetGraph surface
- Failure signal: gradient remains, contrast drops too far, or alert state becomes unclear

## Checkpoint Result

- Outcome: `pending`
- Evidence:
- Residual risk:
