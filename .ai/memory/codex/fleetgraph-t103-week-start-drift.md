# FleetGraph T103 - Week Start Drift

## Summary
- Story: `T103`
- Branch: `codex/fleetgraph-t103-week-start-drift`
- Goal: deliver one end-to-end proactive FleetGraph detection on real Ship REST data and render it visibly inside Ship.

## What Changed
- Added FleetGraph-owned proactive finding persistence with lifecycle status, cooldown, snooze, and trace metadata.
- Added a proactive Ship REST client and week-start drift detector based on `/api/weeks`.
- Wrapped the proactive worker/runtime path so week-start drift findings route through the shared FleetGraph runtime before being persisted.
- Added same-origin findings routes for listing, dismissing, and snoozing proactive findings.
- Added a visible document-page findings panel that renders active FleetGraph proactive findings and their advisory next step.

## Guardrails
- Ship product context comes from REST only. No direct database reads for Ship weeks, projects, or issues.
- FleetGraph-owned PostgreSQL state remains allowed for queue jobs, dedupe/checkpoints, and proactive findings.
- `start_week` remains advisory only in `T103`; the real HITL write path belongs to `T104`.

## Validation
- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts`
- `pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/api build`
- `pnpm --filter @ship/web build`

## Next
- Finalize `T103`
- Refresh Render after merge because API and web runtime changed
- Start `T104` for the real `start week` HITL write path
