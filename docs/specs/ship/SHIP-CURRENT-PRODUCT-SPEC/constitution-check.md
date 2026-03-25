# Constitution Check

## Repo Alignment

- The pack lives under `docs/specs/`, which is the repo’s established formal-spec surface.
- The work is registered as a checked-in story (`US-101`) and tied to a fresh `codex/` branch from current `master`.
- The pack is code-grounded: route maps, shared types, backend routes, schema, and core docs were used as the primary evidence set.
- The pack does not change runtime behavior, deployment plumbing, or database shape.

## Canonical Sources Used

1. `docs/core/application-architecture.md`
2. `docs/core/unified-document-model.md`
3. `docs/core/document-model-conventions.md`
4. `docs/core/week-documentation-philosophy.md`
5. `docs/assignments/fleetgraph/README.md`
6. `docs/assignments/fleetgraph/FLEETGRAPH.md`
7. `web/src/main.tsx`
8. `web/src/pages/App.tsx`
9. `web/src/pages/*.tsx`
10. `web/src/components/UnifiedEditor.tsx`
11. `web/src/components/Editor.tsx`
12. `api/src/app.ts`
13. `api/src/routes/*.ts`
14. `api/openapi.yaml`
15. `api/src/db/schema.sql`
16. `api/src/collaboration/index.ts`
17. `shared/src/types/document.ts`

## Conventions Preserved

- “Everything is a document” remains the organizing principle.
- Canonical screen routing is described in terms of `/documents/:id/*` and the modern route map, while legacy redirects are called out as compatibility behavior.
- Organizational relationships are described through `document_associations`, not the removed legacy columns.
- FleetGraph is treated as part of the current product surface and not an isolated experiment.

## Transitional Areas Explicitly Called Out

- Several frontend context providers are marked deprecated in favor of unified document querying.
- Compatibility routes still exist for legacy `/docs/:id`, `/issues/:id`, `/projects/:id`, `/programs/:id/*`, and `/sprints/:id/*` flows.
- FleetGraph currently spans both polished end-user surfaces and explicit debug/deployment-readiness surfaces.

## Guardrails For Future Updates

- Prefer code-first verification whenever a prose doc and the implementation differ.
- Update this pack when major routes, document tabs, shared editor capabilities, or FleetGraph behaviors change.
- Keep the pack current-state; create separate planning docs if a future redesign is being proposed.
