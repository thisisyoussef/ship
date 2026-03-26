# Ship Product Requirements Document

## Document Purpose

This document is the single-file product requirements document for Ship.
It is the top-level implementation handoff for rebuilding the current Ship product end to end.

This PRD is:

- product-only
- current-state oriented, not a redesign proposal
- complete enough to brief an engineer or software factory from one document
- backed by the deeper supporting specs in this folder

This PRD does not include FleetGraph or AI harness workflow material.

## How To Use This PRD

Use this file as the first document for any rebuild effort.
After reading it once, use the supporting files in this pack as precision references for exact route-state handling, field-level payloads, and acceptance verification.

Recommended usage:

1. Read this PRD top to bottom.
2. Use `developer-build-queue.md` for the day-by-day implementation order.
3. Use `acceptance-and-rebuild-checklist.md` for final QA.
4. Use the remaining files in this folder as deeper appendices when exact implementation details are needed.

## 1. Executive Summary

Ship is a project-management product built on one central idea: everything content-like is a document with properties.
Wiki pages, issues, projects, programs, weeks, weekly plans, retros, standups, reviews, and person profiles are all represented in one shared document graph, then surfaced through different route families, list views, and workflow rules.

The product combines:

- knowledge management
- issue tracking
- project and program planning
- weekly planning and accountability
- team allocation and review workflows
- shared rich-text collaboration
- workspace administration
- super-admin operations
- public feedback intake

The rebuild target is the current shipped behavior, not an idealized future architecture.
Compatibility quirks such as week/sprint naming overlap, canonical `/documents/:id/*` routing, in-place issue/project conversion, and `properties.user_id` on person documents must be preserved deliberately.

## 2. Product Goals

The rebuilt product must:

1. Preserve Ship's unified document architecture instead of splitting the product into separate siloed modules.
2. Preserve weekly planning and retrospectives as first-class operational workflows, not optional side documents.
3. Preserve one shared app shell, one shared detail-page model, and one shared collaboration/editor substrate across most document types.
4. Preserve workspace-scoped access and simple authorization rules.
5. Preserve the current route map, route aliases, payload compatibility, and post-mutation side effects.
6. Be implementable as a monorepo with a React frontend, Express backend, PostgreSQL database, and WebSocket collaboration server.

## 3. Non-Goals

This PRD does not authorize:

1. redesigning the information architecture
2. introducing per-document ACLs beyond current private-document behavior
3. replacing the unified document model with type-specific content tables
4. removing week/sprint compatibility layers
5. introducing FleetGraph, AI harness behavior, or unrelated experimentation into the Ship product
6. normalizing away current transitional behavior unless every affected route, payload, and UI contract changes together

## 4. Core Product Principles

| Principle | Meaning in Ship |
| --- | --- |
| Everything is a document with properties | Wiki pages, issues, projects, programs, weeks, people, and weekly artifacts share one core model |
| Server is source of truth | Clients cache aggressively, but the authoritative state lives on the backend |
| Weekly planning is operational, not ceremonial | Weekly plans and retros drive real accountability and review workflows |
| Shared substrate over special cases | Reuse the same app shell, list substrate, detail shell, and editor model across product areas |
| Workspace-level access stays simple | Most authenticated content is workspace-visible unless explicitly private |
| Current-state fidelity matters | Preserve legacy redirects, compatibility shims, and transitional behavior where the product still depends on them |

## 5. Users And Roles

| Role | Responsibilities |
| --- | --- |
| Workspace member | Read and edit documents, create issues/projects/programs, participate in weekly planning, and use team surfaces allowed by role |
| Manager / reviewer | Review weekly plans and retros, request changes, approve artifacts, rate outcomes, inspect allocation and status views |
| Workspace admin | Manage members, invites, tokens, audit logs, settings, archived people, and private-document overrides |
| Super admin | Manage all workspaces and users, inspect global audit data, impersonate users, and administer workspace-level state without membership |
| External submitter | Submit public feedback to a program through the public feedback form |

## 6. Product Scope

The rebuilt Ship product includes the following modules:

1. Setup, login, invite acceptance, workspace switching, and session handling
2. Dashboard and My Week
3. Documents and wiki-style content
4. Issues
5. Projects
6. Programs
7. Weeks and weekly child documents
8. Team allocation, directory, reviews, status overview, org chart, and person detail
9. Workspace settings and conversion history
10. Super-admin dashboard and workspace detail
11. Public feedback intake and internal feedback follow-up
12. Shared editor, uploads, comments, history, collaboration, and AI quality-analysis affordances for weekly artifacts

