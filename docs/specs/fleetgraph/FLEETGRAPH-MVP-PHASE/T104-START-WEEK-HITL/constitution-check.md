# Constitution Check

## Metadata
- Story ID: T104
- Story Title: Execute the real week-start action through a human-in-the-loop FleetGraph gate
- Author: Codex
- Date: 2026-03-17

## Boundary Check
- [x] Stays on the Ship REST boundary for Ship product data and write execution.
- [x] Uses FleetGraph-owned persistence only for approval/execution state, not Ship product reads.
- [x] Extends the visible Ship-facing FleetGraph surface before or alongside backend execution work.
- [x] Preserves the same-origin embedded FleetGraph contract instead of adding a standalone page.
- [x] Keeps consequential action execution behind explicit human confirmation.

## Quality Check
- [x] Story remains narrow: one real `start_week` action path only.
- [x] Duplicate execution protection is part of the initial design, not a cleanup item.
- [x] Tests can cover approve, reject, duplicate, and already-started paths.

## Deployment Check
- [x] Story changes deployed API and web behavior.
- [x] Completion gate must include UI inspection on the sanctioned public demo after merge.
- [x] Render refresh is required after merge unless blocked.

## Risks Requiring Attention
- Forwarding auth and CSRF correctly through the same-origin FleetGraph apply route.
- Preventing double-apply from repeated clicks or retries.
- Handling the case where the week was started outside FleetGraph before approval executes.
