# Developer Build Queue

Use this document as the primary execution-order guide for rebuilding Ship from this spec pack. `task-breakdown.md` remains the macro workstream/dependency map; this file turns that map into the ideal one-by-one build sequence for an engineer or small team.

## How To Use This Queue

1. Read `README.md` first, then use the `Spec Intake Order` below before starting `Q00`.
2. Treat each queue item as a stop-and-stabilize slice.
3. Before starting a queue item, read the listed spec docs for that step.
4. Do not pull later slices forward just because their routes already exist in the shell; many later features depend on the shared substrate built in earlier queue items.
5. Use `acceptance-and-rebuild-checklist.md` only after the later queue items are in place; it is the exit gate, not the day-one implementation guide.

## Spec Intake Order

This is the fastest way for a fresh engineer to understand the pack before touching code.

| Order | Read these docs | Why first |
| --- | --- | --- |
| S01 | `README.md`, `feature-spec.md` | Understand the pack’s purpose, fidelity target, and how the docs are organized |
| S02 | `product-overview.md` | Build a mental model of Ship’s users, modules, and major work loops |
| S03 | `implementation-constraints.md`, `constitution-check.md` | Lock in the non-negotiable stack, compatibility, and repo-alignment rules before designing anything |
| S04 | `developer-build-queue.md`, `task-breakdown.md` | Understand both the detailed queue and the macro dependency map |
| S05 | `domain-and-data-spec.md`, `document-field-reference.md` | Learn the unified document model and current compatibility shims |
| S06 | `permissions-and-access-spec.md`, `payload-and-response-reference.md` | Learn the current access model and the raw-vs-wrapped API contract split |
| S07 | `navigation-and-routing-spec.md`, `screen-spec.md`, `screen-state-spec.md`, `state-machine-and-lifecycle-spec.md`, `shared-interaction-patterns-spec.md` | Learn route, shell, UI-state, and interaction behavior |
| S08 | `workflow-and-action-spec.md`, `mutation-side-effects-spec.md`, `api-and-service-spec.md` | Learn how writes behave end to end and what refresh fan-out must happen afterward |
| S09 | `editor-and-collaboration-spec.md` | Learn the shared editor and collaboration substrate before building any document-heavy surface |
| S10 | `fleetgraph-spec.md` | Learn FleetGraph last, after the rest of the product model is already clear |
| S11 | `acceptance-and-rebuild-checklist.md` | Use the acceptance matrix only when the rebuild is nearing feature completeness |

## Spec-To-Queue Coverage Map

Use this table when the question is not "what do I build next?" but "when does this spec file become operationally important?" No doc in the pack should feel orphaned.

| Spec file | First required in queue | Main job in the rebuild |
| --- | --- | --- |
| `README.md` | Q00 | Entry point, reading paths, and pack structure |
| `feature-spec.md` | Q00 | Scope, fidelity target, and out-of-scope guardrails |
| `technical-plan.md` | Q00 | Source inventory and evidence map while auditing the pack |
| `developer-build-queue.md` | Q00-Q15 | Day-to-day execution order, dependencies, and stopping gates |
| `task-breakdown.md` | Q00, Q15 | Macro dependency map and end-of-build coverage cross-check |
| `constitution-check.md` | Q00, Q15 | Repo alignment and current-state constraints that should not be normalized away |
| `product-overview.md` | Q00 | Product model, personas, and module boundaries |
| `navigation-and-routing-spec.md` | Q01 | Route protection, canonical URLs, redirects, shell mode derivation, and tab parsing |
| `screen-spec.md` | Q03 | Route-by-route surface behavior once the shell is in place |
| `screen-state-spec.md` | Q01 | Loading, empty, blocked, review, and mutation-result states |
| `state-machine-and-lifecycle-spec.md` | Q01 | Session, invite, document, approval, collaboration, and FleetGraph lifecycle rules |
| `shared-interaction-patterns-spec.md` | Q03 | App-shell mechanics, keyboard rules, persistence, and shared interaction behavior |
| `domain-and-data-spec.md` | Q02 | Unified entity model, associations, and weekly/accountability structure |
| `document-field-reference.md` | Q02 | Field-level contract and compatibility flattening for every document type |
| `permissions-and-access-spec.md` | Q01 | Public/auth/admin boundaries and mutation ownership rules |
| `payload-and-response-reference.md` | Q01 | Dominant request/response families and raw-vs-wrapped API behavior |
| `workflow-and-action-spec.md` | Q06 | User-triggered action flows for docs, issues, projects, programs, weeks, reviews, admin, and FleetGraph |
| `mutation-side-effects-spec.md` | Q05 | Invalidation, broadcasts, navigation replacements, collaboration resets, and background fan-out after writes |
| `api-and-service-spec.md` | Q05 | Backend route groups, collaboration service, uploads/comments/history, and support services |
| `editor-and-collaboration-spec.md` | Q05 | Shared rich-text, collaboration, offline/cache, uploads, comments, and history substrate |
| `fleetgraph-spec.md` | Q14 | Proactive queue, current-context analysis, review/apply, and follow-up AI behavior |
| `acceptance-and-rebuild-checklist.md` | Q15 | Final route-by-route QA gate once the rebuild is feature-complete |
| `implementation-constraints.md` | Q00 | Stack, caching, security, deployment, and migration constraints that apply throughout the rebuild |

