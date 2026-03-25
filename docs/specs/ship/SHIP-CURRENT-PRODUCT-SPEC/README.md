# Ship Current Product Spec

## Purpose

This pack is the current-product handoff for Ship. It translates the repo’s code and living docs into an implementation-ready specification so an engineer can rebuild the shipped product behavior without reverse-engineering the entire codebase first.

This pack describes the product as implemented on local `master` at commit `246ab71` on March 25, 2026.

## How To Use This Pack

1. Read `feature-spec.md` for scope, intent, and acceptance boundaries.
2. Read `product-overview.md` for the product model, personas, navigation, and main workflows.
3. Read `screen-spec.md` for route-by-route and tab-by-tab behavior.
4. Read `domain-and-data-spec.md` and `api-and-service-spec.md` for backend/domain contracts.
5. Read `editor-and-collaboration-spec.md` for the shared editing surface used across most product types.
6. Read `fleetgraph-spec.md` for the proactive/on-demand intelligence layer.
7. Use `task-breakdown.md` as the recommended implementation sequence for rebuilding the product.
8. Use `implementation-constraints.md` and `constitution-check.md` as the non-negotiable build constraints.

## Pack Contents

| File | Purpose |
| --- | --- |
| `feature-spec.md` | High-level product-pack objective, scope, acceptance criteria, and out-of-scope boundaries |
| `technical-plan.md` | Source map and documentation architecture for this pack |
| `task-breakdown.md` | Recommended implementation sequencing for rebuilding the current product |
| `constitution-check.md` | Repo-convention and source-of-truth alignment notes |
| `product-overview.md` | Product thesis, user roles, navigation, and major workflows |
| `screen-spec.md` | Route-by-route screen behavior and document-tab behavior |
| `domain-and-data-spec.md` | Entity model, associations, weekly/accountability flows, and storage contracts |
| `api-and-service-spec.md` | REST route groups, collaboration service behavior, and cross-cutting backend services |
| `editor-and-collaboration-spec.md` | Shared editor capabilities, collaboration model, offline behavior, and content extraction rules |
| `fleetgraph-spec.md` | FleetGraph proactive queue, on-demand analysis, review/apply actions, and runtime contracts |
| `implementation-constraints.md` | Stack, security, caching, deployment, validation, and migration constraints |

## Product Modules Covered

1. Authentication, setup, invites, workspace switching, and session behavior
2. Dashboard and My Week planning/accountability surfaces
3. Documents, issues, projects, programs, and week documents
4. Team allocation, directory, reviews, status overview, and org chart
5. Workspace settings, API tokens, audit logs, conversions, and admin controls
6. Public feedback intake and internal feedback-as-issue handling
7. Shared rich-text editing, collaboration, mentions, uploads, comments, history, and AI quality banners
8. FleetGraph proactive and on-demand project-intelligence behavior

## Source Of Truth For This Pack

Primary repo evidence:

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

## Recommended Build Sequence

1. Establish auth, workspaces, and the unified document model.
2. Build the shared app shell, route map, and list pages.
3. Build the unified document page and shared editor/collaboration substrate.
4. Add issue/project/program/week workflows and team/accountability views.
5. Add settings/admin/public feedback surfaces.
6. Add FleetGraph runtime, queue, and document-context UI.

## Important Notes

- This is a current-state pack, not a redesign proposal.
- Where the implementation contains transitional patterns or deprecated layers, the pack calls that out explicitly instead of hiding it.
- The exact REST payloads continue to live in `api/openapi.yaml`; this pack summarizes them in product terms and groups them by capability.
