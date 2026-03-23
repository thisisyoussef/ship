# FleetGraph Demo Inspection Guide

Use this guide when verifying FleetGraph behavior on the sanctioned public demo.

## Demo Account

- Public demo URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Named Inspection Targets

- Project title: `FleetGraph Demo Project`
- Seeded HITL week title: `FleetGraph Demo Week - Review and Apply`
- Owner-gap week title: `FleetGraph Demo Week - Owner Gap`
- Unassigned-issues week title: `FleetGraph Demo Week - Unassigned Issues`
- Validation-ready week title: `FleetGraph Demo Week - Validation Ready`
- Sprint-owner proof lane: `FleetGraph Demo Week - Owner Gap`
- Unassigned-issues proof lane: `FleetGraph Demo Week - Unassigned Issues`
- Current-page analysis proof lane: `FleetGraph Demo Week - Validation Ready` on the `Review` tab
- Current-page guided-step proof lane: `FleetGraph Demo Week - Validation Ready` on the `Review` tab
- Seeded HITL finding title: `Week start drift: FleetGraph Demo Week - Review and Apply`
- Owner-gap finding title: `Sprint owner gap: FleetGraph Demo Week - Owner Gap`
- Unassigned-issues finding title: `3 unassigned issues in FleetGraph Demo Week - Unassigned Issues`
- Worker-generated week title: `FleetGraph Demo Week - Worker Generated`
- Worker-generated finding title: `Week start drift: FleetGraph Demo Week - Worker Generated`

## Current Public-Demo Truth

Stable public-demo proof lanes during the March 22, 2026 audit:

- `FleetGraph Demo Week - Review and Apply`
- `FleetGraph Demo Week - Owner Gap`
- `FleetGraph Demo Week - Validation Ready`
- `FleetGraph Demo Week - Worker Generated`

Current public-demo blocker:

- `FleetGraph Demo Week - Unassigned Issues` is seeded in repo but blocked on
  the current public Railway findings feed. Treat that lane as blocked unless
  the titled finding is visibly present on the live demo.

## UI Inspection Flow

1. Open the public demo URL.
2. Sign in with the demo account.
3. Go to `Documents`.
4. Open `FleetGraph Demo Week - Review and Apply` from the document list or sidebar.
5. Inspect the proactive panel and the entry card on that page.
6. Confirm the page itself scrolls naturally with your mouse wheel or trackpad while the FleetGraph panels stay part of the same page flow.
7. Click `Review and apply`, then inspect the inline review state.
8. Pause for a beat and confirm nothing in Ship has changed yet.
9. Click `Cancel`.
10. Return to `Documents`.
11. Open `FleetGraph Demo Week - Owner Gap`.
12. Inspect the proactive FleetGraph card and confirm the owner-gap finding is visible.
13. Confirm the suggested next step offers `Review and apply`.
14. Click `Review and apply`, inspect the owner-assignment review state, then apply it when you are ready to verify the real path.
15. Return to `Documents`.
16. If `FleetGraph Demo Week - Unassigned Issues` is visible with its titled
    finding, inspect it as the fifth workbook lane.
17. If that finding is missing, treat it as the known blocked public-demo lane
    recorded in `docs/evidence/fleetgraph-mvp-evidence.md`.
18. Return to `Documents`.
19. Open `FleetGraph Demo Week - Validation Ready`.
20. Open the `Review` tab for `FleetGraph Demo Week - Validation Ready`.
21. Click `Check this page` in the entry card and inspect the FAB handoff.
22. Ask a follow-up such as `What else should I look at?` in the FAB.
23. Click `Preview next step` in the entry card and inspect the guided-step preview state.
24. Open `FleetGraph debug`.
25. Inspect the secondary debug dock for thread history and pending interrupts.
26. Return to `Documents`.
27. Open `FleetGraph Demo Week - Worker Generated`.

## Expected FleetGraph Surface

- The `FleetGraph proactive` panel is visible near the top of the document page.
- The proactive panel heading reads `Proactive findings`, even when the current proof lane only shows a week-start drift example.
- The `FleetGraph entry` card remains visible below the proactive panel.
- The page scrolls as one comfortable document page instead of trapping the FleetGraph panels above a separate inner scroller.
- On `FleetGraph Demo Week - Review and Apply`, the proactive card shows:
  - `Active finding`
  - `Why this matters`
  - `Suggested next step`
  - `Quick actions`
  - `Review and apply`