## Queue Rules

1. Build the shared substrate before type-specific surfaces.
2. Build the canonical route and detail shell before building every list or feature in parallel.
3. Treat unified documents as the core platform layer, not as one product module among many.
4. Build FleetGraph after the core product because it depends on the surrounding route, mutation, and editor contracts.
5. Preserve today’s compatibility behaviors deliberately: week/sprint naming overlap, raw-vs-wrapped API split, in-place issue/project conversion, `properties.user_id`, and canonical `/documents/:id/*` routing.

## Queue Summary

| Queue ID | Build slice | Depends on | Primary outcome |
| --- | --- | --- | --- |
| Q00 | Intake and guardrails | none | Team understands the pack, constraints, and current-state fidelity target |
| Q01 | Auth, setup, sessions, invites, workspace context | Q00 | Protected-shell bootstrap works and auth state is trustworthy |
| Q02 | Unified document storage and compatibility model | Q01 | Core data model exists for all later product surfaces |
| Q03 | Canonical routing and app shell | Q01, Q02 | Stable route contract and left-rail shell exist |
| Q04 | Shared list substrate | Q03 | Reusable collection behaviors exist for docs/issues/projects/programs/team |
| Q05 | Shared editor and collaboration substrate | Q02, Q03 | Reusable rich-text/collaboration layer exists |
| Q06 | Generic documents/wiki and canonical detail shell | Q04, Q05 | Generic document list/detail loop is working |
| Q07 | Issue workflows and embedded issue surfaces | Q06 | Issue lifecycle and scoped issue lists work |
| Q08 | Project workflows | Q07 | Project detail tabs, ICE, retro, and ownership flows work |
| Q09 | Program workflows | Q08 | Program container behavior and nested project/week context work |
| Q10 | Week workflows and weekly child documents | Q08, Q09 | Planning, execution, review, and approval flows work |
| Q11 | Dashboard and My Week | Q10 | Personal workflow hub and accountability summaries work |
| Q12 | Team surfaces | Q10, Q11 | Allocation, reviews, directory, status, org chart, and person detail work |
| Q13 | Settings, admin, public feedback, and conversions | Q01, Q06, Q07, Q08, Q12 | Operational/admin edges and public intake are complete |
| Q14 | FleetGraph | Q05, Q07, Q08, Q10, Q12, Q13 | Proactive and on-demand AI product layer works against the rebuilt app |
| Q15 | Final compatibility, hardening, and acceptance pass | Q01-Q14 | Rebuild is current-state accurate and ready for QA/release review |

## Detailed Queue

### Q00. Intake And Guardrails

- Goal: align the engineer with what Ship is, what the pack covers, and what cannot be redesigned away.
- Read first: `README.md`, `feature-spec.md`, `product-overview.md`, `implementation-constraints.md`, `constitution-check.md`.
- Build now:
  - project/repo skeleton decisions
  - stack/runtime assumptions
  - current-state compatibility commitments
