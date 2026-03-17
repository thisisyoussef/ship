# FleetGraph T104 - Start Week HITL

## Summary
- Branch: `codex/fleetgraph-t104-start-week-hitl`
- Goal: turn the visible proactive week-start finding into one real human-confirmed Ship action.
- Boundary: Ship product reads and writes stay behind Ship REST; FleetGraph owns only the finding/action lifecycle state.

## What Changed
- Added `api/src/services/fleetgraph/actions/` for durable apply-state storage and same-origin REST execution.
- Added `fleetgraph_finding_action_runs` in `api/src/db/migrations/040_fleetgraph_finding_action_runs.sql` and mirrored it in `api/src/db/schema.sql`.
- Added `POST /api/fleetgraph/findings/:id/apply` in `api/src/routes/fleetgraph.ts`.
- Extended findings responses to include persisted `actionExecution` state.
- Updated `web/src/hooks/useFleetGraphFindings.ts` and `web/src/components/FleetGraphFindingsPanel.tsx` for inline review/apply/cancel and visible result states.

## Important Decisions
- Real Ship mutations still go through `POST /api/weeks/:id/start`.
- A `400 already active` Ship response is treated as a safe idempotent outcome, not a hard failure.
- Successful apply does not immediately hide the finding; the persisted execution state stays visible until a later proactive pass resolves the drift.

## Validation
- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts`
- `pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/api build`
- `pnpm --filter @ship/web build`
- `git diff --check`
