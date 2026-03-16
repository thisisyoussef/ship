# Git Finalization Workflow (Mandatory)

**Purpose**: Enforce commit + push completion, remote sync, PR management, merge readiness, and branch cleanup at the end of each story.

---

## When To Run

Run this workflow after implementation and validation, before final story handoff:
- feature
- bug fix
- performance
- security
- deployment/ops
- AI-architecture changes

Important:
- Do not run commit, push, PR creation/update, merge, or branch cleanup until the user has completed the story audit and explicitly approved finalization.
- Once the user does approve, prefer to automate the full flow instead of leaving branch/PR state half-finished.

---

## Step 1: Confirm Validation Gates

Run the project-specific validation commands defined during setup first:

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm --filter @ship/api test -- --coverage
pnpm audit --prod
```

If any command fails, stop and fix before committing.

---

## Step 2: Sync With Remotes First

```bash
git fetch --all --prune
git status -sb
git branch -vv
```

Confirm:
- the current branch is not detached,
- the current branch has the expected upstream,
- the tracking branch is not behind,
- the branch base is current enough to open or update a PR cleanly.

If the branch is behind its upstream, sync it first:

```bash
git pull --ff-only
```

If the branch needs the latest base branch before PR or merge:
- prefer merging the base branch into the feature branch once it is already shared remotely,
- avoid force-push flows unless the user explicitly asks for them.

---

## Step 3: Review and Stage Intentional Changes

```bash
git status --short
git diff
git add <intended-files>
```

Never stage unrelated changes accidentally.

---

## Step 4: Commit with Story Context

```bash
git commit -m "<type>(<scope>): <summary>

- Story: <story-id>
- Notes: <key outcome>"
```

Use conventional commit style and include story reference.

---

## Step 5: Push to Upstream

```bash
git push
```

If branch has no upstream yet:

```bash
git push -u origin <branch>
```

---

## Step 6: Open or Update the PR

Check PR status:

```bash
gh pr status
```

If no PR exists for the current branch:

```bash
gh pr create --fill
```

If a PR already exists:
- update the title/body if needed,
- confirm the PR points at the correct base branch,
- ensure the verification notes reflect the final validation state.

Capture:
- PR URL,
- PR state,
- base branch,
- whether checks are pending/passing/failing.

---

## Step 7: Run Finalization Guard (Hard Gate)

```bash
bash scripts/git_finalize_guard.sh
```

This must pass before handoff.

---

## Step 8: Merge Only After Approval and Passing Checks

After the user approves finalization and required checks pass, complete the merge flow:

```bash
gh pr merge --squash --delete-branch
```

If auto-merge is the better fit because checks are still running but approvals are complete:

```bash
gh pr merge --auto --squash --delete-branch
```

After merge, update local refs:

```bash
git fetch --all --prune
git checkout master
git pull --ff-only origin master
git branch -d <story-branch>
```

If the local branch is still needed temporarily, record why instead of deleting it silently.

---

## Step 9: Include Git Evidence in Handoff

Include in handoff checklist:
- branch name,
- commit SHA,
- push confirmation,
- remote sync status,
- PR URL/status,
- merge status or reason it has not happened yet,
- branch cleanup status,
- `git_finalize_guard.sh` result.

---

## Exit Criteria

- Validation gates passed
- Changes committed
- Changes pushed to upstream
- Remote refs fetched and branch sync state checked
- PR created or updated
- `bash scripts/git_finalize_guard.sh` passed
- Merge completed or explicitly waiting on user approval / checks
- Branch cleanup completed or explicitly deferred
- Git evidence included in handoff
