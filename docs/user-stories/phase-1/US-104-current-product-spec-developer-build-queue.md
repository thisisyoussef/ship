# US-104: Current Product Spec Developer Build Queue

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-103`
- Related branch: `codex/us-104-spec-build-queue`
- Related commit/PR: `430a5d0` / [PR #206](https://github.com/thisisyoussef/ship/pull/206)
- Target environment: `not deployed`

## Persona

**Implementation engineer / tech lead** wants the Ship spec pack arranged into the ideal build sequence so a team can execute the rebuild one slice at a time without inventing its own ordering.

## User Story

> As an implementation engineer, I want the Ship spec pack to include a thorough ordered build queue so I know exactly which slices to implement first, which spec docs to read for each slice, and what each step must produce before moving on.

## Goal

Add a developer-facing execution-order layer to the Ship current-product spec pack. The pack already explains what the product does; this story should explain the ideal order to build it out one queue item at a time, including dependencies, required docs, expected deliverables, and stop/check gates.

## Scope

In scope:

1. Register a new follow-up story for the build-queue pass and add it to the checked-in queue.
2. Add a dedicated ordered build-queue document to the Ship current-product spec pack.
3. Update the pack README and adjacent rebuild-guidance docs so the new queue is the main implementation-order entrypoint for engineers.
4. Update checkpoint logs and story metadata so the work is resumable from the repo.

Out of scope:

1. Changing product behavior, architecture, acceptance criteria, or runtime code.
2. Rewriting all existing spec docs when targeted cross-linking and queue-layer guidance are enough.
3. Turning the pack into a project-management system with staffing or time estimates.

## Pre-Implementation Audit

Local sources to read before editing:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/user-stories/phase-1/US-103-current-product-spec-implementation-contract-deepening.md`
7. `docs/DEFINITION_OF_DONE.md`
8. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
9. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/task-breakdown.md`
10. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/acceptance-and-rebuild-checklist.md`
11. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/technical-plan.md`
12. `.claude/CLAUDE.md`

## Preparation Phase

1. Inspect the current rebuild-order guidance in the pack.
2. Identify where the pack already has sequencing versus where engineers still need to invent an implementation order.
3. Decide whether to deepen `task-breakdown.md` further or add a new dedicated build-queue doc.
4. Write preparation notes before editing.

### Preparation Notes

Local docs reviewed:

1. Repo workflow docs in `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/DEFINITION_OF_DONE.md`, and `.claude/CLAUDE.md`.
2. The current spec-pack README plus the existing rebuild guidance in `task-breakdown.md`, `acceptance-and-rebuild-checklist.md`, and `technical-plan.md`.
3. The immediately previous story contract in `docs/user-stories/phase-1/US-103-current-product-spec-implementation-contract-deepening.md`.

Observed gap:

1. The pack already has strong workstream sequencing in `task-breakdown.md`, but that guidance is still chunked at the workstream level.
2. A developer rebuilding the product still has to translate those workstreams into a one-by-one implementation queue and decide which spec docs to consult at each stop.
3. The missing layer is therefore an explicit developer build queue, not another pass of feature-detail expansion.

Planned output:

1. A dedicated queue document that turns the pack into an ordered implementation sequence.
2. Queue items should include dependencies, required spec docs, expected outputs, and completion gates.
3. The README and current rebuild docs should point engineers to the queue as the primary implementation-order surface.

Planned failing tests:

1. No runtime red/green loop is required because this story is documentation-only.
2. Validation will focus on spec-file inventory, repo hygiene, and story/spec references.

## UX Script

Happy path:

1. A developer opens the spec pack and finds a dedicated build queue instead of inferring the order from multiple docs.
2. For each queue step, the developer can see what to build, which spec docs to read first, and what constitutes a good stopping point.
3. The queue gives a realistic order for rebuilding Ship one layer at a time without repeatedly backtracking.

Error path:

1. A developer opens the pack and still has to synthesize the build order manually from the README plus `task-breakdown.md`.
2. The queue is too vague, duplicates the existing task breakdown, or fails to name the spec docs required at each step.
3. The pack remains detailed but not operationally sequenced.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

Validation layers for this story:

1. Source audit against the current pack README, breakdown, and acceptance docs.
2. Internal consistency checks across the new queue doc, story file, queue entry, and checkpoint logs.
3. `git diff --check` and story/spec reference scans before handoff.

## Step-by-step Implementation Plan

1. Register the new story in the phase-1 queue.
2. Add a dedicated developer build-queue doc to the Ship current-product pack.
3. Update the pack README and task-breakdown doc to use that queue as the implementation-order entrypoint.
4. Update story/checkpoint metadata and run documentation validation commands.
5. Finalize through the default GitHub flow unless an exact blocker appears.

## Acceptance Criteria

- [x] AC-1: The Ship current-product spec pack includes a dedicated developer build queue that orders the rebuild into one-by-one implementation steps.
- [x] AC-2: Each queue step points to the spec docs an engineer should read before implementing that slice.
- [x] AC-3: The queue makes dependencies and good stopping points explicit enough that a developer can build in sequence without inventing their own plan first.
- [x] AC-4: The pack README and rebuild-guidance docs are updated so the new queue is discoverable from the main spec entrypoint.
- [x] AC-5: Queue/story/checkpoint metadata is updated so the work is resumable from the repo.

## Local Validation

Run these before handoff:

```bash
git diff --check
find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort
rg -n "US-104|developer-build-queue|task-breakdown|README.md" docs/user-stories docs/specs/ship
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the updated spec pack.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: open the pack and inspect the new developer build queue plus the updated rebuild-guidance links
- Expected result: the pack now gives an engineer a one-by-one ideal build sequence rather than only high-level workstreams
- Failure signal: the engineer still has to invent the execution order from multiple docs

## User Checkpoint Test

1. Open the pack README and confirm the build queue is linked as a first-class implementation-order document.
2. Open the queue and confirm each step says what to build, which spec docs to read, and what output should exist before moving on.
3. Compare it to `task-breakdown.md` and confirm the queue is more operational and sequential, not just a duplicate table.

## What To Test

- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: review the updated rebuild-order guidance and the new build-queue document
- Expected visible result: a thorough developer-facing queue that orders the spec pack into an ideal implementation sequence
- Failure signal: the pack still offers only broad workstreams rather than an executable build order

## Checkpoint Result

- Outcome: Passed
- Evidence: `git diff --check` passed; `find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort` passed; `rg -n "US-104|developer-build-queue|task-breakdown|README.md" docs/user-stories docs/specs/ship` passed; the pack now includes a dedicated `developer-build-queue.md` with spec intake order, a full Q00-Q15 implementation sequence, and a per-spec coverage map.
- Residual risk: This story is documentation-only, so proof is repo inspection rather than runtime execution; future product changes will need the queue kept aligned with the deeper spec pack to preserve its usefulness.
