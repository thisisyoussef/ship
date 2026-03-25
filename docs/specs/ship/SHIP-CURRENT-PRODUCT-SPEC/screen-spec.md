# Screen Spec

## Route Families

### Public and bootstrap routes

| Route | Screen | Purpose | Primary states and actions |
| --- | --- | --- | --- |
| `/setup` | Setup page | First-run admin bootstrap | Checks `/api/setup/status`, collects name/email/password, posts `/api/setup/initialize`, redirects to login |
| `/login` | Login page | Session entry and recovery | Email/password login, session-expired messaging, offline messaging, CAIA/PIV login when available, redirects to requested route |
| `/invite/:token` | Invite acceptance | Join workspace from invite | Validates token, handles already-member/already-accepted/expired/invalid states, optionally collects name/password for new users |
| `/feedback/:programId` | Public feedback form | External issue intake | Loads program info, accepts title/email, posts feedback, shows success state |

### Authenticated app-shell routes

| Route | Screen | Purpose | Key behavior |
| --- | --- | --- | --- |
| `/` | Redirect | Authenticated root | Redirects to `/my-week` |
| `/dashboard` | Dashboard | Personal or overview dashboard | `view=my-work` or `view=overview`, active-week summaries, recent standups, overdue-accountability banner |
| `/my-week` | My Week | Personal weekly workspace | Week navigation, assigned projects, plan/retro creation/open, standup slots, previous-retro nudges |
| `/docs` | Documents | Workspace wiki/document list | Tree or list view, visibility filtering, search, create/delete docs, bulk actions in list mode |
| `/issues` | Issues | Issue backlog/work list | List or kanban view, state filter tabs, program filter, create issue, bulk actions, keyboard navigation |
| `/projects` | Projects | Project portfolio list | Status filters, program filter, list/kanban, ICE sorting, bulk archive/delete, conversion flows |
| `/programs` | Programs | Program list | List view, create/open/archive/delete programs, column visibility |
| `/fleetgraph` | FleetGraph queue | Workspace findings queue | Global proactive findings list with open/review/apply/snooze/dismiss behavior |
| `/settings` | Workspace settings | Workspace administration | Members, invites, API tokens, audit logs |
| `/settings/conversions` | Converted documents | Conversion history | Filtered list of issue↔project conversions with metadata |

### Team routes

| Route | Screen | Purpose | Key behavior |
| --- | --- | --- | --- |
| `/team/allocation` | Team allocation | Resource planning by week | Scrollable week grid, my-team/everyone filtering, archived toggle, program grouping, assign/unassign actions |
| `/team/directory` | Team directory | People list | View members, archived toggle, workspace-admin removal, navigate to person profile |
| `/team/status` | Status overview | Accountability heatmap | Archived toggle plus heatmap display |
| `/team/reviews` | Reviews | Manager review workspace | Plan/retro review queue, my-team filtering, approve/request-changes/rating flows, queue helpers |
| `/team/org-chart` | Org chart | Reporting-structure editor | Tree view, search, keyboard navigation, drag/drop reporting lines, undo toast |
| `/team/:id` | Person profile | Person detail and notes | Shared editor plus person properties and sprint metrics |

### Admin routes

| Route | Screen | Purpose | Key behavior |
| --- | --- | --- | --- |
| `/admin` | Admin dashboard | Super-admin control center | Workspace tab, user tab, audit tab, create/archive workspaces, toggle super-admin, impersonate |
| `/admin/workspaces/:id` | Admin workspace detail | Workspace-level admin detail | Inspect workspace metadata, manage members, invite users, add existing users, revoke invites |

## Shared App Shell Specification

The authenticated shell (`AppLayout`) wraps most in-app routes.

Required shell behavior:

1. Left-rail mode selection based on current path and current document type.
2. Persistent left-sidebar collapse state in localStorage.
3. Workspace switching for users with multiple memberships.
4. Global command palette.
5. Session timeout warning modal and redirect on expiration.
6. Upload navigation warning and cache-corruption alert surfaces.
7. Global accountability/action-items modal with route-aware suppression behavior.
8. FleetGraph queue badge/count in shell navigation.

## Canonical Detail Screen: `/documents/:id/*`

This is the product’s primary detail surface for most document types.

Shared behavior:

1. Loads a single document regardless of type.
2. Sets current-document context for shell highlighting and contextual sidebars.
3. Renders a shared editor and a type-specific properties sidebar.
4. Supports FleetGraph document-context analysis surfaces.
5. Adapts tab bar behavior based on document type and, for week docs, status.

### Document-type tab matrix

| Document type | Canonical detail route behavior |
| --- | --- |
| `wiki` | No tabs; direct shared editor |
| `issue` | No tabs; direct shared editor with issue properties |
| `project` | Tabs: `issues`, `details`, `weeks`, `retro` |
| `program` | Tabs: `overview`, `issues`, `projects`, `weeks` |
| `sprint` / week document | Status-aware tabs: planning weeks show `overview`, `plan`; active/completed weeks show `overview`, `issues`, `review`, `standups` |
| `person` | Person profiles stay on `/team/:id`, not `/documents/:id` |
| `weekly_plan` | Direct editor view for personal weekly plan docs |
| `weekly_retro` | Direct editor view for personal weekly retro docs |
| `standup` | Direct editor view for standup docs |

### Detail-screen cross-cutting requirements

