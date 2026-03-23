# US-XXX: Title

## Status

- State: `todo | in-progress | blocked | done`
- Owner:
- Depends on:
- Related branch:
- Active worktree:
- Parallel dependency / merge order:
- Related commit/PR:
- Target environment:

## Persona

**<Role>** wants <goal>.

## User Story

> As <persona>, I want <capability> so that <outcome>.

## Goal

One paragraph describing what this story delivers and why it matters.

## Scope

In scope:

1.
2.
3.

Out of scope:

1.
2.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `<path>` — why it matters
2. `<path>` — why it matters

## Preparation Phase

1. Read the local code and contracts listed above.
2. Check any relevant docs before coding.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1.
2.

Expected contracts/data shapes:

1.
2.

Planned failing tests:

1.
2.
3.

## UX Script

Happy path:

1.
2.
3.

Error path:

1.
2.
3.

## Preconditions

- [ ] Queue-truth preflight was run against `master` using `git worktree list` and `git branch -vv`
- [ ] Fresh story branch is checked out from current `master` before edits begin
- [ ] Any sibling-branch dependency or required merge order is recorded
- [ ] If this story is active in parallel, the queue/Active Work visibility has landed on `master` or is being shipped as a separate docs-only correction now
- [ ] If finalization will run, the shared merge lock claim/release plan is clear
- [ ] Services/accounts exist
- [ ] Secrets/config are present
- [ ] Dependencies are healthy

## TDD Plan

List the tests or validation layers this story will use before implementation.

1.
2.
3.

## Step-by-step Implementation Plan

1.
2.
3.

## Acceptance Criteria

- [ ] AC-1:
- [ ] AC-2:
- [ ] AC-3:

## Local Validation

Run these before handoff:

```bash
# lint/type/test/build commands for this story
```

If sibling branches land first before finalization, rerun this section after syncing to latest `master`.

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. For deploy-relevant stories on auto-deployed surfaces, record how the live deployed surface will be checked and what counts as success or failure.
4. Record the runtime proof path if blocked or not deployed.
5. If finalization will run, claim the shared merge lock before merge and release it afterward or record the exact blocker.

## How To Verify

- Prefer the lightest reliable proof path first: local tests, seeded proof lanes, authenticated runtime or API checks, and deployment observation.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane:
- Route or URL:
- Interaction:
- Expected result:
- Failure signal:

## User Checkpoint Test

1.
2.
3.

## What To Test

- Route or URL:
- Interaction:
- Expected visible result:
- Failure signal:

## Checkpoint Result

- Outcome:
- Evidence:
- Residual risk:
