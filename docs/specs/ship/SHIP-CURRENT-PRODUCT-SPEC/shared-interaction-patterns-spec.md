# Shared Interaction Patterns Spec

This document captures the UI mechanics that recur across Ship. It is the contract for how the product feels, not just what each route does.

## App-Shell Patterns

### Global command palette

| Trigger | Behavior |
| --- | --- |
| `Cmd+K` or `Ctrl+K` | Toggles the command palette anywhere inside `AppLayout` |

Implementation notes:

1. The shortcut is global at the window level.
2. Repeated presses toggle the palette rather than only opening it.
3. A rebuild should keep this behavior shell-global instead of reimplementing it per screen.

### Session timeout handling

| Pattern | Current behavior |
| --- | --- |
| Warning | Shell shows a session timeout warning modal before expiry |
| Expiry | Shell redirects hard to `/login?expired=true&returnTo=...` |
| Return behavior | The prior path, search, and hash are preserved in `returnTo` |

### Action-items and accountability prompts

| Pattern | Current behavior |
| --- | --- |
| Auto-open | Action-items modal auto-opens on initial load when there are pending items |
| Disable flag | `localStorage['ship:disableActionItemsModal']='true'` suppresses auto-open |
| Route-aware suppression | Auto-opened modal closes when the user navigates into `/documents/:id/*` |
| Celebration | Realtime accountability completion triggers a brief celebratory state before queries refresh |

### Shell persistence keys

| Key | Owner | Purpose |
| --- | --- | --- |
| `ship:leftSidebarCollapsed` | `AppLayout` | Persist left-rail collapse |
| `ship:disableActionItemsModal` | `AppLayout` | Disable auto-open action-items modal |
| `ship:rightSidebarCollapsed` | `Editor` | Persist editor right-sidebar collapse |
| `dashboard-view` | `DashboardSidebar` | Persist preferred dashboard view |
| `ship:allocation-filter-mode` | `TeamModePage` | Persist `my-team` vs `everyone` |
| `ship:allocation-show-past-weeks` | `TeamModePage` | Persist past-week visibility |
| `ship_quality_guide_expanded` | quality assistant | Persist expanded/collapsed AI quality guide |
| `${storageKey}-view-mode` | `useListFilters` | Persist list/tree/kanban choice for a screen |
| `${storageKeyPrefix}-column-visibility` or dedicated keys like `documents-column-visibility` | `useColumnVisibility` | Persist visible columns per list surface |

## Shared List Pattern

### Document list toolbar

`DocumentListToolbar` is the canonical list header control strip.

It combines:

1. Sort combobox
2. Optional view-mode toggle
3. Optional column picker
4. Optional extra filter controls
5. Optional create button

Rules:

1. View toggle only appears when more than one view mode is enabled.
2. Column picker only appears in list view.
3. The create button stays in the header even when the list body is empty.

### View modes

| View mode | Current usage |
| --- | --- |
| `list` | Canonical table/list presentation for documents, issues, projects, programs |
| `tree` | Documents page hierarchy mode |
| `kanban` | Issues and projects alternate view |

Persistence rules:

1. View mode is stored under `${storageKey}-view-mode` when a `storageKey` is provided.
2. Documents default to `tree`.
3. Most other reusable lists default to `list` unless configured otherwise.

### Selectable list contract

`SelectableList` is the canonical selectable-table surface.

Behavior that must be preserved:

1. Hover-visible checkboxes become visible on hover and stay visible when selected.
2. Plain row click selects only that row.
3. `Shift+click` extends a range from the last selected item.
4. `Cmd/Ctrl+click` toggles membership in the current selection.
5. Right-clicking an unselected row first selects that row, then opens the context menu.
6. Hover also sets the focused row so keyboard navigation feels continuous.
7. Leaving the table clears hover and focus so `j` navigation restarts from the top.

### Keyboard navigation and selection

Keyboard behavior is split between `useSelection` and `useGlobalListNavigation`.

| Shortcut | Current behavior |
| --- | --- |
| `j` / `ArrowDown` | Move focus down |
| `k` / `ArrowUp` | Move focus up |
| `Shift+j` / `Shift+ArrowDown` | Extend selection downward |
| `Shift+k` / `Shift+ArrowUp` | Extend selection upward |
| `Home` / `End` | Jump focus to start/end |
| `Shift+Home` / `Shift+End` | Extend selection to start/end |
| `Enter` | Open focused item when global list navigation is enabled |
| `Space` or `Enter` on focused row inside the grid | Toggle selection |
| `Cmd/Ctrl+A` | Select all visible items |
| `Escape` | Clear selection or close bulk-action dropdowns |

