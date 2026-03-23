# FleetGraph Demo Inspection Guide

Use this guide when verifying FleetGraph behavior on the sanctioned public demo.

## Demo Account

- Public demo URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Named Inspection Targets

- Project title: `FleetGraph Demo Project`
- Final demo story week title: `FleetGraph Demo Week - One Story`
- Seeded HITL week title: `FleetGraph Demo Week - Review and Apply`
- Owner-gap week title: `FleetGraph Demo Week - Owner Gap`
- Unassigned-issues week title: `FleetGraph Demo Week - Unassigned Issues`
- Validation-ready week title: `FleetGraph Demo Week - Validation Ready`
- Final demo story finding title: `Week start drift: FleetGraph Demo Week - One Story`
- Sprint-owner proof lane: `FleetGraph Demo Week - Owner Gap`
- Unassigned-issues proof lane: `FleetGraph Demo Week - Unassigned Issues`
- Current-page analysis proof lane: `FleetGraph Demo Week - Validation Ready` on the `Review` tab
- Current-page guided-step proof lane: `FleetGraph Demo Week - Validation Ready` on the `Review` tab
- Global queue proof lane: `/fleetgraph` showing active findings for `FleetGraph Demo Week - Review and Apply`, `FleetGraph Demo Week - One Story`, `FleetGraph Demo Week - Owner Gap`, and, when the public findings feed is fresh, `FleetGraph Demo Week - Unassigned Issues`
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

Workspace queue proof path:

- `/fleetgraph` should aggregate the active proactive findings from the seeded review/apply, one-story, and owner-gap lanes above, plus the unassigned-issues lane when the public Railway findings feed is fresh.
- Treat the queue as successful if it truthfully reflects the currently active seeded findings instead of fabricating a queue-only scenario.

Repo/bootstrap final-demo story lane:

- `FleetGraph Demo Week - One Story` is the seeded single-sprint video path for the final submission. It intentionally starts with a week-start drift finding, then keeps the same sprint ready for on-demand review-tab analysis and guided validation after the week is started.

Worker-generated lane contract:

- `FleetGraph Demo Week - Worker Generated` should now regenerate through the same live worker path as the rest of Ship: active workspace sweeps are re-registered on API startup and watched write routes can enqueue fresh proactive work.
- The demo reset still clears this lane and nudges one immediate worker job, but the lane should no longer depend on demo-only sweep registration to stay alive after the app restarts.

Current public-demo blocker:

- `FleetGraph Demo Week - Unassigned Issues` is seeded in repo but blocked on
  the current public Railway findings feed. Treat that lane as blocked unless
  the titled finding is visibly present on the live demo with its real
  review/apply path.

## Final Demo Story Flow

Use this when recording the final video. It is intentionally narrower than the full audit flow.

1. Open `FleetGraph Demo Week - One Story`.
2. Confirm the proactive panel shows `Week start drift: FleetGraph Demo Week - One Story`.
3. Confirm the evidence explains that the sprint is still in planning even though its start date has passed.
4. Click `Review and apply`.
5. Confirm nothing changes in Ship until you explicitly apply.
6. Apply `Start week in Ship`.
7. Confirm the page refreshes and the original drift condition is no longer the current active state.
8. Open the `Review` tab on the same sprint.
9. Confirm the bottom-left guided overlay appears automatically for the `Review` tab.
10. Confirm the guided step is `Validate week plan`.
11. Apply the guided step from the overlay.
12. Confirm the overlay shows the action result and `Plan Validation` updates to `Validated` on the page.
13. Open the FAB.
14. Confirm the analysis is grounded in the current review page.
15. Ask a follow-up such as `What else should I do here?`
16. Confirm the follow-up stays on the same analysis thread.

## UI Inspection Flow

1. Open the public demo URL.
2. Sign in with the demo account.
3. Go to `Documents`.
4. Open `FleetGraph Demo Week - Review and Apply` from the document list or sidebar.
5. Inspect the proactive panel on that page.
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
21. Confirm the bottom-left guided overlay appears automatically when the `Review` tab loads.
22. Open the FAB and ask a follow-up such as `What else should I look at?`
23. Open `FleetGraph debug`.
24. Inspect the secondary debug dock for thread history and pending interrupts.
25. Return to `Documents`.
26. Open `FleetGraph Demo Week - Worker Generated`.

## Expected Global Queue Flow

