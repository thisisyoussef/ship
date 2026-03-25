# US-102: Expanded Current Product Spec Blueprint

## Status

- State: `in-progress`
- Owner: Codex
- Depends on: `US-101`
- Related branch: `codex/us-102-expanded-product-spec`
- Related commit/PR:
- Target environment: `not deployed`

## Persona

**Product lead / implementation engineer** wants the current Ship spec pack expanded into a much more detailed blueprint.

## User Story

> As a product lead, I want the existing Ship product pack expanded with route-level, field-level, and action-level detail so a software engineer can rebuild the shipped features and behaviors without having to infer missing contracts from the code.

## Goal

Expand the first-pass Ship current-product spec pack into a deeper engineer-facing blueprint. The expanded pack should keep the current repo-grounded overview, but add exact route rules, tab behavior, state handling, reusable interaction patterns, document field references, action contracts, and acceptance checklists so the handoff reads like a rebuild contract instead of a high-level survey.

## Scope

In scope:

1. Add a new follow-up story for the expanded-spec effort and register it in the checked-in queue.
2. Expand the current Ship spec pack with materially deeper implementation detail where the first pass is still summary-level.
3. Add new supporting docs that cover routing/navigation, screen states, shared interaction patterns, field/property reference, workflow/action contracts, and rebuild acceptance criteria.
4. Update pack metadata and index docs so the expanded material is discoverable from the pack README.
5. Update checkpoint logs and story metadata so the work is resumable from the repo.

Out of scope:

1. Changing runtime product behavior, UI copy, data shape, or deployment plumbing.
2. Redesigning Ship or proposing a future-state architecture that diverges from the current implementation.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow, branch, validation, and finalization rules.
2. `docs/CONTEXT.md` — current repo/runtime truth.
3. `docs/WORKFLOW_MEMORY.md` — recurring corrections and workflow defaults.
4. `docs/IMPLEMENTATION_STRATEGY.md` — repo execution model.
5. `docs/user-stories/README.md` — story queue and dependency truth.
6. `docs/user-stories/phase-1/US-101-current-product-spec-pack.md` — first-pass pack contract and existing acceptance boundary.
7. `docs/DEFINITION_OF_DONE.md` — completion gate.
8. `docs/core/application-architecture.md` — stack and shared architectural rules.
9. `docs/core/unified-document-model.md` — document-system and week-model baseline.
10. `docs/core/document-model-conventions.md` — hierarchy, modes, associations, and naming rules.
11. `docs/core/week-documentation-philosophy.md` — weekly-accountability behavior.
12. `docs/assignments/fleetgraph/README.md`, `docs/assignments/fleetgraph/PRESEARCH.md`, and `docs/assignments/fleetgraph/FLEETGRAPH.md` — FleetGraph product/runtime contract.
13. `.claude/CLAUDE.md` — command, testing, deployment, and architecture appendix.
14. `web/src/main.tsx`, `web/src/pages/*.tsx`, `web/src/lib/document-tabs.tsx`, and key shared components under `web/src/components/` — actual route/screen behavior.
15. `api/src/routes/*.ts`, `api/src/db/schema.sql`, and `shared/src/types/document.ts` — API, schema, and data-contract truth.

## Preparation Phase

1. Re-read the checked-in workflow docs and the first-pass spec-pack story.
2. Inspect the actual route map, key page components, shared list/editor surfaces, and FleetGraph UI/runtime touchpoints.
3. Inspect shared document types, schema, and route implementations to ground field-level and action-level specs.
4. Identify where the current pack still forces readers to reverse-engineer the repo.

### Preparation Notes

Local docs/code reviewed:

1. Repo harness docs in `AGENTS.md`, `docs/`, `.claude/CLAUDE.md`, and the `US-101` story file.
2. Core architecture/docs in `docs/core/` and FleetGraph assignment docs.
3. Frontend route map in `web/src/main.tsx`, app-shell behavior in `web/src/pages/App.tsx`, and page surfaces in `web/src/pages/*.tsx`.
4. Shared detail/list/editor/FleetGraph components including `UnifiedDocumentPage`, `UnifiedEditor`, `IssuesList`, `SelectableList`, document tabs, sidebars, standup/review/retro components, and FleetGraph finding/overlay/FAB components.
5. Shared/domain/backend truth in `shared/src/types/document.ts`, `api/src/db/schema.sql`, and key route files under `api/src/routes/`.

