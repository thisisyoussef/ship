# Harness Lifecycle Simplification

## What Changed
- Added a post-lookup story-sizing gate.
- Added a trivial fast-track lane for one-file, non-API, non-AI stories.
- Replaced the older flight-board workflow with one single writer lock.
- Wired `check_ai_wiring.sh` into pre-commit and the finalization guard for AI-architecture diffs.
- Added a persisted correction-triage counter with a re-scope circuit breaker.
- Turned story handoff into the combined completion gate and added a finalization recovery workflow.

## Reuse Notes
- Keep the sizing classifier strict. If any condition fails, use the standard lane.
- Keep `scripts/flight_slot.sh` as the stable CLI even if the underlying state model changes again later.
- Treat the combined completion gate as the only user-facing approval step; do not reintroduce a second human-touching git checklist.
- Route all finalization failures back through `.ai/workflows/finalization-recovery.md` instead of improvising cleanup.