## 7. System Architecture

### 7.1 Monorepo Layout

| Package | Responsibility |
| --- | --- |
| `web/` | React + Vite frontend, route pages, UI components, hooks, cached query state, editor client |
| `api/` | Express REST API, auth/session middleware, document/work-management routes, admin routes, collaboration bootstrap |
| `shared/` | Shared TypeScript contracts and constants used by frontend and backend |

### 7.2 Runtime Stack

| Layer | Current implementation |
| --- | --- |
| Runtime | Node.js 20+ |
| Package manager | pnpm 10.x |
| Frontend | React 18 + Vite |
| Backend | Express |
| Database | PostgreSQL |
| DB access | `pg` direct SQL |
| Shared contracts | TypeScript workspace package |
| Rich text | TipTap |
| Collaboration | Yjs + WebSocket |
| Client query cache | TanStack Query + IndexedDB persistence |
| Editor cache | y-indexeddb |
| UI components | shadcn/ui plus local components |

### 7.3 Deployment Surfaces

| Surface | Current role |
| --- | --- |
| AWS Elastic Beanstalk + S3/CloudFront + AWS-managed config | Canonical production baseline |
| Railway | Public demo baseline, auto-deployed from merged `master` |
| Render script | Legacy demo path still present in the repo |

### 7.4 Local Development Contract

The rebuild must preserve a developer setup that assumes:

- local PostgreSQL for development and tests
- `pnpm dev` as the main local startup path
- migrations under `api/src/db/migrations/`
- schema bootstrap snapshot in `api/src/db/schema.sql`

Useful commands:

```bash
pnpm install
pnpm dev
pnpm build
pnpm type-check
pnpm test
pnpm db:migrate
pnpm db:seed
```

## 8. Product Information Architecture

### 8.1 Canonical Route Families

| Product area | Canonical route(s) | Purpose |
| --- | --- | --- |
| Setup and auth | `/setup`, `/login`, `/invite/:token` | First-run bootstrap, login, invite acceptance, session recovery |
| Dashboard | `/dashboard`, `/my-week` | Personal work focus, week summaries, accountability prompts |
| Documents | `/docs`, `/documents/:id/*` | Workspace knowledge base plus canonical detail page for most document types |
| Issues | `/issues`, `/documents/:id` for issue detail | Work-item listing, filtering, bulk actions, issue detail |
| Projects | `/projects`, `/documents/:id/*` for project detail | Project planning, issue grouping, week linkage, retro workflow |
| Programs | `/programs`, `/documents/:id/*` for program detail | Top-level initiative containers and scoped subviews |
| Weeks | `/my-week`, `/documents/:id/*` for week detail | Planning, execution, review, and weekly artifact workflows |
| Team | `/team/allocation`, `/team/directory`, `/team/status`, `/team/reviews`, `/team/org-chart`, `/team/:id` | Allocation, people management, accountability, review, reporting structure |
| Settings | `/settings`, `/settings/conversions` | Workspace admin controls, invite/member/token/audit management, conversion history |
| Admin | `/admin`, `/admin/workspaces/:id` | Super-admin-only global administration |
| Public feedback | `/feedback/:programId` and internal `/feedback/:id` redirect | External submission and internal issue-backed follow-up |

### 8.2 Canonical Detail Routing

`/documents/:id/*` is the canonical detail route for almost every document-like entity.

Rules that must be preserved:

1. The route wildcard is parsed into a tab plus optional nested path.
2. Valid tabs depend on the current document type and, for weeks, the current week status.
3. Invalid tabs redirect to `/documents/:id` with `replace: true`.
4. Creation flows navigate directly into canonical detail routes.
5. Review flows for weekly plan and retro documents use `?review=true&sprintId=:id`.

### 8.3 Detail Tab Matrix

| Document type | Canonical tabs |
| --- | --- |
| `wiki` | none |
| `issue` | none |
| `project` | `issues`, `details`, `weeks`, `retro` |
| `program` | `overview`, `issues`, `projects`, `weeks` |
| `sprint` in planning state | `overview`, `plan` |
| `sprint` in active or completed state | `overview`, `issues`, `review`, `standups` |
| `weekly_plan` | none, but may run in review mode |
| `weekly_retro` | none, but may run in review mode |
| `standup` | none |
| `person` | not canonical here; person detail stays on `/team/:id` |

### 8.4 Redirects And Compatibility Routes