- Produce:
  - an agreed rebuild baseline
  - a shared understanding that this is a faithful rebuild, not a cleanup rewrite
- Stop when:
  - the team can explain the unified document model, canonical routing strategy, and major compatibility quirks without opening the codebase

### Q01. Auth, Setup, Sessions, Invites, And Workspace Context

- Goal: make the protected shell trustworthy before any product page is built on top of it.
- Read first: `permissions-and-access-spec.md`, `payload-and-response-reference.md`, `state-machine-and-lifecycle-spec.md`, `screen-state-spec.md`, `navigation-and-routing-spec.md`.
- Build now:
  - setup flow
  - login/logout/me/status/session endpoints and client bootstrap
  - protected vs public routing
  - invite validation and acceptance states
  - workspace context provider and switching flow
  - session timeout warnings and expiry handling
- Produce:
  - working `/setup`, `/login`, `/invite/:token`
  - protected-shell auth bootstrap
  - workspace switching that reloads into the correct context
- Stop when:
  - an authenticated user can reliably enter the shell, survive normal navigation, switch workspace, and be kicked out correctly on timeout or revoked access

### Q02. Unified Document Storage And Compatibility Model

- Goal: establish the shared data layer that almost every feature depends on.
- Read first: `domain-and-data-spec.md`, `document-field-reference.md`, `permissions-and-access-spec.md`, `payload-and-response-reference.md`.
- Build now:
  - unified `documents` storage model
  - `document_associations`
  - visibility and access filtering
  - per-type `properties`
  - compatibility flattening
  - ticket-number and snapshot behavior
  - person-to-user linking via `properties.user_id`
- Produce:
  - a storage/service layer that can represent wiki, issue, project, program, sprint/week, person, weekly plan, weekly retro, and weekly review documents
- Stop when:
  - later UI slices can rely on one coherent document model instead of bespoke per-type persistence

### Q03. Canonical Routing And App Shell

- Goal: lock the route contract and shell layout early so later features slot into stable locations.
- Read first: `navigation-and-routing-spec.md`, `screen-spec.md`, `screen-state-spec.md`, `state-machine-and-lifecycle-spec.md`, `shared-interaction-patterns-spec.md`.
- Build now:
  - app shell and left rail
  - canonical route map
  - legacy redirects into canonical routes
  - mode derivation from path plus current document type
  - detail tab parsing and invalid-tab redirects
  - query-param conventions used across the shell
- Produce:
  - a stable shell where `/documents/:id/*` is already canonical
  - top-level surfaces reachable even if their inner content is still stubbed
- Stop when:
  - later feature work can target stable routes and no longer needs routing redesign

### Q04. Shared List Substrate

- Goal: build the reusable collection behavior once instead of re-implementing it per screen.
- Read first: `shared-interaction-patterns-spec.md`, `screen-state-spec.md`, `navigation-and-routing-spec.md`.
- Build now:
  - tree/list/kanban view primitives where relevant
  - filters and search
  - selection and range-selection
  - bulk action bar behavior
  - context-menu selection rules
  - keyboard navigation
  - persisted columns and view modes
- Produce:
  - reusable list infrastructure for documents, issues, projects, programs, and team surfaces
- Stop when:
  - later collection pages can be assembled mostly from shared list primitives instead of custom one-off behavior

### Q05. Shared Editor And Collaboration Substrate

- Goal: build the shared editing system before type-specific content screens.
- Read first: `editor-and-collaboration-spec.md`, `mutation-side-effects-spec.md`, `state-machine-and-lifecycle-spec.md`, `api-and-service-spec.md`.
- Build now:
  - rich-text editor
  - shared 4-panel detail layout behavior
  - Yjs/WebSocket collaboration
  - offline/cache handling
  - uploads/comments/history hooks
  - content extraction and JSON/Yjs fallback behavior
  - collaboration close-code handling (`4101`, `4403`, and current `4100` nuance)
- Produce:
  - one shared editor surface that works for document-like types
- Stop when:
  - wiki/project/program/week-like docs can all be edited on the same substrate without special-case editor implementations

