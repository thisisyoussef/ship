# Phase X Harness and Workflow Evolution

This folder holds stories that change the execution harness itself.

## Story Sequence

| ID | Title | State | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-901 | AGENTS-first harness reset | `done` | P0 | — |
| US-902 | Seeded verification entry rule | `done` | P1 | `US-901` |
| US-903 | Workflow memory log | `done` | P1 | `US-901` |

## Execution Notes

1. Use `docs/user-stories/README.md` as the global status index.
2. Harness changes must run `bash scripts/check_ai_wiring.sh`.
3. Keep recovery guidance in `docs/guides/finalization-recovery.md`.
4. Record detailed harness progress in `CHECKPOINT-LOG.md`.