1. Title editing with `"Untitled"` placeholder semantics.
2. Breadcrumb/back navigation context.
3. Type-specific properties panel.
4. Shared rich-text editor.
5. Document-type selector when the parent flow enables it.
6. Delete and conversion hooks where applicable.
7. FleetGraph findings panel, guided actions overlay, analysis FAB, and optional debug surfaces.

## Screen-by-Screen Functional Spec

### Dashboard (`/dashboard`)

Required behavior:

1. Support `view=my-work` and `view=overview`.
2. Surface blocking overdue-accountability banner at the top when overdue items exist.
3. In overview mode, show active weeks, active projects, recent standups, and time-left metrics.
4. Pull recent standups from active week contexts.

### My Week (`/my-week`)

Required behavior:

1. Support current-week view and arbitrary week selection via `week_number` query param.
2. Show assigned projects for the selected week.
3. Show weekly plan card, weekly retro card, and daily standup slots.
4. Allow creation of missing plan/retro/standup documents from the page.
5. Nudge the user about incomplete prior retros.

### Documents (`/docs`)

Required behavior:

1. Support tree and list views.
2. Support visibility filtering (`all`, `workspace`, `private`) and title search.
3. Allow new document creation, nested creation, single delete, and bulk delete.
4. Preserve column visibility and list preferences in localStorage.

### Issues (`/issues`)

Required behavior:

1. Support list and kanban views.
2. Support state filter tabs and program filtering.
3. Support issue creation, updates, refresh, bulk actions, keyboard navigation, and promote-to-project behavior.

### Projects (`/projects`)

Required behavior:

1. Support status filters (`all`, `active`, `planned`, `completed`, `archived`) and optional program filter.
2. Support list and kanban-ish/project browsing behaviors through reusable list state.
3. Support ICE sorting, project creation, archive/delete bulk actions, and conversion dialogs.

### Programs (`/programs`)

Required behavior:

1. Support program list view with sortable columns.
2. Allow creation of new programs that open into the canonical detail page.
3. Support archive/delete bulk actions and context menus.

### Team allocation (`/team/allocation`)

Required behavior:

1. Render people vs week grid with lazy range loading and horizontal scrolling.
2. Group people by program assignment for the viewed/current week.
3. Support “my team” versus “everyone” filtering.
4. Support search, archived toggle, past-weeks toggle, and viewed-sprint grouping.
5. Support assigning and unassigning projects/program work to people-week cells.

### Team directory (`/team/directory`)

Required behavior:

1. List members with name/email and archived state.
2. Open person profiles on click.
3. Show admin management affordances for workspace admins.

### Reviews (`/team/reviews`)

Required behavior:

1. Present week-by-person plan and retro review states.
2. Support my-team filtering based on reporting relationships.
3. Support selecting plan or retro cells for review actions.
4. Support approval, request-changes, and rating workflows.
5. Support queue/batch-review assistance.

### Status overview (`/team/status`)

Required behavior:

1. Render accountability/status heatmap.
2. Support archived-person visibility toggle.

### Org chart (`/team/org-chart`)

Required behavior:

1. Build reporting tree from person documents’ `reports_to` property.
2. Support search and expansion.
3. Allow drag/drop reassignment of reporting lines when the user is a workspace admin.
4. Prevent invalid drops such as assigning someone under their own descendant.

### Workspace settings (`/settings`)

Required behavior:

1. Tabs for `members`, `invites`, `tokens`, and `audit`.
2. Admin-only access.
3. Member management supports role changes, archive/restore, and archived toggle.
4. Invite management supports email plus optional PIV/X.509 subject DN.
5. API tokens support list/create/revoke flows.
6. Audit logs show recent workspace-level activity.

### Converted documents (`/settings/conversions`)

Required behavior:

1. List archived original documents paired with active converted documents.
2. Filter `all`, `issue-to-project`, and `project-to-issue`.
3. Show conversion actor and timestamp metadata.

### Admin dashboard (`/admin`)

Required behavior:

1. Restrict access to super admins.
2. Support tabs for workspaces, users, and audit logs.
3. Support creating and archiving workspaces.
4. Support toggling super-admin status and impersonation.
5. Support global audit-log export.

### Admin workspace detail (`/admin/workspaces/:id`)

Required behavior:

1. Load workspace metadata, members, and invites.
2. Support creating/revoking invites.
3. Support adding existing users to the workspace.
4. Support role changes and member removal.
5. Support copying invite links.

## FleetGraph Surface Spec

### Global queue (`/fleetgraph`)

Required behavior:

1. Present active proactive findings across the workspace.
2. Allow navigation from a finding to its source document.
3. Allow review/apply, dismiss, and snooze behaviors.
4. Show contextual owner options where actions require assignment.

### Document-context surfaces (`/documents/:id/*`)

Required behavior:

1. Show document-scoped proactive findings when available.
2. Show an analysis-only FAB for on-demand reasoning.
3. Show guided actions in a floating overlay when a consequential next step is recommended.
4. Preserve follow-up conversation context through thread-based turns.

## Compatibility and Redirect Rules

1. `/docs/:id`, `/issues/:id`, and `/projects/:id` redirect to `/documents/:id`.
2. `/programs/:id/*` redirects to `/documents/:id/*` while preserving tab suffixes.
3. `/sprints/:id/*` redirects to `/documents/:id/*` with tab remapping such as `planning -> plan`.
4. `/feedback/:id` redirects to the canonical issue/document view because feedback is represented as an issue.
