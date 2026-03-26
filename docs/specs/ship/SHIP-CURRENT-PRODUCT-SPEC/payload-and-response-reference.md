# Payload And Response Reference

Use this document with `api-and-service-spec.md` for endpoint inventory and `permissions-and-access-spec.md` for who is allowed to call each route family. This file is meant to capture the dominant current-state wire shapes so a rebuild engineer does not have to keep jumping into `api/openapi.yaml` or route handlers for the main contracts.

## Response Families

| Family | Current shape | Main route groups | Important current nuance |
| --- | --- | --- | --- |
| Wrapped success | `{ success: true, data: ... }` | Auth, setup, invites, workspaces, admin, many settings routes | This is the dominant “platform/admin” envelope |
| Wrapped failure | `{ success: false, error: { code, message } }` | Same wrapped route families | Error payload is structured, not just a string |
| Hybrid action confirmation | `{ success: true }` or `{ success: true, approval: ... }` | Logout, week approvals, some action routes | These are not nested under `data` even though they still use `success` |
| Raw resource/list | JSON object or array with no outer `success` key | Documents, issues, projects, programs, weeks, most work-management surfaces | These routes usually return `{ error: string, details? }` on failure |
| Empty success | `204 No Content` | Some delete routes, especially document delete | Client success is inferred from the HTTP status only |
| Redirecting detail | `301` plus headers | Legacy converted-document reads | `GET /api/documents/:id` can return `Location`, `X-Converted-Type`, and `X-Converted-To` for old conversion records |

## Naming And Compatibility Rules

1. Wrapped routes usually use camelCase inside `data`.
2. Raw routes usually stay close to database/legacy API naming and often use snake_case.
3. Many document-family routes flatten selected `properties` fields onto the top-level response for compatibility.
4. That flattening is not fully symmetric:
   - `GET /api/documents` and `GET /api/documents/:id` flatten common fields.
   - `PATCH /api/documents/:id` returns a raw updated row plus a selected flattened compatibility subset.
   - `POST /api/documents` returns the raw inserted row with no compatibility flattening.
5. `PersonProperties` in shared TypeScript still omits persisted `user_id`, but runtime payloads do use `properties.user_id`.

## Auth, Setup, Workspace, And Invite Contracts

| Endpoint | Request | Success response | Notes |
| --- | --- | --- | --- |
| `GET /api/setup/status` | none | `{ success: true, data: { needsSetup: boolean } }` | Public route used before the login form decides where to send the user |
| `POST /api/setup/initialize` | `{ email, password, name }` | `{ success: true, data: { user: { id, email, name, isSuperAdmin }, message } }` | Password length must be at least 8; route returns `403` once any user exists |
| `POST /api/auth/login` | `{ email, password }` | `{ success: true, data: { user, currentWorkspace, workspaces, pendingAccountabilityItems: [] } }` | Sets the `session_id` cookie with `sameSite: 'strict'`; `currentWorkspace` can be `null` for a super-admin with no membership |
| `GET /api/auth/status` | none | `{ success: true, data: { authenticated: boolean } }` | Used as a cheap session probe on public bootstrap paths |
| `GET /api/auth/me` | none | `{ success: true, data: { user, currentWorkspace, workspaces, pendingAccountabilityItems: [] } }` | `user.isSuperAdmin` is camelCase in the response |
| `POST /api/auth/extend-session` | none | `{ success: true, data: { expiresAt, lastActivity } }` | Refreshes the cookie and session row |
| `GET /api/auth/session` | none | `{ success: true, data: { createdAt, expiresAt, absoluteExpiresAt, lastActivity } }` | Used for timeout warning math, not for general auth bootstrap |
| `POST /api/auth/logout` | none | `{ success: true }` | Clears the strict session cookie |
| `GET /api/workspaces` | none | `{ success: true, data: { workspaces, isSuperAdmin } }` | Super-admins receive all active workspaces, with synthetic admin-role entries where needed |
| `GET /api/workspaces/current` | none | `{ success: true, data: { workspace } }` | `workspace.role` defaults to `admin` for a super-admin with no membership |
| `POST /api/workspaces/:id/switch` | none | `{ success: true, data: { workspaceId } }` | Current frontend type definitions still expect `data.workspace`, so the app relies on a hard reload after success |
| `GET /api/invites/:token` | none | `{ success: true, data: { id, email, role, workspaceId, workspaceName, invitedBy, expiresAt, userExists, alreadyMember } }` | Validation can auto-consume the invite if the email already belongs to a member |
| `POST /api/invites/:token/accept` | Existing user: empty body. New user: `{ name?, password }` | `{ success: true, data: { user: { id, email, name }, workspace: { id, name, role } } }` | Sets `session_id` with `sameSite: 'lax'` instead of the auth flow’s `strict` setting |

## Unified Document Contracts

### Canonical raw document fields

