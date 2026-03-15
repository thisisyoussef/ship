# Git Finalization Workflow (Mandatory)

**Purpose**: Enforce commit + push completion at the end of each story so handoff cannot proceed with uncommitted or unpushed work.

---

## When To Run

Run this workflow after implementation and validation, before final story handoff:
- feature
- bug fix
- performance
- security
- deployment/ops
- AI-architecture changes

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

## Step 2: Review and Stage Intentional Changes

```bash
git status --short
git diff
git add <intended-files>
```

Never stage unrelated changes accidentally.

---

## Step 3: Commit with Story Context

```bash
git commit -m "<type>(<scope>): <summary>

- Story: <story-id>
- Notes: <key outcome>"
```

Use conventional commit style and include story reference.

---

## Step 4: Push to Upstream

```bash
git push
```

If branch has no upstream yet:

```bash
git push -u origin <branch>
```

---

## Step 5: Run Finalization Guard (Hard Gate)

```bash
bash scripts/git_finalize_guard.sh
```

This must pass before handoff.

---

## Step 6: Include Git Evidence in Handoff

Include in handoff checklist:
- branch name,
- commit SHA,
- push confirmation,
- `git_finalize_guard.sh` result.

---

## Exit Criteria

- Validation gates passed
- Changes committed
- Changes pushed to upstream
- `bash scripts/git_finalize_guard.sh` passed
- Git evidence included in handoff
