# US-101: Current Product Spec Pack

## Status

- State: `done`
- Owner: Codex
- Depends on: —
- Related branch: `codex/us-101-product-spec-pack`
- Related commit/PR: `ba634c6`, [PR #200](https://github.com/thisisyoussef/ship/pull/200)
- Target environment: `not deployed`

## Persona

**Product lead / implementation engineer** wants a single checked-in spec pack for the current Ship product.

## User Story

> As a product lead, I want the current Ship product translated into an engineer-ready spec folder so a software engineer can rebuild the shipped features and functionality without reverse-engineering the repo from scratch.

## Goal

Create a comprehensive, repo-grounded spec pack that describes Ship as it exists today across product surfaces, document workflows, data contracts, editor behavior, and FleetGraph. The pack should consolidate fragmented knowledge from code and docs into a single handoff a new engineer can use as a build contract.

## Scope

In scope:

1. Create a new spec pack under `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
2. Capture the current product surface across navigation, screens, domain/data model, APIs, editor/collaboration behavior, and FleetGraph.
3. Update the checked-in story queue and checkpoint logs so this documentation work is resumable from the repo.

Out of scope:

1. Redesigning the product or changing runtime behavior.
2. Shipping new API, UI, or database functionality beyond documentation and queue metadata.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary repo rules and branch/story/finalization requirements.
2. `docs/CONTEXT.md` — live repo and deployment truth.
3. `docs/WORKFLOW_MEMORY.md` — durable workflow corrections and default behavior.
4. `docs/IMPLEMENTATION_STRATEGY.md` — execution model and phase layout.
5. `docs/user-stories/README.md` — queue/index and story workflow.
6. `docs/DEFINITION_OF_DONE.md` — completion gate.
7. `.claude/CLAUDE.md` — command, architecture, and deployment appendix.
8. `docs/core/application-architecture.md` — product stack and runtime shape.
9. `docs/core/unified-document-model.md` — core domain model.
10. `docs/core/document-model-conventions.md` — mode, hierarchy, and association conventions.
11. `docs/core/week-documentation-philosophy.md` — weekly-plan/retro accountability behavior.
12. `docs/assignments/fleetgraph/README.md` and `docs/assignments/fleetgraph/FLEETGRAPH.md` — FleetGraph product constraints and assignment framing.
13. `web/src/main.tsx` and `web/src/pages/App.tsx` — route map and app shell.
14. `web/src/pages/*` and `web/src/components/*` for the main product surfaces.
15. `api/src/app.ts`, `api/src/routes/*`, `api/openapi.yaml`, `api/src/db/schema.sql`, and `shared/src/types/document.ts` — backend contracts and domain truth.

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm the repo’s established home for formal spec packs.
3. Record route, domain, API, and editor findings before drafting the pack.

### Preparation Notes

Local docs/code reviewed:

1. Repo harness docs in `AGENTS.md`, `docs/`, and `.claude/CLAUDE.md`.
2. Product/domain docs in `docs/core/` and FleetGraph assignment docs.
3. Frontend route/pages/editor sources in `web/src/`.
4. Backend route, schema, and FleetGraph sources in `api/src/`.
5. Shared types in `shared/src/`.

Expected contracts/data shapes:

1. Unified document model with document types, JSONB properties, and `document_associations`.
2. React route map rooted in `/documents/:id/*` plus list, team, settings, admin, auth, and FleetGraph surfaces.
3. REST + WebSocket collaboration backend with session auth, CSRF, audit logging, and FleetGraph worker/runtime tables.

Planned failing tests:

1. No runtime red/green cycle is required because this story is documentation-only.
2. Validation will focus on checked-in doc completeness, internal consistency, and repo hygiene.

## UX Script

Happy path:

1. A reader opens the spec-pack README and understands the pack structure.
2. The reader can find the current route/screen behavior, domain model, API map, editor behavior, and FleetGraph behavior without opening code first.
3. The reader can use the task breakdown to sequence a rebuild of the current product.

Error path:

1. A reader lands in the pack without prior repo context.
2. The pack points them to the exact source docs/files that back each section.
3. Any intentionally ambiguous or transitional areas are labeled explicitly instead of being implied.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

List the tests or validation layers this story will use before implementation.

1. Source audit against the route map, domain docs, shared types, and route inventory.
2. Internal doc consistency across the story file, queue entry, and spec-pack files.
3. `git diff --check` before handoff.

## Step-by-step Implementation Plan

1. Create the story contract and queue entry for the spec-pack effort.
2. Add a Ship-specific spec pack under `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
3. Write top-level pack docs: README, feature spec, technical plan, task breakdown, constitution check.
4. Write implementation-facing product specs covering overview, screen/route behavior, domain/data model, API/service contracts, editor/collaboration, and FleetGraph.
5. Update checkpoint logs and finalize the story metadata with validation results.

## Acceptance Criteria

- [x] AC-1: A checked-in spec pack exists under `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
- [x] AC-2: The pack covers the current Ship product surface, including app navigation, document workflows, team/admin/settings surfaces, and public/auth flows.
- [x] AC-3: The pack documents the current domain model and backend contract shape, including document types, weekly/accountability behavior, associations, and core REST/WebSocket surfaces.
- [x] AC-4: The pack documents the current shared editor/collaboration behavior and the current FleetGraph product layer.
- [x] AC-5: The story queue and checkpoint logs are updated so this work is resumable from the repo without chat history.

## Local Validation

Run these before handoff:

```bash
git diff --check
find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort
rg -n "US-101|SHIP-CURRENT-PRODUCT-SPEC" docs/user-stories docs/specs/ship
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the checked-in spec pack.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: open the pack and follow the linked/adjacent docs
- Expected result: the pack gives a coherent, implementation-ready description of the current product
- Failure signal: missing major product areas, contradictions with the route/API inventory, or no clear build sequence

## User Checkpoint Test

1. Open the pack README and confirm it points to every major product surface.
2. Open the screen spec and confirm the main routes and tabs are described.
3. Open the data/API/editor/FleetGraph docs and confirm they read like implementation contracts rather than loose notes.

## What To Test

- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: review the pack index and sample linked docs
- Expected visible result: a complete current-product spec folder that an engineer can use as a handoff
- Failure signal: important surfaces are missing, source-of-truth files are not referenced, or the pack cannot stand on its own

## Checkpoint Result

- Outcome: Passed
- Evidence: `git diff --check` pass; `find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort` pass; `rg -n "US-101|SHIP-CURRENT-PRODUCT-SPEC" docs/user-stories docs/specs/ship` pass; spec pack and queue metadata added in `ba634c6`; review recorded in PR #200
- Residual risk: The pack intentionally mirrors the current implementation, including transitional naming (`sprint` vs week) and deprecated-but-still-present compatibility layers.
