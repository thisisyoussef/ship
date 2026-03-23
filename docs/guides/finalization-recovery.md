# Finalization Recovery

Use this guide when branch finalization, deployment, or the harness audit fails late in the story.

## When To Use

- `bash scripts/git_finalize_guard.sh` fails
- `bash scripts/git_finalize_guard.sh` fails because another branch holds the merge lock
- `bash scripts/check_ai_wiring.sh` fails for a harness change
- branch is ahead/behind in an unexpected way
- merge or push fails after the user approved finalization

## Recovery Steps

1. Stop and record the exact failing command and message.
2. Confirm the working tree state with `git status -sb`.
3. If another branch holds the merge lock, wait for release, refresh from latest `master`, rerun validation, claim the merge lock for the current branch, and then retry. See `docs/guides/merge-coordination.md`.
4. If the harness audit failed, fix the wiring/docs first and rerun `bash scripts/check_ai_wiring.sh`.
5. If git state failed, re-sync the branch with its upstream before trying again.
6. If a stale merge lock remains after an interrupted finalization, release it if your branch still owns it or coordinate before using `bash scripts/merge_lock.sh reset --confirm`.
7. If deployment failed, record `blocked` or `failed` in the story handoff instead of implying success.
8. Return to the story with the updated evidence and re-ask for finalization only after the failure path is understood.
