# Workflow And Action Spec

This document describes how user-triggered actions work end to end. Use it with `api-and-service-spec.md` for endpoint inventory, `payload-and-response-reference.md` for request/response shapes, `mutation-side-effects-spec.md` for invalidation/broadcast consequences, and `document-field-reference.md` for the payload/data model behind each action.

## Mutation Conventions

Cross-cutting rules:

1. Browser-authenticated writes use session cookies plus CSRF protection.
2. Most screen-level writes confirm success with toasts or inline status changes rather than full hard refreshes.
3. Query invalidation is the normal refresh mechanism after mutation.
4. When a mutation changes the user’s navigation target, Ship usually navigates directly to the canonical route with `replace: true`.

## Document Creation, Editing, And Deletion

### Create document-like item

| Surface | Action | Result |
| --- | --- | --- |
| Documents page | Create top-level or nested document | New document opens at `/documents/:id` |
| Issues page / embedded issues lists | Create issue | New issue opens at `/documents/:id` and inherits locked context where present |
| Projects page | Create project | New project opens at `/documents/:id`; owner is not required at creation time |
| Programs page | Create program | New program opens at `/documents/:id` |
| My Week | Create plan/retro/standup | New accountability document opens in its canonical editor |

Shared defaults:

1. New titles default to `"Untitled"`.
2. Relationship context is inherited when creation happens inside a program/project/week context.
3. Detail navigation happens immediately after creation, not after a second click.

### Edit document content and properties

Mutation surfaces:

1. Title editing on the detail page
2. Shared editor body updates
3. Properties sidebar updates
4. Association changes
5. Visibility changes

Important compatibility behavior:

1. Content extraction can overwrite manual `plan`, `success_criteria`, `vision`, and `goals` when content changes.
2. `PATCH /api/documents/:id` still accepts top-level issue/project/week fields and merges them into `properties`.
3. Updating a sprint owner also mirrors the owner into `properties.assignee_ids` for older sprint readers.

### Delete/archive

| Surface | Current behavior |
| --- | --- |
| Documents list | Single delete with toast or bulk delete with selection bar |
| Projects/programs | Archive and delete actions available from list context |
| Member/admin flows | Archive/remove actions often require confirm prompts |

## Document Type Change

The current type-change feature is narrower than generic conversion.

Rules:

1. Only the document creator can change `document_type`.
2. Changing to or from `program` or `person` is blocked.
3. Missing required fields are highlighted after a type change.
4. Type-change completion rules are UI-focused and still carry some older sprint field assumptions (`start_date`, `end_date`).

## Issue Workflow

### Issue lifecycle

1. Issues move through `triage`, `backlog`, `todo`, `in_progress`, `in_review`, `done`, and `cancelled`.
2. Specialized accept/reject routes support triage decisions.
3. Closing a parent issue can trigger a cascade warning when incomplete child issues still exist.
4. Issue history and iterations are tracked separately from the main content document.

### Bulk issue actions

Issue-style lists support bulk:

1. Archive
2. Delete
3. Change status
4. Move to week
5. Assign person
6. Assign project

### Scoped issue management

Embedded issue lists can operate in several modes:

1. Program-scoped
2. Project-scoped
3. Week-scoped
4. Self-fetching locked-filter mode

Extra behaviors:

1. Inline week assignment can move issues between weeks.
2. Backlog picker can pull existing issues into the current context.
3. “Show All Issues” can reveal out-of-context issues for add-in workflows.

## Project Workflow

### Prioritization and ownership

Project properties actions include:

1. Set ICE scores
2. Set owner/accountable people
3. Set design-review flags and notes
4. Set visual identity (color, emoji)

### Project retro

`ProjectRetro` preserves a multi-part workflow:

1. Load draft or saved retrospective
2. Show issue summary cards
3. Let the user validate or invalidate the original plan
4. Edit actual monetary impact
5. Add and remove success criteria
6. Save draft or update existing retro

### Project approvals

Project plan and retro approvals are separate fields and separate actions. Rebuilds should preserve:

1. Pending state
2. Approved state
3. Changes-requested state
4. Changed-since-approved state when content moves after approval

## Program Workflow

Programs are the top-level long-lived container.

User actions include:

1. Create program from list
2. Edit overview content and ownership/accountability fields
3. Review program-scoped issues, projects, and weeks
4. Merge one program into another through merge-preview and merge action

## Week Workflow

### Week creation and start

1. Weeks are explicit documents created for a program and week number.
2. Planning weeks expose a start action through `POST /api/weeks/:id/start`.
3. Starting a week changes the visible tab set from planning-oriented to execution/review-oriented.

