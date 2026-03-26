# Mutation Side Effects Spec

Use this document with `workflow-and-action-spec.md` for action intent, `payload-and-response-reference.md` for request/response shapes, and `editor-and-collaboration-spec.md` for the underlying realtime editor behavior.

## Side-Effect Classes

| Side-effect class | Implemented in | Current consequence |
| --- | --- | --- |
| React Query invalidation | `web/src/hooks/*`, `UnifiedDocumentPage.tsx`, `App.tsx` | Lists, detail pages, context panels, and review surfaces refresh after writes |
| Optimistic local patching | Query hooks for documents, issues, projects, programs, and weeks | UI updates immediately, then rolls back or revalidates on settle |
| Hard navigation | `UnifiedDocumentPage.tsx`, `useDocumentConversion.ts`, `App.tsx`, admin pages | Some writes end with direct route replacement or a full page reload |
| Realtime user broadcast | `broadcastToUser()` + `/events` WebSocket | Action-items celebration, reviewer nudges, and week/project completion signals appear without polling |
| Collaboration socket reset | `invalidateDocumentCache()`, `handleVisibilityChange()` | Editors may clear IndexedDB, reconnect, or bounce the user out of a room |
| Server-side list cache invalidation | `listCacheInvalidationMiddleware` | Successful non-GET workspace writes evict the 3-second document/issue list cache |

## Cross-Cutting Cache And Invalidation Rules

### Backend JSON list cache

1. Document and issue list responses are cached for 3000 milliseconds.
2. Any successful non-`GET`/`HEAD`/`OPTIONS` request with `req.workspaceId` invalidates both document and issue list caches for that workspace.
3. This invalidation is middleware-driven, so it happens even when the route itself does not explicitly mention list caches.

### Frontend query-hook pattern

Current create/update/delete hooks for wiki documents, programs, projects, and weeks all follow the same pattern:

1. Cancel the relevant list query.
2. Apply an optimistic insert/update/delete to the cached list.
3. Roll back on error if a snapshot was saved.
4. Replace the optimistic row on success when possible.
5. Invalidate the canonical list query on settle.

That pattern exists in:

1. `useDocumentsQuery.ts`
2. `useProgramsQuery.ts`
3. `useProjectsQuery.ts`
4. `useWeeksQuery.ts`

## Document-Family Mutations

| Mutation | Immediate client behavior | Server-side side effects | Important current nuance |
| --- | --- | --- | --- |
| `POST /api/documents` | Creating UI usually navigates straight to `/documents/:id` | Parent visibility may be inherited; `belongs_to`/`program_id`/`sprint_id` create associations; weekly-plan and retro-like creates can broadcast `accountability:updated` | The response is the raw inserted row, not the normalized detail shape |
| `PATCH /api/documents/:id` without content | Unified detail page invalidates detail and relevant list queries after success | Top-level compatibility fields are merged into `properties`; associations may be rewritten; descendant visibility cascade may run | For sprints, `owner_id` is mirrored into `properties.assignee_ids` for older readers |
| `PATCH /api/documents/:id` with content | Unified detail page uses optimistic mutation, then invalidates detail and typed list queries | Server recomputes `plan`, `success_criteria`, `vision`, `goals`; clears `yjs_state`; recomputes completeness for projects/sprints; may change parent sprint approval state for weekly-plan/retro resubmission | Content is the source of truth and can overwrite manually submitted plan-like fields |
| Document visibility change | Detail page stays in place; collaborators may be forced out | Descendant visibility cascades; collaboration layer checks active sockets and closes unauthorized editors with `4403` | Moving a private child under a workspace-visible parent auto-promotes visibility even if the request omitted `visibility` |
| `DELETE /api/documents/:id` | Unified detail page navigates to `/docs`; list UIs remove the row | Route returns `204`; middleware invalidates document/issue list caches | Delete success is status-code-only, not JSON-driven |
| `POST /api/documents/:id/convert` | `useDocumentConversion()` invalidates issue lists, project lists, and `['document', id]`, then navigates with `replace: true` to `/documents/:id` | Server writes a snapshot, changes type in place, rewrites associations, and preserves undo history | The collaboration server has a conversion-close helper, but the current conversion route does not call it |
| `POST /api/documents/:id/undo-conversion` | Same invalidation and `replace: true` navigation pattern as convert | Server restores the most recent snapshot in place, deletes the restored snapshot row, and rewrites associations for the restored type | Undo also keeps the same document ID |

### Unified detail page invalidation specifics

When the canonical unified detail page updates a document successfully, it currently invalidates:

1. `['document', documentId]`
2. `[document.document_type + 's', 'list']`
3. `['documents', 'wiki']` additionally for wiki documents

When a detail-page conversion succeeds, it invalidates:

1. `issueKeys.lists()`
2. `projectKeys.lists()`
3. `['document', id]`

## Collaboration Side Effects Of Content Writes

### API-driven content overwrite

When content is changed through the REST API instead of the live Yjs room:

1. The backend clears `yjs_state`.
2. `invalidateDocumentCache(id)` closes active collaboration sockets with code `4101`.
3. The frontend editor clears IndexedDB for that document and allows the room to reconnect.
4. The next room load rebuilds Yjs from `content` if needed.

### Fresh-from-JSON recovery

When the collaboration server had to reconstruct Yjs from raw JSON content:

