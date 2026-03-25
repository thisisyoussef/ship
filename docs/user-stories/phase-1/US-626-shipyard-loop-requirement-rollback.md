# US-626: Shipyard Loop Requirement Rollback

## Status

- State: `done`
- Owner: Codex
- Depends on: —
- Related branch: `codex/us-626-revert-shipyard-loop`
- Related commit/PR: `8aa65b4` / [PR #208](https://github.com/thisisyoussef/ship/pull/208)
- Target environment: `not deployed`

## Persona

**Repo maintainer / implementation engineer** wants the Shipyard docs surface to stop advertising the interruptible persistent-loop requirement after the request was withdrawn.

## User Story

> As a repo maintainer, I want the merged Shipyard loop requirement removed from the checked-in docs surfaces so the repository no longer presents that requirement as active scope.

## Goal

Reverse PR #207 completely at the source-of-truth docs level. The merged change added a Shipyard assignment pack, generated submission assets, and story/queue registrations centered on an interruptible persistent session loop. This rollback removes that package so the repo no longer treats the loop requirement as current guidance.

## Scope

In scope:

1. Reverse the checked-in Shipyard assignment pack introduced by PR #207.
2. Remove the `US-625` story registration and checkpoint rows that existed only to support that pack.
3. Add a narrow rollback story so the harness still records why the package was removed.
4. Record validation and checkpoint metadata for the rollback.

Out of scope:

1. Replacing the Shipyard pack with an alternative design.
2. Changing FleetGraph, Ship runtime behavior, or deployment plumbing.
3. Reintroducing any portion of the loop requirement under a new name.

## Pre-Implementation Audit

Local sources to read before editing:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `docs/user-stories/phase-1/US-104-current-product-spec-developer-build-queue.md`
8. `docs/user-stories/phase-1/US-625-shipyard-interruptible-persistent-session-loop.md`
9. `git show --stat c1c7f4d`
10. `.claude/CLAUDE.md`

## Preparation Phase

1. Confirm the repo is on a fresh `codex/` branch from current `master`.
2. Inspect the exact merge being reversed so the rollback stays narrow.
3. Identify every docs and story surface introduced by PR #207.
4. Write preparation notes before editing.

### Preparation Notes

Local docs/code reviewed:

1. Repo workflow docs in `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/DEFINITION_OF_DONE.md`, and `.claude/CLAUDE.md`.
2. The existing docs-only story exemplar in `docs/user-stories/phase-1/US-104-current-product-spec-developer-build-queue.md`.
3. The merged Shipyard rollback target in `docs/user-stories/phase-1/US-625-shipyard-interruptible-persistent-session-loop.md` plus merge commit `c1c7f4d`.

Observed rollback target:

1. PR #207 added only docs assets and story registrations; it did not introduce a checked-in Shipyard runtime implementation.
2. The merged surface is isolated to `docs/assignments/shipyard/`, the `US-625` story file, and the queue/checkpoint rows wired to that story.
3. A clean rollback can therefore remove the package entirely and replace it with one narrow story that records why it was removed.

Planned output:

1. No `docs/assignments/shipyard/` directory in the checked-in repo.
2. No `US-625` story registration in the active queue or checkpoint ledgers.
3. A new `US-626` rollback story that records the reversal.

Planned failing tests:

1. No runtime red/green loop is required because this story is documentation-only.
2. Validation will focus on package absence, story wiring, and repo hygiene.

## UX Script

Happy path:

1. A maintainer inspects the repo and no longer finds the Shipyard interruptible-loop assignment pack.
2. The story queue and checkpoint logs no longer claim that requirement is active checked-in scope.
3. A reader can still tell why the package was removed by opening the rollback story.

Error path:

1. The Shipyard assignment pack or generated assets still remain in the repo.
2. The queue or checkpoint ledgers still reference `US-625` as active checked-in scope.
3. The rollback happens with no checked-in story explaining why the package disappeared.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

Validation layers for this story:

1. Source audit against the reverted file set from PR #207.
2. Presence/absence checks for the Shipyard pack and rollback story wiring.
3. `git diff --check` before handoff.

## Step-by-step Implementation Plan

1. Reverse the PR #207 merge without committing so the docs package is removed cleanly.
2. Add the rollback story and wire it into the phase-1 queue and checkpoint ledgers.
3. Run the docs-story validation commands.
4. Finalize through the default GitHub flow unless an exact blocker appears.

## Acceptance Criteria

- [x] AC-1: The checked-in `docs/assignments/shipyard/` package introduced by PR #207 is removed.
- [x] AC-2: The `US-625` story file and its queue/checkpoint registrations are removed from the current checked-in docs surfaces.
- [x] AC-3: A new rollback story records that PR #207 was intentionally reversed.
- [x] AC-4: Queue/checkpoint metadata is updated so the rollback is resumable from the repo.

## Local Validation

Run these before handoff:

```bash
git diff --check
test ! -d docs/assignments/shipyard
rg -n "US-626|PR #207|Shipyard loop requirement rollback" docs/user-stories
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the removed package plus the rollback story.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/user-stories/phase-1/US-626-shipyard-loop-requirement-rollback.md`
- Interaction: confirm the rollback story exists, then verify `docs/assignments/shipyard/` is absent
- Expected result: the repo no longer carries the Shipyard loop requirement package
- Failure signal: the Shipyard pack or `US-625` references remain in the checked-in docs surfaces

## User Checkpoint Test

1. Open this story file and confirm it explicitly says PR #207 was reversed.
2. Confirm `docs/assignments/shipyard/` no longer exists in the repo tree.
3. Confirm the phase-1 queue and checkpoint logs now reference `US-626` instead of `US-625`.

## What To Test

- Route or URL: `docs/user-stories/phase-1/US-626-shipyard-loop-requirement-rollback.md`
- Interaction: review the rollback story, then inspect the repo tree for `docs/assignments/shipyard/`
- Expected visible result: the rollback story exists and the Shipyard loop docs pack is gone
- Failure signal: the removed Shipyard pack or `US-625` docs registration still appears

## Checkpoint Result

- Outcome: Passed
- Evidence: `git diff --check` passed; `test ! -d docs/assignments/shipyard` passed; `rg -n "US-626|PR #207|Shipyard loop requirement rollback" docs/user-stories` passed.
- Residual risk: This rollback removes the checked-in Shipyard scope entirely; if the requirement is revived later, it should return through a new explicit story rather than by relying on the reverted pack.
