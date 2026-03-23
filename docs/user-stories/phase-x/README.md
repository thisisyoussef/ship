# Phase X Harness and Workflow Evolution

This folder holds stories that change the execution harness itself.

## Story Sequence

| ID | Title | State | Priority | Depends On |
| --- | --- | --- | --- | --- |
| US-901 | AGENTS-first harness reset | `done` | P0 | — |
| US-902 | Seeded verification entry rule | `done` | P1 | `US-901` |
| US-903 | Workflow memory log | `done` | P1 | `US-901` |
| US-904 | Autodeploy and test handoff rule | `done` | P1 | `US-901` |
| US-905 | Post-merge deploy monitoring rule | `done` | P1 | `US-901` |
| US-906 | Story branch lifecycle rule | `done` | P1 | `US-901` |
| US-907 | Skip default browser-verification closeout | `done` | P1 | `US-904` |
| US-908 | Parallel multi-agent branch workflow | `done` | P1 | `US-906` |
| US-909 | Parallel-lane callout and agent prompt | `done` | P1 | `US-908` |
| US-910 | Shared merge coordination lock | `done` | P1 | `US-909` |
| US-913 | Queue-first workflow reset | `done` | P1 | `US-910` |

## Execution Notes

1. Use `docs/user-stories/README.md` as the global status index.
2. Harness changes must run `bash scripts/check_ai_wiring.sh`.
3. Keep recovery guidance in `docs/guides/finalization-recovery.md`.
4. Record detailed harness progress in `CHECKPOINT-LOG.md`.
5. Treat `US-913` as the reset that restores the simpler queue-first workflow after the parallel-agent coordination experiment became too heavyweight.