The rebuild must preserve these compatibility behaviors:

1. `/docs/:id` redirects to `/documents/:id`
2. `/issues/:id` redirects to `/documents/:id`
3. `/projects/:id` redirects to `/documents/:id`
4. `/programs/:id/*` redirects into `/documents/:id/*`
5. `/programs/:programId/sprints/:id` redirects to `/documents/:id`
6. `/sprints` redirects to `/team/allocation`
7. `/sprints/:id/*` redirects to canonical week detail routes
8. `/feedback/:id` resolves internal feedback and redirects to canonical issue/document detail

## 9. Shared UX And Interaction Model

### 9.1 App Shell

Most authenticated product routes live inside a shared shell with:

1. left icon rail
2. contextual sidebar
3. main content area
4. optional right properties panel on document detail pages
5. global command palette
6. session-timeout handling
7. accountability/action-item prompts

Super-admin routes remain separate from the normal app shell, but they still preserve the same product-level auth and redirect semantics.

Shared shell rules:

1. `Cmd+K` / `Ctrl+K` opens the command palette from anywhere in the app shell.
2. Left-rail mode is derived from the current route and, for `/documents/:id/*`, from the current document type.
3. Left sidebar collapse state persists in localStorage.
4. The expanded left sidebar is hidden for `/my-week`, `weekly_plan`, `weekly_retro`, and `standup` detail views.
5. Session timeout warnings appear before expiry and can trigger `extend-session`.

### 9.2 Four-Panel Detail Layout

The canonical editor/detail experience uses a shared four-panel structure:

| Panel | Purpose |
| --- | --- |
| Icon rail | App-mode navigation |
| Contextual sidebar | Mode-specific collection list and quick-create affordances |
| Main content | Title, badges, sync status, presence, editor body, review affordances |
| Properties sidebar | Type-specific metadata and mutation controls |

All new document-like items default to title `"Untitled"`.

### 9.3 Shared List Substrate

Collection surfaces must reuse the shared list pattern rather than inventing custom behavior.

Required shared behaviors:

1. filter and search controls
2. persisted view modes where applicable
3. persisted column visibility where applicable
4. hover-visible selection checkboxes
5. range selection, toggle selection, context-menu selection, and keyboard navigation
6. bulk action bars that only appear when items are selected

Expected view types:

| Surface | Required views |
| --- | --- |
| Documents | tree and list |
| Issues | list and kanban |
| Projects | list and kanban-style browsing |
| Programs | sortable list |
| Team surfaces | grid, directory list, org chart, or review matrix depending on use case |

### 9.4 Screen-State Taxonomy

All major screens should express current-state behavior through a common state vocabulary:

1. loading
2. empty
3. blocked
4. success
5. review-specific state
6. mutation feedback state

The rebuild must preserve explicit blocked and review states rather than hiding unavailable actions silently.

## 10. Core Domain Model

### 10.1 Base Document Contract

All content-like entities share one base contract:

| Field | Purpose |
| --- | --- |
| `id` | Canonical UUID |
| `workspace_id` | Workspace scope |
| `document_type` | Type discriminator |
| `title` | User-facing title, defaults to `"Untitled"` |
| `content` | TipTap JSON content |
| `yjs_state` | Collaboration CRDT state |
| `properties` | Type-specific JSON properties |
| `parent_id` | Hierarchical containment |
| `visibility` | `workspace` or `private` |
| `created_by`, `created_at`, `updated_at` | Audit and mutation tracking |

### 10.2 Relationship Model

Ship uses two relationship patterns:

| Mechanism | Use case |
| --- | --- |
| `parent_id` | Hierarchical containment such as nested wiki pages or week child documents |
| `document_associations` | Organizational relationships such as program, project, and week membership |

Rebuild rules:

1. Keep `parent_id` for containment only.
2. Use `document_associations` for organizational membership.
3. Do not reintroduce removed legacy association columns as the primary source of truth.

### 10.3 Document Types

| Document type | Purpose | Key responsibilities |
| --- | --- | --- |
| `wiki` | General documentation | Knowledge pages, nested docs, backlinks, rich text |
| `issue` | Work item | Workflow state, assignment, priority, ticket numbering, scoped issue views |
| `project` | Time-bounded deliverable | ICE scoring, issue grouping, weeks tab, retro workflow |
| `program` | Long-lived initiative or product area | Prefix ownership, scoped issues/projects/weeks, merge workflow |
| `sprint` | Week document using historical DB naming | Explicit program-week container with `sprint_number` and `owner_id` |
| `weekly_plan` | Weekly planning artifact | Hypothesis for upcoming work |
| `weekly_retro` | Weekly retrospective artifact | Conclusion and learning loop after the week |
| `standup` | Daily standup artifact | In-week status capture |
| `weekly_review` | Review-specific weekly artifact contract | Approval/rating companion for week review flows |
| `person` | Editable people/profile document | Profile content, reporting line, `properties.user_id` link to auth user |

