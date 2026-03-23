# Merge Coordination

Use this guide when parallel story branches may try to finalize against the same Ship repo clone at roughly the same time.

## Single Source Of Truth

- The live merge state for this clone is the shared file at `$(git rev-parse --git-common-dir)/ship-merge-lock.json`.
- Run `bash scripts/merge_lock.sh status` to inspect it. The command prints the exact file path plus the active branch, owner, story, worktree, and wait instructions.
- If you need the raw file path, run `bash scripts/merge_lock.sh path`.
- This state is shared across worktrees for the same clone because it lives in the git common dir. It does not coordinate across separate clones or machines.

## Normal Flow

1. Before finalization, inspect the merge lock:

```bash
bash scripts/merge_lock.sh status
```

2. If another branch already holds the merge lock, stop and wait. Do not continue PR or merge finalization from your branch yet.
3. After the other branch releases the lock, refresh from latest `master`, rerun your story validation, and confirm the branch is still ready to merge.
4. Claim the merge lock for your branch with clear wait instructions for other agents:

```bash
bash scripts/merge_lock.sh claim \
  --owner Codex \
  --story US-910 \
  --instructions "Wait until this merge lock is released, then refresh from latest master, rerun validation, and only then finalize."
```

5. Run the normal finalization checks. `bash scripts/git_finalize_guard.sh` now requires the current branch to hold the merge lock.
6. When finalization finishes or becomes blocked, release the merge lock:

```bash
bash scripts/merge_lock.sh release --status completed --summary "Merged to master"
```

Use `--status blocked` or `--status cancelled` when the merge does not complete.

## Waiting Branches

- Treat the active merge lock as the current merge slot owner.
- Follow the recorded wait instructions exactly.
- After the lock is released, refresh from latest `master`, rerun your story validation, and only then claim the lock for your own branch.

## Recovery

- If `bash scripts/git_finalize_guard.sh` says another branch holds the merge lock, wait for release and follow the lock instructions before retrying.
- If your branch holds a stale lock after an interrupted finalization, release it if the branch still owns the lock:

```bash
bash scripts/merge_lock.sh release --status blocked --summary "Interrupted finalization"
```

- Only use `bash scripts/merge_lock.sh reset --confirm` when the lock state is clearly stale and the team agrees nobody is actively finalizing.
- For broader finalization failures, use [docs/guides/finalization-recovery.md](/Users/youss/Development/gauntlet/ship/docs/guides/finalization-recovery.md).
