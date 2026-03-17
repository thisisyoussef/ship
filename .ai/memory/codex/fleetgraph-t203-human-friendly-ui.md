# FleetGraph T203 Human-Friendly UI

## Date
- 2026-03-17

## Story
- `T203` FleetGraph action-state trust and human-facing copy cleanup

## What Changed
- Updated `web/src/hooks/useFleetGraphFindings.ts` so dismiss, snooze, and apply now expose awaited mutation results and separate load errors from action errors.
- Reworked `web/src/components/FleetGraphFindingsPanel.tsx` and new `web/src/components/FleetGraphFindingCard.tsx` so success notices only appear after confirmed mutation success.
- Added `web/src/components/FleetGraphDebugDisclosure.tsx` and moved thread ids, endpoints, and trace-link details behind that disclosure.
- Reworked `web/src/components/FleetGraphEntryCard.tsx` so the main surface uses calmer, user-facing copy and hides diagnostics by default.
- Added `web/src/lib/fleetgraph-findings-presenter.ts` to centralize FleetGraph finding status and lifecycle copy.

## Validation
- `bash scripts/tdd_handoff.sh check --story T203 --stage agent1 --expect red -- pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `bash scripts/tdd_handoff.sh check --story T203 --stage agent2 --expect green -- pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `bash scripts/tdd_handoff.sh check --story T203 --stage agent3 --expect green -- pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx src/pages/UnifiedDocumentPage.test.tsx src/pages/Documents.test.tsx`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/web build`
- `git diff --check`

## Notes
- A targeted Stryker run was attempted, but the current web mutation setup is blocked by a repo-level tooling gap: the config expects the TypeScript checker plugin, and that plugin is not installed.
- This story stays inside the FleetGraph feedback-pack boundary and does not touch the Ship REST-only runtime data-source rule.