### 10.4 Week Model

Weeks are a defining product concept.

Rules that must be preserved:

1. A week window is a derived 7-day time window based on workspace `sprint_start_date`.
2. A week document is explicit, per-program, and stored as `document_type='sprint'`.
3. Week dates are computed from `sprint_number` and workspace start date.
4. Week status is computed from dates rather than stored manually.
5. Every week has exactly one owner in `properties.owner_id`.
6. A person can only own one week per week window across all programs.
7. Week child documents include weekly plan, weekly retro, and standup documents.

### 10.5 Weekly Accountability Model

Weekly accountability is not optional add-on behavior.

The week workflow follows the scientific method:

1. Weekly Plan = hypothesis
2. The Week = experiment
3. Weekly Retro / Review = conclusion

Key product rules:

1. Weekly Plan and Weekly Retro are required artifacts in the product model, even if they are not blocking gates.
2. Missing or late artifacts must be visually obvious.
3. Reviewers can approve, unapprove, request changes, and rate weekly artifacts.
4. Weekly child documents can enter a special review mode via query params.

### 10.6 Issue, Project, And Program Model

Issues, projects, and programs are different lenses over the same graph:

1. Issues are the atomic work items.
2. Projects group issues into time-bounded deliverables.
3. Programs group projects, issues, and weeks into long-lived initiative containers.
4. Issues can belong to program, project, and week contexts at the same time.
5. Ticket numbers are sequential per program and use program prefixes.
6. Project and week workflows preserve separate accountability and review fields.

### 10.7 Person And Workspace Model

Authorization and content are separate:

| Concern | Source of truth |
| --- | --- |
| Authentication and membership | `users`, `workspace_memberships`, sessions, invites, tokens |
| Person profile content | `documents` with `document_type='person'` |

Critical compatibility rule:

- Person documents use `properties.user_id` as the real runtime link to `users.id`, even though some shared TypeScript layers lag behind that truth.

### 10.8 Visibility Model

Ship uses a simple visibility rule:

`visibility = 'workspace' OR created_by = currentUser OR isWorkspaceAdmin = true`

Implications:

1. Workspace-visible docs are visible to all workspace members.
2. Private docs are visible only to their creator or a workspace admin.
3. Private-document misses return `404`, not `403`.
4. Explicit visibility changes cascade to descendants.
5. If a document becomes private, collaboration sessions for unauthorized users are closed.

## 11. Permissions, Access, And Security

### 11.1 Access Modes

| Mode | Usage |
| --- | --- |
| Public | Setup, login, invite validation, and public feedback |
| Browser session | Main authenticated product UI |
| API token | Programmatic access using Bearer tokens |
| Super-admin override | Global administration without workspace membership |

### 11.2 Role Model

| Role | Effective power |
| --- | --- |
| Member | Normal workspace access subject to visibility rules |
| Workspace admin | Workspace-level admin surfaces plus private-doc override |
| Super admin | Global workspace and user administration plus workspace-admin bypass |

### 11.3 Surface Gating

The rebuild must preserve these gates:

1. `/setup` only works before the first user exists.
2. `/login` is public but redirects signed-in users away.
3. Protected shell routes require an authenticated session or equivalent token context.
4. `/settings` is workspace-admin-only.
5. `/admin` and `/admin/workspaces/:id` are super-admin-only.
6. Person metrics and approval actions use narrower reviewer rules on top of general membership.

### 11.4 Session And Security Requirements

Required current-state security behavior:

1. browser sessions use secure cookies with inactivity timeout
2. inactivity timeout is 15 minutes
3. absolute session timeout is 12 hours
4. session expiry returns `401` with session-expired semantics
5. browser state-changing requests require CSRF
6. Bearer-token requests bypass CSRF
7. same-origin `returnTo` handling is validated
8. general API rate limiting is enabled
9. login uses stricter failed-attempt rate limiting
10. Helmet, CSP, and HSTS protections are part of the contract

### 11.5 Mutation Authority Rules

Important authority rules that must be preserved:

1. Private-document visibility changes are limited to the creator or a workspace admin.
2. Generic `document_type` changes are limited to the creator and exclude `program` and `person`.
3. Issue-to-project and project-to-issue conversion is creator-only.
4. Undo conversion is limited to the creator or the recorded converter.
5. Reporting-line edits on person documents are workspace-admin-only.
6. Week approvals and change requests are limited to reviewers such as the accountable user, the week owner’s supervisor, or a workspace admin.
7. Review approval requires a rating in the accepted range.

## 12. Functional Requirements By Product Area

### 12.1 Setup, Login, Invites, And Workspace Context

Routes:

- `/setup`
- `/login`
- `/invite/:token`
- workspace switching via `/api/workspaces/:id/switch`

Required behavior:

1. First-run setup initializes the first workspace, first super-admin, linked person document, and welcome content.
2. Completed setup redirects to `/login`.
3. Login supports session bootstrap, expired-session recovery, and preserved return targets.
4. Invite routes distinguish valid, invalid, expired, accepted, and already-member states.
5. Invite acceptance can create a new user or link an existing one to the workspace.
6. Workspace switching reloads the shell into the selected workspace context.
7. `ProtectedRoute` preserves the prior destination when redirecting to login.

### 12.2 Documents And Knowledge Management

Routes:

- `/docs`
- `/documents/:id`

Required behavior:

1. Documents page supports tree and list views.
2. Documents can be created at the top level or nested under a parent.
3. Creation opens the new document immediately at its canonical detail route.
4. Generic documents support title editing, rich-text editing, properties updates, associations, and visibility changes.
5. Search, filtering, selection, bulk delete, and single delete must work from the documents list.
6. Backlinks, links, comments, files, and activity must be available as supporting document features.

### 12.3 Issues

Routes:

- `/issues`
- `/documents/:id` for issue detail

Required behavior:

1. Issues list supports list and kanban modes.
2. State filters sync to the URL.
3. Issues support create, update, delete, archive, and bulk actions.
4. Issues support ticket-number lookup and program-prefixed sequential numbering.
5. Embedded issue lists work in program, project, week, and locked-filter contexts.
6. Backlog picker and show-all flows can pull existing issues into the current scope.
7. Issue history and iteration logging are preserved.
8. Specialized triage accept/reject actions remain available where the product currently uses them.
9. Issues support promote-to-project conversion.

### 12.4 Projects

Routes:

- `/projects`
- `/documents/:id/details`
- `/documents/:id/issues`
- `/documents/:id/weeks`
- `/documents/:id/retro`

Required behavior:

1. Projects list supports filtering by status and program.
2. Projects can be created, archived, deleted, and opened from the list.
3. Project detail supports details, issues, weeks, and retro tabs.
4. Project properties include ICE scoring, ownership, accountability, design-review flags, color, and emoji.
5. Project retro supports draft and saved states, issue-summary cards, plan validation, impact editing, and success-criteria editing.
6. Project plan and retro approvals remain separate fields and actions.
7. Current issue-to-project and project-to-issue conversion behavior is in-place and snapshot-based.

### 12.5 Programs

Routes:

- `/programs`
- `/documents/:id/overview`
- `/documents/:id/issues`
- `/documents/:id/projects`
- `/documents/:id/weeks`

Required behavior:

1. Programs are top-level initiative containers.
2. Programs can be created, opened, archived, deleted, and sorted from the list.
3. Program detail exposes overview, issues, projects, and weeks tabs.
4. Program ownership and accountability fields are editable.
5. Program-scoped issue, project, and week subviews preserve scoped behavior.
6. Program merge-preview and merge workflow must remain available.

### 12.6 Weeks And Weekly Child Documents

Routes:

- `/documents/:weekId/overview`
- `/documents/:weekId/plan`
- `/documents/:weekId/issues`
- `/documents/:weekId/review`
- `/documents/:weekId/standups`
- weekly child-doc routes under `/documents/:id`

Required behavior:

1. Weeks are explicit documents created for a program and week number.
2. Planning weeks expose `overview` and `plan`.
3. Active or completed weeks expose `overview`, `issues`, `review`, and `standups`.
4. Start-week action transitions a planning week into its active/completed tab set.
5. Week issues tab supports scoped issues, backlog assignment, show-all expansion, and inline week assignment.
6. Review workflow supports draft, save, and update states.
7. Reconciliation supports `next_sprint`, `backlog`, `close_done`, and `close_cancelled`.
8. Moving incomplete work to the next week creates the next week automatically when needed.
9. Weekly plan and retro documents can open in review mode through `?review=true&sprintId=:id`.
10. Review queue actions advance correctly after approval or request-changes operations.
11. AI plan/retro analysis status and quality banners remain part of the weekly artifact experience where currently supported.

