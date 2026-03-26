# Navigation And Routing Spec

This document is the canonical URL and route-state contract for Ship. Read it with `screen-spec.md` for per-screen behavior and `screen-state-spec.md` for state handling.

## Route Entry And Access Model

### Public entrypoints

| Route | Access | Notes |
| --- | --- | --- |
| `/feedback/:programId` | Public | The only frontend route rendered outside the auth/workspace provider stack |
| `/setup` | Public bootstrap within auth/workspace wrappers | Handles first-run initialization and redirects to `/login` once setup already exists |
| `/login` | Public-with-redirect | Uses `PublicRoute`; authenticated users are redirected to `/docs` |
| `/invite/:token` | Semi-public | Can be opened while signed out or signed in; resolves membership/invite state before deciding next action |

### Protected app shell

All authenticated product routes live under a protected root that wraps:

1. `WorkspaceProvider`
2. `AuthProvider`
3. `RealtimeEventsProvider`
4. `CurrentDocumentProvider`
5. `ArchivedPersonsProvider`
6. `DocumentsProvider`
7. `ProgramsProvider`
8. `ProjectsProvider`
9. `IssuesProvider`
10. `UploadProvider`
11. `AppLayout`

Implication for rebuilds:

1. Most screens assume workspace, auth, query cache, and current-document context already exist.
2. Detail screens do not bootstrap their own product-wide providers.
3. Redirect behavior must happen before these providers are bypassed or duplicated.

### Super-admin routes

| Route | Guard | Unauthorized behavior |
| --- | --- | --- |
| `/admin` | `SuperAdminRoute` | Signed-out users go to `/login`; signed-in non-super-admin users go to `/docs` |
| `/admin/workspaces/:id` | `SuperAdminRoute` | Same redirect behavior as `/admin` |

## Canonical Route Matrix

| Route | Access | App-shell mode | Primary component | Query params | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Protected | dashboard | redirect only | none | Always redirects to `/my-week` |
| `/dashboard` | Protected | dashboard | `DashboardPage` | `view=my-work|overview` | Supports dashboard sidebar mode switching |
| `/my-week` | Protected | dashboard | `MyWeekPage` | `week_number` | Personal week workspace |
| `/docs` | Protected | docs | `DocumentsPage` | `filter=workspace|private` | Tree/list document browser |
| `/documents/:id/*` | Protected | derived from current document type | `UnifiedDocumentPage` | `review`, `sprintId` on weekly review flows | Canonical detail route for most documents |
| `/issues` | Protected | issues | `IssuesPage` | `state` | Canonical issue list |
| `/projects` | Protected | projects | `ProjectsPage` | `status` | Canonical project list |
| `/programs` | Protected | programs | `ProgramsPage` | none | Canonical program list |
| `/team/allocation` | Protected | team | `TeamModePage` | none | Team allocation grid |
| `/team/directory` | Protected | team | `TeamDirectoryPage` | none | Team directory |
| `/team/status` | Protected | team | `StatusOverviewPage` | none | Accountability/status heatmap |
| `/team/reviews` | Protected | team | `ReviewsPage` | none | Manager review workspace |
| `/team/org-chart` | Protected | team | `OrgChartPage` | none | Reporting structure editor |
| `/team/:id` | Protected | team | `PersonEditorPage` | none | Person detail stays in team context |
| `/feedback/:id` | Protected | programs | `FeedbackEditorPage` | none | Internal feedback is redirected into canonical issue detail |
| `/settings` | Protected | settings | `WorkspaceSettingsPage` | `tab=members|invites|tokens|audit` | Workspace admin surface |
| `/settings/conversions` | Protected | settings | `ConvertedDocumentsPage` | none | Historical conversion view |
| `/admin` | Super admin | outside normal app shell | `AdminDashboardPage` | `tab=workspaces|users|audit` | Separate super-admin surface |
| `/admin/workspaces/:id` | Super admin | outside normal app shell | `AdminWorkspaceDetailPage` | none | Workspace-specific super-admin surface |

## App-Shell Mode Derivation