- On `FleetGraph Demo Week - Owner Gap`, the proactive card shows:
  - `Sprint owner gap: FleetGraph Demo Week - Owner Gap`
  - accountability-focused evidence about the missing owner
  - `Assign sprint owner` with a real `Review and apply` path
  - `Quick actions` with `Dismiss` and snooze controls
  - `Review and apply`
- On `FleetGraph Demo Week - Unassigned Issues`, the proactive card shows:
  - `3 unassigned issues in FleetGraph Demo Week - Unassigned Issues`
  - count/context evidence about the unassigned work cluster
  - `Assign sprint issues` as advisory guidance only
  - `Quick actions` with `Dismiss` and snooze controls
  - no `Review and apply` button
- If that titled finding is absent on Railway, use the evidence bundle's blocked
  note instead of treating the whole audit as failed. The lane is seeded in repo
  but blocked on the current public Railway findings feed.
- On `FleetGraph Demo Week - Worker Generated`, the panel shows the worker-generated finding title generated by the live Railway worker.
- On `FleetGraph Demo Week - Validation Ready`, the `Review` tab is available immediately and `Plan Validation` starts unset so FleetGraph can validate it.
- Lifecycle controls such as `Dismiss` and `Snooze 4h` remain available in the `Quick actions` block for finding-state checks.
- The entry card should also show a `Quick actions` section instead of an unlabeled button row.
- The entry card starts current-page analysis, but the FAB is the canonical analysis/chat surface once `Check this page` is used.
- The main card copy should read in user terms first, with diagnostics moved behind `Open FleetGraph debug`.
- The debug dock should show secondary details such as:
  - FleetGraph thread ids
  - latest checkpoint path/outcome
  - pending interrupt summaries when a review thread is paused

## Expected Review-And-Apply Flow

1. Click `Review and apply`.
2. Confirm the inline review box headline is `Confirm before starting this week`.
3. Confirm `Cancel` and `Start week in Ship` are both visible.
4. Confirm the copy explains the effect in human terms instead of raw endpoint or route jargon.
5. Confirm the same click that opened review did not already start the week.
6. Open `FleetGraph debug` and confirm the review thread appears as a secondary diagnostic detail, not primary product copy.
7. Apply only when you want to test the real HITL path.

## Expected Owner-Gap Flow

1. Open `FleetGraph Demo Week - Owner Gap`.
2. Confirm the proactive panel shows `Sprint owner gap: FleetGraph Demo Week - Owner Gap`.
3. Confirm the summary explains the missing owner in user/accountability terms.
4. Confirm the evidence mentions that nobody is accountable for coordinating the sprint right now.
5. Confirm the suggested next step is `Assign sprint owner`.
6. Click `Review and apply`.
7. Confirm the inline review explains that FleetGraph will assign the signed-in user as sprint owner.
8. Confirm `Cancel` and `Assign owner in Ship` are both visible.
9. Apply the action.
10. Confirm the page refreshes and the `Owner` field now shows the signed-in demo user.
11. Confirm the owner-gap finding disappears instead of resurfacing immediately.
12. Confirm lifecycle controls such as `Dismiss` and `Snooze 4h` were available before apply.
13. Failure signal: the owner-gap page has no finding, the review does not say who will be assigned, the page never shows an owner, or the same finding remains after apply.

## Expected Unassigned-Issues Flow When The Public Demo Feed Is Fresh

1. Open `FleetGraph Demo Week - Unassigned Issues`.
2. Confirm the proactive panel shows `3 unassigned issues in FleetGraph Demo Week - Unassigned Issues`.
3. Confirm the summary explains that the sprint still needs an ownership decision for those issues.
4. Confirm the evidence includes the unassigned count and the sprint timing/context.
5. Confirm the suggested next step is `Assign sprint issues`.
6. Confirm FleetGraph does not show `Review and apply` or any other fake mutation control for this case.
7. Confirm lifecycle controls such as `Dismiss` and `Snooze 4h` still work.
8. Failure signal: the page has no unassigned-issues finding, the count/context is missing, or FleetGraph exposes a broken apply path for issue assignment.