### 12.7 Dashboard And My Week

Routes:

- `/dashboard`
- `/my-week`

Required behavior:

1. Dashboard supports `my-work` and `overview` modes.
2. Dashboard surfaces accountability prompts and focus summaries.
3. My Week supports week navigation and URL sync.
4. My Week supports creation entrypoints for missing weekly plan, retro, and standup documents.
5. Due-state messaging depends on selected week and assigned projects.
6. Previous-retro nudges remain separate from the selected-week state.
7. My Week acts as the post-login landing experience through `/`.

### 12.8 Team Surfaces

Routes:

- `/team/allocation`
- `/team/directory`
- `/team/reviews`
- `/team/status`
- `/team/org-chart`
- `/team/:id`

Required behavior:

1. Allocation grid supports my-team/everyone filtering, archived toggle, past-weeks toggle, search, lazy week loading, assignment, and unassignment.
2. Allocation grid groups by program for the relevant week and warns about orphaned issues when removing the last assigned person.
3. Directory supports archived toggle, person open, and admin management affordances.
4. Reviews grid supports plan approval, retro approval, request-changes, rating, and queue assistance.
5. Status overview renders accountability heatmap behavior.
6. Org chart supports search, keyboard navigation, drag/drop reporting-line edits, and invalid-drop prevention.
7. Person detail page supports profile editing and metrics visibility subject to role checks.

### 12.9 Workspace Settings And Admin

Routes:

- `/settings?tab=members`
- `/settings?tab=invites`
- `/settings?tab=tokens`
- `/settings?tab=audit`
- `/settings/conversions`
- `/admin?tab=workspaces`
- `/admin?tab=users`
- `/admin?tab=audit`
- `/admin/workspaces/:id`

Required behavior:

1. Members tab supports role changes, archive, restore, and archived toggle.
2. Invites tab supports invite creation, revoke, and optional PIV/X.509 subject DN capture.
3. Tokens tab supports create, list, and revoke API tokens.
4. Audit tab supports recent workspace audit logs.
5. Conversions page preserves the historical conversion ledger screen.
6. Admin workspaces tab supports create and archive workspace flows.
7. Admin users tab supports super-admin toggling and impersonation.
8. Admin audit supports export.
9. Admin workspace detail supports member management, invite management, add-existing-user, role updates, removals, and copy-invite-link behavior.

### 12.10 Public Feedback

Routes:

- `/feedback/:programId`
- authenticated internal `/feedback/:id` redirect flow

Required behavior:

1. External users can submit public feedback without authentication.
2. Public feedback writes create internal issue documents with `source='external'` and `state='triage'`.
3. Internal feedback follow-up is issue-backed and resolves into canonical issue/document routing.

## 13. Editor, Collaboration, Comments, And Files

### 13.1 Shared Editor Requirements

The shared editor must provide:

1. rich-text editing with TipTap
2. shared editor shell and properties sidebar
3. title editing and auto-save
4. document-type-specific overlays without fragmenting the editor architecture
5. mentions and embedded rich content where currently supported

### 13.2 Collaboration Model

The collaboration layer must preserve:

1. WebSocket-based Yjs transport
2. room naming by prefix plus document ID
3. loading from Yjs state or JSON fallback
4. awareness/presence support
5. debounced persistence
6. sync-status feedback
7. stale-cache clearing when fresh-from-JSON recovery is required

### 13.3 Comments, History, And Uploads

The product must preserve:

1. inline/editor comments on documents
2. document and issue history surfaces
3. file upload support through `/api/files`
4. weekly-plan and weekly-retro content history capture

### 13.4 Offline And Cache Behavior

Ship is offline-tolerant, not offline-first.

Required behavior:

1. query metadata uses stale-while-revalidate caching
2. query cache persists in IndexedDB
3. editor content caches in IndexedDB through y-indexeddb
4. offline edits are preserved and reconciled on reconnect
5. the server remains the source of truth
6. visibility revocation or offboarding can force cache invalidation or collaboration disconnects

## 14. API And Service Requirements

### 14.1 Cross-Cutting API Rules

The rebuild must preserve:

1. one Express app mounted under `/api`
2. one collaboration WebSocket service
3. `GET /health` as unauthenticated health check
4. `GET /api/csrf-token` for browser-authenticated write flows
5. OpenAPI coverage for API routes

### 14.2 Major API Namespaces

| Namespace | Must support |
| --- | --- |
| Setup and auth | setup status/init, login/logout/status/me/session, extend-session, invite validation/acceptance |
| Workspaces and memberships | workspace list/current/switch, member CRUD, invite CRUD, workspace audit |
| API tokens | create, list, revoke |
| Admin | workspaces, users, audit, impersonation, workspace detail management |
| Documents | CRUD, content routes, conversion, backlinks, links, associations, context, reverse associations |
| Issues | listing, single issue, children, CRUD, bulk mutate, accept/reject, history, iterations |
| Projects | CRUD, issues, weeks, retro, approvals |
| Programs | CRUD, issues, projects, weeks, merge-preview, merge |
| Weeks | CRUD, lookup helpers, my-week, action items, start, plan, issues, standups, review, carryover, approvals |
| Weekly docs and dashboard | weekly plan/retro/standup endpoints, dashboard summaries, accountability feeds |
| Team | grid, assignments, people, sprint metrics, reviews, accountability matrices |
| Feedback | public submission plus internal follow-up routes |
| AI weekly artifact analysis | status and analyze-plan/analyze-retro endpoints where currently present |

### 14.3 Response And Payload Conventions

The rebuild must preserve the current wire-contract character:

1. some endpoints return wrapped envelopes while others return raw document-shaped payloads
2. many document routes flatten `properties` onto top-level response fields for compatibility
3. browser flows are same-origin and session-oriented by default
4. token flows are Bearer-oriented and bypass CSRF
5. `api/openapi.yaml` remains the exhaustive wire reference even when higher-level docs summarize the main families

### 14.4 Mutation Side Effects

The current product depends on predictable fan-out after writes:

1. query invalidation refreshes list and detail views
2. optimistic updates are used selectively on the frontend
3. navigation often changes directly into the canonical target route
4. collaboration persistence updates both JSON content and Yjs state
5. visibility changes can disconnect active editors
6. review actions advance review queues and refresh document review state
7. conversion actions rely on client navigation and invalidation, not a special collaboration close workflow

## 15. Non-Functional Requirements

### 15.1 Performance And Caching

1. Use stale-while-revalidate behavior for list and metadata queries.
2. Load cached editor content instantly where available.
3. Preserve optimistic-update-with-rollback behavior for writes that currently use it.
4. Prefer direct SQL and simple server architecture over abstraction-heavy layers.

### 15.2 Accessibility

The product must meet strict accessibility expectations:

1. keyboard navigation across lists, dialogs, and editor surfaces
2. screen-reader-compatible controls and labels
3. focus management for dialogs and overlays
4. adequate contrast and visible focus states
5. icon-only controls with proper accessible labeling and tooltip support

### 15.3 Security And Compliance

1. Preserve session-cookie auth and CSRF enforcement for browser writes.
2. Preserve stricter login rate limiting and general API rate limiting.
3. Preserve secure cookie/session behavior and same-origin redirect validation.
4. Preserve auditable admin and membership workflows.

### 15.4 Observability

Operational behavior should preserve:

1. structured JSON logging
2. AWS-compatible observability assumptions
3. auditability for admin and membership changes
4. health endpoint plus deploy-surface verification

### 15.5 Migrations And Schema Management

1. Schema changes go in numbered SQL migration files.
2. `schema.sql` is the bootstrap snapshot, not the live change log.
3. Rollback and migration review remain part of safe delivery.

## 16. Rebuild Sequence

Rebuild the product in this order:

| Phase | Outcome |
| --- | --- |
| Q00 | Align on current-state fidelity, constraints, and compatibility rules |
| Q01 | Build auth, setup, invite acceptance, session handling, and workspace context |
| Q02 | Build unified document storage, associations, compatibility flattening, and person-to-user linking |
| Q03 | Build canonical routing, app shell, and redirect behavior |
| Q04 | Build shared list substrate |
| Q05 | Build shared editor and collaboration substrate |
| Q06 | Build generic documents/wiki and canonical detail shell |
| Q07 | Build issue workflows and embedded issue surfaces |
| Q08 | Build project workflows |
| Q09 | Build program workflows |
| Q10 | Build week workflows and weekly child documents |
| Q11 | Build dashboard and My Week |
| Q12 | Build team surfaces |
| Q13 | Build settings, admin, conversions, and public feedback |
| Q14 | Run compatibility hardening and acceptance pass |

