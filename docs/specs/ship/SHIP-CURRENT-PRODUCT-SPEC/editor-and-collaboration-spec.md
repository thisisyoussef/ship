# Editor And Collaboration Spec

## Purpose

Most of Ship’s product types are edited through a shared rich-text substrate. Rebuilding the current product requires reproducing this editor once and then layering document-type-specific sidebars, tabs, and banners on top of it.

## Canonical Editor Surface

The canonical implementation is the combination of:

1. `UnifiedDocumentPage`
2. `UnifiedEditor`
3. `Editor`
4. document-type-specific properties sidebars
5. Yjs/WebSocket collaboration plus IndexedDB persistence

## Shared Editor Shell Requirements

Every shared-editor surface must support:

1. Editable title with `"Untitled"` placeholder semantics
2. Optional breadcrumbs and back navigation
3. Optional header badge and secondary header actions
4. Type-specific properties sidebar
5. Optional type selector for convertible document types
6. Delete and create-subdocument hooks where supported
7. Navigation to linked or newly created documents
8. Optional content banner for AI/accountability cues

## Shared Rich-Text Capabilities

The current editor includes the following content primitives and behaviors:

| Capability | Current behavior |
| --- | --- |
| Base rich text | TipTap `StarterKit` behavior for normal prose editing |
| Collaboration | Yjs collaboration extension plus cursor awareness |
| Placeholder | Empty-state placeholder text per document surface |
| Links | Rich link support |
| Code blocks | Syntax-highlighted code blocks via lowlight |
| Tables | Table, row, cell, and header support |
| Task lists | Task-list and task-item support |
| Drag handles | Block drag/reorder affordance |
| Slash commands | Contextual insert/create commands |
| Document mentions | Mention extension for linking other Ship documents |
| Document embeds | Embedded document blocks |
| Image upload | Inline image upload and resizable image rendering |
| File attachments | File attachment blocks |
| Details blocks | Expand/collapse details sections |
| Emoji support | Emoji insertion and emoji picker behavior |
| Table of contents | Generated TOC support |
| Hypothesis/plan blocks | Structured plan-like content blocks |
| Plan reference blocks | Structured references to plans |
| Comments | Mark-based comment anchoring plus comment display |
| Inline AI scoring | Inline rendering of AI plan/retro analysis output |

## Collaboration Model

### Data transport

The editor uses:

1. `y-websocket` for live sync
2. `y-indexeddb` for local content persistence
3. Yjs awareness for presence and cursors
4. a room name derived from `roomPrefix` and `documentId`

### Required collaboration behaviors

1. Create a new `Y.Doc` per `documentId` to avoid cross-document contamination.
2. Load from persisted `yjs_state` when present.
3. Fall back to JSON content and convert it into Yjs when no binary state exists yet.
4. Notify the browser to clear stale IndexedDB cache when a document is freshly hydrated from JSON rather than Yjs state.
5. Persist changes with debounce rather than on every keystroke.

### Sync status model

The current editor models sync state as:

1. `connecting`
2. `cached`
3. `synced`
4. `disconnected`

The rebuild should preserve a user-visible notion of whether the document is connected, cached, or disconnected.

## Persistence Behavior

When content is persisted, the backend:

1. stores `yjs_state`
2. stores JSON content as a backup/current API-readable form
3. updates `updated_at`
4. extracts `plan`, `success_criteria`, `vision`, and `goals` metadata from the current document content

### History behavior

For `weekly_plan` and `weekly_retro` documents, content changes also feed the history/audit trail.

Current expectations:

1. History entries are only logged when content actually changes.
2. Logging is throttled to avoid writing on every keystroke.
3. Approval flows reference version/history state.

## Offline And Cache Behavior

### Auth and app-state cache

The frontend caches auth/session bootstrap data in localStorage for short-lived offline continuity.

### Query cache

The frontend uses TanStack Query with IndexedDB persistence for stale-while-revalidate list/metadata behavior.

### Editor cache

The editor uses Yjs IndexedDB persistence for fast reopen and offline-tolerant editing semantics.

Key rule:

- The server remains the source of truth, but the UX is designed to reopen quickly from local cache and reconcile in the background.

## Title And Auto-Save Rules

1. Title changes are throttled/auto-saved.
2. Local unsaved title changes should not be overwritten by stale server props.
3. Empty titles render as `"Untitled"` from the product’s point of view even when the input temporarily shows blank placeholder styling.

## Document-Type Overlays On The Shared Editor

The shared editor is not alone; it is wrapped with type-specific behavior:

1. `issue` docs add issue properties and conversion/accept/reject hooks.
2. `project` docs add project properties, people/program pickers, and retro/accountability behavior.
3. `sprint` / week docs add plan/review navigation, status-sensitive tabs, and accountability banners.
4. `person` docs add people/reporting and sprint metrics sidebars.
5. `weekly_plan` and `weekly_retro` docs can display AI quality banners.

## Comments And Review Affordances

The editor must support:

1. Anchored inline comments
2. comment creation and updates
3. approval/review-related side content and banners
4. content-derived review cues such as plan/retro quality scoring

## Upload Requirements

The current editor supports image and file uploads with navigation-safe cancellation.

Rebuild requirements:

1. Uploads must be cancellable when the user navigates away.
2. Uploaded content must remain associated with the active document only.
3. The UI must support both inline media and attachment-style file blocks.

## Accessibility And Layout Requirements

1. The editor lives inside a multi-panel layout with a persistent properties sidebar.
2. Landmark order must remain sensible even when the sidebar is rendered through a portal.
3. Keyboard navigation must remain viable across editor, sidebars, and comment/review affordances.

## Current-State Edge Cases To Preserve

1. Cache corruption warning flows exist and must not be lost in a rebuild.
2. The editor protects against stale title responses overwriting newer local input.
3. Cross-document Yjs contamination prevention is an explicit implementation safeguard.
4. Weekly-accountability docs require stronger history/audit behavior than generic wiki pages.