The unified document routes all work from the same `documents` table, but current responses may include a compatibility layer on top of the stored row.

Common raw fields used across the family:

```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "document_type": "wiki|issue|program|project|sprint|person|weekly_plan|weekly_retro|weekly_review",
  "title": "string",
  "parent_id": "uuid|null",
  "position": 0,
  "ticket_number": 123,
  "content": {},
  "properties": {},
  "visibility": "private|workspace",
  "created_by": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

Common flattened compatibility fields that may be added on top:

```json
{
  "state": "backlog",
  "priority": "medium",
  "estimate": 3,
  "assignee_id": "uuid|null",
  "source": "internal|external|action_items",
  "impact": 5,
  "confidence": 5,
  "ease": 5,
  "owner_id": "uuid|null",
  "owner": { "id": "user_id", "name": "Person Name", "email": "..." },
  "prefix": "ENG",
  "color": "#6366f1",
  "status": "planning|active|completed",
  "plan": "string|null",
  "plan_approval": {},
  "review_approval": {},
  "review_rating": {}
}
```

### `GET /api/documents`

Request query params:

```json
{
  "type": "optional document_type filter",
  "parent_id": "optional uuid, 'null', or empty string"
}
```

Success response:

1. Raw JSON array, not wrapped.
2. Each row includes a minimal document shape plus a small compatibility flatten (`state`, `priority`, `estimate`, `assignee_id`, `source`, `prefix`, `color`).
3. Visibility filtering is already applied server-side before the list is returned.

### `GET /api/documents/:id`

Success response behavior:

1. Raw JSON object, not wrapped.
2. Private inaccessible docs return `404`.
3. Legacy converted docs can return `301` redirect to `/api/documents/:newId` with headers:
   - `X-Converted-Type`
   - `X-Converted-To`
4. Detail responses may enrich the raw row with computed owner/person display data and computed weekly-plan/weekly-retro titles.

### `POST /api/documents`

Request body:

```json
{
  "title": "optional string, defaults to Untitled",
  "document_type": "optional wiki|issue|program|project|sprint|person|weekly_plan|weekly_retro",
  "parent_id": "optional uuid|null",
  "program_id": "optional uuid|null",
  "sprint_id": "optional uuid|null",
  "properties": {},
  "visibility": "optional private|workspace",
  "content": {},
  "belongs_to": [
    { "id": "uuid", "type": "program|project|sprint|parent" }
  ]
}
```

Success response:

1. Raw inserted document row from the database.
2. No wrapped envelope.
3. No compatibility flattening is added at create time.
4. If `parent_id` is present and `visibility` is omitted, the new document inherits the parent’s visibility.

### `PATCH /api/documents/:id`

Request body families:

```json
{
  "title": "optional string",
  "content": {},
  "parent_id": "optional uuid|null",
  "position": 0,
  "properties": {},
  "visibility": "optional private|workspace",
  "document_type": "optional wiki|issue|program|project|sprint|person",
  "state": "optional issue state",
  "priority": "optional issue priority",
  "estimate": "optional number|null",
  "assignee_id": "optional uuid|null",
  "source": "optional internal|external",
  "rejection_reason": "optional string|null",
  "belongs_to": [
    { "id": "uuid", "type": "program|project|sprint|parent" }
  ],
  "confirm_orphan_children": "optional boolean",
  "impact": "optional 1..10|null",
  "confidence": "optional 1..10|null",
  "ease": "optional 1..10|null",
  "color": "optional string",
  "owner_id": "optional uuid|null",
  "has_design_review": "optional boolean|null",
  "design_review_notes": "optional string|null",
  "accountable_id": "optional uuid|null",
  "consulted_ids": ["uuid"],
  "informed_ids": ["uuid"],
  "program_id": "optional uuid|null",
  "sprint_id": "optional uuid|null",
  "status": "optional planning|active|completed",
  "hypothesis": "optional string",
  "plan": "optional string"
}
```

Success response:

1. Raw updated row plus selected flattened compatibility fields.
2. For projects, `owner` may be resolved as `{ id: user_id, name, email }`.
3. For sprints, approval and review tracking fields are surfaced at the top level.
4. Content-derived fields (`plan`, `success_criteria`, `vision`, `goals`) are recomputed server-side when `content` is included.

### `DELETE /api/documents/:id`

Success response: `204 No Content`

### `POST /api/documents/:id/convert`

Request body:

```json
{
  "target_type": "issue|project"
}
```

Success response:

1. Raw updated document row.
2. Flattened target-type fields are added for the converted type.
3. `converted_from_type` is added.
4. The ID stays the same; current conversion is in-place, not new-document creation.

### `POST /api/documents/:id/undo-conversion`

Request body: empty object is acceptable; the route only uses the URL parameter plus auth context.

Success response:

1. Raw restored document row.
2. Flattened target-type fields are added for the restored type.
3. `restored_from_type` and a human-readable `message` are added.
4. The ID still stays the same.

## Issues, Projects, Programs, And Weeks

### Issues

| Endpoint | Request body | Success response |
| --- | --- | --- |
| `POST /api/issues` | `{ title, state?, priority?, assignee_id?, belongs_to?, source?, due_date?, is_system_generated?, accountability_target_id?, accountability_type? }` | Raw issue object with issue-specific fields plus `display_id` and resolved `belongs_to` |
| `PATCH /api/issues/:id` | `{ title?, state?, priority?, assignee_id?, belongs_to?, estimate?, confirm_orphan_children?, claude_metadata? }` | Raw issue object with `display_id` and resolved `belongs_to` |
| `POST /api/issues/bulk` | `{ ids: string[], action: "archive|delete|restore|update", updates?: { state?, sprint_id?, assignee_id?, project_id? } }` | `{ updated, failed }` |

### Projects

| Endpoint | Request body | Success response |
| --- | --- | --- |
| `POST /api/projects` | `{ title?, impact?, confidence?, ease?, owner_id?, accountable_id?, consulted_ids?, informed_ids?, color?, emoji?, program_id?, plan?, target_date? }` | Raw project object with owner summary, counts, completeness, and inferred status |
| `PATCH /api/projects/:id` | Same family as create, plus `archived_at?`, `has_design_review?`, `design_review_notes?` | Raw project object in the project-list/detail shape |
| `POST /api/projects/:id/retro` and `PATCH /api/projects/:id/retro` | `{ plan_validated?, monetary_impact_actual?, success_criteria?, next_steps?, content? }` | Raw project retro/detail shape; route persists the retro into project properties plus optional content |

### Programs

| Endpoint | Request body | Success response |
| --- | --- | --- |
| `POST /api/programs` | `{ title?, color?, emoji?, owner_id?, accountable_id?, consulted_ids?, informed_ids? }` | Raw program object with owner summary and counts |
| `PATCH /api/programs/:id` | Same family as create, plus `archived_at?` | Raw program object |

### Weeks

| Endpoint | Request body | Success response |
| --- | --- | --- |
| `POST /api/weeks` | `{ program_id?, title?, sprint_number, owner_id?, plan?, success_criteria?, confidence? }` | Raw sprint/week object |
| `PATCH /api/weeks/:id` | `{ title?, owner_id?, sprint_number?, status? }` | Raw sprint/week object |
| `POST /api/weeks/:id/start` | none | Raw sprint/week object after status becomes `active` |
| `GET /api/weeks/:id/review` | none | Either persisted review `{ id, ..., is_draft: false }` or generated draft `{ id: null, ..., is_draft: true }` |
| `POST /api/weeks/:id/review` | `{ content?, title?, plan_validated? }` | Persisted weekly-review payload with `is_draft: false` |
| `PATCH /api/weeks/:id/review` | `{ content?, title?, plan_validated? }` | Updated weekly-review payload with `is_draft: false` |
| `POST /api/weeks/:id/carryover` | `{ issue_ids: uuid[], target_sprint_id: uuid }` | `{ moved_count, source_sprint, target_sprint }` |
| `POST /api/weeks/:id/approve-plan` | `{ comment? }` | `{ success: true, approval }` |
| `POST /api/weeks/:id/unapprove-plan` | none | `{ success: true }` |
| `POST /api/weeks/:id/approve-review` | `{ rating: 1..5, comment? }` | `{ success: true, approval, review_rating }` |
| `POST /api/weeks/:id/request-plan-changes` | `{ feedback }` | `{ success: true, approval }` |
| `POST /api/weeks/:id/request-retro-changes` | `{ feedback }` | `{ success: true, approval }` |

## Current Compatibility Drifts Worth Preserving In A Rebuild

1. Workspace switching returns `{ workspaceId }`, while the frontend context type still assumes `{ workspace }`.
2. Wrapped admin/platform routes and raw work-management routes coexist; a rebuild cannot collapse them into one envelope without changing clients.
3. Document create, document update, and document detail do not return perfectly symmetric shapes.
4. Document responses still flatten selected `properties` fields because older UI paths and helper code depend on those top-level keys.
5. Private inaccessible document reads intentionally return raw `404` instead of a wrapped permission error.

## Rebuild Requirements

1. Preserve the wrapped-vs-raw split unless every consumer is deliberately rewritten.
2. Preserve the in-place conversion contract: same document ID, snapshot-backed undo, flattened target-type fields.
3. Preserve the generated-draft behavior of `GET /api/weeks/:id/review` with `id: null` plus `is_draft: true`.
4. Preserve the current hybrid approval responses (`success` plus `approval` outside `data`) because the frontend already consumes them directly.
5. Treat `api/openapi.yaml` as the exhaustive backup reference, but this document as the dominant current-state integration map.
