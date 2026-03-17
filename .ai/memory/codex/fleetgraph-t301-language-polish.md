# FleetGraph T301 - Language Polish

## Date
- 2026-03-17

## Story
- `T301` FleetGraph human-language summary polish

## What Changed
- Replaced the awkward approval-preview breadcrumb sentence with a direct human-facing review prompt.
- Added a deterministic human summary for week-start drift findings so the main proactive card no longer depends on raw LLM wording.
- Kept the REST-only Ship runtime boundary unchanged; this story only changes presentation/copy behavior.

## Validation
- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts src/routes/fleetgraph.test.ts`
- `pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/api build`
- `pnpm --filter @ship/web build`

## Notes
- Dismiss and snooze already work on the live Railway demo, so they stayed as regression checks rather than the main story focus.
- The worker-generated summary was polished in the frontend presentation layer to avoid turning this into an AI prompt/eval story.