If that titled finding is not present on Railway, do not treat this checklist as
failed. Instead, record the known blocker from
`docs/evidence/fleetgraph-mvp-evidence.md`: the lane is seeded in repo but
blocked on the current public Railway findings feed.

## Expected FAB Page-Analysis Flow

1. On `FleetGraph Demo Week - Validation Ready`, open the `Review` tab and find the `FleetGraph entry` card.
2. Confirm the card shows a `Quick actions` section with `Check this page` and `Preview next step`.
3. Click `Check this page`.
4. Confirm the floating FleetGraph FAB opens immediately.
5. Confirm the FAB begins the page analysis instead of leaving the entry card to render an inline chat transcript.
6. Confirm the analysis explains what matters on the current page in user terms instead of generic placeholder copy.
7. Confirm the FAB shows a follow-up composer with `Ask a follow-up...`.
8. Ask `What else should I look at?`
9. Confirm the answer continues on the same FAB thread instead of resetting to a generic first response.
10. Confirm diagnostics remain secondary under `Open FleetGraph debug`.
11. Failure signal: the FAB does not open, no analysis appears there, the entry card still renders competing inline chat, or the second answer repeats the first without advancing.

## Expected Entry-Card Preview Flow

1. On `FleetGraph Demo Week - Validation Ready`, open the `Review` tab and find the `FleetGraph entry` card.
2. Confirm the card shows a `Quick actions` section with `Check this page` and `Preview next step`.
3. Click `Preview next step`.
4. Confirm the card shows `FleetGraph paused for your confirmation.`
5. Confirm the result area shows `Current guidance` and `Review step`.
6. Confirm the guided step is `Validate week plan`.
7. Confirm the preview explains that the validation result is visible on this page and includes evidence about `Plan Validation` showing `Validated`.
8. Confirm the visible options focus on user choice first, while diagnostics remain secondary under `Open FleetGraph debug`.
9. Confirm the debug dock surfaces the entry thread and its latest checkpoint summary.

## Expected Entry-Card Apply Flow

1. On `FleetGraph Demo Week - Validation Ready`, open the `Review` tab and click `Preview next step`.
2. Click `Apply`.
3. Confirm the card shows a `Latest result` panel after the action finishes.
4. Confirm the result headline is `Week plan validated.`
5. Confirm the result detail explains the visible effect in Ship and points back to the page state: `Week plan marked as validated in Ship. Look for Plan Validation showing Validated on this page.`
6. Confirm the page data refreshes after apply instead of leaving the stale preview in place.
7. Confirm the `Plan Validation` control now shows `Validated` on the review page.
8. Click `Preview next step` again and confirm FleetGraph does not offer the same validation step a second time.
9. Failure signal: the card shows no inline result, the review page stays stale after the action completes, or the same validation prompt reappears immediately.

## Screenshot References

- Review/apply page:
  [fleetgraph-polish-review-page-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-review-page-live.png)
- Inline review state:
  [fleetgraph-polish-review-inline-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-review-inline-live.png)
- Guided-step preview:
  [fleetgraph-polish-approval-preview-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-approval-preview-live.png)
- Worker-generated page:
  [fleetgraph-polish-worker-page-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-worker-page-live.png)

## Reset Behavior

- In repo/bootstrap contract, re-running the demo bootstrap should reset the
  named week back to `planning`.
- In repo/bootstrap contract, it should reset `FleetGraph Demo Week - Owner Gap`
  back to an `active` sprint with no owner assigned.
- In repo/bootstrap contract, it should reset `FleetGraph Demo Week - Unassigned
  Issues` back to an `active` sprint with three unassigned issues and two
  assigned issues.
- In repo/bootstrap contract, it should clear prior FleetGraph action-run state
  so the review/apply path is visible again for the next audit.
- In repo/bootstrap contract, it should also clear the worker-generated lane and
  enqueue one fresh proactive worker job so the deployed worker can re-create
  that finding on the next refresh.
- In repo/bootstrap contract, it should reset `FleetGraph Demo Week - Validation
  Ready` back to an `active` week with a linked weekly review whose `Plan
  Validation` state is unset.
- Current public Railway note: the March 22 audit showed the unassigned-issues
  lane still missing from the live findings feed, so do not assume the public
  deployment has replayed every seeded proof lane yet.