1. Open any page with the global left rail visible, then click `FleetGraph`.
2. Confirm the rail item shows a count badge when proactive findings are active.
3. Confirm the `/fleetgraph` page heading reads `Workspace findings queue`.
4. Confirm the queue includes active findings from multiple seeded demo lanes, including `FleetGraph Demo Week - Review and Apply`, `FleetGraph Demo Week - One Story`, and `FleetGraph Demo Week - Owner Gap`.
5. If `FleetGraph Demo Week - Unassigned Issues` is present in the queue, treat that as the fresh-feed variant of the same proof lane.
6. Use `Open related document` on one finding and confirm Ship lands in the corresponding document page.
7. Use a queue action such as `Review and apply`, `Dismiss`, or `Snooze 4h` and confirm the queue refreshes afterward.

## Expected FleetGraph Surface

- The `FleetGraph proactive` panel is visible near the top of the document page.
- The global left rail should show a dedicated `FleetGraph` mode with a count badge while active proactive findings exist.
- On `/fleetgraph`, the page heading reads `Workspace findings queue`.
- The `/fleetgraph` queue should reuse the existing proactive finding cards and quick-action bars, plus an `Open related document` action for queue-to-document navigation.
- The queue should show multiple active findings drawn from the seeded demo weeks instead of only the currently open page.
- The proactive panel heading reads `Proactive findings`, even when the current proof lane only shows a week-start drift example.
- The page scrolls as one comfortable document page instead of trapping the FleetGraph panels above a separate inner scroller.
- On `FleetGraph Demo Week - Review and Apply`, the proactive card shows:
  - `Active finding`
  - `Why this matters`
  - `Suggested next step`
  - `Quick actions`
  - `Review and apply`
- On `FleetGraph Demo Week - One Story`, the proactive card shows:
  - `Week start drift: FleetGraph Demo Week - One Story`
  - evidence about the missed start date and current owner state
  - `Review and apply`
  - `Quick actions` with dismiss and snooze controls before apply
  - a follow-on path where the same sprint can still use the analysis FAB plus the guided overlay on the `Review` tab after the week is started
- On `FleetGraph Demo Week - Owner Gap`, the proactive card shows:
  - `Sprint owner gap: FleetGraph Demo Week - Owner Gap`
  - accountability-focused evidence about the missing owner
  - `Assign sprint owner` with a real `Review and apply` path
  - `Quick actions` with `Dismiss` and snooze controls
  - `Review and apply`
- On `FleetGraph Demo Week - Unassigned Issues`, the proactive card shows:
  - `3 unassigned issues in FleetGraph Demo Week - Unassigned Issues`
  - count/context evidence about the unassigned work cluster
  - `Assign sprint issues` with a real `Review and apply` path
  - `Quick actions` with `Dismiss` and snooze controls
  - `Review and apply`
- If that titled finding is absent on Railway, use the evidence bundle's blocked
  note instead of treating the whole audit as failed. The lane is seeded in repo
  but blocked on the current public Railway findings feed.
- On `FleetGraph Demo Week - Worker Generated`, the panel shows the worker-generated finding title generated by the live Railway worker.
- On `FleetGraph Demo Week - Validation Ready`, the `Review` tab is available immediately and `Plan Validation` starts unset so FleetGraph can validate it.
- Lifecycle controls such as `Dismiss` and `Snooze 4h` remain available in the `Quick actions` block for finding-state checks.
- The embedded `FleetGraph entry` card is gone from the document page.
- The bottom-left guided overlay should surface automatically when the current page has a guided next step.
- The FAB is the canonical analysis/chat surface and should not expose a `Guided actions` tab on the validation-ready proof lane.
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
7. Confirm the inline review shows a searchable `Sprint owner` picker and that `Assign owner in Ship` stays disabled until you choose someone.
8. Choose a person other than the signed-in demo user.
9. Confirm the review explains that FleetGraph will assign the selected person as sprint owner.
10. Confirm `Cancel` and `Assign owner in Ship` are both visible.
11. Apply the action.
12. Confirm the page refreshes and the `Owner` field now shows the person you selected.
13. Confirm the owner-gap finding disappears instead of resurfacing immediately.
14. Confirm lifecycle controls such as `Dismiss` and `Snooze 4h` were available before apply.
15. Failure signal: the owner-gap page has no finding, the picker is missing, the chosen owner is ignored, the page never shows the selected owner, or the same finding remains after apply.

## Expected Unassigned-Issues Flow When The Public Demo Feed Is Fresh