Expected contracts/data shapes:

1. Canonical detail navigation centered on `/documents/:id/*`, with compatibility redirects from legacy route families.
2. A unified `documents` table plus `document_associations`, with JSONB `properties` and typed shared enums/interfaces.
3. Shared list-state and selection patterns across documents, issues, projects, and programs.
4. Review/apply workflows for approvals, conversion, week reconciliation, team allocation, and FleetGraph actions.
5. Multiple user-visible product surfaces that depend on local persistence, query params, and route-derived state.

Planned failing tests:

1. No runtime red/green cycle is required because this story is documentation-only.
2. Validation will focus on spec-pack completeness, queue/story/checkpoint consistency, and repo hygiene.

## UX Script

Happy path:

1. A reader opens the Ship spec-pack README and sees a layered blueprint instead of only high-level summaries.
2. The reader can trace a route from canonical URL to screen states, shared interactions, field contracts, mutations, and acceptance expectations without opening code first.
3. The reader can rebuild major Ship modules by following the pack’s sequencing and acceptance docs.

Error path:

1. A reader only has the spec pack, not prior repo context.
2. The expanded pack points them to the exact route/data/action contracts that back the implementation.
3. Transitional or legacy behavior is called out explicitly instead of being omitted.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

List the tests or validation layers this story will use before implementation.

1. Source audit against the route map, screen components, shared UI surfaces, shared types, schema, and backend route implementations.
2. Internal consistency checks across the pack README, new supporting docs, story file, queue entry, and checkpoint logs.
3. `git diff --check` and spec-file inventory checks before handoff.

## Step-by-step Implementation Plan

1. Register the follow-up story in the phase-1 queue.
2. Add deeper pack coverage for routing/navigation, screen states, shared interaction rules, field/property reference, action contracts, and acceptance/rebuild checklists.
3. Update the pack README and pack metadata docs so the new material is the primary entry path for engineers.
4. Update story/checkpoint metadata and run documentation validation commands.
5. Finalize through the default GitHub flow unless an exact blocker appears.

## Acceptance Criteria

- [ ] AC-1: The Ship current-product pack includes new docs that cover routing/navigation, screen states, shared UI interaction rules, field/property reference, workflow/action contracts, and rebuild acceptance criteria.
- [ ] AC-2: The expanded pack documents canonical routes, redirects, query params, tab rules, and route-derived state closely enough that a new engineer can rebuild navigation behavior without reading the route files first.
- [ ] AC-3: The expanded pack documents shared field/property contracts, enums, relationships, approval objects, and transitional legacy compatibility behaviors closely enough that the data model is implementable from the docs.
- [ ] AC-4: The expanded pack documents major create/update/delete/review/apply flows, including week/accountability behaviors, conversions, team operations, and FleetGraph review/apply interactions.
- [ ] AC-5: The pack README and supporting docs read like a blueprint handoff rather than a high-level survey, and the queue/checkpoint docs are updated to make this follow-up discoverable from the repo.

## Local Validation

Run these before handoff:

```bash
git diff --check
find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort
rg -n "US-102|navigation-and-routing-spec|screen-state-spec|shared-interaction-patterns-spec|document-field-reference|workflow-and-action-spec|acceptance-and-rebuild-checklist" docs/user-stories docs/specs/ship
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the expanded checked-in spec pack.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: open the pack and inspect the new detailed supporting docs
- Expected result: the pack now provides detailed route, state, field, and action contracts for rebuilding the current product
- Failure signal: the pack still forces the reader to infer major behavior from code, or the new docs are missing key product modules

## User Checkpoint Test

1. Open the pack README and confirm the new detailed docs are surfaced prominently.
2. Open the routing, screen-state, and field-reference docs and confirm they answer concrete implementation questions without requiring code lookup.
3. Open the workflow/action and acceptance docs and confirm they describe how current behaviors should work end to end.

## What To Test

- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: review the index and sample the new deep-dive docs linked from it
- Expected visible result: a materially expanded current-product blueprint with exact route, UI-state, field, and action coverage
- Failure signal: the new pack still reads like a summary instead of an implementation contract

## Checkpoint Result

- Outcome: Pending
- Evidence: Pending
- Residual risk: The pack can still only be as exact as the current implementation; transitional naming and legacy compatibility layers must remain labeled explicitly.