Important nuance:

1. Bulk-action bar buttons keep their own `Enter` handling; global list navigation skips hijacking `Enter` when focus is inside the bulk-action region.
2. Global list navigation disables itself inside text inputs, textareas, and contenteditable elements.

### Bulk action bar

`BulkActionBar` is the reusable selected-items affordance used by issue-style list screens.

Actions currently supported:

1. Archive
2. Delete
3. Change status
4. Move to week
5. Assign person
6. Assign project
7. Clear selection

Behavior:

1. Appears only when at least one row is selected.
2. Announces selection count.
3. Uses dropdown menus for status/week/assignee/project changes.
4. Closes dropdowns on outside click or `Escape`.

## Filter And URL-Sync Pattern

`useListFilters` standardizes three pieces of list state:

1. Sort order
2. View mode
3. Optional URL-synced filter value

Current URL-synced patterns:

| Screen | URL param | Meaning |
| --- | --- | --- |
| Issues | `state` | Issue state/filter tab |
| Dashboard | `view` | Dashboard variant |
| Documents | `filter` | Visibility filter |
| Projects | `status` | Project status filter |
| Settings/Admin | `tab` | Selected tab |

Principle:

1. Filter state that matters for deep links goes in the URL.
2. Pure presentation preferences like view mode and columns go in localStorage.

## Detail-Screen Interaction Pattern

### Unified editor shell

Most detail pages share the same high-level interaction model:

1. Title editing at the top
2. Shared rich-text editor body
3. Properties sidebar on the right
4. Optional type selector or document-type-specific tab shell
5. Contextual quality, review, or FleetGraph surfaces around the editor

### Type change and missing-field guidance

`DocumentTypeSelector` plus the properties panel enforce a cross-type completion model.

Required-field highlights are currently defined as:

| Target type | Required fields list used for highlighting |
| --- | --- |
| `issue` | `state`, `priority` |
| `project` | `impact`, `confidence`, `ease` |
| `sprint` | `start_date`, `end_date`, `status` |
| `wiki` | none |

Important nuance:

1. The sprint/week required-field list still mentions `start_date` and `end_date`, even though current week windows are derived from workspace cadence plus `sprint_number`.
2. This is a compatibility/UI-completeness artifact and should be preserved or intentionally redesigned, not silently discarded.

### Weekly review mode

When a weekly plan or retro is opened with `?review=true&sprintId=:id`:

1. Approval actions move into a dedicated sub-nav/sidebar flow.
2. Person and project names are resolved from IDs for human-readable review context.
3. Approve/request-changes/rating actions operate on the parent week, not only the child weekly document.

## Context Menus And Destructive Actions

Patterns that recur across list/detail surfaces:

1. Context menus expose single-item actions that mirror the bulk-action vocabulary.
2. Admin/member archival flows use browser confirm prompts for destructive actions.
3. Conversion uses a modal dialog with explicit “what will happen” copy.
4. Delete/archive flows typically clear selection after completion.

Current transitional nuance:

1. Conversion dialog copy still describes the older new-document-plus-archive model.
2. Backend conversion is now in-place and snapshot-backed.
3. A rebuild should either preserve that mismatch knowingly or clean it up as a separate product change, not as an accidental docs omission.

## Feedback, Toast, And Notice Patterns

| Pattern | Current usage |
| --- | --- |
| Toast on delete/archive/save | Documents, projects, programs, reviews, retros, and other standard CRUD surfaces |
| Inline banner for draft status | Week review and project retro |
| Inline local notice | FleetGraph findings panel after dismiss/snooze/apply |
| Inline blocking banner | Dashboard accountability banner and some review/change-request states |

## FleetGraph Interaction Pattern

FleetGraph uses a distinct but still shared interaction grammar:

1. Findings cards expose `Review`, `Apply`, `Dismiss`, and `Snooze`.
2. Some findings need user selection before review can complete, especially owner and assignee actions.
3. Apply is gesture-guarded for a short interval after opening review so accidental double-actions do not fire immediately.
4. Snoozing schedules a client-side refresh when the snooze expires.
5. Local notices explain what changed in Ship after apply.

## Rebuild Rules

When rebuilding the product, preserve these interaction-level invariants:

1. Shared interactions should stay shared; do not implement separate selection or list-toolbar systems per page.
2. URL state and local persistence should remain clearly separated.
3. Review flows should keep their explicit draft/pending/approved/changes-requested states rather than collapsing them into a generic save state.
4. Compatibility quirks that users can observe today should be documented or migrated intentionally, never erased accidentally.
