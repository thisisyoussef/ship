# FleetGraph Demo Inspection Guide

Use this guide when verifying FleetGraph behavior on the sanctioned public demo.

## Demo Account

- Public demo URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Named Inspection Targets

- Project title: `FleetGraph Demo Project`
- Seeded HITL week title: `FleetGraph Demo Week - Review and Apply`
- Seeded HITL finding title: `Week start drift: FleetGraph Demo Week - Review and Apply`
- Worker-generated week title: `FleetGraph Demo Week - Worker Generated`
- Worker-generated finding title: `Week start drift: FleetGraph Demo Week - Worker Generated`

## UI Inspection Flow

1. Open the public demo URL.
2. Sign in with the demo account.
3. Go to `Documents`.
4. Open `FleetGraph Demo Week - Review and Apply` from the document list or sidebar.
5. Click the `FleetGraph Intelligence` button in the lower-right corner to open the FleetGraph FAB.
6. Confirm the FAB opens with `Findings` and `Analyze` tabs.
7. On the default `Findings` tab, inspect the seeded HITL finding.
8. Click `Review and apply`, then inspect the inline confirmation state.
9. Pause for a beat and confirm nothing in Ship has changed yet.
10. Click `Cancel`.
11. Switch to the `Analyze` tab and confirm FleetGraph loads an on-demand analysis for the current document.
12. Return to `Documents`.
13. Open `FleetGraph Demo Week - Worker Generated`.
14. Open the FleetGraph FAB again and inspect the worker-generated finding in the `Findings` tab.

## Expected FleetGraph Surface

- FleetGraph is accessed through the floating `FleetGraph Intelligence` FAB, not through page-embedded proactive or entry panels.
- Opening the FAB shows:
  - a `Findings` tab for proactive findings tied to the current document context
  - an `Analyze` tab for on-demand document analysis
- On `FleetGraph Demo Week - Review and Apply`, the `Findings` tab shows the seeded HITL finding title `Week start drift: FleetGraph Demo Week - Review and Apply`.
- The finding card exposes:
  - the finding summary
  - a `Why this matters` evidence section
  - `Review and apply` when a real Ship action is available
  - `Dismiss`, `Snooze 10s`, and `Snooze 4h`
- On `FleetGraph Demo Week - Worker Generated`, the `Findings` tab shows the worker-generated finding title created by the live Railway worker.
- The `Analyze` tab auto-runs document analysis and shows conversational output plus follow-up input.

## Expected Review-And-Apply Flow

1. Open the FleetGraph FAB on `FleetGraph Demo Week - Review and Apply`.
2. Stay on the `Findings` tab and click `Review and apply`.
3. Confirm the inline review box headline is `Confirm before applying` or equivalent confirmation copy.
4. Confirm `Cancel` and the confirm action are both visible.
5. Confirm the same click that opened review did not already start the week.
6. Apply only when you want to test the real HITL path.

## Expected Analyze Flow

1. Open the FleetGraph FAB on either named demo week.
2. Switch to the `Analyze` tab.
3. Confirm FleetGraph runs an initial analysis for the current document.
4. Confirm the tab shows conversational output and a follow-up input with `Ask a follow-up...`.
5. If the analysis surfaces an actionable finding, confirm `Review and apply` opens a distinct confirmation step before any Ship mutation happens.

## Reset Behavior

- Re-running the public demo bootstrap resets the named week back to `planning`.
- Re-running the public demo bootstrap clears prior FleetGraph action-run state so the review/apply path is visible again for the next audit.
- Re-running the public demo bootstrap also clears the worker-generated lane and enqueues one fresh proactive worker job so the deployed worker can re-create that finding on the next refresh.
