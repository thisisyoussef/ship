# FleetGraph Round-Two User Audit Checklist

Use this checklist for the next live UI inspection after the second FleetGraph feedback round ships.

## Demo Access

- URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Main Goals

- confirm the named FleetGraph week pages scroll as one page again
- confirm `Review and apply` no longer feels like an accidental auto-confirm
- confirm the suggested-action card reads cleanly without duplicated labels
- confirm the inline review state feels readable and deliberate

## Audit Steps

1. Open the public demo and sign in.
   Expected:
   - login succeeds
   - the document list loads normally

2. Open `FleetGraph Demo Week - Review and Apply`.
   Expected:
   - the week is reachable from the normal document list or sidebar
   - the page shows both `FleetGraph proactive` and `FleetGraph entry`

3. Scroll the page from the FleetGraph panels into the week content and back up again.
   Expected:
   - the page scrolls naturally with mouse wheel or trackpad
   - the FleetGraph panels are part of the same page flow
   - the page does not feel trapped above a separate inner scroller

4. Inspect the proactive card before clicking anything.
   Expected:
   - section labels include `Active finding`, `Why this matters`, `Suggested next step`, and `Quick actions`
   - `Suggested next step` appears once as the section label, not again as a repeated badge
   - the copy stays human-facing

5. Click `Review and apply`.
   Expected:
   - the inline review state appears
   - headline: `Confirm before starting this week`
   - supporting copy explains the effect in simple human terms
   - the same click that opened review does not also start the week

6. Inspect the inline review action row.
   Expected:
   - `Cancel` appears before `Start week in Ship`
   - the confirm action feels clearly separate from the initial review action

7. Click `Cancel`.
   Expected:
   - the inline review state closes cleanly
   - the card returns to the normal pre-review state

8. Click `Preview approval step` in the entry card.
   Expected:
   - the card shows `FleetGraph paused for human approval.`
   - the result area stays user-facing, with diagnostics still secondary

9. Open `FleetGraph Demo Week - Worker Generated`.
   Expected:
   - the worker-generated finding is still visible
   - it uses the same cleaned-up card presentation

10. Optional: test `Dismiss` or `Snooze 4h`.
    Expected:
    - the action resolves cleanly
    - the UI does not show contradictory or obviously broken failure copy

## Notes Slot

Capture anything that still feels off, even if it is small. The next feedback pass should stay bounded and user-facing.
