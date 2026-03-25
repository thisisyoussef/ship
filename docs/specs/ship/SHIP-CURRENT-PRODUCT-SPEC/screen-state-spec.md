# Screen State Spec

This document defines the state taxonomy a rebuild must preserve. It focuses on what users see when data is loading, missing, invalid, empty, ready for action, or mid-mutation. Use `state-machine-and-lifecycle-spec.md` alongside this file when you need the underlying transition rules, stored approval states, or session/document lifecycle mechanics behind those visible states.

## Cross-Cutting State Taxonomy

| State | Required treatment |
| --- | --- |
| Boot/loading | Use centered loading copy or skeletons rather than blank screens |
| Empty | Distinguish “no data exists yet” from “filters returned nothing” and offer the next obvious action where the product currently does |
| Blocked/forbidden | Explain whether the problem is auth, permissions, invalid token, or setup state; do not silently fail |
| Review/pending | Show explicit draft, pending approval, changes requested, or already-approved indicators |
| Mutation in progress | Disable or relabel the triggering control so the user sees that work is happening |
| Mutation success | Show toast, badge, inline status change, or navigation update depending on the surface |
| Mutation failure | Show inline error or toast and leave the user in a recoverable state |

## Public And Bootstrap Screens

### Setup (`/setup`)

| State | Current behavior |
| --- | --- |
| Loading setup status | Screen waits for `/api/setup/status` before rendering the form |
| Setup already complete | Redirect to `/login` |
| Ready to initialize | Show initial admin form with CSRF-aware submission |
| Initialize in progress | Submit button enters busy state |
| Initialize success | Redirect to `/login` |
| Initialize failure | Keep the user on the page and surface the error |

### Login (`/login`)

| State | Current behavior |
| --- | --- |
| Auth/status boot | Page resolves setup status plus auth/session state before final redirect decisions |
| Signed-in user hits login | Redirect to `/docs` through `PublicRoute` |
| Normal login | Email/password form with redirect target handling |
| Session expired | Show expired-session message driven by `expired=true` |
| Offline/problem state | Show offline or login error messaging instead of only console errors |
| CAIA/PIV available | Render alternate sign-in entrypoint |
| Successful login | Navigate to `state.from`, validated `returnTo`, or the default product landing path |

### Invite acceptance (`/invite/:token`)

| State | Current behavior |
| --- | --- |
| Loading token | Show pending invite-validation state |
| Valid invite for signed-out new user | Show account-creation path with invite acceptance |
| Valid invite for signed-out existing user | Show login path that preserves return flow |
| Valid invite for signed-in eligible user | Allow direct acceptance |
| Invalid token | Show invalid state |
| Expired token | Show expired state |
| Already accepted | Show accepted state |
| Already member | Show already-member state |

### Public feedback (`/feedback/:programId`)

| State | Current behavior |
| --- | --- |
| Loading program context | Load program name/context before showing the submission form |
| Program not found or invalid | Show error/blocked state |
| Ready | Show title plus optional email form |
| Submit in progress | Disable the form action |
| Submit success | Replace the form with success confirmation |
| Submit failure | Keep the form and surface the error |

## Dashboard And My Week

### Dashboard (`/dashboard`)

| State | Current behavior |
| --- | --- |
| Loading | Show dashboard loading state while summary queries resolve |
| No overdue accountability | Banner is absent |
| Overdue accountability exists | Show red accountability banner at top |
| `view=my-work` | Show personal-focus dashboard mode |
| `view=overview` | Show active weeks, active projects, recent standups, and day-remaining summaries |
| Sparse recent standups | Section still renders, but with whatever active-week standup context exists |

### My Week (`/my-week`)

| State | Current behavior |
| --- | --- |
| Loading selected week | Show page loading state while week context resolves |
| No assigned projects | Plan/retro due rules become less aggressive because some cards key off project presence |
| Current week | Week navigation can keep the URL free of `week_number` |
| Historical/future week | Navigation writes `week_number` explicitly |
| Previous retro missing | Show an orange nudge card for the prior week retro |
| Plan missing but due | Show create affordance and due state |
| Plan exists but not submitted | Show open/edit state with due messaging when appropriate |
| Retro missing but due | Show create affordance and due state |
| Retro exists but not submitted | Show open/edit state |
| Standup missing | Show create affordance for the day |
| Standup exists | Show open/edit affordance |

Detailed due-state rules that must be preserved:

1. Plan is treated as due when it is not submitted, the selected week is current-or-earlier, and the user has assigned projects.
2. Retro is treated as due when the selected week is before the current week, or when it is the current week and the day is Friday or later, again gated by project assignment.
3. Previous-retro nudges are separate from the selected-week retro card and should not be collapsed into one state.

## List And Collection Screens

### Documents (`/docs`)

| State | Current behavior |
| --- | --- |
| Loading | `DocumentsListSkeleton` renders |
| Tree view | Hierarchy view from `buildDocumentTree` |
| List view | Sortable, selectable row list with configurable columns |
| Search/filter produces no results | Empty list after filtering, not a loading state |
| Workspace has no documents | Empty state with create affordance |
| Single delete | Toast with deleted document title |
| Bulk delete | Bulk-selection bar plus pluralized delete toast |

### Issues (`/issues`) and embedded `IssuesList` surfaces

| State | Current behavior |
| --- | --- |
| Loading | `IssuesListSkeleton` renders |
| List view | Selectable list with bulk actions |
| Kanban view | Columnar issue board |
| Filtered empty | Empty state respects locked filters and active tabs |
| Self-fetch context | Program/project/week tabs can render `IssuesList` without parent-supplied data |
| “Show All Issues” off | Only in-context issues render |
| “Show All Issues” on | Out-of-context issues render after in-context rows and use reduced-context affordances |
| Backlog picker enabled | Extra action appears to pull existing issues into the current context |
| Promote-to-project enabled | Context menu can convert issue into project through conversion dialog |

