# State Machine And Lifecycle Spec

Use this document with `screen-state-spec.md` for visible UI states, `workflow-and-action-spec.md` for user-triggered actions, and `mutation-side-effects-spec.md` for what refreshes or broadcasts after each transition.

## Where Ship Stores State

| State family | Primary storage surface | Secondary/UI surface |
| --- | --- | --- |
| Session/auth | `sessions` table plus `session_id` cookie | `useAuth()`, `useSessionTimeout()` |
| Workspace context | `users.last_workspace_id`, `sessions.workspace_id` | `WorkspaceContext`, hard reload after switch |
| Route mode and review mode | URL path/query params | `main.tsx`, `App.tsx`, `UnifiedDocumentPage.tsx` |
| Document visibility/type/content | `documents` table columns plus `properties` | Unified detail page and editor |
| Approval state | Sprint `properties.plan_approval`, `properties.review_approval`, `properties.review_rating` | Review grids, weekly child-doc review mode, badges |
| Collaboration sync state | `yjs_state`, `content`, active WebSocket rooms | Editor sync badges and socket close handling |
| FleetGraph runtime state | Stored finding records plus runtime thread/checkpoint state | React Query findings hooks, FAB/panel state, guided overlay |

## Session And Auth Lifecycle

| State | Entered when | Exits when |
| --- | --- | --- |
| Anonymous public bootstrap | Browser loads `/login`, `/setup`, or `/invite/*` | Auth status resolves and either stays anonymous or escalates to authenticated bootstrap |
| Authenticated bootstrap | `GET /api/auth/status` says authenticated and `GET /api/auth/me` succeeds | App shell finishes loading and protected routes render |
| Protected active session | Valid cookie or API token plus workspace access | Session expires, membership is revoked, or user logs out |
| Inactivity warning | 14 minutes of inactivity have elapsed | User triggers `resetTimer()` or the final 60-second countdown reaches zero |
| Absolute-timeout warning | Session age is within 5 minutes of 12 hours | Final 5-minute countdown reaches zero; inactivity warning takes precedence if already active |
| Expired session | `authMiddleware` or the timeout hook decides the session is no longer valid | User logs in again |

Current lifecycle details:

1. `useAuth()` only does the cheap `/api/auth/status` probe on public bootstrap paths.
2. Offline bootstrap can restore cached auth only when `navigator.onLine === false`.
3. `ProtectedRoute` never renders child content before auth loading resolves.
4. On timeout, the app redirects to `/login?expired=true&returnTo=...`.
5. Super-admin login can complete with `currentWorkspace = null`; that is a valid authenticated state, not an auth failure.

## Setup And Invite Lifecycle

### Setup lifecycle

| State | Entered when | Exit condition |
| --- | --- | --- |
| `loading` | `/setup` mounts and requests CSRF plus `GET /api/setup/status` | Route learns whether setup is still needed |
| `ready` | `needsSetup = true` | User submits initialization form |
| `submitting` | `POST /api/setup/initialize` is pending | Success or failure |
| `completed` | Setup route returns `201` | Frontend redirects to `/login` |
| `blocked` | `needsSetup = false` or setup POST returns “already completed” | Frontend redirects to `/login` |

### Invite lifecycle

The page-level invite status enum is:

1. `loading`
2. `valid`
3. `invalid`
4. `expired`
5. `accepted`
6. `already_member`
7. `error`

Important transitions:

1. `loading -> valid` when invite validation succeeds and `alreadyMember` is false.
2. `loading -> already_member` when validation succeeds but the backend auto-consumed the invite because the user already belongs to the workspace.
3. `loading -> expired|accepted|invalid` based on backend error text mapping.
4. `valid -> loading/submitting -> redirect /docs` when invite acceptance succeeds.
5. New-user acceptance is only allowed when the password length is at least 8.

## Workspace Lifecycle

| State | Current representation | Transition triggers |
| --- | --- | --- |
| Authenticated with current workspace | `currentWorkspace` object in auth/workspace context | Default case for most normal users |
| Authenticated with no workspace selected | `currentWorkspace = null` | Super-admin login with no direct memberships |
| Switching workspace | `POST /api/workspaces/:id/switch` in flight | Opens from shell workspace switcher |
| Switched workspace | Backend has updated `users.last_workspace_id` and `sessions.workspace_id` | App hard reloads to `/docs` |
| Workspace access revoked | Auth middleware no longer finds membership | Session is deleted and future requests return `403` |

The current switch path is important:

1. Backend success only returns `workspaceId`.
2. `WorkspaceContext.switchWorkspace()` still assumes `response.data.workspace`.
3. `App.tsx` compensates by forcing `window.location.href = '/docs'` after any successful switch.

## Document Lifecycle

### Core document states

| State | Stored in | Entered when | Exits when |
| --- | --- | --- | --- |
| Created | `documents` row exists | Any create route or invite/setup helper inserts it | It is updated, deleted, converted, or archived |
| Workspace-visible | `visibility = 'workspace'` | Default create state or explicit promotion | Explicitly changed to `private` |
| Private | `visibility = 'private'` | Explicit create/update choice | Explicitly promoted, auto-promoted by workspace-visible parent move, or cascaded from ancestor change |
| Type-changed in place | `document_type` changed through `PATCH /api/documents/:id` | Creator performs a non-conversion type change | Further updates or another type change |
| Converted in place | `document_type` changed through `/convert`, snapshot written | Creator converts issue <-> project | Undo conversion or another conversion |
| Deleted | row removed or logically hidden depending on route family | Delete route succeeds | Terminal state for that ID unless rebuilt out of band |

