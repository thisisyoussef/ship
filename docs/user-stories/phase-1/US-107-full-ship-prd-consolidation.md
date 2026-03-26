# US-107: Full Ship PRD Consolidation

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-106`
- Related branch: `codex/us-107-ship-prd`
- Related commit/PR: `43dcaf8` / [PR #211](https://github.com/thisisyoussef/ship/pull/211)
- Target environment: `not deployed`

## Persona

**Product lead / implementation engineer** wants one complete Ship PRD inside the specs pack so a developer can rebuild the full product end to end without piecing the story together from many files first.

## User Story

> As a product lead, I want a full Ship PRD added to the specs so any developer can understand the product, system boundaries, workflows, data model, architecture, and rebuild expectations from one complete document.

## Goal

Create a single comprehensive PRD for Ship that consolidates the existing product-only spec pack into one implementation-ready narrative. The document should still stay repo-grounded and current-state accurate, but it should read as a top-down end-to-end build blueprint rather than a list of fragmented supporting docs.

## Scope

In scope:

1. Author a full Ship PRD inside `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
2. Cover product purpose, personas, information architecture, route families, workflows, data model, permissions, API/service shape, collaboration/editor behavior, non-functional constraints, rebuild order, and acceptance expectations in one document.
3. Update the Ship specs entrypoints so the PRD is discoverable from the pack README and Ship specs folder.
4. Update queue/checkpoint metadata so the work is resumable from the repo.

Out of scope:

1. Changing runtime behavior, route behavior, schemas, or deployment plumbing.
2. Rewriting the underlying detailed spec docs unless small cross-links are needed for PRD discoverability.
3. Reintroducing FleetGraph or harness-only material into the Ship product pack.

## Pre-Implementation Audit

Local sources to read before editing:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`
7. `docs/specs/README.md`
8. `docs/specs/ship/README.md`
9. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
10. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/*.md`
11. `docs/core/application-architecture.md`
12. `docs/core/unified-document-model.md`
13. `docs/core/document-model-conventions.md`
14. `docs/core/week-documentation-philosophy.md`
15. `.claude/CLAUDE.md`

## Preparation Phase

1. Inspect the current Ship pack and supporting core docs to map the sections a complete PRD needs.
2. Decide the PRD structure so it can stand alone for end-to-end project recreation while staying consistent with the deeper spec docs.
3. Identify any missing pack entrypoint updates needed so readers can find the PRD first.
4. Write preparation notes before editing.

### Preparation Notes

Local docs reviewed:

1. Ship pack entry docs and deep specs, especially `README.md`, `developer-build-queue.md`, `navigation-and-routing-spec.md`, `workflow-and-action-spec.md`, `permissions-and-access-spec.md`, `api-and-service-spec.md`, and `acceptance-and-rebuild-checklist.md`.
2. Core architecture docs in `docs/core/application-architecture.md`, `docs/core/unified-document-model.md`, `docs/core/document-model-conventions.md`, and `docs/core/week-documentation-philosophy.md`.

Observed documentation gap:

1. The current Ship pack is thorough but still spread across many files, which makes it harder to hand to a developer or software factory as one complete starting document.
2. The existing specs entrypoints point readers to the pack, but not to a single authoritative PRD that explains the full product, system boundaries, and rebuild plan end to end.

Planned output:

1. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/product-requirements-document.md` as the single-file full Ship PRD.
2. Ship pack entrypoint updates so the PRD is the obvious first read from `docs/specs/`.
3. Queue and checkpoint updates so the PRD consolidation is resumable from the repo.

Planned failing tests:

1. No runtime red/green loop is required because this is a documentation-only story.
2. Validation will focus on PRD file presence, entrypoint discoverability, and story/spec consistency.

## UX Script

Happy path:

1. A developer opens the Ship specs folder and can immediately find a single complete PRD.
2. The PRD explains what Ship is, how it behaves, how it is built, and how to recreate it.
3. The deeper supporting docs remain available as reference layers behind the PRD.

Error path:

1. The PRD is too high-level and still forces the reader to reconstruct core product behavior from many other docs.
2. The PRD drifts from the current pack or reintroduces FleetGraph/harness content.
3. The specs entrypoints do not clearly promote the PRD as the one-document starting point.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

Validation layers for this story:

1. Source audit of the existing Ship pack and core architecture docs.
2. Docs-only validation of PRD presence, entrypoint links, and queue/checkpoint bookkeeping.
3. `git diff --check` before handoff.

## Step-by-step Implementation Plan

1. Synthesize the existing Ship pack into a single end-to-end PRD structure.
2. Author the PRD and add it to the Ship pack.
3. Update Ship specs entrypoints so the PRD is easy to find.
4. Update queue/checkpoint metadata and run docs-only validation.
5. Finalize through the default GitHub flow unless an exact blocker appears.

## Acceptance Criteria

- [x] AC-1: A full Ship PRD exists inside `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
- [x] AC-2: The PRD is complete enough for a developer to understand the full product and recreate it end to end from one document.
- [x] AC-3: The PRD stays product-only and does not pull FleetGraph or harness-only material into the Ship pack.
- [x] AC-4: Ship specs entrypoints clearly point readers to the PRD.
- [x] AC-5: Queue/checkpoint metadata is updated so the work is resumable from the repo.

## Local Validation

Run these before handoff:

```bash
git diff --check
test -f docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/product-requirements-document.md
rg -n "product-requirements-document.md|Full Ship PRD|Product Requirements Document" docs/specs/README.md docs/specs/ship/README.md docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md docs/user-stories
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the Ship pack entrypoints and PRD.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/product-requirements-document.md`
- Interaction: open the PRD and confirm it explains the full product, architecture, workflows, and rebuild expectations end to end
- Expected result: a reader can start from one document and understand how to recreate Ship
- Failure signal: the PRD reads like a thin summary and still depends on many other docs for core understanding

## User Checkpoint Test

1. Open the Ship specs folder and verify the PRD is easy to discover.
2. Open the PRD and verify it covers product scope, workflows, architecture, data, routes, operations, and rebuild sequence.
3. Confirm the PRD stays focused on Ship and does not include FleetGraph or harness-only material.

## What To Test

- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/product-requirements-document.md`
- Interaction: read the PRD top to bottom, then compare the entrypoints in the Ship specs folder
- Expected visible result: a single complete Ship PRD backed by the current product-only spec pack
- Failure signal: the PRD is missing major system areas or is hard to discover from the specs folder

## Checkpoint Result

- Outcome: Passed
- Evidence: `git diff --check` passed; `test -f docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/product-requirements-document.md` passed; `rg -n "product-requirements-document.md|Full Ship PRD|Product Requirements Document" docs/specs/README.md docs/specs/ship/README.md docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md docs/user-stories` passed; the Ship specs pack now has a single-file PRD plus updated entrypoints and queue docs.
- Residual risk: The PRD is intentionally comprehensive, but exact field-by-field and route-edge reference detail still also lives in the deeper supporting docs in the same pack; future product changes will need both the PRD and those detailed specs kept in sync.
