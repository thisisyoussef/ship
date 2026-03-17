# FleetGraph Feedback Round 2 Pack

## Date
- 2026-03-17

## Branch
- `codex/fleetgraph-feedback-round2-pack`

## Goal
- Close the remaining live-inspection issues on the named FleetGraph demo week pages before the next user QA pass.

## What Changed
- Moved FleetGraph week-page scroll ownership to the outer `UnifiedDocumentPage` shell and removed the tab-content overflow trap.
- Added a gesture-safe inline review/apply contract in `FleetGraphFindingsPanel` with a short guard against same-click confirmation.
- Strengthened the inline review state in `FleetGraphFindingCard`, reordered the action buttons to `Cancel` then `Start week in Ship`, and removed the duplicated default `Suggested next step` badge.
- Added focused web tests for the scroll-shell contract, the safer confirm interaction, and the single-label/stronger-review presentation.
- Refreshed the FleetGraph demo inspection guide and added a dedicated round-two user audit checklist for the next Railway pass.

## Validation
- `pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/pages/UnifiedDocumentPage.test.tsx`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/web build`
- `git diff --check`
- Live Railway inspection of:
  - `FleetGraph Demo Week - Review and Apply`
  - `Preview approval step`
  - page-shell scroll on the named review/apply page

## Constraints Preserved
- No Ship product data path changed; the REST-only FleetGraph boundary still holds.
- No new FleetGraph intelligence or backend write path was added.
- The fixes stay user-facing and bounded to the named live-inspection feedback.

## Next
- Re-run the round-two audit checklist against the live demo with the user.
- Turn any remaining user-reported roughness into the next bounded follow-on pack instead of reopening completed stories ad hoc.