### Projects (`/projects`)

| State | Current behavior |
| --- | --- |
| Loading | Uses list skeleton |
| Default filter | Non-archived projects only |
| Archived filter | Archived projects visible |
| Program filter active | Counts and list contents recompute inside the chosen program |
| Empty | Create-project affordance remains visible |
| Bulk actions active | Archive/delete bar appears with current selection count |
| Conversion pending | Conversion dialog blocks duplicate submit and surfaces busy state |

### Programs (`/programs`)

| State | Current behavior |
| --- | --- |
| Loading | List skeleton / loading state |
| Empty | “Create your first program” affordance |
| List ready | Selectable sortable table |
| Bulk selection active | Archive/delete actions appear |
| Creating | Create button relabels to busy state |

## Canonical Detail Screen States

### `/documents/:id/*`

| State | Current behavior |
| --- | --- |
| Loading document | Unified detail page resolves document plus sidebar/context queries |
| Not found/private without access | Backend returns 404; UI must not expose private-doc existence |
| Invalid tab | Immediate redirect to `/documents/:id` |
| Untabbed doc type | Shared editor renders directly with properties sidebar |
| Tabbed doc type | Tab bar plus tab-specific content renders |
| Weekly review mode | Query params move review actions into the sub-nav/sidebar model |
| Missing required fields after type change | Fields are highlighted for completion |
| FleetGraph contextual state | Findings panel, guided overlay, FAB, and debug surfaces appear when relevant |

### Project detail tabs

| Tab | Important state distinctions |
| --- | --- |
| `issues` | Uses embedded `IssuesList` with project-scoped behavior |
| `details` | Shared editor plus project-specific properties and setup actions |
| `weeks` | Allocation-style people-vs-weeks grid plus plan/retro progress signals |
| `retro` | Draft vs saved retro, issues summary, success criteria, and plan validation |

### Program detail tabs

| Tab | Important state distinctions |
| --- | --- |
| `overview` | Shared editor plus program properties |
| `issues` | Includes untriaged handling and backlog assignment paths |
| `projects` | Program-scoped project list |
| `weeks` | Program week index with nested week drill-in |

### Week detail tabs

| Week status | Tabs | Important state distinctions |
| --- | --- | --- |
| `planning` | `overview`, `plan` | Planning screen includes start-week action and scoped issue/backlog setup |
| `active` or `completed` | `overview`, `issues`, `review`, `standups` | Active/completed weeks expose execution, reconciliation, review, and standup states |

## Team Screens

### Allocation (`/team/allocation`)

| State | Current behavior |
| --- | --- |
| Initial loading | Whole grid waits on team, project, and assignment data |
| Incremental left/right loading | Horizontal extension shows directional loading state |
| Error | Inline error text instead of silent failure |
| My-team filter | Only direct reports show |
| Everyone filter | All visible people show |
| Archived included | Archived users are included in the grid |
| Past weeks hidden | Only current-and-future weeks show |
| Dialog for assignment | Project picker dialog controls assignment/unassignment |
| Last-person warning | Special dialog appears when removing the last assigned person would orphan issues |

### Directory, Reviews, Status, Org Chart, Person

| Surface | Required state distinctions |
| --- | --- |
| Directory | Loading, archived toggle, empty list, context menu active |
| Reviews | Cell inactive vs actionable vs already approved vs changes requested; queue assistance active or not |
| Status overview | Loading, archived toggle, populated heatmap |
| Org chart | Loading, search filtered, drag target valid, drag target invalid |
| Person detail | Loading, non-person redirect, editable profile, metrics visibility |

## Settings, Conversions, And Admin

| Surface | Required state distinctions |
| --- | --- |
| Workspace settings | No workspace selected, not-admin blocked, loading, per-tab ready state |
| Members tab | Active members, archived toggle, role-change guard against removing last admin |
| Invites tab | Invite form ready, PIV field expanded, revoke state |
| API tokens | Empty vs existing tokens, create/revoke flow |
| Audit logs | Recent activity list or empty |
| Converted documents | Loading spinner, empty state, filtered historical conversion list |
| Admin dashboard | Loading, workspaces tab, users tab, audit tab, impersonation banner active |
| Admin workspace detail | Loading, invite/member lists ready, add-existing-user flow, no-data states |

## FleetGraph States

### Workspace queue (`/fleetgraph`)

| State | Current behavior |
| --- | --- |
| Loading | Helper text says FleetGraph is loading Ship context |
| Empty | Queue-specific empty copy |
| Findings ready | Cards render with severity/evidence/action controls |
| Review opened | Review payload or selection UI is attached to the card |
| Apply running | Action buttons enter busy state |
| Snoozed | Local info notice appears and auto-refresh is scheduled for snooze expiry |
| Dismissed/applied | Local success/info notice appears and the finding can disappear from the list |

### Document-context FleetGraph

| State | Current behavior |
| --- | --- |
| No findings | Quiet empty panel state |
| Findings present | Document-scoped findings panel renders |
| Guided next-step present | Floating overlay auto-surfaces page-specific actions |
| Analysis only | FAB opens on-demand analysis without applying changes |
| Follow-up turn active | Thread-based continuation persists inside the FleetGraph conversation surface |

## Mutation Feedback Patterns

These feedback states recur across screens and must remain recognizable in a rebuild:

1. Create and save actions typically show toast-based confirmation.
2. Approval actions change the visible approval state immediately and often also advance review queue context.
3. Delete/archive actions usually clear selection and show a toast rather than a blocking full-page refresh.
4. FleetGraph uses local inline notices in addition to any global toast/error treatment.
