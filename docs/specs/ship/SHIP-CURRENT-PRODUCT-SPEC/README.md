# Ship Current Product Spec

## Purpose

This pack is the current-product handoff for Ship. It translates the repo’s code and living docs into an implementation-ready specification so an engineer can rebuild the shipped product behavior without reverse-engineering the entire codebase first.

This pack describes the product as implemented on local `master` at commit `ce14b05` on March 25, 2026.

## How To Use This Pack

1. Read `feature-spec.md` for the scope, fidelity target, and what this pack must cover.
2. Read `product-overview.md` for the product model, personas, major work loops, and module boundaries.
3. Read `navigation-and-routing-spec.md`, `screen-spec.md`, and `screen-state-spec.md` together for the canonical URL contract, route-to-screen mapping, tab rules, and state handling.
4. Read `state-machine-and-lifecycle-spec.md` and `shared-interaction-patterns-spec.md` together for auth/session transitions, review states, route-driven lifecycle changes, shell behavior, keyboard shortcuts, persistence, and shared UI mechanics.
5. Read `domain-and-data-spec.md` and `document-field-reference.md` together for the entity model, storage surfaces, per-document properties, compatibility fields, and computed data.
6. Read `permissions-and-access-spec.md` and `payload-and-response-reference.md` together for access boundaries, envelope families, request bodies, response shapes, and current compatibility drifts.
7. Read `workflow-and-action-spec.md`, `mutation-side-effects-spec.md`, and `api-and-service-spec.md` together for user-triggered mutations, approval flows, conversion rules, invalidation/broadcast behavior, and backing endpoints/services.
8. Read `editor-and-collaboration-spec.md` for the shared editing surface used across most product types.
9. Read `fleetgraph-spec.md` for the proactive queue, current-page analysis, review/apply flows, and runtime shape.
10. Use `acceptance-and-rebuild-checklist.md` and `task-breakdown.md` as the implementation and verification sequence for rebuilding the product.
11. Use `implementation-constraints.md` and `constitution-check.md` as the non-negotiable build constraints.

## Pack Contents

| File | Purpose |
| --- | --- |
| `feature-spec.md` | High-level product-pack objective, blueprint scope, acceptance criteria, and out-of-scope boundaries |
| `technical-plan.md` | Source map, documentation architecture, and evidence plan for this pack |
| `task-breakdown.md` | Recommended implementation sequencing for rebuilding the current product |
| `constitution-check.md` | Repo-convention and source-of-truth alignment notes |
| `product-overview.md` | Product thesis, user roles, navigation, and major workflows |
| `navigation-and-routing-spec.md` | Canonical URL map, access rules, redirect contract, query params, shell mode derivation, and tab routing |
| `screen-spec.md` | Route-by-route screen behavior and document-tab behavior |
| `screen-state-spec.md` | Loading, empty, blocked, success, review, and mutation states for major screens |
| `state-machine-and-lifecycle-spec.md` | Session, invite/setup, workspace, document, approval, collaboration, and FleetGraph lifecycle state machines |
| `shared-interaction-patterns-spec.md` | App-shell behavior, command palette, selection, keyboard shortcuts, persistence, and shared UI mechanics |
| `domain-and-data-spec.md` | Entity model, associations, weekly/accountability flows, and storage contracts |
| `document-field-reference.md` | Field-level document contract, property schema, compatibility layer, and computed/flattened response fields |
| `permissions-and-access-spec.md` | Public/authenticated/admin access model, workspace/document visibility rules, and mutation ownership boundaries |
| `payload-and-response-reference.md` | Dominant request bodies, response envelopes, raw-vs-wrapped contracts, and payload compatibility drifts |
| `workflow-and-action-spec.md` | Create/update/delete, approval/review, conversion, allocation, feedback, admin, and FleetGraph action flows |
| `mutation-side-effects-spec.md` | Query invalidation, optimistic updates, broadcasts, navigation changes, collaboration resets, and background hooks after writes |
| `api-and-service-spec.md` | REST route groups, collaboration service behavior, and cross-cutting backend services |
| `editor-and-collaboration-spec.md` | Shared editor capabilities, collaboration model, offline behavior, and content extraction rules |
| `fleetgraph-spec.md` | FleetGraph proactive queue, on-demand analysis, review/apply actions, and runtime contracts |
| `acceptance-and-rebuild-checklist.md` | Route-by-route rebuild acceptance checklist and verification matrix |
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

## Reading Paths By Role

### If you are rebuilding routing and UI structure

1. `product-overview.md`
2. `navigation-and-routing-spec.md`
3. `screen-spec.md`
4. `screen-state-spec.md`
5. `state-machine-and-lifecycle-spec.md`
6. `shared-interaction-patterns-spec.md`

### If you are rebuilding data contracts and CRUD behavior

1. `domain-and-data-spec.md`
2. `document-field-reference.md`
3. `payload-and-response-reference.md`
4. `workflow-and-action-spec.md`
5. `mutation-side-effects-spec.md`
6. `api-and-service-spec.md`

### If you are rebuilding auth, permissions, and backend contracts

1. `navigation-and-routing-spec.md`
2. `permissions-and-access-spec.md`
3. `payload-and-response-reference.md`
4. `state-machine-and-lifecycle-spec.md`
5. `api-and-service-spec.md`

### If you are rebuilding the collaborative editor and AI layer

1. `editor-and-collaboration-spec.md`
2. `fleetgraph-spec.md`
3. `mutation-side-effects-spec.md`
4. `shared-interaction-patterns-spec.md`
5. `implementation-constraints.md`

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
- Several surfaces intentionally preserve legacy compatibility:
  - “week” is the user-facing term while many schemas and route helpers still use `sprint`.
  - `/documents/:id/*` is canonical, while older `/docs/:id`, `/issues/:id`, `/projects/:id`, `/programs/:id/*`, and `/sprints/:id/*` routes still redirect into it.
  - Current issue/project conversion is implemented in-place with snapshots, while the conversions history screen still reflects the older archived-original/new-document model.
  - Person documents persist `properties.user_id` even though the shared TS type omits that field.
- The dominant REST payloads and response families are now captured in `payload-and-response-reference.md`; `api/openapi.yaml` remains the exhaustive wire reference for edge endpoints and schema details not restated here.
- The collaboration layer exposes a conversion close-code path (`4100`), but the current conversion routes do not invoke it; current conversion UX depends on client-side navigation and invalidation instead.
- When this pack and older prose docs disagree, prefer the route files, page components, schema, and backend route implementations named in the source inventory.
