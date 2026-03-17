# FleetGraph Feedback Pack

## Date
- 2026-03-17

## Trigger
- First live user audit on the shipped Railway MVP found two concrete UI issues:
  - the FleetGraph demo weeks are not discoverable from standard documents navigation
  - the affected FleetGraph week page can become non-scrollable

## Verified Findings
- `web/src/pages/App.tsx` keeps sprint documents in docs mode, but the docs sidebar uses the deprecated wiki-only `useDocuments()` path.
- `web/src/pages/Documents.tsx` also uses the same wiki-only path, so seeded FleetGraph sprint documents do not appear there.
- `web/src/pages/UnifiedDocumentPage.tsx` and the sprint tab/editor layout use nested flex containers with `overflow-hidden`; this is the likely cause of the observed scroll trap on the week page.

## Pack Decision
- Create a dedicated post-MVP feedback pack instead of patching the findings ad hoc.
- Sequence:
  - `T201` discoverability/navigation first
  - `T202` scroll/layout recovery second
  - `T203` action-state trust and human-facing copy cleanup third
  - `T204` refreshed QA checklist and tail follow-ons last

## Constraints
- Keep Ship product data REST-only.
- Keep the Railway public demo as the proof surface for this feedback cycle.
- Use standard Ship navigation, not FleetGraph-only shortcuts, as the success bar for discoverability.