1. It marks the document as “fresh from JSON.”
2. On the next client connection it sends custom message type `3`.
3. The frontend clears the IndexedDB cache for that document before continuing sync.

### Visibility revocation

When a document is changed to `private`:

1. `handleVisibilityChange()` inspects active room participants.
2. Any participant who is neither the creator nor a workspace admin is closed with `4403`.
3. The editor disables reconnect, alerts the user, and calls its back-navigation handler.

## Issue, Project, Program, And Week Side Effects

| Mutation | Side effects |
| --- | --- |
| `POST /api/issues` | Creates associations from `belongs_to`; if this is the first issue linked to a sprint, broadcasts `accountability:updated` with `type: 'week_issues'` |
| `PATCH /api/issues/:id` | Rewrites associations when `belongs_to` changes; if a new sprint got its first issue, broadcasts `week_issues`; if an `action_items` issue is moved into a closed state, broadcasts to the assignee |
| `POST /api/projects` / `PATCH /api/projects/:id` | Project list hooks do optimistic updates and then invalidate `projectKeys.lists()` on settle; later plan writes through the project update path can broadcast `accountability:updated` with `type: 'project_plan'` |
| `POST /api/projects/:id/retro` | Broadcasts `accountability:updated` with `type: 'project_retro'`; logs retro content to history when content exists |
| `POST /api/programs`, `PATCH /api/programs/:id`, `DELETE /api/programs/:id` | Program list hooks use optimistic cache updates, then invalidate `programKeys.lists()` on settle |
| `POST /api/weeks` / `PATCH /api/weeks/:id` / `DELETE /api/weeks/:id` | Week list hooks optimistically patch the program-specific cache and invalidate `sprintKeys.list(programId)` on settle |
| `POST /api/weeks/:id/start` | Writes `status = active`, `planned_issue_ids`, and `snapshot_taken_at`; broadcasts `accountability:updated` with `type: 'week_start'`; the visible tab set changes because status changed |
| `POST /api/weeks/:id/review` | Creates `weekly_review` doc plus sprint association; broadcasts `accountability:updated` with `type: 'weekly_review'`; logs initial review content |
| `PATCH /api/weeks/:id/review` | Logs changed review content; if content or `plan_validated` changed after prior review approval, parent sprint `review_approval.state` becomes `changed_since_approved` |
| `POST /api/weeks/:id/approve-plan` | Stores approval metadata plus optional comment; broadcasts to the sprint owner’s user account with `type: 'plan_approved'` |
| `POST /api/weeks/:id/unapprove-plan` | Removes `plan_approval` from sprint properties and logs the removal to history |
| `POST /api/weeks/:id/approve-review` | Stores `review_approval` plus `review_rating`; broadcasts to the sprint owner with `type: 'review_approved'` |
| `POST /api/weeks/:id/request-plan-changes` | Writes `plan_approval.state = 'changes_requested'` plus feedback; broadcasts to sprint owner with `type: 'changes_requested_plan'` |
| `POST /api/weeks/:id/request-retro-changes` | Writes `review_approval.state = 'changes_requested'` plus feedback; broadcasts to sprint owner with `type: 'changes_requested_retro'` |
| `POST /api/weeks/:id/carryover` | Rewrites sprint associations for moved issues and sets `carryover_from_sprint_id`; no celebration broadcast is sent by this route |

## Review Queue And Child-Document Side Effects

1. Child weekly plan/retro review mode is driven by `?review=true&sprintId=:id`.
2. The review queue stores `{ queue, currentIndex, active }`.
3. Starting the queue navigates to `/documents/:docId?review=true&sprintId=:sprintId`.
4. Successful approve/request-change actions can auto-advance the queue.
5. `finishReview()` and exit behavior return the user to `/team/reviews`.

## Workspace, Invite, Setup, And Admin Side Effects

| Mutation | Side effects |
| --- | --- |
| `POST /api/workspaces/:id/switch` | Updates both `users.last_workspace_id` and `sessions.workspace_id`; logs `workspace.switch`; frontend closes the popover and hard reloads to `/docs` |
| `POST /api/setup/initialize` | Creates workspace, user, admin membership, linked person document, welcome wiki document |
| `POST /api/invites/:token/accept` | Uses invite-acceptance service to create membership and person-doc linkage, marks invite used, creates session, and returns a logged-in workspace context |
| Admin impersonation end | Frontend forces `window.location.href = '/docs'` after success so the full shell reloads with original user context |

## Realtime Celebration Loop

The shell-level accountability celebration is a separate side-effect path:

1. `/events` WebSocket receives `accountability:updated`.
2. `App.tsx` shows a celebration banner immediately.
3. After 4 seconds, it invalidates `actionItemsKeys.all`.
4. Then it hides the celebration state.

This means many route handlers intentionally do not push full payload refreshes themselves; they only need to broadcast the event and let the app-level listener do the delayed refetch.

## Rebuild Requirements

1. Do not treat a successful HTTP response as the whole contract; many Ship mutations are only “complete” once invalidation, navigation, socket, and broadcast side effects also occur.
2. Preserve the current 3-second backend list-cache invalidation rule for successful workspace writes.
3. Preserve the editor socket-reset behavior on API content writes and visibility revocation.
4. Preserve the in-place conversion invalidation/navigation pattern, and document that collaborator conversion socket closes are supported by infrastructure but not currently invoked by the route.
5. Preserve the app-level celebration-and-refetch loop for `accountability:updated` events.
