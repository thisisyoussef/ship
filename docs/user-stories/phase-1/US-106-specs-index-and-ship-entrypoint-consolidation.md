# US-106: Specs Index And Ship Entrypoint Consolidation

## Status

- State: `in-progress`
- Owner: Codex
- Depends on: `US-105`
- Related branch: `codex/us-106-specs-index`
- Related commit/PR:
- Target environment: `not deployed`

## Persona

**Product lead / implementation engineer** wants the checked-in Ship specs to be easy to find from the main repo docs tree.

## User Story

> As a product lead, I want a clear specs index and an obvious Ship entrypoint so I can find the product-only Ship rebuild pack without accidentally landing in FleetGraph or harness specs.

## Goal

Make the product-only Ship spec pack discoverable inside the main repo by adding a small `docs/specs` index, a Ship-specific entrypoint, and the narrow bookkeeping needed to keep that consolidation resumable from the checked-in workflow.

## Scope

In scope:

1. Add a top-level specs index that distinguishes Ship, FleetGraph, and AI harness spec families.
2. Add a Ship-specific README that points directly to the current product-only pack.
3. Update the current Ship pack and repo context docs so the discovery path is explicit.
4. Register the story in the queue and checkpoint logs.

Out of scope:

1. Rewriting the Ship spec pack contents beyond the small discoverability updates needed here.
2. Changing FleetGraph, harness behavior, runtime code, or deployment plumbing.
3. Touching the user’s dirty local checkout beyond merging the docs changes to `master`.

## Pre-Implementation Audit

Local sources to read before editing:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
8. `.claude/CLAUDE.md`

## Preparation Phase

1. Inspect the current docs tree to confirm where users land today when they browse `docs/specs/`.
2. Confirm the Ship pack already exists under `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
3. Identify the smallest set of doc changes that will make the Ship pack discoverable without moving or rewriting the pack itself.
4. Write preparation notes before editing.

### Preparation Notes

Local docs reviewed:

1. Repo workflow docs in `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/DEFINITION_OF_DONE.md`, and `.claude/CLAUDE.md`.
2. The current Ship pack entrypoint at `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`.
3. The current docs tree under `docs/specs/`, which already contains `ai-harness/`, `fleetgraph/`, and `ship/` directories but no top-level index files.

Observed gap:

1. Browsing `docs/specs/` by folder name alone makes it easy to miss that the product-only Ship pack already exists in `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
2. The nested Ship pack lacks a parent README that tells a reader they are in the right place for the core product.
3. The repo context docs do not currently call out the Ship spec-pack location as part of the current working truth.

Planned output:

1. `docs/specs/README.md` as the top-level specs index.
2. `docs/specs/ship/README.md` as the Ship entrypoint.
3. Small breadcrumb/discoverability updates in the Ship pack and repo context docs.
4. Queue/checkpoint metadata for a docs-only discoverability story.

Planned failing tests:

1. No runtime red/green loop is required because this is a documentation-only story.
2. Validation will focus on file presence, link/discovery-path truthfulness, and story/checkpoint consistency.

## UX Script

Happy path:

1. A reader opens `docs/specs/` and immediately sees where the Ship product specs live.
2. A reader opens `docs/specs/ship/` and sees the current Ship product pack without needing prior context.
3. The current Ship pack still works as the deep spec contract, but now has a visible discovery path from the repo docs tree.

Error path:

1. The reader still lands on FleetGraph or harness docs first when they were looking for the core Ship product.
2. The Ship pack remains nested without a parent entrypoint.
3. Queue or checkpoint metadata is missing, making the change harder to resume from the repo alone.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

Validation layers for this story:

1. Source audit of the current `docs/specs/` tree and Ship pack path.
2. Docs-only validation of file presence, discovery-path references, and queue/checkpoint bookkeeping.
3. `git diff --check` before handoff.

## Step-by-step Implementation Plan

1. Add the top-level specs index and Ship entrypoint docs.
2. Add small discovery-path references in the Ship pack and repo context docs.
3. Update the story queue and checkpoint ledgers.
4. Run docs-only validation commands.
5. Finalize through the default GitHub flow unless an exact blocker appears.

## Acceptance Criteria

- [ ] AC-1: `docs/specs/README.md` exists and clearly distinguishes Ship, FleetGraph, and AI harness specs.
- [ ] AC-2: `docs/specs/ship/README.md` exists and points directly to the current product-only Ship pack.
- [ ] AC-3: Repo docs now make the Ship spec-pack discovery path explicit without changing the pack’s scope.
- [ ] AC-4: Queue/checkpoint metadata is updated so the consolidation is resumable from the repo.

## Local Validation

Run these before handoff:

```bash
git diff --check
test -f docs/specs/README.md
test -f docs/specs/ship/README.md
rg -n "docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC|docs/specs/README.md|docs/specs/ship/README.md" docs/CONTEXT.md docs/specs/README.md docs/specs/ship/README.md docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md
rg -n "US-106|Specs Index And Ship Entrypoint Consolidation|specs index" docs/user-stories
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the updated specs tree.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/specs/README.md`
- Interaction: open the specs index and follow the Ship entrypoint into the current pack
- Expected result: the core Ship product specs are easy to find without confusing them with FleetGraph or harness docs
- Failure signal: a reader still cannot tell where the Ship product-only pack starts

## User Checkpoint Test

1. Open `docs/specs/README.md` and confirm it separates Ship, FleetGraph, and AI harness spec families.
2. Open `docs/specs/ship/README.md` and confirm it points to `SHIP-CURRENT-PRODUCT-SPEC/README.md`.
3. Open the Ship pack README and confirm the discovery path from `docs/specs/` is now explicit.

## What To Test

- Route or URL: `docs/specs/README.md`
- Interaction: navigate from the top-level specs index into `docs/specs/ship/README.md`, then into the current Ship pack
- Expected visible result: an obvious, product-only path to the Ship rebuild specs
- Failure signal: the Ship pack still feels hidden behind FleetGraph or harness folders

## Checkpoint Result

- Outcome:
- Evidence:
- Residual risk:
