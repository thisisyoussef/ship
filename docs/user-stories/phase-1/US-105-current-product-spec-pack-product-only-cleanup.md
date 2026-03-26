# US-105: Current Product Spec Pack Product-Only Cleanup

## Status

- State: `in-progress`
- Owner: Codex
- Depends on: `US-104`
- Related branch: `codex/us-105-product-only-specs`
- Related commit/PR: `pending`
- Target environment: `not deployed`

## Persona

**Product lead / implementation engineer** wants the Ship spec pack reduced to only the material needed to recreate Ship itself, without harness-oriented pack scaffolding or FleetGraph.

## User Story

> As a product lead, I want the Ship spec pack to describe only the core Ship product so I can hand it to an engineer as a clean build blueprint without FleetGraph or repo-harness noise mixed in.

## Goal

Refocus the Ship current-product spec pack on the product itself. Remove pack-internal meta documents and story-oriented scaffolding that are not needed to recreate Ship, and remove FleetGraph from the pack entirely so the result reads like a product-only implementation handoff.

## Scope

In scope:

1. Register a narrow follow-up story for the product-only cleanup pass.
2. Remove pack files or sections that exist only to describe the spec-pack process rather than the Ship product.
3. Remove FleetGraph-specific docs, references, routes, workflows, state descriptions, payloads, and build-order steps from the Ship spec pack.
4. Update the README, queue docs, acceptance docs, and checkpoint metadata so the cleaned pack is discoverable and internally consistent.

Out of scope:

1. Changing Ship runtime behavior, deployment plumbing, or the actual FleetGraph implementation in code.
2. Rewriting the repo-wide harness, AGENTS flow, or historical story files beyond the narrow queue/checkpoint updates needed for this story.
3. Redesigning Ship beyond removing non-core-product pack content.

## Pre-Implementation Audit

Local sources to read before editing:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `docs/assignments/fleetgraph/README.md`
8. `docs/assignments/fleetgraph/PRESEARCH.md`
9. `docs/assignments/fleetgraph/FLEETGRAPH.md`
10. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/*.md`
11. `.claude/CLAUDE.md`

## Preparation Phase

1. Inspect the current spec pack for pack-only meta docs, story metadata, and FleetGraph coverage.
2. Decide which docs should remain as product build inputs versus which docs should be removed from the pack.
3. Identify every FleetGraph reference in the remaining pack docs so the removal pass stays coherent.
4. Write preparation notes before editing.

### Preparation Notes

Local docs reviewed:

1. Repo workflow docs in `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/DEFINITION_OF_DONE.md`, and `.claude/CLAUDE.md`.
2. FleetGraph assignment docs in `docs/assignments/fleetgraph/`.
3. The full `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/` pack, with emphasis on the README, build-order docs, and the files that still mention FleetGraph or story-level metadata.

Observed cleanup targets:

1. `technical-plan.md` and `constitution-check.md` describe pack construction and repo alignment rather than Ship behavior.
2. Several remaining pack docs still contain story metadata or repo-harness wording that is not needed in a product-only handoff.
3. FleetGraph currently appears in the README, build queue, acceptance checklist, and many product-spec sections, so the cleanup must be cross-pack rather than a single-file delete.

Planned output:

1. A Ship spec pack that focuses on the core product only.
2. No `fleetgraph-spec.md` in the Ship current-product pack.
3. No FleetGraph-specific sections or queue stages in the remaining pack docs.
4. A lighter pack index and build queue that point only to Ship product rebuild material.

Planned failing tests:

1. No runtime red/green loop is required because this story is documentation-only.
2. Validation will focus on pack-file inventory, FleetGraph removal from the pack, and story/spec consistency.

## UX Script

Happy path:

1. A developer opens the Ship spec pack and sees only the material needed to recreate Ship itself.
2. The pack index, build queue, and acceptance checklist stay coherent after FleetGraph and pack-meta content are removed.
3. The remaining docs still give a usable build order for auth, documents, issues, projects, programs, weeks, team, settings, admin, and feedback.

Error path:

1. The pack still includes process-oriented docs that describe how the pack was assembled instead of how Ship works.
2. FleetGraph references remain scattered through routing, workflow, payload, or acceptance docs.
3. The README or build queue still implies that FleetGraph is part of the required Ship rebuild.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

Validation layers for this story:

1. Source audit against the current Ship spec pack and FleetGraph references inside it.
2. Internal consistency checks across the cleaned pack README, build queue, acceptance checklist, and story metadata.
3. `git diff --check` before handoff.

## Step-by-step Implementation Plan

1. Remove pack-only meta docs or story-oriented scaffolding that are not needed in the Ship handoff.
2. Remove FleetGraph coverage from the remaining pack docs and delete the dedicated FleetGraph spec file.
3. Rework the build queue and acceptance checklist so they describe only the non-FleetGraph Ship rebuild.
4. Update queue/checkpoint metadata and run the docs-only validation commands.
5. Finalize through the default GitHub flow unless an exact blocker appears.

## Acceptance Criteria

- [ ] AC-1: The Ship current-product pack removes pack-only meta docs or story-oriented scaffolding that are not needed to recreate the product.
- [ ] AC-2: `fleetgraph-spec.md` is removed from the Ship current-product pack and the remaining pack docs no longer treat FleetGraph as part of the required Ship rebuild.
- [ ] AC-3: The pack README, build queue, and acceptance checklist now focus only on the core Ship product surfaces.
- [ ] AC-4: The remaining product-spec docs stay internally consistent after FleetGraph removal.
- [ ] AC-5: Queue/checkpoint metadata is updated so this cleanup is resumable from the repo.

## Local Validation

Run these before handoff:

```bash
git diff --check
test ! -f docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/fleetgraph-spec.md
test ! -f docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/technical-plan.md
test ! -f docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/constitution-check.md
! rg -n "FleetGraph|fleetgraph" docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC
rg -n "US-105|product-only cleanup|fleetgraph-spec|technical-plan|constitution-check" docs/user-stories docs/specs/ship
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the cleaned Ship spec pack.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: open the pack and confirm it reads as a Ship-only handoff without FleetGraph or pack-process docs
- Expected result: the pack contains only the core Ship rebuild material
- Failure signal: FleetGraph or pack-construction material still appears in the pack

## User Checkpoint Test

1. Open the pack README and confirm the contents list no longer includes FleetGraph or meta-only pack docs.
2. Open the build queue and confirm it stops at core Ship product surfaces instead of adding a FleetGraph stage.
3. Search the pack for `FleetGraph` and confirm no remaining product-pack references exist.

## What To Test

- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: review the cleaned pack index, then inspect the pack file list and build queue
- Expected visible result: a product-only Ship spec pack with FleetGraph and pack-meta scaffolding removed
- Failure signal: the pack still contains FleetGraph sections or pack-construction docs

## Checkpoint Result

- Outcome: Pending
- Evidence: Pending
- Residual risk: Pending
