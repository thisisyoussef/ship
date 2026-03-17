# FleetGraph T303 - Visual Hierarchy

## Date
- 2026-03-17

## Story
- `T303` FleetGraph light visual hierarchy polish

## What Changed
- Reworked the proactive finding card into clearer labeled sections so the main narrative reads as finding -> why it matters -> suggested next step -> quick actions.
- Removed the default bullet-list feel from evidence rows and grouped dismiss/snooze into a calmer secondary quick-actions panel.
- Gave the entry card matching section rhythm so its actions and result state read more like guided help than stacked utility controls.

## Validation
- `bash scripts/tdd_handoff.sh check --story T303 --stage agent1 --expect red -- pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx`
- `bash scripts/tdd_handoff.sh check --story T303 --stage agent2 --expect green -- pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `bash scripts/tdd_handoff.sh check --story T303 --stage agent3 --expect green -- pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx`
- `pnpm --filter @ship/web type-check`
- `pnpm --filter @ship/web build`
- `pnpm run test:mutation:changed -- --base HEAD` (skipped by current helper because it only scopes committed diff)
- `git diff --check`

## QA Critic Brief
- Strengths:
  - The main proactive card now keeps the primary task flow clearer and the quick actions visibly secondary.
  - The main surfaces remain free of endpoint, thread-id, and trace-path jargon; those details stay in the debug dock.
- Findings:
  - No new blocking UI issue surfaced from the branch diff itself.
  - Local browser proof for the branch was blocked by the existing local Postgres role issue (`role "ship" does not exist`), so final visual proof still needs the post-merge Railway inspection.
- Follow-on suggestions:
  - None from `T303`; the final pack QA refresh in `T304` should verify the polished live surface and only append new work if Railway inspection surfaces a real remaining issue.

## Notes
- This story stays entirely in `web/` and does not change the Ship REST-only runtime boundary.
- Live Railway currently shows the pre-`T303` baseline until this story is merged and deployed.
