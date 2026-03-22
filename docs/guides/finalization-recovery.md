# Finalization Recovery

Use this guide when branch finalization, deployment, or the harness audit fails late in the story.

## When To Use

- `bash scripts/git_finalize_guard.sh` fails
- `bash scripts/check_ai_wiring.sh` fails for a harness change
- branch is ahead/behind in an unexpected way
- merge or push fails after the user approved finalization

## Recovery Steps

1. Stop and record the exact failing command and message.
2. Confirm the working tree state with `git status -sb`.
3. If the harness audit failed, fix the wiring/docs first and rerun `bash scripts/check_ai_wiring.sh`.
4. If git state failed, re-sync the branch with its upstream before trying again.
5. If deployment failed, record `blocked` or `failed` in the story handoff instead of implying success.
6. Return to the story with the updated evidence and re-ask for finalization only after the failure path is understood.
