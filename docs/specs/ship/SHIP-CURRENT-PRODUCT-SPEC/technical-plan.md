# Technical Plan

## Metadata

- Story ID: US-102
- Story Title: Expanded current product spec blueprint
- Author: Codex
- Date: 2026-03-25

## Proposed Design

- Components/modules affected:
  - `docs/user-stories/README.md`
  - `docs/user-stories/CHECKPOINT-LOG.md`
  - `docs/user-stories/phase-1/US-102-expanded-current-product-spec-blueprint.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/feature-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/technical-plan.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/task-breakdown.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/constitution-check.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/product-overview.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/navigation-and-routing-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/screen-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/screen-state-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/shared-interaction-patterns-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/domain-and-data-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/document-field-reference.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/workflow-and-action-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/api-and-service-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/editor-and-collaboration-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/fleetgraph-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/acceptance-and-rebuild-checklist.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/implementation-constraints.md`
- Public interfaces/contracts:
  - This pack is documentation-only and introduces no runtime code contracts.
  - The pack will summarize existing product/runtime contracts already implemented in frontend routes, shared types, OpenAPI, schema, and FleetGraph services.
- Data flow summary:
  - The story and queue docs register the work.
  - The pack README becomes the single entry point for the current-product handoff.
  - Supporting docs now split the product into overview, routing, screens, state handling, shared interaction patterns, domain/data, field reference, workflow/actions, API/services, editor/collaboration, FleetGraph, acceptance, and implementation constraints.

## Architecture Decisions

- Decision: Place the pack under `docs/specs/ship/`.
- Alternatives considered: create a new top-level `spec/` directory, bury it in `docs/plans/`, or append to existing core docs.
- Rationale: the repo already uses `docs/specs/` for implementation-facing spec packs, so this keeps the new handoff in the established formal-spec surface.

- Decision: Describe the product as implemented today rather than propose a cleaner target architecture.
- Alternatives considered: write a future-state PRD or a redesign-oriented spec.
- Rationale: the user explicitly asked for a handoff a software engineer can build “to a tee,” which requires current-state fidelity first.

- Decision: Separate shared editor/collaboration behavior and FleetGraph behavior into their own docs instead of repeating them inside every screen.
- Alternatives considered: route-local descriptions only.
- Rationale: both systems are cross-cutting and would create duplication and drift if repeated everywhere.

- Decision: Add dedicated routing/state/field/workflow reference docs rather than continuing to widen the existing overview files.
- Alternatives considered: make `screen-spec.md`, `domain-and-data-spec.md`, and `api-and-service-spec.md` much longer without adding new docs.
- Rationale: engineers need to answer different implementation questions quickly. Splitting the pack by question type keeps it navigable while still making it much deeper.

- Decision: Preserve transitional and contradictory behavior in the docs instead of normalizing it.
- Alternatives considered: describe only the intended or cleaned-up contract.
- Rationale: the user asked for a build-to-the-current-product handoff. Engineers need to know where the code still carries compatibility layers or half-migrated models.

- Decision: Use code-first evidence from route/page/schema files, with core docs as supporting context.
- Alternatives considered: doc-first summary from `docs/` alone.
- Rationale: several product surfaces have evolved past the older prose docs, especially FleetGraph and the unified document/tab model.

## Source Inventory

- Frontend route and screen truth:
  - `web/src/main.tsx`
  - `web/src/pages/App.tsx`
  - `web/src/pages/*.tsx`
  - `web/src/lib/document-tabs.tsx`
- Shared interaction and list/shell truth:
  - `web/src/components/DocumentListToolbar.tsx`
  - `web/src/components/SelectableList.tsx`
  - `web/src/components/BulkActionBar.tsx`
  - `web/src/hooks/useSelection.ts`
  - `web/src/hooks/useGlobalListNavigation.ts`
  - `web/src/hooks/useListFilters.ts`
  - `web/src/hooks/useColumnVisibility.ts`
  - `web/src/lib/actionItemsModal.ts`
- Shared editor/collaboration truth:
  - `web/src/components/UnifiedEditor.tsx`
  - `web/src/components/Editor.tsx`
  - `api/src/collaboration/index.ts`
- Backend contract truth:
  - `api/src/app.ts`
  - `api/src/routes/*.ts`
  - `api/openapi.yaml`
  - `api/src/db/schema.sql`
- Domain-model truth:
  - `shared/src/types/document.ts`
  - `docs/core/unified-document-model.md`
  - `docs/core/document-model-conventions.md`
  - `docs/core/week-documentation-philosophy.md`
- Workflow/action truth:
  - `web/src/components/WeekReview.tsx`
  - `web/src/components/WeekReconciliation.tsx`
  - `web/src/components/ProjectRetro.tsx`
  - `web/src/components/dialogs/ConversionDialog.tsx`
  - `web/src/pages/WorkspaceSettings.tsx`
  - `web/src/pages/AdminDashboard.tsx`
  - `web/src/pages/AdminWorkspaceDetail.tsx`
- FleetGraph truth:
  - `docs/assignments/fleetgraph/README.md`
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/services/fleetgraph/**`
  - `web/src/components/FleetGraph*.tsx`
  - `web/src/hooks/useFleetGraph*.ts`

## Documentation Plan

1. Create the pack index and top-level feature/plan/task docs.
2. Expand the product model into canonical route, state, and shared-interaction docs.
3. Expand the entity model into field-reference and workflow/action docs.
4. Keep the entity/model, API/service, editor/collaboration, and FleetGraph docs synchronized with the deeper blueprint docs.
5. Add a rebuild acceptance checklist so a future engineer can use the pack as both design input and QA contract.
6. Document implementation constraints so a rebuild stays aligned with the repo’s core rules.

## Risks And Mitigations

- Risk: a purely descriptive pack becomes too abstract to be implementation-ready.
  - Mitigation: include route names, tab sets, query params, endpoint groups, field-level contracts, action flows, and task sequencing.
- Risk: older docs conflict with current implementation.
  - Mitigation: prefer code-first evidence and label transitional/deprecated areas explicitly.
- Risk: FleetGraph ends up treated as an isolated add-on.
  - Mitigation: include FleetGraph as a first-class product doc in the main pack.
- Risk: the expanded pack becomes harder to navigate because it is larger.
  - Mitigation: organize it by implementation question type and update the README with clear reading paths.

## Validation Commands

```bash
git diff --check
find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort
rg -n "US-102|navigation-and-routing-spec|screen-state-spec|shared-interaction-patterns-spec|document-field-reference|workflow-and-action-spec|acceptance-and-rebuild-checklist" docs/user-stories docs/specs/ship
```