### Q06. Generic Documents/Wiki And Canonical Detail Shell

- Goal: make the generic document experience real before layering specialized product types on top.
- Read first: `screen-spec.md`, `workflow-and-action-spec.md`, `document-field-reference.md`, `payload-and-response-reference.md`, `mutation-side-effects-spec.md`.
- Build now:
  - `/docs` list surface
  - generic document create/update/delete
  - canonical detail page shell
  - properties sidebar behavior for generic docs
  - parent/child nesting
  - visibility handling
  - associations/backlinks/context basics
- Produce:
  - a functioning document list/detail roundtrip for wiki-style documents
- Stop when:
  - generic docs can be created from the list, opened via `/documents/:id`, edited, and deleted with the correct side effects

### Q07. Issue Workflows And Embedded Issue Surfaces

- Goal: establish the issue system because projects, programs, and weeks all depend on scoped issue behavior.
- Read first: `workflow-and-action-spec.md`, `screen-spec.md`, `document-field-reference.md`, `payload-and-response-reference.md`, `mutation-side-effects-spec.md`.
- Build now:
  - `/issues` list and kanban surfaces
  - issue create/update/delete/bulk flows
  - ticket IDs and issue-specific compatibility fields
  - scoped embedded issue lists
  - backlog picker and “show all” behavior
  - issue history and iterations
  - promote-to-project conversion entrypoint
- Produce:
  - a complete issue lifecycle that can be embedded into project/program/week contexts
- Stop when:
  - issues can function both as a standalone module and as the shared task layer used by later queue items

### Q08. Project Workflows

- Goal: build projects after issues so project tabs and aggregation behaviors have real issue data to sit on top of.
- Read first: `screen-spec.md`, `workflow-and-action-spec.md`, `document-field-reference.md`, `domain-and-data-spec.md`, `mutation-side-effects-spec.md`.
- Build now:
  - `/projects` list behavior
  - project detail tabs
  - ICE scoring and ownership/accountability fields
  - project issues tab using embedded issue behavior
  - project weeks tab
  - project retro flow
  - in-place issue<->project conversion behavior
- Produce:
  - a working project module that can host both issues and weeks
- Stop when:
  - projects can be created, prioritized, reviewed, retro’d, and converted exactly as the current product does

### Q09. Program Workflows

- Goal: build the long-lived top-level planning container after projects exist.
- Read first: `screen-spec.md`, `workflow-and-action-spec.md`, `document-field-reference.md`, `domain-and-data-spec.md`, `payload-and-response-reference.md`.
- Build now:
  - `/programs` list
  - program detail tabs
  - program ownership/accountability fields
  - nested program-scoped issues, projects, and weeks
  - merge-preview and merge behavior
- Produce:
  - top-level container behavior for projects and weeks
- Stop when:
  - programs behave as the top-level planning object and drive scoped subviews correctly

### Q10. Week Workflows And Weekly Child Documents

- Goal: build the planning/execution/review engine once issues, projects, and programs already exist.
- Read first: `screen-spec.md`, `state-machine-and-lifecycle-spec.md`, `workflow-and-action-spec.md`, `document-field-reference.md`, `mutation-side-effects-spec.md`.
- Build now:
  - week creation and start-week transition
  - planning vs active/completed tab switching
  - scoped week issues and backlog behavior
  - reconciliation/carryover
  - weekly plan, weekly retro, standup, and weekly review document flows
  - approval and request-changes flows
  - review queue and child-doc review mode
- Produce:
  - the full week planning/execution/review cycle
- Stop when:
  - a week can move from planning through review with the current approval state machine and weekly child-doc behavior intact

### Q11. Dashboard And My Week

- Goal: build the user’s personal work hub after the underlying week/accountability objects exist.
- Read first: `screen-spec.md`, `screen-state-spec.md`, `workflow-and-action-spec.md`, `state-machine-and-lifecycle-spec.md`, `mutation-side-effects-spec.md`.
- Build now:
  - `/dashboard` `my-work` and `overview` modes
  - `/my-week` cards and due-state logic
  - previous-retro nudge
  - standup/plan/retro creation entrypoints
  - accountability banner and action-items modal behavior
