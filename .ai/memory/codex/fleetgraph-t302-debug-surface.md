# FleetGraph T302 - Debug Surface

## Date
- 2026-03-17

## Story
- `T302` FleetGraph debug-console surface

## What Changed
- Replaced the per-card inline FleetGraph debug disclosure with a shared page-level debug dock.
- Added a persistent bottom-right FleetGraph debug surface that shows secondary QA details for both proactive findings and entry results.
- Kept the main FleetGraph cards human-first by removing thread ids, endpoints, and trace links from the primary card body.

## Validation
- `pnpm --filter @ship/web exec vitest run src/components/FleetGraphDebugDock.test.tsx src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/web build`

## Notes
- The shared debug surface reuses already-fetched FleetGraph state; it does not add new polling or debug-only API calls.
- This story does not change the Ship REST-only runtime boundary or FleetGraph backend behavior.
