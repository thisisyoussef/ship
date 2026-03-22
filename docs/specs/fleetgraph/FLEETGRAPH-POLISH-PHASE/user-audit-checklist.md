# FleetGraph Polish Pack User Audit Checklist

Use this checklist to QA the full post-feedback polish pack from the public Railway demo.

## Demo Access

- URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Scope Covered

This checklist covers the full FleetGraph polish pack:

- calmer proactive card hierarchy
- secondary quick-actions grouping
- entry-card quick-actions grouping
- inline review/apply state
- guided-step preview state
- secondary debug dock
- worker-generated proactive proof

## Audit Steps

1. Open the public demo and sign in.
   Expected:
   - login succeeds with the demo account
   - the document list loads normally
   If this fails:
   - the Railway demo may be down or the demo bootstrap may not be current

2. Open `FleetGraph Demo Week - Review and Apply`.
   Expected:
   - the document is visible from the normal docs list or sidebar
   - the page shows both `FleetGraph proactive` and `FleetGraph entry`
   - the page scrolls naturally instead of trapping the FleetGraph panels above a separate inner scroller
   If this fails:
   - the public proof lane or discoverability path regressed

3. Inspect the proactive card on that page before clicking anything.
   Expected:
   - section labels include `Active finding`, `Why this matters`, `Suggested next step`, and `Quick actions`
   - the main copy stays human-facing
   - `Dismiss` and `Snooze 4h` live inside the secondary `Quick actions` area instead of crowding the main narrative
   If this fails:
   - the T303 hierarchy polish regressed

4. Click `Review and apply`.
   Expected:
   - the inline review state appears
   - headline: `Confirm before starting this week`
   - buttons: `Cancel` and `Start week in Ship`
   - the copy explains the action in user terms
   - the same click that opened review does not also start the week
   If this fails:
   - the review/apply lane regressed or became too technical again

5. Click `Cancel`.
   Expected:
   - the inline review box closes cleanly
   - the finding returns to the standard pre-review state
   If this fails:
   - the review-state transitions regressed

6. Inspect the `FleetGraph entry` card on the same page.
   Expected:
   - it has a labeled `Quick actions` area
   - the main help copy stays lighter than the action controls
   - the debug dock remains secondary at the bottom right
   If this fails:
   - the entry card is still reading like a utility box instead of guided help

7. Open the `Review` tab, then click `Preview next step`.
   Expected:
   - the card shows `FleetGraph paused for your confirmation.`
   - the result area includes `Current guidance`
   - the guided state includes `Review step`
   - the action preview explains that `Plan Validation` will show `Validated`
   - the action choices remain obviously secondary previews, not active controls
   If this fails:
   - the guided-step hierarchy regressed

8. Open `Open FleetGraph debug`.
   Expected:
   - technical details are available there
   - the main proactive and entry cards do not need those diagnostics to make sense
   If this fails:
   - debug disclosure either leaked back into the primary UI or became too hidden for QA

9. Open `FleetGraph Demo Week - Worker Generated`.
   Expected:
   - the worker-generated proactive finding is visible
   - it uses the same calmer hierarchy with `Why this matters`, `Suggested next step`, and `Quick actions`
   If this fails:
   - the worker proof lane or the shared card presentation regressed

10. Optionally test `Snooze 4h` or `Dismiss` on either named week page.
    Expected:
    - the action resolves without generic contradictory failure copy
    - the lifecycle notice appears only after the result is confirmed
    If this fails:
    - lifecycle trust needs another focused follow-on

## Screenshot References

- [fleetgraph-polish-review-page-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-review-page-live.png)
- [fleetgraph-polish-review-inline-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-review-inline-live.png)
- [fleetgraph-polish-approval-preview-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-approval-preview-live.png)
- [fleetgraph-polish-worker-page-live.png](/Users/youss/Development/gauntlet/ship/docs/evidence/screenshots/fleetgraph-polish-worker-page-live.png)

## Tail Follow-On Slot

If you spot any remaining non-blocking polish issues, append them after this pack as follow-on stories. Do not reopen the finished polish stories mid-sequence unless the issue is a true regression or broken core path.
