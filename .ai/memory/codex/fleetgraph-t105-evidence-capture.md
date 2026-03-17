# T105 - FleetGraph Evidence Capture

## Summary

- Story: `T105`
- Branch: `codex/fleetgraph-t105-evidence-capture`
- Goal: capture the Tuesday MVP evidence set from the live Railway demo and update the FleetGraph submission workbook with real trace, deploy, and UI proof.

## What Changed

- Added `scripts/capture_fleetgraph_mvp_evidence.sh` to log into the public Railway demo, verify readiness, capture named inspection targets, and write `docs/evidence/fleetgraph-mvp-evidence.json`.
- Hardened the evidence capture flow so it can share LangSmith runs from stored run ids or by discovering the latest matching run when the live API omits `tracePublicUrl`.
- Fixed FleetGraph entry normalization so real Ship context payloads with `ticket_number: null` no longer break the approval-preview route.
- Captured live UI screenshots for:
  - `fleetgraph-review-apply-live.png`
  - `fleetgraph-approval-preview-live.png`
  - `fleetgraph-worker-generated-live.png`
- Updated `docs/assignments/fleetgraph/FLEETGRAPH.md` with:
  - two shared trace links
  - public demo/readiness proof
  - truthful cost/token accounting
  - explicit deferral notes for non-Tuesday use cases
- Added `docs/evidence/fleetgraph-mvp-evidence.md` as the human-readable evidence bundle.

## Key Evidence

- Public demo: `https://ship-demo-production.up.railway.app`
- Review/apply target:
  - doc id `77ae8e61-144a-4e05-a83a-f090eddb8caf`
  - title `Week start drift: FleetGraph Demo Week - Review and Apply`
- Worker-generated target:
  - doc id `a1e33dd0-7bef-4a97-817e-f0eb1bde5343`
  - title `Week start drift: FleetGraph Demo Week - Worker Generated`
- Shared traces:
  - proactive worker: `https://smith.langchain.com/public/d5f1a274-6f81-4c42-b8be-924791429323/r`
  - approval preview: `https://smith.langchain.com/public/e969f90a-ef5a-45e5-bded-9d6de7233311/r`

## Validation

- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts src/routes/fleetgraph.test.ts`
- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/api build`
- `bash -n scripts/capture_fleetgraph_mvp_evidence.sh`
- `bash scripts/capture_fleetgraph_mvp_evidence.sh` against the live Railway demo
- `git diff --check`

## Notes

- The live LangSmith payload currently exposes `total_tokens`, but not a reliable prompt/completion split or dollar-cost field for these FleetGraph runs.
- The public demo proof remains Railway-first for FleetGraph stories.
