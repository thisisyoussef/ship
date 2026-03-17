# FleetGraph UI-First Handoffs

## Summary
- Branch: `codex/fleetgraph-ui-first-handoffs`
- Goal: make future FleetGraph MVP stories visually inspectable earlier and require UI inspection in completion gates.

## What Changed
- Updated the combined completion gate to require UI inspection steps for visible behavior stories.
- Updated the feature workflow to establish an inspectable UI surface early instead of leaving visible proof until the end.
- Updated the FleetGraph MVP pack so the visible Ship surface is treated as an ongoing proof lane, not a one-off artifact from `T103`.

## Why
- The public demo should let the user monitor real FleetGraph behavior as stories land.
- Future audits should test what is visible in Ship, not only read diffs or terminal output.

## Next
- Finalize this workflow adjustment.
- Start `T104` with the visible document-page proof lane as the first extension point.
