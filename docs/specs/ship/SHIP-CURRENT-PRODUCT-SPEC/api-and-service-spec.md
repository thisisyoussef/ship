# API And Service Spec

Use this document with `workflow-and-action-spec.md` for the user-visible mutation contract and `document-field-reference.md` for the data shapes these routes read and write.

## API Architecture Summary

Ship uses a single Express application mounted under `/api` plus a separate WebSocket collaboration server. The REST API is grouped by product capability rather than by frontend page, and most authenticated browser flows use session cookies while API/token flows can use Bearer tokens.

## Cross-Cutting API Rules

1. `GET /health` is the unauthenticated health endpoint.
2. `GET /api/csrf-token` provides the CSRF token for session-authenticated state changes.
3. State-changing routes are CSRF-protected unless using Bearer token auth.
4. General API rate limiting applies to `/api/*`; login has a stricter failed-attempt limiter.
5. Swagger/OpenAPI documentation is generated from the checked-in route/schema registry and emitted to `api/openapi.yaml`.

## Auth, Setup, And Session Endpoints

| Namespace | Key endpoints | Behavior |
| --- | --- | --- |
| Setup | `GET /api/setup/status`, `POST /api/setup/initialize` | Detect first-run and create initial admin account |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/status`, `GET /api/auth/me`, `POST /api/auth/extend-session`, `GET /api/auth/session` | Session lifecycle, current-user bootstrap, workspace context |
| CAIA/PIV | `GET /api/auth/caia/status`, `GET /api/auth/caia/login`, `GET /api/auth/caia/callback` and `/api/auth/piv/*` alias | PIV/CAIA identity flow |
| Invites | `GET /api/invites/:token`, `POST /api/invites/:token/accept` | Invite validation and acceptance |

## Workspace, Member, And Admin Endpoints

### Workspace-member endpoints

| Namespace | Key endpoints | Behavior |
| --- | --- | --- |
| Workspaces | `GET /api/workspaces`, `GET /api/workspaces/current`, `POST /api/workspaces/:id/switch` | Workspace enumeration and active-workspace switching |
| Workspace members | `GET /api/workspaces/:id/members`, `POST /api/workspaces/:id/members`, `PATCH /api/workspaces/:id/members/:userId`, `DELETE /api/workspaces/:id/members/:userId`, `POST /api/workspaces/:id/members/:userId/restore` | Member list, add/update/remove/restore |
| Workspace invites | `GET /api/workspaces/:id/invites`, `POST /api/workspaces/:id/invites`, `DELETE /api/workspaces/:id/invites/:inviteId` | Invite management |
| Workspace audit | `GET /api/workspaces/:id/audit-logs` | Workspace-level audit inspection |
| API tokens | `POST /api/api-tokens`, `GET /api/api-tokens`, `DELETE /api/api-tokens/:id` | Create/list/revoke API tokens |

### Super-admin endpoints

| Namespace | Key endpoints | Behavior |
| --- | --- | --- |
| Admin workspaces | `GET /api/admin/workspaces`, `POST /api/admin/workspaces`, `PATCH /api/admin/workspaces/:id`, `POST /api/admin/workspaces/:id/archive`, `GET /api/admin/workspaces/:id` | Global workspace administration |
| Admin users | `GET /api/admin/users`, `GET /api/admin/users/search`, `PATCH /api/admin/users/:id/super-admin` | User administration and search |
| Admin workspace detail | `GET /api/admin/workspaces/:id/members`, `GET /api/admin/workspaces/:id/invites`, `POST /api/admin/workspaces/:id/invites`, `POST /api/admin/workspaces/:id/members`, `PATCH /api/admin/workspaces/:workspaceId/members/:userId`, `DELETE /api/admin/workspaces/:workspaceId/members/:userId` | Workspace detail page behavior |
| Admin audit/debug | `GET /api/admin/audit-logs`, `GET /api/admin/audit-logs/export`, `POST /api/admin/impersonate/:userId`, `DELETE /api/admin/impersonate`, `GET /api/admin/debug/*`, `POST /api/admin/debug/orphans/fix`, `DELETE /api/admin/debug/users/:id` | Global audit, impersonation, and repair utilities |
| Admin credentials | `GET /api/admin/credentials`, `POST /api/admin/credentials/save`, `POST /api/admin/credentials/test-api`, `POST /api/admin/credentials/test`, `GET /api/admin/credentials/status` | Super-admin credential/test surface |

## Document, Content, And Knowledge Endpoints

| Namespace | Key endpoints | Behavior |
| --- | --- | --- |
| Documents | `GET /api/documents`, `GET /api/documents/:id`, `POST /api/documents`, `PATCH /api/documents/:id`, `DELETE /api/documents/:id` | Core document CRUD |
| Document content | `GET /api/documents/:id/content`, `PATCH /api/documents/:id/content` | Explicit content fetch/update paths |
| Document conversion | `GET /api/documents/converted/list`, `POST /api/documents/:id/convert`, `POST /api/documents/:id/undo-conversion` | Issue↔project conversion model; current conversions are in-place with snapshots, while the list route still reflects legacy archived-original records |
| Backlinks | `GET /api/documents/:id/backlinks`, `POST /api/documents/:id/links` | Link tracking and backlinks |
| Associations | `GET /api/documents/:id/associations`, `POST /api/documents/:id/associations`, `DELETE /api/documents/:id/associations/:relatedId`, `GET /api/documents/:id/reverse-associations`, `GET /api/documents/:id/context` | Association and contextual relationship queries |
| Comments | `GET /api/documents/:id/comments`, `POST /api/documents/:id/comments`, plus `/api/comments/*` mutation routes | Inline/editor comment system |
| Files | `/api/files` POST/GET endpoints | Upload and attachment support |
| Search | `GET /api/search/*` | Read-only search routes |
| Activity | `GET /api/activity/:entityType/:entityId` | Activity feed lookup |
| Claude context | `GET /api/claude/context` | Read-only AI helper context route |

## Work-Management Endpoints

### Issues

| Key endpoints | Behavior |
| --- | --- |
| `GET /api/issues` | Filterable issue listing |
| `GET /api/issues/action-items` | System-generated accountability issue feed |
| `GET /api/issues/by-ticket/:number` | Ticket-number lookup |
| `GET /api/issues/:id` | Single issue |
| `GET /api/issues/:id/children` | Child issue relationships |
| `POST /api/issues` | Issue creation |
| `PATCH /api/issues/:id` | Issue update |
| `POST /api/issues/bulk` | Bulk issue mutation |
| `DELETE /api/issues/:id` | Issue deletion |
| `POST /api/issues/:id/accept`, `POST /api/issues/:id/reject` | Specialized issue decision endpoints |
| `GET /api/issues/:id/history`, `POST /api/issues/:id/history` | Issue history |
| `POST /api/issues/:id/iterations`, `GET /api/issues/:id/iterations` | Issue iteration logging |

### Programs

| Key endpoints | Behavior |
| --- | --- |
| `GET /api/programs`, `GET /api/programs/:id`, `POST /api/programs`, `PATCH /api/programs/:id`, `DELETE /api/programs/:id` | Program CRUD |
| `GET /api/programs/:id/issues` | Program issue list |
| `GET /api/programs/:id/projects` | Program project list |
| `GET /api/programs/:id/sprints` | Program week list |
| `GET /api/programs/:id/merge-preview`, `POST /api/programs/:id/merge` | Program merge workflow |

### Projects

| Key endpoints | Behavior |
| --- | --- |
| `GET /api/projects`, `GET /api/projects/:id`, `POST /api/projects`, `PATCH /api/projects/:id`, `DELETE /api/projects/:id` | Project CRUD |
| `GET /api/projects/:id/issues` | Project issue list |
| `GET /api/projects/:id/weeks` and legacy `GET /api/projects/:id/sprints` | Project week list |
| `POST /api/projects/:id/sprints` | Create week/sprint within project context |
| `GET /api/projects/:id/retro`, `POST /api/projects/:id/retro`, `PATCH /api/projects/:id/retro` | Project retro lifecycle |
| `POST /api/projects/:id/approve-plan`, `POST /api/projects/:id/approve-retro` | Project accountability approval flows |

### Weeks

| Key endpoints | Behavior |
| --- | --- |
| `GET /api/weeks`, `GET /api/weeks/:id`, `POST /api/weeks`, `PATCH /api/weeks/:id`, `DELETE /api/weeks/:id` | Week document CRUD |
| `GET /api/weeks/lookup-person`, `GET /api/weeks/lookup` | Helper lookups for person/week context |
| `GET /api/weeks/my-week`, `GET /api/weeks/my-action-items` | Personal week/accountability entrypoints |
| `POST /api/weeks/:id/start` | Start-week action |
| `PATCH /api/weeks/:id/plan` | Week plan updates |
| `GET /api/weeks/:id/issues` | Week-scoped issues |
| `GET /api/weeks/:id/scope-changes` | Scope-change analysis |
| `GET /api/weeks/:id/standups`, `POST /api/weeks/:id/standups` | Week standup access |
| `GET /api/weeks/:id/review`, `POST /api/weeks/:id/review`, `PATCH /api/weeks/:id/review` | Week review workflow |
| `POST /api/weeks/:id/carryover` | Carryover behavior |
| `POST /api/weeks/:id/approve-plan`, `POST /api/weeks/:id/unapprove-plan`, `POST /api/weeks/:id/approve-review`, `POST /api/weeks/:id/request-plan-changes`, `POST /api/weeks/:id/request-retro-changes` | Week approval/change-request workflow |

### Weekly plans, standups, iterations, and dashboard

| Namespace | Key endpoints | Behavior |
| --- | --- | --- |
| Weekly plans | `POST /api/weekly-plans`, `GET /api/weekly-plans`, `GET /api/weekly-plans/:id`, `GET /api/weekly-plans/:id/history`, `GET /api/weekly-plans/project-allocation-grid/:projectId` | Personal weekly-plan docs and related grids |
| Weekly retros | `/api/weekly-retros` routes | Personal retro docs |
| Standups | `POST /api/standups`, `GET /api/standups`, `GET /api/standups/status`, `PATCH /api/standups/:id`, `DELETE /api/standups/:id` | Daily standup lifecycle |
| Iterations | `POST /api/weeks/:id/iterations`, `GET /api/weeks/:id/iterations` | Week/story iteration logging |
| Dashboard | `GET /api/dashboard/my-work`, `GET /api/dashboard/my-focus`, `GET /api/dashboard/my-week` | Dashboard and focus summaries |
| Accountability | `GET /api/accountability/action-items` | Inference-based action-item feed |
| AI plan/retro analysis | `GET /api/ai/status`, `POST /api/ai/analyze-plan`, `POST /api/ai/analyze-retro` | AI quality analysis for plan/retro artifacts |

## Team-Service Endpoints

| Key endpoints | Behavior |
| --- | --- |
| `GET /api/team/grid` | Allocation grid data |
| `GET /api/team/projects`, `GET /api/team/programs` | Allocation pickers and lookups |
| `GET /api/team/assignments`, `POST /api/team/assign`, `DELETE /api/team/assign` | Allocation mutation lifecycle |
| `GET /api/team/people` | Team directory data |
| `GET /api/team/people/:personId/sprint-metrics` | Person profile metrics |
| `GET /api/team/accountability`, `GET /api/team/accountability-grid*` | Accountability matrices |
| `GET /api/team/reviews` | Review grid data |

## Feedback Endpoints

| Key endpoints | Behavior |
| --- | --- |
| Public `GET /api/feedback/program/:programId` and `POST /api/feedback` | External feedback submission flow |
| Authenticated `GET /api/feedback/:id` and related internal routes | Internal feedback follow-up, now issue-backed |

## Collaboration Service

### Transport

The collaboration subsystem runs over WebSocket and persists Yjs CRDT state.

Canonical behavior:

1. Room names combine a prefix and document ID.
2. The server loads existing Yjs or JSON content from the unified documents table.
3. The client uses Yjs awareness for presence/cursors.
4. Persistence is debounced.
5. The server can signal browsers to clear stale IndexedDB cache when a doc was loaded fresh from JSON rather than Yjs state.

### Collaboration side effects

When content persists, the collaboration service also:

1. stores JSON content alongside Yjs binary state
2. extracts plan/success-criteria/vision/goals metadata from content
3. writes weekly-plan/retro content history entries with throttling

## FleetGraph Endpoints

| Key endpoints | Behavior |
| --- | --- |
| `GET /api/fleetgraph/ready` | Readiness check gated by service token |
| `POST /api/fleetgraph/entry` | Contextual entry creation for document-page interactions |
| `POST /api/fleetgraph/entry/apply` | Apply reviewed document-context action |
| `GET /api/fleetgraph/findings` | Active proactive findings, optionally filtered by document IDs |
| `GET /api/fleetgraph/debug/threads` | Thread/checkpoint debugging surface |
| `POST /api/fleetgraph/findings/:id/dismiss` | Dismiss finding |
| `POST /api/fleetgraph/findings/:id/review` | Prepare reviewed action payload, optionally with owner/assignee selections |
| `POST /api/fleetgraph/findings/:id/snooze` | Snooze finding |
| `POST /api/fleetgraph/findings/:id/apply` | Execute reviewed finding action |
| `POST /api/fleetgraph/analyze` | On-demand page analysis |
| `POST /api/fleetgraph/thread/:threadId/turn` | Follow-up conversation turn |

## Service Boundaries A Rebuild Must Preserve

1. REST remains the primary browser/server contract.
2. Collaboration is a separate WebSocket/Yjs layer, not a REST poller.
3. The same backend serves both normal product routes and FleetGraph routes.
4. Route groups are product-centric and largely same-origin/browser-oriented.
5. Many document routes still flatten `properties` onto top-level response fields for backward compatibility.
6. OpenAPI is the exact HTTP contract source; this doc is the capability map.