### Planning and execution

Planning-week behavior includes:

1. Shared editor for overview context
2. Dedicated planning tab
3. Scoped issues view and backlog assignment
4. “Show All” issue expansion
5. Inline sprint/week assignment

### Reconciliation

`WeekReconciliation` handles incomplete issues at review time.

Per-issue decisions:

1. Move to next week
2. Move to backlog
3. Close as done
4. Close as cancelled

Bulk decision:

1. Move all incomplete issues to backlog

Special rules:

1. Moving to next week creates the next week automatically when needed.
2. Carryover writes `carryover_from_sprint_id`.

### Week review

`WeekReview` preserves these behaviors:

1. Draft review can exist before the user finalizes it.
2. User can validate, invalidate, or clear plan validation.
3. Save and update are separate states.

### Week approval flows

Manager/reviewer actions operate on the parent week:

1. Approve plan
2. Unapprove plan
3. Request plan changes
4. Approve review/retro
5. Request retro changes
6. Rate the review outcome

Weekly child-document review mode:

1. Weekly plan/retro docs can be opened in `review=true` mode.
2. Approval state, comments, and rating are shown in document context.
3. Review queue can advance after a successful approval or change-request action.

## My Week Accountability Workflow

The My Week page is a workflow hub rather than a simple list.

Actions:

1. Navigate between weeks
2. Create missing weekly plan
3. Create missing weekly retro
4. Create daily standup
5. Open existing plan/retro/standup docs

Rules:

1. Due-state messaging depends on the selected week and whether the user has assigned projects.
2. Prior-week retro nudges remain separate from the selected-week retro state.

## Team Workflow

### Allocation

Team allocation supports:

1. Assign project/program work to a person-week cell
2. Unassign a person-week cell
3. Filter to direct reports or everyone
4. Toggle archived users
5. Toggle past weeks
6. Group by program for the viewed/current week

Important edge behavior:

1. Removing the last assigned person can trigger an orphaned-issues warning dialog.
2. Week columns lazy-load to the left or right as the user scrolls.

### Reviews

Manager reviews page supports:

1. Select plan cell for approval/request-changes
2. Select retro cell for approval/rating/request-changes
3. Work in “my team” filtered mode
4. Use queue helpers to move from one review target to the next

### Org chart

Org chart supports:

1. Drag/drop reporting-line edits
2. Search and keyboard navigation
3. Invalid-drop prevention, including descendant loops

## Settings And Admin Workflow

### Workspace settings

Actions:

1. Change member role
2. Archive member
3. Restore archived member
4. Create invite
5. Revoke invite
6. Create API token
7. Revoke API token

Guardrails:

1. The last admin cannot be demoted or archived.
2. Non-admin users see a blocked state, not partial controls.

### Super-admin

Actions:

1. Create workspace
2. Archive workspace
3. Toggle super-admin status
4. Impersonate user
5. End impersonation
6. Export audit logs
7. Add existing user to a workspace
8. Update/remove workspace member
9. Create/revoke workspace invites

## Conversion Workflow

This is a critical transitional area.

### Current live conversion behavior

`POST /api/documents/:id/convert` currently:

1. Only allows `issue <-> project`
2. Requires creator ownership
3. Creates a `document_snapshots` entry first
4. Changes the existing document in place to the target type
5. Resets target-type-specific properties to defaults
6. Updates conversion metadata on the same row
7. Preserves or prunes associations based on the new type

### Undo conversion

`POST /api/documents/:id/undo-conversion`:

1. Requires creator or converter ownership
2. Restores from the most recent snapshot
3. Can regenerate ticket numbers when restoring to an issue
4. Keeps the same document ID

### Historical conversion surfaces

Current product still shows older-model behavior in some places:

1. Conversion dialog copy says a new document will be created and the original archived.
2. Converted-documents screen shows archived original plus active converted document.
3. Backend still supports legacy redirects for old conversions via `converted_to_id`.

Rebuild rule:

1. Preserve this split model explicitly or plan a cleanup separately.
2. Do not document conversion as only one model.

## Public Feedback Workflow

1. Public user opens `/feedback/:programId`.
2. Product loads target program.
3. User submits title and optional email.
4. Backend creates an internal issue with `source='external'`.
5. Internal staff later follow the item through canonical issue/document surfaces.

## Rebuild Rules

When implementing from this pack:

1. Match the current actor permissions, even when the UI copy is slightly behind the backend.
2. Preserve where actions operate on the parent week/project instead of only the visible child document.
3. Keep review, approval, and conversion flows explicit; Ship does not silently execute consequential changes.