### Collaboration-content lifecycle

| State | Entered when | Exit condition |
| --- | --- | --- |
| JSON-only source of truth | Document has `content` but no `yjs_state` | Collaboration server converts JSON into Yjs on first collaborative load |
| Yjs-backed collaborative state | `yjs_state` exists and WebSocket room is active | API content write clears `yjs_state`, or room is evicted from cache |
| Fresh-from-JSON reconnect | Server had to regenerate Yjs from stored JSON | Client receives custom binary message type `3` and clears IndexedDB cache |
| API-overwritten content | `PATCH /api/documents/:id` or `/content` updates content directly | Collaboration server closes active sockets with `4101`, clients reconnect to reload |
| Access revoked | Visibility became `private` for a non-author/non-admin collaborator | Collaboration socket closes with `4403`; editor alerts and navigates back |

Current nuance:

1. The collaboration layer implements a `4100` “document converted” close path.
2. The editor handles that close code and can navigate to the replacement document.
3. The current document conversion routes do not call `handleDocumentConversion()`, so initiated conversion UX currently depends on client-side cache invalidation and `replace: true` navigation rather than server-pushed collaborator conversion notices.

## Canonical Week Lifecycle

### Status state machine

| Week status | How it is stored | Main tabs | Entered by |
| --- | --- | --- | --- |
| `planning` | `properties.status` absent or explicitly `planning` | `overview`, `plan` | Creation or explicit status update |
| `active` | `properties.status = 'active'` | `overview`, `issues`, `review`, `standups` | `POST /api/weeks/:id/start` or status update |
| `completed` | `properties.status = 'completed'` | Same execution/review tab family as active | Explicit status update |

Important transitions:

1. `planning -> active` through `POST /api/weeks/:id/start` takes a scope snapshot and writes `planned_issue_ids` plus `snapshot_taken_at`.
2. `active -> completed` is an explicit update-state transition, not an automatic end-of-calendar transition.
3. The visible tab set is derived from week status, so status is both business state and routing state.

### Week review lifecycle

| State | Representation | Transition trigger |
| --- | --- | --- |
| Review draft not yet saved | `GET /api/weeks/:id/review` returns `id: null, is_draft: true` | No persisted `weekly_review` document exists yet |
| Persisted review | Review response returns `id`, timestamps, `is_draft: false` | `POST /api/weeks/:id/review` |
| Persisted review edited | Same review ID, updated timestamps | `PATCH /api/weeks/:id/review` |
| Review mode on child doc | URL query `?review=true&sprintId=:id` | Review queue or deep link opens weekly plan/retro in reviewer context |

## Approval State Machines

The shared approval state enum is:

1. `null` or missing: no recorded approval decision yet
2. `approved`
3. `changes_requested`
4. `changed_since_approved`

### Plan approval (`properties.plan_approval`)

| State | Entered by | Leaves state when |
| --- | --- | --- |
| unset | New sprint or explicit unapprove | Reviewer approves or requests changes |
| `approved` | `POST /api/weeks/:id/approve-plan` | Reviewer unapproves, or later edits change the approved artifact in a tracked flow |
| `changes_requested` | `POST /api/weeks/:id/request-plan-changes` | Owner edits the related plan artifact and server moves it to `changed_since_approved`, or reviewer approves |
| `changed_since_approved` | Weekly-plan edit after changes were requested in the current implementation | Reviewer re-reviews and approves or requests changes again |

### Review approval (`properties.review_approval`)

| State | Entered by | Leaves state when |
| --- | --- | --- |
| unset | New sprint or no review decision yet | Reviewer approves the review or requests changes |
| `approved` | `POST /api/weeks/:id/approve-review` | `PATCH /api/weeks/:id/review` changes content or `plan_validated`, which downgrades it to `changed_since_approved` |
| `changes_requested` | `POST /api/weeks/:id/request-retro-changes` | Weekly-retro edits or reviewer approval |
| `changed_since_approved` | Review content changed after a prior approval, or a weekly retro/plan resubmission moved the parent sprint back into re-review | Reviewer resolves it with a new decision |

Important approval metadata:

1. Approved states record `approved_by`, `approved_at`, and `approved_version_id`.
2. Review approval also requires and stores `review_rating` with `value`, `rated_by`, and `rated_at`.
3. Weekly child-doc review mode reads approval state from the parent sprint, not from the child document itself.

## FleetGraph Lifecycle

### Proactive findings

The persisted finding status enum is:

1. `active`
2. `dismissed`
3. `resolved`
4. `snoozed`

Current transitions:

1. Worker/runtime upserts findings into `active`.
2. Reviewer can move a finding to `dismissed` or `snoozed`.
3. Applying or later evidence can move a finding to `resolved`.
4. UI query scope is either workspace-wide or page-scoped by sorted document IDs.

### Current-page entry runs

The runtime outcome enum surfaced to the UI is:

1. `advisory`
2. `approval_required`
3. `fallback`
4. `quiet`

Those outcomes drive whether the user sees:

1. Analysis text only
2. A guided approval card/overlay
3. A safe fallback message
4. No meaningful intervention

## Rebuild Requirements

1. Preserve the split between stored business state and route-derived UI state; many Ship state machines are expressed across both.
2. Preserve the generated-draft review behavior instead of creating empty persisted reviews immediately.
3. Preserve the current approval-state transitions exactly, including `changed_since_approved`.
4. Preserve week-status-driven tab switching; it is part of the product contract, not just presentation.
5. Preserve the editor’s socket-close handling for `4403` and `4101`, and document the currently unwired `4100` conversion path rather than assuming it is already active.