The left-rail mode is not determined only by pathname. For canonical detail pages it is derived from the currently loaded document.

| Condition | Mode |
| --- | --- |
| Path starts with `/dashboard` or `/my-week` | `dashboard` |
| Path starts with `/docs` | `docs` |
| Path starts with `/issues` | `issues` |
| Path starts with `/projects` | `projects` |
| Path starts with `/programs` or `/feedback` | `programs` |
| Path starts with `/team` | `team` |
| Path starts with `/settings` | `settings` |
| Path starts with `/sprints` or `/programs/:id/sprints` | `sprints` legacy mode |
| Path starts with `/documents/:id/*` and current document type is `wiki` | `docs` |
| Path starts with `/documents/:id/*` and current document type is `issue` | `issues` |
| Path starts with `/documents/:id/*` and current document type is `project` | `projects` |
| Path starts with `/documents/:id/*` and current document type is `program` | `programs` |
| Path starts with `/documents/:id/*` and current document type is `person` | `team` |
| Path starts with `/documents/:id/*` and current document type is `sprint` | `docs` |
| Path starts with `/documents/:id/*` and current document type is `weekly_plan` or `weekly_retro` with `currentDocumentProjectId` | `projects` |
| Any other `/documents/:id/*` detail state while loading or unknown | `docs` |

Important rebuild notes:

1. `project-context` exists in the `Mode` type but is not a first-class route family in the current router.
2. Sprint/week detail pages do not reactivate the old `sprints` rail; they live under canonical document routing and use docs-mode shell context.
3. Weekly plan and retro detail screens may still anchor the user in projects mode when they have project context.

## Left Sidebar Visibility Rules

The authenticated shell keeps the left rail mounted, but hides the expanded left sidebar in several focused-writing contexts.

| Condition | Result |
| --- | --- |
| Path starts with `/my-week` | Left sidebar hidden |
| Current document type is `weekly_plan` | Left sidebar hidden |
| Current document type is `weekly_retro` | Left sidebar hidden |
| Current document type is `standup` | Left sidebar hidden |
| Any other app-shell screen | Left sidebar shown unless collapsed |

Persistence rules:

1. Collapse state is stored in `localStorage['ship:leftSidebarCollapsed']`.
2. When hidden, the shell offset uses the collapsed width regardless of the stored collapse preference.
3. Right-sidebar collapse for the editor is separate and stored in `localStorage['ship:rightSidebarCollapsed']`.

## Canonical Query-Param Contract

| Surface | Query param(s) | Current behavior |
| --- | --- | --- |
| `/dashboard` | `view` | `overview` is explicit; default `my-work` removes the param and can be restored from `localStorage['dashboard-view']` |
| `/my-week` | `week_number` | Selecting the current week can remove the param; selecting another week writes the param |
| `/docs` | `filter` | `workspace` and `private` are explicit; omitted means all |
| `/issues` | `state` | Issues list syncs the current state filter to the URL |
| `/projects` | `status` | Valid values are `active`, `planned`, `completed`, `archived`, or omitted for the default active/non-archived view |
| `/settings` | `tab` | Invalid or missing values fall back to `members` |
| `/admin` | `tab` | Invalid or missing values fall back to `workspaces` |
| `/documents/:id` weekly review flows | `review=true&sprintId=:id` | Enables review-mode sidebars/sub-nav for weekly plan and retro documents |
| `/login` | `expired`, `returnTo` | Used for session timeout and post-login redirect handling |
| `/login` location state | `state.from` | `ProtectedRoute` sends the prior route here when auth is missing |

## Canonical Detail Route Contract

`/documents/:id/*` is the canonical detail route for almost every document-like entity.

Shared route rules:

1. The wildcard portion is parsed into `urlTab` plus optional `nestedPath`.
2. Valid tabs are resolved from the current document type and, for week documents, current status.
3. For program documents, legacy `urlTab='sprints'` is normalized to the canonical `weeks` tab so older deep links still work.
4. If the URL names a tab that is invalid for the loaded document, the page immediately redirects to `/documents/:id` with `replace: true`.
5. Detail creation and many list-to-detail navigations also use `replace: true` so the browser history does not retain stale intermediate entries.

