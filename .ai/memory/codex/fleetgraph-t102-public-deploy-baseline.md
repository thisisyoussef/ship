# FleetGraph T102 Public Deploy Baseline

## Summary

- Goal: clear the Render public-demo blocker for the FleetGraph Tuesday MVP path without breaking the shared AWS-oriented deployment contract.
- Branch: `codex/fleetgraph-t102-public-deploy-baseline`
- Spec source: `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`

## What Changed

- Restored the MVP pack artifacts onto the T102 branch so the Tuesday checklist remains the active spec.
- Updated `api/src/config/ssm.ts` so optional FleetGraph/LangSmith SSM reads no longer crash non-AWS hosts when explicit runtime environment variables are already the intended config source.
- Added `api/src/config/ssm.test.ts` and included it in `api/vitest.fleetgraph.config.ts`.
- Updated `docs/guides/fleetgraph-deployment-readiness.md` and the MVP technical plan to document explicit-env-primary behavior for non-AWS demo hosts.

## Evidence

- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts`
- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/api build`
- Local production-shaped boot with explicit env and no AWS credentials:
  - `GET /health` -> `200 {"status":"ok"}`
  - `GET /api/fleetgraph/ready` with service token -> both API and worker surfaces `ready: true`
- Current live demo check:
  - `https://ship-demo.onrender.com/health` -> `200 {"status":"ok"}`
  - `https://ship-demo.onrender.com/api/fleetgraph/ready` -> `404 Cannot GET /api/fleetgraph/ready`

## Remaining Gap

- The live Render demo still needs a merged refresh after finalization, because the currently served build predates FleetGraph readiness routing.
