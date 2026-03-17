# FleetGraph T202 - Scroll Recovery

## Date
- 2026-03-17

## Goal
- Restore normal scrolling on FleetGraph week pages by fixing the shared flex/overflow contract around the document page, editor shell, and week planning tab.

## What Changed
- Added `min-h-0` to the shared tabbed document shell in `web/src/pages/UnifiedDocumentPage.tsx`.
- Added `min-h-0` to the adaptive editor containers in `web/src/components/UnifiedEditor.tsx`.
- Added `min-h-0` to the underlying editor layout in `web/src/components/Editor.tsx`.
- Added `min-h-0` to the week planning tab shell in `web/src/components/document-tabs/WeekPlanningTab.tsx`.
- Added regression tests in `web/src/components/document-tabs/WeekPlanningTab.test.tsx` and `web/src/pages/UnifiedDocumentPage.test.tsx`.

## Why
- The FleetGraph week pages stack the proactive panel, entry card, tab bar, and editor/issues surfaces in nested flex columns.
- Without explicit shrink contracts, the inner scroll region could not take over cleanly, which matches the live “can’t scroll” report from the public demo.

## Validation
- `pnpm --filter @ship/web exec vitest run src/components/document-tabs/WeekPlanningTab.test.tsx src/pages/UnifiedDocumentPage.test.tsx`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/web build`
- `git diff --check`

## Constraints Preserved
- No Ship product data path changed.
- No FleetGraph behavior or copy changed in this story.
- The fix stays in shared layout containers so both seeded FleetGraph week proof lanes benefit from the same scroll contract.