1. Open `FleetGraph Demo Week - Unassigned Issues`.
2. Confirm the proactive panel shows `3 unassigned issues in FleetGraph Demo Week - Unassigned Issues`.
3. Confirm the summary explains that the sprint still needs an ownership decision for those issues.
4. Confirm the evidence includes the unassigned count and the sprint timing/context.
5. Confirm the suggested next step is `Assign sprint issues`.
6. Click `Review and apply`.
7. Confirm the inline review shows a searchable `Issue assignee` picker and that `Assign issues in Ship` stays disabled until you choose someone.
8. Choose a person other than the already-assigned sprint owner.
9. Confirm the review explains that FleetGraph will assign the currently unassigned sprint issues to the selected person.
10. Apply the action.
11. Confirm the page refreshes and the formerly unassigned sprint issues now show the selected assignee.
12. Confirm the unassigned-issues finding disappears instead of resurfacing immediately.
13. Confirm lifecycle controls such as `Dismiss` and `Snooze 4h` were available before apply.
14. Failure signal: the page has no unassigned-issues finding, the assignee picker is missing, the selected assignee is ignored, or the same finding remains after apply.

If that titled finding is not present on Railway, do not treat this checklist as
failed. Instead, record the known blocker from
`docs/evidence/fleetgraph-mvp-evidence.md`: the lane is seeded in repo but
blocked on the current public Railway findings feed.

## Expected Analysis FAB Flow

1. On `FleetGraph Demo Week - Validation Ready`, open the `Review` tab.
2. Confirm the floating FleetGraph FAB is available as a separate analysis surface.
3. Open the FAB.
4. Confirm the FAB begins the page analysis for the current review page.
5. Confirm the analysis explains what matters on the current page in user terms instead of generic placeholder copy.
6. Confirm the FAB shows a follow-up composer with `Ask a follow-up...`.
7. Ask `What else should I look at?`
8. Confirm the answer continues on the same FAB thread instead of resetting to a generic first response.
9. Confirm diagnostics remain secondary under `Open FleetGraph debug`.
10. Failure signal: the FAB does not open, no analysis appears there, or the second answer repeats the first without advancing.

## Expected Guided-Overlay Preview Flow

1. On `FleetGraph Demo Week - Validation Ready`, open the `Review` tab.
2. Confirm the embedded `FleetGraph entry` card is absent.
3. Confirm a bottom-left guided overlay appears automatically.
4. Confirm the overlay shows `FleetGraph paused for your confirmation.`
5. Confirm the overlay shows `Current guidance` and `Review step`.
6. Confirm the guided step is `Validate week plan`.
7. Confirm the preview explains that the validation result is visible on this page and includes evidence about `Plan Validation` showing `Validated`.
8. Confirm the visible options focus on user choice first, while diagnostics remain secondary under `Open FleetGraph debug`.
9. Confirm the debug dock surfaces the entry thread and its latest checkpoint summary.

## Expected Guided-Overlay Apply Flow

1. On `FleetGraph Demo Week - Validation Ready`, open the `Review` tab and wait for the guided overlay to surface automatically.
2. Click `Apply`.
3. Confirm the guided overlay shows a `Latest result` panel after the action finishes.
4. Confirm the result headline is `Week plan validated.`
5. Confirm the result detail explains the visible effect in Ship and points back to the page state: `Week plan marked as validated in Ship. Look for Plan Validation showing Validated on this page.`
6. Confirm the page data refreshes after apply instead of leaving the stale preview in place.
7. Confirm the `Plan Validation` control now shows `Validated` on the review page.
8. Switch to another tab and back to `Review`, or refresh the page, and confirm FleetGraph does not surface the same validation step a second time.
9. Failure signal: the guided overlay shows no result, the review page stays stale after the action completes, or the same validation prompt reappears immediately.

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
- In repo/bootstrap contract, it should reset `FleetGraph Demo Week - One Story`
  back to `planning`, recreate its week-start-drift finding, and reset its
  linked review so `Plan Validation` is unset again.
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
- In live app/runtime contract, API startup should also re-register active
  workspace sweep schedules, and watched Ship write routes should be able to
  enqueue fresh worker jobs for the same workspace without rerunning demo
  setup.
- In repo/bootstrap contract, it should reset `FleetGraph Demo Week - Validation
  Ready` back to an `active` week with a linked weekly review whose `Plan
  Validation` state is unset.
- Current public Railway note: the March 22 audit showed the unassigned-issues
  lane still missing from the live findings feed, so do not assume the public
  deployment has replayed every seeded proof lane yet.