- Produce:
  - the personal workflow surfaces that sit on top of the core work-management data
- Stop when:
  - a user can manage their week from the dashboard and My Week without needing unfinished admin/team surfaces

### Q12. Team Surfaces

- Goal: add multi-user planning and review tools after the personal and document-centric layers are in place.
- Read first: `screen-spec.md`, `shared-interaction-patterns-spec.md`, `workflow-and-action-spec.md`, `permissions-and-access-spec.md`, `mutation-side-effects-spec.md`.
- Build now:
  - allocation grid
  - directory
  - reviews grid and approval controls
  - status overview heatmap
  - org chart
  - person detail and edit surface
- Produce:
  - the management and accountability layer for teams
- Stop when:
  - managers/admins can assign work, review plans/retros, inspect team status, and manage reporting lines

### Q13. Settings, Admin, Public Feedback, And Conversion History

- Goal: finish the operational edges after the main product model is already working.
- Read first: `permissions-and-access-spec.md`, `payload-and-response-reference.md`, `workflow-and-action-spec.md`, `screen-spec.md`, `screen-state-spec.md`.
- Build now:
  - workspace settings tabs
  - members/invites/tokens/audit behavior
  - admin dashboard and admin workspace detail
  - impersonation flow
  - public feedback intake
  - historical conversion ledger screen
- Produce:
  - the operational/admin/public-facing edges of the product
- Stop when:
  - the product can be administered, invited into, audited, and used for public feedback intake

### Q14. FleetGraph

- Goal: build the AI augmentation layer last, once the product it operates on is already present.
- Read first: `fleetgraph-spec.md`, `mutation-side-effects-spec.md`, `api-and-service-spec.md`, `state-machine-and-lifecycle-spec.md`, `shared-interaction-patterns-spec.md`.
- Build now:
  - workspace queue at `/fleetgraph`
  - document-context findings panel
  - guided overlay
  - analysis FAB
  - review/apply flows
  - worker/runtime readiness and route-surface integration
  - thread-based follow-up turns
- Produce:
  - both proactive and on-demand FleetGraph behavior on top of the rebuilt Ship surface
- Stop when:
  - FleetGraph can analyze current context, queue findings, review actions, apply them, and refresh the host UI correctly

### Q15. Final Compatibility, Hardening, And Acceptance Pass

- Goal: make the rebuild current-state accurate, not just feature-complete.
- Read first: `acceptance-and-rebuild-checklist.md`, `implementation-constraints.md`, `constitution-check.md`, plus any spec docs touched by remaining gaps.
- Build now:
  - route alias verification
  - week/sprint terminology compatibility
  - raw-vs-wrapped API verification
  - visibility/access edge checks
  - conversion-model split verification
  - collaboration cache/reconnect edge verification
  - performance/security/deploy hardening needed to match current constraints
- Produce:
  - a rebuild that behaves like current Ship, including the awkward but real compatibility layers
- Stop when:
  - the acceptance checklist passes and no remaining slice requires code-spelunking to explain why it works

## Why This Order Works

1. Q01 through Q05 build the shared platform layers.
2. Q06 through Q13 build the product modules on top of that substrate in dependency-safe order.
3. Q14 comes late because FleetGraph depends on routes, mutations, editor behavior, and domain context already existing.
4. Q15 exists to catch current-state quirks that are easy to accidentally “clean up” during a rebuild.

## Safe Team Split Points

If more than one engineer is building in parallel, the safest split points are:

1. After Q05, one engineer can continue Q06-Q10 while another prepares Q12-Q13 on top of the shared substrate.
2. FleetGraph should still remain mostly last because it depends on the surrounding product slices being stable.
3. The final compatibility pass should be shared, because it spans every module and many transitional behaviors.

## Relationship To Other Rebuild Docs

| Doc | Use it for |
| --- | --- |
| `task-breakdown.md` | Macro dependency/workstream map |
| `developer-build-queue.md` | One-by-one implementation order |
| `acceptance-and-rebuild-checklist.md` | End-state QA contract |
| `README.md` | Entry point and reading paths |
