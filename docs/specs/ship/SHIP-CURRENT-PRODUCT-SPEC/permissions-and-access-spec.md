# Permissions And Access Spec

Use this document with `navigation-and-routing-spec.md` for route-level gating, `payload-and-response-reference.md` for blocked/error response shapes, and `workflow-and-action-spec.md` for mutation ownership.

## Access Model Layers

| Layer | Source of truth | Current rule |
| --- | --- | --- |
| Identity | `api/src/middleware/auth.ts`, `web/src/hooks/useAuth.tsx` | Ship supports public, browser-session, API-token, and super-admin access modes |
| Workspace scope | `authMiddleware`, `workspaceAccessMiddleware`, `workspaces` routes | Most authenticated routes are scoped to the session or token workspace; membership is rechecked on every request unless the actor is super-admin |
| Workspace role | `workspaceAdminMiddleware`, `useWorkspace()` | Workspace-admin-only surfaces require membership role `admin`, with super-admin bypass |
| Document visibility | `api/src/middleware/visibility.ts`, `canAccessDocument()` in `documents.ts` | Workspace-visible docs are visible to any workspace member; private docs are visible only to their creator or a workspace admin |
| Surface-specific reviewers | `weeks.ts`, `AdminDashboard.tsx`, `WorkspaceSettings.tsx`, `PersonEditor.tsx` | Several screens add narrower rules on top of workspace membership, especially approvals, admin tools, and metrics |

## Identity And Authentication Modes

| Mode | Where it is used | Credential surface | Important current behavior |
| --- | --- | --- | --- |
| Public bootstrap | `/setup`, `/login`, `/invite/:token`, public feedback routes | None | These routes load before the protected app shell and do not require workspace membership |
| Browser session | Most UI routes under the protected shell | `session_id` cookie | Cookie auth is the default browser path; state-changing requests also require CSRF unless a route is explicitly public |
| Invite-created session | `POST /api/invites/:token/accept` | `session_id` cookie | Invite acceptance creates a normal session, but the cookie is set with `sameSite: 'lax'` instead of the stricter auth flow default |
| API token | Bearer-token API clients | `Authorization: Bearer ...` | Token auth is checked before cookie auth, sets `req.isApiToken = true`, binds both user and workspace, and bypasses CSRF |
| Super-admin override | `/api/admin/*`, admin UI, workspace switching, workspace-scoped reads | `users.is_super_admin = true` | Super-admins bypass workspace membership and workspace-admin checks, and are treated as effective admins for workspaces they are not members of |

## Session And Workspace Gate

Current session rules that affect both backend access and frontend UX:

1. Session inactivity timeout is 15 minutes.
2. Absolute session timeout is 12 hours from session creation time.
3. `authMiddleware` deletes expired sessions immediately and returns `401` with `SESSION_EXPIRED`.
4. Membership is revalidated on every authenticated request whenever `session.workspace_id` is set and the actor is not super-admin.
5. Session row writes are throttled: `last_activity` is only updated after 30 seconds of inactivity, and the browser cookie is only refreshed after 60 seconds.
6. `useSessionTimeout()` warns 60 seconds before inactivity expiry and 5 minutes before absolute expiry.
7. Clicking “Stay Logged In” calls `POST /api/auth/extend-session`; if that request fails, the shell forces logout.

Frontend route gating built on top of those rules:

1. `ProtectedRoute` shows a full-screen loading state while auth is bootstrapping.
2. If auth finishes with no user, `ProtectedRoute` redirects to `/login` and preserves `state.from`.
3. `useAuth()` only calls `GET /api/auth/status` first on public bootstrap paths (`/login`, `/setup`, `/invite*`).
4. Offline-only fallback uses cached auth from `localStorage['ship:auth-cache']` when the browser is offline and the cache is less than 24 hours old.
5. A super-admin can log in with `currentWorkspace = null`; workspace selection is a separate step after login.

## Surface Access Matrix

| Surface | Who can access it now | Enforcement point | Blocked behavior |
| --- | --- | --- | --- |
| `/setup` | Anyone, but only while there are zero users | `GET /api/setup/status`, `POST /api/setup/initialize` | Already-initialized installs redirect to `/login` and setup POST returns `403` |
| `/login` | Anyone | Public route plus auth bootstrap | Signed-in users are redirected away by the public-route wrapper |
| `/invite/:token` | Anyone with a token | Invite validation route plus page state machine | UI distinguishes invalid, expired, accepted, and already-member cases instead of one generic failure state |
| `/feedback/:programId` and public feedback API routes | Anyone | Separate public router | No auth and no CSRF; failures are screen-level blocked/error states |
| Protected shell routes under `/` | Authenticated users | `ProtectedRoute` plus `authMiddleware` | Unauthenticated users are redirected to `/login`; expired sessions are treated as login-expired flows |
| Workspace settings surface | Workspace admin or super-admin | Backend admin routes plus `isWorkspaceAdmin` UI guard | Screen renders a blocked state when `!isWorkspaceAdmin` |
| `/admin` and `/admin/workspaces/:id` | Super-admin only | `superAdminMiddleware` plus admin-page redirect | Non-super-admin UI traffic is redirected to `/docs` |
| Person sprint-metrics section | Only when backend allows it | `GET /api/team/people/:personId/sprint-metrics` | Frontend treats `403` as “do not render this section” instead of an inline hard failure |
| Document detail and collaboration | Workspace members, then filtered by visibility | `canAccessDocument()`, visibility helpers, collaboration auth | Private-doc misses are collapsed to `404`; collaboration sockets can be closed when access is revoked |

