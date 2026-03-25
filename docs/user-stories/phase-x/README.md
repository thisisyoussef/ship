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
| US-913 | Queue-first workflow reset | `done` | P1 | `US-907` |
| US-914 | Prune superseded harness history | `done` | P1 | `US-913` |
| US-915 | Organized `.ai` compatibility workspace | `done` | P1 | `US-914` |
| US-916 | Agent design workflow | `in-progress` | P1 | `US-915` |

## Execution Notes

1. Use `docs/user-stories/README.md` as the global status index.
2. Harness changes must run `bash scripts/check_ai_wiring.sh`.
3. Keep recovery guidance in `docs/guides/finalization-recovery.md`.
4. Record detailed harness progress in `CHECKPOINT-LOG.md`.
5. Treat `US-913` and `US-914` as the cleanup stories that keep the checked-in harness queue-first and focused on current guidance.
6. Treat `US-915` as the compatibility-layer story that keeps `.ai/` organized without replacing the docs-first control plane.
7. Treat `US-916` as the design-harness story that routes inspiration, canvas, and implementation phases through one checked-in workflow.
