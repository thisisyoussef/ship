# FleetGraph T201 - Discoverability

## Date
- 2026-03-17

## Goal
- Make the seeded FleetGraph demo weeks reachable from normal Ship document navigation instead of popup-only entry paths.

## What Changed
- `web/src/contexts/DocumentsContext.tsx` now combines REST-backed `wiki` and `sprint` documents for the compatibility docs surfaces.
- Added provider coverage in `web/src/contexts/DocumentsContext.test.tsx`.
- Added standard-docs-surface coverage in `web/src/pages/Documents.test.tsx`.

## Why
- The FleetGraph proof lanes are sprint documents.
- The docs sidebar and `/docs` page were both still on the deprecated wiki-only compatibility path.
- Fixing the compatibility layer once makes both surfaces show the named FleetGraph weeks without inventing a special FleetGraph route.

## Validation
- `pnpm --filter @ship/web exec vitest run src/contexts/DocumentsContext.test.tsx src/pages/Documents.test.tsx`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/web build`
- `git diff --check`

## Constraints Preserved
- Ship product data remains REST-only.
- No new FleetGraph-only navigation or data path was introduced.
- This story only broadens the standard docs compatibility surface to include sprint/week documents needed for the public proof lane.
