# Technical Plan

## Metadata

- Story ID: US-101
- Story Title: Current product spec pack
- Author: Codex
- Date: 2026-03-25

## Proposed Design

- Components/modules affected:
  - `docs/user-stories/README.md`
  - `docs/user-stories/phase-1/US-101-current-product-spec-pack.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/feature-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/technical-plan.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/task-breakdown.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/constitution-check.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/product-overview.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/screen-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/domain-and-data-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/api-and-service-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/editor-and-collaboration-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/fleetgraph-spec.md`
  - `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/implementation-constraints.md`
- Public interfaces/contracts:
  - This pack is documentation-only and introduces no runtime code contracts.
  - The pack will summarize existing product/runtime contracts already implemented in frontend routes, shared types, OpenAPI, schema, and FleetGraph services.
- Data flow summary:
  - The story and queue docs register the work.
  - The pack README becomes the single entry point for the current-product handoff.
  - Supporting docs split the product into overview, screens, domain/data, API/services, editor/collaboration, FleetGraph, and implementation constraints.

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

- Decision: Use code-first evidence from route/page/schema files, with core docs as supporting context.
- Alternatives considered: doc-first summary from `docs/` alone.
- Rationale: several product surfaces have evolved past the older prose docs, especially FleetGraph and the unified document/tab model.

## Source Inventory

- Frontend route and screen truth:
  - `web/src/main.tsx`
  - `web/src/pages/App.tsx`
  - `web/src/pages/*.tsx`
  - `web/src/lib/document-tabs.tsx`
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
- FleetGraph truth:
  - `docs/assignments/fleetgraph/README.md`
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/services/fleetgraph/**`
  - `web/src/components/FleetGraph*.tsx`
  - `web/src/hooks/useFleetGraph*.ts`

## Documentation Plan

1. Create the pack index and top-level feature/plan/task docs.
2. Document the product model and route map at the UX level.
3. Document the entity model and backend/service contract groups.
4. Document the shared editor/collaboration substrate and FleetGraph layer.
5. Document implementation constraints so a rebuild stays aligned with the repo’s core rules.

## Risks And Mitigations

- Risk: a purely descriptive pack becomes too abstract to be implementation-ready.
  - Mitigation: include route names, tab sets, endpoint groups, data entities, and task sequencing.
- Risk: older docs conflict with current implementation.
  - Mitigation: prefer code-first evidence and label transitional/deprecated areas explicitly.
- Risk: FleetGraph ends up treated as an isolated add-on.
  - Mitigation: include FleetGraph as a first-class product doc in the main pack.

## Validation Commands

```bash
git diff --check
find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort
rg -n "US-101|SHIP-CURRENT-PRODUCT-SPEC" docs/user-stories docs/specs/ship
```
