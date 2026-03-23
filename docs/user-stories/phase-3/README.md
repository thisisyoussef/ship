# Phase 3 Reliability, Assignment Completion, and Productization

This folder holds FleetGraph assignment-gap stories plus the UX, reliability, deploy-proof, and productization follow-through that surround them.

## Execution Notes

1. Use this phase for work that closes the gap between a working slice and a trustworthy shipped slice.
2. Keep cross-phase status in `docs/user-stories/README.md`.
3. Record detailed phase evidence in `CHECKPOINT-LOG.md`.
4. Treat `US-608`, `US-609`, `US-609.5`, `US-610`, `US-611`, and `US-612` as the current FleetGraph completion sequence.
5. Treat `US-617` as embedded-entry contract hardening for the current-page FleetGraph surface once the workbook lane is complete.
6. Treat `US-618` as the owner-picker follow-through on top of `US-615`, so FleetGraph can choose the actual sprint owner instead of forcing self-assignment.
7. Treat `US-616` as the issue-assignment follow-through once its dependency chain is clear.
8. Treat `US-606`, `US-607`, `US-613`, and `US-614` as sidecar improvements, not replacements for the original assignment-gap stories.
9. Treat `US-619` as a post-tail extension that should wait for `US-616`, `US-618`, and `US-623`, then reuse the finished proactive action bars while complementing the analysis FAB plus guided overlay current-page surfaces.
10. Treat `US-620`, `US-621`, and `US-622` as shipped-surface hardening stories that should land before the remaining P2 UI tail work.
11. Treat `US-623` as the current-page guided-surface refactor that removes the embedded entry card and splits guided next-step help into its own floating overlay ahead of the global queue work.

## Story Sequence

| ID | Title | State | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-606 | FleetGraph chat follow-up reasoning | `done` | P1 | `US-605` |
| US-607 | FleetGraph panel visibility polish | `done` | P1 | `US-606` |
| US-608 | FleetGraph context-aware page analysis completion | `done` | P0 | `US-605` |
| US-609 | FleetGraph shared proactive multi-finding plumbing | `done` | P0 | `US-608` |
| US-609.5 | FleetGraph FAB analysis handoff | `done` | P1 | `US-609` |
| US-610 | FleetGraph sprint-owner gap | `done` | P0 | `US-609.5` |
| US-611 | FleetGraph unassigned sprint issues | `done` | P0 | `US-610` |
| US-612 | FleetGraph assignment evidence refresh | `done` | P0 | `US-611` |
| US-617 | FleetGraph entry nullable-context hardening | `done` | P1 | `US-612` |
| US-615 | FleetGraph assign-owner review/apply follow-through | `done` | P1 | `US-612` |
| US-618 | FleetGraph assign-owner picker follow-through | `done` | P1 | `US-615` |
| US-620 | FleetGraph finding-review thread scoping fix | `done` | P1 | `US-618` |
| US-621 | FleetGraph post-comment fallback preview cleanup | `done` | P1 | `US-601` |
| US-622 | FleetGraph route-trigger enqueue and sweep bootstrap | `done` | P1 | `US-612` |
| US-613 | FleetGraph panel gradient removal | `done` | P2 | `US-612` |
| US-614 | FleetGraph FAB guided-actions panel convergence | `done` | P2 | `US-613` |
| US-616 | FleetGraph assign-issues review/apply follow-through | `done` | P2 | `US-614` |
| US-623 | FleetGraph guided-actions floating overlay | `in-progress` | P2 | `US-614`, `US-617` |
| US-619 | FleetGraph left-sidebar global findings queue | `todo` | P2 | `US-616`, `US-618`, `US-623` |
