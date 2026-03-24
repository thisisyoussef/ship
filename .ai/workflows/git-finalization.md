# Git Finalization

Use this workflow for the default end-of-story GitHub flow.

## Canonical Sources

- `AGENTS.md`
- `scripts/git_finalize_guard.sh`
- `docs/guides/finalization-recovery.md`

## Default Flow

1. commit the scoped story work
2. push the branch
3. open a PR
4. merge to `master`
5. sync local `master`
6. delete the story branch

## Guardrails

- run `scripts/git_finalize_guard.sh` before finalizing
- if the guard fails, use `docs/guides/finalization-recovery.md`
- record the exact blocker instead of leaving the branch in a vague partial state
