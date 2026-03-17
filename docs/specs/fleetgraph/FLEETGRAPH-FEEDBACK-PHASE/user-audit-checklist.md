# FleetGraph Feedback Pack User Audit Checklist

Use this checklist to QA the full FleetGraph feedback pack from the public Railway demo.

## Demo Access

- URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Scope Covered

This checklist covers the full shipped FleetGraph feedback pack:

- discoverability from normal `Documents` navigation
- comfortable page scrolling on the named demo weeks
- calmer, more human FleetGraph copy
- secondary debug disclosure instead of primary technical detail
- trustworthy review/apply and approval-preview flows
- capture of non-blocking follow-on polish work

## Audit Steps

1. Open the public demo and sign in.
   Expected:
   - login succeeds with the demo account
   - the Ship shell loads normally
   If this fails:
   - the public Railway demo may be down or the demo seed may be stale

2. Go to `Documents` and search for `FleetGraph Demo Week - Review and Apply`.
   Expected:
   - the review/apply week is reachable from normal Ship navigation
   - you do not need a popup shortcut or direct URL
   If this fails:
   - `T201` discoverability has regressed

3. Open `FleetGraph Demo Week - Review and Apply` and scroll the page.
   Expected:
   - the page scrolls normally
   - the FleetGraph panels do not trap the document view
   If this fails:
   - `T202` scroll recovery has regressed

4. Inspect the proactive panel on that page.
   Expected:
   - finding title: `Week start drift: FleetGraph Demo Week - Review and Apply`
   - `Review and apply` is visible
   - `Dismiss` and `Snooze 4h` are visible
   - the copy is primarily user-facing rather than endpoint/thread jargon
   - `Debug details` exists, but diagnostics are secondary
   If this fails:
   - `T203` copy or disclosure hierarchy has regressed

5. Click `Review and apply`.
   Expected:
   - the inline state headline reads `Review before starting this week`
   - `Start week in Ship` and `Cancel` are visible
   - the inline explanation describes the outcome in human terms
   If this fails:
   - the main HITL review flow still needs copy cleanup

6. Click `Cancel`.
   Expected:
   - the inline review state closes cleanly
   - the card returns to the pre-review view
   If this fails:
   - the review-state transition regressed

7. In the `FleetGraph entry` card, click `Preview approval step`.
   Expected:
   - the card shows `FleetGraph paused for human approval.`
   - approval options remain visible
   - any diagnostic details stay behind `Debug details`
   If this fails:
   - the entry-card hierarchy still feels too technical

8. Return to `Documents` and search for `FleetGraph Demo Week - Worker Generated`.
   Expected:
   - the worker-generated week is reachable from standard docs navigation
   - opening it shows `FleetGraph proactive`
   If this fails:
   - discoverability or worker proof-lane bootstrapping has regressed

9. Open `FleetGraph Demo Week - Worker Generated` and inspect the page.
   Expected:
   - finding title: `Week start drift: FleetGraph Demo Week - Worker Generated`
   - `Review and apply`, `Dismiss`, `Snooze 4h`, and `Debug details` are visible
   - the layout remains scrollable and readable
   If this fails:
   - the worker lane or the visible page-shell fixes regressed

10. Optional live mutation trust check:
    - click `Snooze 4h` or `Dismiss` only if you are okay mutating the seeded demo state for this audit cycle
    Expected:
    - the action should not produce generic failure copy such as `Failed to snooze` or `Failed to dismiss FleetGraph finding`
    - user-facing status should reflect the actual confirmed outcome
    If this fails:
    - capture it as a follow-on product fix instead of treating it like a docs issue

## Tail Follow-On Suggestions

If the visible behavior above is good enough to ship but still feels rough, capture follow-ons in this order:

1. Make dismiss/snooze mutation feedback fully trustworthy on the live demo, including any remaining prod-only failures.
2. Further humanize approval-preview and worker-summary copy that still reads too technical or awkward.
3. Add modest visual polish and consider a demo-only persistent debug overlay if it improves QA without polluting the main experience.
