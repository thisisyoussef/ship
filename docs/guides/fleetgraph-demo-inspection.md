# FleetGraph Demo Inspection Guide

Use this guide when verifying FleetGraph behavior on the sanctioned public demo.

## Demo Account

- Public demo URL: `https://ship-demo-production.up.railway.app`
- Email: `dev@ship.local`
- Password: `admin123`

## Named Inspection Targets

- Project title: `FleetGraph Demo Project`
- Week title: `FleetGraph Demo Week - Review and Apply`
- Expected proactive finding title: `Week start drift: FleetGraph Demo Week - Review and Apply`

## UI Inspection Flow

1. Open the public demo URL.
2. Sign in with the demo account.
3. Go to `Documents`.
4. Search for `FleetGraph Demo Week - Review and Apply`.
5. Open that week document.

## Expected FleetGraph Surface

- The `FleetGraph proactive` panel is visible near the top of the document page.
- The panel shows the expected finding title.
- The panel shows the `Review and apply` button.
- The panel also keeps `Dismiss` and `Snooze 4h` available for lifecycle checks.

## Expected Review-And-Apply Flow

1. Click `Review and apply`.
2. Confirm that the inline review box explains this will call the existing Ship REST week-start route.
3. Confirm `Apply start week` and `Cancel` are both visible.
4. Apply only when you want to test the real HITL path.

## Reset Behavior

- Re-running the public demo bootstrap resets the named week back to `planning`.
- Re-running the public demo bootstrap clears prior FleetGraph action-run state so the review/apply path is visible again for the next audit.