### Tab and nested-path matrix

| Document type | Canonical tabs | Nested-path usage |
| --- | --- | --- |
| `wiki` | none | none |
| `issue` | none | none |
| `project` | `issues`, `details`, `weeks`, `retro` | none |
| `program` | `overview`, `issues`, `projects`, `weeks` | Canonical tab ID is `weeks`, but nested legacy-compatible paths still use `/documents/:programId/sprints/:sprintId` and normalize back to `weeks` |
| `sprint` with `properties.status='planning'` | `overview`, `plan` | none |
| `sprint` with `properties.status='active'` or `completed` | `overview`, `issues`, `review`, `standups` | none |
| `weekly_plan` | none | none |
| `weekly_retro` | none | none |
| `standup` | none | none |
| `person` | not routed here canonically | handled by `/team/:id` instead |

### Nested-path examples

| URL | Parsed tab | Parsed nested path | Effect |
| --- | --- | --- | --- |
| `/documents/abc/details` | `details` | empty | Opens project details tab |
| `/documents/program-1/weeks` | `weeks` | empty | Opens program weeks tab index |
| `/documents/program-1/sprints/week-17` | `sprints` then normalized to `weeks` | `week-17` | Program weeks tab uses nested week context inside the tab surface |
| `/documents/week-17/review` | `review` | empty | Opens active/completed week review tab |

## Redirect And Compatibility Contract

| Legacy route | Canonical destination | Notes |
| --- | --- | --- |
| `/docs/:id` | `/documents/:id` | Old wiki/document detail path |
| `/issues/:id` | `/documents/:id` | Old issue detail path |
| `/projects/:id` | `/documents/:id` | Old project detail path |
| `/programs/:id/*` | `/documents/:id/*` | Preserves the trailing tab path |
| `/programs/:programId/sprints/:id` | `/documents/:id` | Direct week link within a program context |
| `/sprints` | `/team/allocation` | Old top-level sprints page now redirects to the allocation screen |
| `/sprints/:id` | `/documents/:id` | Old week detail base route |
| `/sprints/:id/view` | `/documents/:id` | Legacy “view” maps to overview/base |
| `/sprints/:id/plan` | `/documents/:id/plan` | Canonical planning tab |
| `/sprints/:id/planning` | `/documents/:id/plan` | Legacy planning alias is remapped |
| `/sprints/:id/standups` | `/documents/:id/standups` | Legacy week standups alias |
| `/sprints/:id/review` | `/documents/:id/review` | Legacy week review alias |
| `/team` | `/team/allocation` | Team landing alias |
| `/feedback/:id` | `/documents/:id` after lookup | Internal feedback detail is issue-backed and redirected by `FeedbackEditorPage` |

## Route-Level Redirect And Recovery Rules

| Condition | Current behavior |
| --- | --- |
| Authenticated user opens `/login` | Redirect to `/docs` |
| Setup already complete and user opens `/setup` | Redirect to `/login` |
| Missing auth for protected route | `ProtectedRoute` sends the user to `/login` with `state.from` |
| Session timeout fires inside app shell | Hard redirect to `/login?expired=true&returnTo=...` |
| Invalid settings/admin tab param | Fallback to default tab instead of erroring |
| Invalid detail tab for the loaded document | Redirect to `/documents/:id` |
| Old conversion record is opened through `/api/documents/:id` | Backend may 301 redirect to the converted document’s API endpoint; frontend should still treat `/documents/:id` as canonical |

## Navigation Side Effects That Must Be Preserved

1. `Cmd+K` / `Ctrl+K` toggles the global command palette from anywhere in the app shell.
2. Auto-opened accountability modal must not block direct entry into `/documents/:id/*`; the shell closes it automatically when the destination is a document detail route.
3. Creating a document, program, project, or issue from a list surface navigates directly into the canonical detail route.
4. Manager review flows open weekly plan/retro documents through `/documents/:id?review=true&sprintId=:id` so the detail screen knows it is in review mode.
