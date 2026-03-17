# FleetGraph MVP User Audit Checklist

Use this checklist to QA the full shipped FleetGraph MVP from the public demo.

## Demo Access

- URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Scope Covered

This checklist covers the full FleetGraph MVP slice:

- deployed public access
- visible proactive findings
- worker-generated proactive proof
- human-in-the-loop approval preview
- human-in-the-loop review/apply path
- dismiss and snooze interaction behavior
- shared trace evidence linkage

## Audit Steps

1. Open the public demo and sign in.
   Expected:
   - the Ship app loads successfully
   - login succeeds with the demo account
   If this fails:
   - the public demo may be down or the demo seed/bootstrap may not be current

2. Open `Documents` and search for `FleetGraph Demo Week - Review and Apply`.
   Expected:
   - the document exists
   - opening it shows `FleetGraph proactive` near the top of the page
   If this fails:
   - the named demo proof lane may not have been bootstrapped correctly

3. Inspect the seeded review/apply lane on that page.
   Expected:
   - finding title: `Week start drift: FleetGraph Demo Week - Review and Apply`
   - `Review and apply`, `Dismiss`, and `Snooze 4h` are visible
   - `FleetGraph entry` is visible below the proactive panel
   - the main panel speaks in human-facing language rather than endpoint or thread jargon
   If this fails:
   - the seeded HITL proof lane may have regressed, or the UI may still be surfacing overly technical copy

4. Click `Review and apply`.
   Expected:
   - an inline review state appears
   - `Apply start week` and `Cancel` are visible
   - the copy explains the outcome in user terms, not transport or route terms
   If this fails:
   - the human-in-the-loop UI state or copy quality regressed

5. Click `Cancel`.
   Expected:
   - the inline review state closes
   - the finding returns to the pre-apply visible state
   If this fails:
   - the review-state transitions regressed

6. Reload the page if needed, then click `Snooze 4h`.
   Expected:
   - the interaction resolves without generic failure text
   - the UI reflects a confirmed snooze outcome instead of contradictory success/failure copy
   If this fails:
   - the visible mutation feedback is not trustworthy yet and should stay on the follow-on pack

7. Reload the page if needed, then click `Dismiss`.
   Expected:
   - the interaction resolves without generic failure text
   - the UI reflects a confirmed dismiss outcome instead of contradictory success/failure copy
   If this fails:
   - the visible mutation feedback is not trustworthy yet and should stay on the follow-on pack

8. Click `Preview approval gate` in the `FleetGraph entry` card.
   Expected:
   - the entry card shows `FleetGraph paused for human approval.`
   - approval-option chips are visible
   - technical diagnostics are secondary, not the dominant content
   If this fails:
   - the entry route, context normalization, or user-facing copy hierarchy likely regressed

9. Return to `Documents` and search for `FleetGraph Demo Week - Worker Generated`.
   Expected:
   - the document exists
   - opening it shows `FleetGraph proactive`
   If this fails:
   - the worker proof lane may not be bootstrapped or regenerated correctly

10. Inspect the worker-generated lane on that page.
    Expected:
    - finding title: `Week start drift: FleetGraph Demo Week - Worker Generated`
    - this proves a deployed worker-generated proactive finding exists on real Ship REST data
    - `Open trace evidence` is visible when the current finding includes a shared trace link
    If this fails:
    - the worker lane, trace sharing, or findings surface likely regressed

11. Open the shared trace links from the evidence bundle:
    - worker proactive trace
    - approval-preview trace
    Expected:
    - one trace represents the proactive scheduled-sweep path
    - one trace represents the on-demand approval-preview path
    If this fails:
    - the evidence bundle may be stale or trace sharing may have regressed

## Suggested QA Notes To Capture

- Anything confusing or overly technical in the review/apply wording
- Whether dismiss/snooze feedback feels truthful and consistent
- Whether any debug detail feels too exposed in the primary UI
- Layout, hierarchy, bulleting, or visual clarity issues in the FleetGraph surfaces
- Any friction or ambiguity between the proactive panel and the entry card

## Next Step

After you finish this checklist, convert any non-blocking findings into the active FleetGraph feedback implementation pack.