## Workspace Membership And Role Rules

1. `workspaceAccessMiddleware` requires any membership in the target workspace unless the actor is super-admin.
2. `workspaceAdminMiddleware` requires role `admin` in the target workspace unless the actor is super-admin.
3. `GET /api/workspaces` returns only active workspaces, but super-admins additionally receive every active workspace they do not belong to with synthesized role `admin`.
4. `GET /api/workspaces/current` returns a wrapped `workspace` object; for a super-admin without membership, the role is synthesized to `admin`.
5. `POST /api/workspaces/:id/switch` only returns `{ workspaceId }`, not a full workspace object. The frontend still type-expects `workspace`, so the current UI relies on a hard reload to `/docs` after a successful switch.

## Document Visibility Rules

The document visibility rule is:

`visibility = 'workspace' OR created_by = currentUser OR isWorkspaceAdmin = true`

That rule is used both in list/query SQL and in single-document access checks.

| Actor | Workspace-visible doc | Private doc | Collaboration session |
| --- | --- | --- | --- |
| Normal workspace member | Allowed | Blocked unless they created it | Allowed only when the same visibility rule passes |
| Document creator | Allowed | Allowed | Allowed |
| Workspace admin | Allowed | Allowed | Allowed |
| Super-admin | Allowed | Allowed | Allowed through admin bypass |
| Non-member | Blocked | Blocked | Blocked |

Important current behaviors:

1. Private-doc denial is returned as `404`, not `403`, to avoid leaking existence.
2. Moving a private document under a workspace-visible parent without explicitly setting visibility auto-promotes the child to `workspace`.
3. Explicit visibility changes cascade to all descendants.
4. When a document becomes private, the collaboration server disconnects active non-author/non-admin editors with close code `4403`.

## Mutation Authority Matrix

| Operation | Who can perform it | Current rejection behavior |
| --- | --- | --- |
| Change document visibility | Creator or workspace admin | `403` with a visibility-specific message |
| Change `document_type` with `PATCH /api/documents/:id` | Creator only | `403`; changing to/from `program` or `person` returns `400` |
| Convert issue to project or project to issue | Creator only | `403` when not creator; `400` for unsupported types or archived docs |
| Undo conversion | Creator or the user recorded in `converted_by` | `403` otherwise |
| Set `person.properties.reports_to` | Workspace admin only | `403` even if the editor can update other person fields |
| Approve/unapprove week plan | Program accountable user, sprint owner’s supervisor, or workspace admin | `403` with reviewer-specific copy |
| Approve/request changes on week review | Program accountable user, sprint owner’s supervisor, or workspace admin | `403`; review approval additionally requires rating `1..5` |
| Workspace member management, invites, workspace audit, workspace tokens/settings tabs | Workspace admin or super-admin | Backend admin routes reject with wrapped `403`; UI blocks the whole settings screen |
| Admin workspace/user/audit/impersonation routes | Super-admin only | Wrapped `403` from `superAdminMiddleware`; admin UI redirects away |

## Invite, Setup, And Public-Feedback Access Rules

### Setup

1. Setup can only complete when the users table is empty.
2. Successful setup creates the first workspace, first super-admin user, workspace-admin membership, linked person document, and welcome wiki document.
3. Setup success does not log the user in; it redirects to `/login`.

### Invites

1. Invite validation is public.
2. Invite acceptance is public and may create a new user or attach an existing user.
3. New users must provide a password with length at least 8.
4. Invite validation auto-marks the invite used when the email already belongs to an existing member of the target workspace.
5. Invite acceptance is implemented through `linkUserToWorkspaceViaInvite()`, which is the source of truth for membership creation and person-document reuse/archive behavior.

### Public Feedback

1. `GET /api/feedback/program/:programId` and `POST /api/feedback` are intentionally outside auth and CSRF.
2. Public feedback writes create internal issue documents with `source = 'external'` and `state = 'triage'`.

## Access Failure Semantics To Preserve

| Failure class | Current HTTP/UI behavior | Why it matters |
| --- | --- | --- |
| Missing or expired session | `401` wrapped auth error, often followed by login redirect in the UI | Distinguishes auth loss from permission loss |
| Workspace membership revoked | `403` wrapped auth error and session deletion | Keeps revoked users from continuing on stale sessions |
| Missing workspace ID for admin/access middleware | `400` wrapped validation error | Current middleware treats workspace selection as required input, not an implicit default |
| Private document without access | `404` raw error | Prevents existence leaks |
| Visible screen blocked by role | Dedicated blocked state or redirect, not silent control hiding alone | Current product tells the user why the surface is unavailable |

## Rebuild Requirements

1. Preserve the distinction between public bootstrap surfaces, authenticated workspace surfaces, workspace-admin surfaces, and super-admin surfaces.
2. Preserve the 404-for-private-doc rule and do not replace it with a visible 403 on document detail.
3. Preserve the current super-admin bypass behavior, including synthesized admin role in workspace responses.
4. Preserve the hard workspace-switch reload behavior unless the switch response contract is intentionally changed everywhere.
5. Preserve collaboration access checks as the same rule as document visibility, not a separate looser policy.
