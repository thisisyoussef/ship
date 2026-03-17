# FleetGraph T104A - Demo Proof Seed

## Goal

Make the FleetGraph public demo dependable for UI inspection by:
- seeding one named Ship week with a visible proactive finding
- resetting the review/apply state on repeated bootstrap runs
- pivoting the sanctioned public demo deploy path from Render to Railway

## Key Changes

- Added a FleetGraph demo fixture helper at `api/src/services/fleetgraph/demo/fixture.ts`
- Wired the fixture into `api/src/db/seed.ts`
- Added `SHIP_PUBLIC_DEMO_BOOTSTRAP=true` support in the root `Dockerfile`
- Added `scripts/deploy-railway-demo.sh`
- Added `railway.json`
- Added `docs/guides/fleetgraph-demo-inspection.md`
- Updated active deployment and FleetGraph MVP docs from Render to Railway

## Named Inspection Targets

- Project: `FleetGraph Demo Project`
- Week: `FleetGraph Demo Week - Review and Apply`
- Finding: `Week start drift: FleetGraph Demo Week - Review and Apply`

## Validation

- `bash scripts/check_ai_wiring.sh`
- `python3 scripts/verify_agent_contract.py`
- `git diff --check`
- `bash -n scripts/deploy-railway-demo.sh`
- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts`
- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/api build`
- `pnpm build`

## Notes

- Runtime Ship product reads/writes still stay behind Ship REST only.
- Direct database writes in this story are limited to seed/bootstrap work plus FleetGraph-owned state.
- Railway CLI is available through `npx -y @railway/cli` and authenticated on this machine, but the repo is not yet linked to a Ship Railway project.
