# FleetGraph Polish Pack

## Date
- 2026-03-17

## Trigger
- The feedback pack is complete and live, but the next live QA pass still surfaced a few remaining UI rough edges:
  - awkward approval-preview phrasing
  - worker summary copy that still feels too technical
  - desire for a more persistent QA/debug surface
  - room for modest visual hierarchy polish without redesign

## Verified Findings
- `Dismiss` and `Snooze 4h` now succeed on the live Railway demo, so they should stay as regression checks instead of the next core defect.
- `web/src/components/FleetGraphEntryCard.tsx` still renders `FleetGraph Demo Week - Review and Apply with 3 breadcrumb level(s).` in the approval-preview state.
- The worker-generated proactive summary is accurate but still denser and more system-shaped than the desired human-facing tone.
- The current `Debug details` disclosure is acceptable but still not as persistent or QA-friendly as the user requested.

## Pack Decision
- Create a dedicated FleetGraph polish pack instead of smuggling the remaining UI work into the completed feedback pack.
- Sequence:
  - `T301` human-language summary polish
  - `T302` persistent debug surface
  - `T303` light visual hierarchy polish
  - `T304` refreshed live QA and tail follow-ons

## Constraints
- Keep Ship product data REST-only.
- Keep the Railway public demo as the proof surface for this pack.
- Keep the work modest and human-centered; do not turn this into a broad redesign.

## Current Status
- `T301`, `T302`, and `T303` are merged and live on the Railway public demo.
- `T304` is closing the pack with refreshed screenshots, the updated inspection guide, and a dedicated polish-pack user audit checklist.
- The current live proof lane now shows the calmer labeled structure:
  - `Active finding`
  - `Why this matters`
  - `Suggested next step`
  - `Quick actions`
