# FleetGraph T304 - QA Refresh

## Date
- 2026-03-17

## Story
- `T304` FleetGraph polish QA refresh

## What Changed
- Refreshed the public demo inspection guide to match the polished Railway UI, including the new labeled hierarchy and `Open FleetGraph debug` terminology.
- Added a dedicated polish-pack user audit checklist so the full polished FleetGraph slice can be QAed from one reproducible path.
- Captured fresh Railway screenshots for the polished review page, inline review state, approval-preview state, and worker-generated page.
- Added a small FleetGraph docs-consistency test so named targets and polished UI labels do not drift silently.

## Validation
- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts src/services/fleetgraph/polish/docs.test.ts`
- `git diff --check`
- Live Railway inspection of:
  - `FleetGraph Demo Week - Review and Apply`
  - `FleetGraph Demo Week - Worker Generated`

## QA Critic Brief
- Strengths:
  - The full polished path is now reproducible from one checklist instead of scattered story notes.
  - Live Railway shows the calmer hierarchy and the secondary debug dock together, which matches the shipped product surface.
- Findings:
  - No new blocking follow-on surfaced during the T304 refresh pass.
- Follow-on suggestions:
  - None appended during T304; the next feedback sequence should be driven by the user’s next full inspection.

## Notes
- This story is docs/evidence/testing only; it does not change Ship runtime code or the REST-only FleetGraph boundary.
