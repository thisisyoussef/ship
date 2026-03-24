# Parallel Flight

Use this workflow when shared harness work needs a lightweight coordination lock.

## Canonical Sources

- `scripts/flight_slot.sh`
- `.ai/state/flight-lock.json`
- `.ai/state/flight-board.json`

## Rules

- `scripts/flight_slot.sh` is the visible CLI for claim, release, status, and init.
- `.ai/state/flight-lock.json` is the current single-lock source of truth.
- `.ai/state/flight-board.json` exists as a legacy compatibility file and may be migrated forward automatically.
- Parallel mode is retired; the lock is intentionally single-flight until real contention returns.

## Typical Commands

```bash
scripts/flight_slot.sh init
scripts/flight_slot.sh status
scripts/flight_slot.sh claim --flight-id <id> --slot <slot> --owner <owner> --paths <paths> --story <story>
scripts/flight_slot.sh release --flight-id <id> --status completed --summary "<summary>"
```
