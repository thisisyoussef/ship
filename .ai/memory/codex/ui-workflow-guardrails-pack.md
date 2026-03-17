# UI Workflow Guardrails Pack

## Date
- 2026-03-17

## Intent
- Turn the FleetGraph MVP QA findings into durable harness guardrails for future visible UI stories.

## Key Decisions
- Add a lightweight `ui-qa-critic` workflow instead of a heavyweight separate QA phase.
- Make human-centered copy, truthful action feedback, and debug-detail containment explicit review criteria.
- Require a pack-level `user-audit-checklist.md` artifact when a visible story pack completes.
- Use the FleetGraph MVP pack as the first concrete checklist artifact.

## Expected Follow-On
- The FleetGraph feedback implementation pack should handle the current product issues.
- This harness branch should make future visible stories less likely to repeat the same problems.
