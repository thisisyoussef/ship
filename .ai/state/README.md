# AI State Directory

This directory holds persisted machine-readable state for the harness helpers.

## Files

- `.ai/state/correction-triage.json`: repeated-correction counters used by `scripts/triage_counter.sh`
- `.ai/state/flight-lock.json`: single-flight coordination lock used by `scripts/flight_slot.sh`
- `.ai/state/flight-board.json`: legacy flight-board compatibility state
- `.ai/state/tdd-handoff/README.md`: file-only TDD handoff contract and per-story directory layout

## Rules

- Keep these files machine-friendly and deterministic.
- Update the matching workflow doc when a state contract changes.
- Run `bash scripts/check_ai_wiring.sh` after changing state-related harness contracts.