## 17. Acceptance Criteria For The Rebuild

The rebuild is complete when:

1. canonical routes, redirects, and query params match the current contract
2. loading, empty, blocked, review, and mutation-result states match current behavior
3. shared list, selection, keyboard, and persistence behavior match current behavior
4. document fields, compatibility shims, and computed properties match current behavior
5. workflow and action behavior match current behavior
6. all major modules in this PRD are implemented
7. the final product passes the route-by-route acceptance checklist

Critical acceptance checks include:

| Route | Interaction | Expected result |
| --- | --- | --- |
| `/login` | Log in with a preserved return target | User lands on the requested destination |
| `/my-week` | Switch week forward/back | URL and visible week stay in sync |
| `/docs` | Toggle tree/list and visibility filter | Layout and visible docs update correctly |
| `/issues` | Select rows and trigger bulk bar | Selection state and bulk affordances appear correctly |
| `/projects` | Filter by status and program | Counts and visible rows recompute correctly |
| `/programs` | Create a new program | New program opens at canonical detail route |
| `/documents/:projectId/details` | Edit project properties | Changes persist while staying on canonical routing |
| `/documents/:weekId/plan` | Start the week | Tab set changes from planning to execution/review |
| `/documents/:weekId/review` | Reconcile incomplete issues | Each decision updates week reconciliation state |
| `/documents/:weeklyPlanId?review=true&sprintId=:weekId` | Approve or request changes | Review-mode UI changes approval state |
| `/team/allocation` | Assign work to a person-week cell | Grid updates while grouping stays coherent |
| `/settings?tab=members` | Archive a member | Archived-member state and access behavior update |
| `/admin?tab=users` | Impersonate a user | Super admin enters impersonation flow |

## 18. Compatibility Behaviors That Must Be Preserved

These are not optional cleanup opportunities.
They are part of the current product contract.

1. User-facing "week" terminology still interoperates with `sprint`-named routes, tables, and API shapes.
2. `/documents/:id/*` remains the canonical detail route for most document types.
3. Legacy detail routes still redirect into canonical document routing.
4. Current issue/project conversion is in-place and snapshot-based, while the conversions history surface still reflects older archived-original language and records.
5. Person documents keep `properties.user_id` as the real auth-content link.
6. Updating week ownership mirrors owner information into older compatibility shapes where required.
7. Workspace switching still relies on a hard reload pattern after success unless the response contract changes everywhere.
8. Private-document denials remain `404`.
9. Collaboration access checks remain aligned with document visibility rules.

## 19. Supporting Docs In This Pack

This PRD is the one-document starting point.
The following files remain important precision references:

| File | Use it for |
| --- | --- |
| `README.md` | Pack structure and reading paths |
| `feature-spec.md` | Scope, fidelity target, and out-of-scope boundaries |
| `developer-build-queue.md` | Detailed one-by-one build sequence |
| `task-breakdown.md` | Macro dependency map |
| `product-overview.md` | Product thesis, personas, and work loops |
| `navigation-and-routing-spec.md` | Exact route, redirect, and query-param behavior |
| `screen-spec.md` | Route-by-route UI behavior |
| `screen-state-spec.md` | Loading/blocked/review/mutation states |
| `state-machine-and-lifecycle-spec.md` | Session, invite, week, and approval state machines |
| `shared-interaction-patterns-spec.md` | Shared shell, list, keyboard, and detail interaction rules |
| `domain-and-data-spec.md` | Entity model and data invariants |
| `document-field-reference.md` | Field-level contract and compatibility flattening |
| `permissions-and-access-spec.md` | Access boundaries and mutation authority |
| `payload-and-response-reference.md` | Dominant request/response families |
| `workflow-and-action-spec.md` | End-to-end mutation behavior |
| `mutation-side-effects-spec.md` | Invalidation, broadcast, navigation, and collaboration fan-out |
| `api-and-service-spec.md` | Endpoint inventory and service boundaries |
| `editor-and-collaboration-spec.md` | Shared editor, uploads, comments, history, and collaboration details |
| `acceptance-and-rebuild-checklist.md` | Final route-by-route QA gate |
| `implementation-constraints.md` | Stack, security, caching, migration, and deployment constraints |

## 20. Final Instruction For Rebuilders

If there is a disagreement between a speculative simplification and the current documented behavior, choose the current documented behavior.
Ship should be rebuilt as it is, not as it would be if it were redesigned today.
