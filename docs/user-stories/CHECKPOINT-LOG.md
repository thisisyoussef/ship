# Cross-Phase Checkpoint Log

| Story | Commit | URL(s) | Local Validation | Deployment | User Checkpoint | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US-901 | pending finalization | repo-only | `bash scripts/check_ai_wiring.sh` pass; `git diff --check` pass | `not deployed` | Passed | `done` | AGENTS-first docs harness shipped; old `.ai` workspace docs retired; FleetGraph case mix updated to the easier planned set. |
| US-601 | pending finalization | repo-only | `pnpm --filter @ship/web exec vitest run src/lib/fleetgraph-entry.test.ts src/components/FleetGraphEntryCard.test.tsx` pass; `pnpm --filter @ship/api exec vitest run src/routes/fleetgraph.test.ts --config vitest.fleetgraph.config.ts` pass; `bash scripts/check_ai_wiring.sh` pending; `git diff --check` pending | `not deployed` | Pending direct product inspection | `done` | Finished current-page approval preview on the lightweight path; `weekly_plan` now resolves to week approval while `weekly_retro` stays on the safer fallback path until `T601A`. |
| US-902 | pending finalization | repo-only | `bash scripts/check_ai_wiring.sh` pass; `git diff --check` pass | `not deployed` | Pending direct doc inspection | `done` | Added a durable seeded-verification-entry rule to the harness and pointed the FleetGraph approval-preview inspection path at the named seeded demo week. |
