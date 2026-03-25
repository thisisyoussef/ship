# Document Field Reference

This document is the field-level contract for Ship’s unified document model. It describes what is stored, what is computed, what is flattened for compatibility, and which fields are transitional.

## Base Document Row Contract

All document-like entities share the `documents` table.

| Field | Type / storage | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | yes | Stable primary key |
| `workspace_id` | UUID | yes | Tenant boundary |
| `document_type` | enum | yes | One of `wiki`, `issue`, `program`, `project`, `sprint`, `person`, `weekly_plan`, `weekly_retro`, `standup`, `weekly_review` |
| `title` | text | yes | Defaults to `"Untitled"` |
| `content` | JSONB TipTap document | yes | Shared rich-text source |
| `yjs_state` | `BYTEA` | no | Collaboration state |
| `parent_id` | UUID | no | Hierarchy/containment link; cascade delete |
| `position` | integer | yes | Ordering within a parent/list |
| `properties` | JSONB | yes | Type-specific fields |
| `ticket_number` | integer | no | Issue display number only |
| `archived_at` | timestamp | no | Archived-state filter |
| `deleted_at` | timestamp | no | Soft-delete/trash retention path |
| `started_at` | timestamp | no | Issue first entered `in_progress` |
| `completed_at` | timestamp | no | Issue entered `done` |
| `cancelled_at` | timestamp | no | Issue entered `cancelled` |
| `reopened_at` | timestamp | no | Issue reopened after completion/cancelation |
| `converted_to_id` | UUID | no | Legacy archived-original conversion pointer |
| `converted_from_id` | UUID | no | Current in-place conversion metadata also writes here |
| `converted_at` | timestamp | no | Latest conversion/undo timestamp |
| `converted_by` | UUID | no | User who performed the latest conversion action |
| `original_type` | varchar | no | First type before any conversion |
| `conversion_count` | integer | yes | Number of conversions/undos recorded |
| `created_at` | timestamp | yes | Creation time |
| `updated_at` | timestamp | yes | Last update |
| `created_by` | UUID | no | Creator user |
| `visibility` | `private` or `workspace` | yes | Only document-level ACL mode in current product |

## Association Contract

Relationships between documents are primarily stored in `document_associations`.

| Relationship type | Meaning |
| --- | --- |
| `program` | Document belongs to a program |
| `project` | Document belongs to a project |
| `sprint` | Document belongs to a week |
| `parent` | Parent-style related association in some public/client shapes |

API/client compatibility shape:

1. Many responses expose these relationships as a `belongs_to` array.
2. Some routes also flatten `program_id`, `project_id`, or `sprint_id` for convenience or backward compatibility.
3. The association table is the canonical relational truth even when convenience fields exist.

## Shared Enums

### Document visibility

`private | workspace`

### Issue state

`triage | backlog | todo | in_progress | in_review | done | cancelled`

### Issue priority

Current shared type:

`low | medium | high | urgent`

Compatibility note:

1. Some backend validators still accept `none`.
2. UI list components also render a `No Priority` label for `none`.

### Issue source

`internal | external | action_items`

### Accountability type

`standup | weekly_plan | weekly_retro | weekly_review | week_start | week_issues | project_plan | project_retro | changes_requested_plan | changes_requested_retro`

### Week status vocabulary

Current user-facing operational statuses on week documents:

`planning | active | completed`

Additional compatibility note:

1. Shared TS also defines `WeekStatus = active | upcoming | completed` for some derived contexts.
2. Rebuilds must distinguish derived calendar status from stored operational week-document status.

## Per-Type Properties

### Wiki document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `maintainer_id` | person ID or null | no | Optional maintainer shown in sidebar |

### Issue document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `state` | issue state | yes | Primary lifecycle field |
| `priority` | issue priority | yes | Defaults are applied on create/conversion paths |
| `assignee_id` | user ID or null | no | Stored as user ID, not person ID |
| `estimate` | number or null | no | Sprint estimate |
| `source` | issue source | yes | Provenance; `external` is feedback-backed |
| `rejection_reason` | string or null | no | Used when rejecting triage items |
| `due_date` | ISO date string or null | no | Due-date support |
| `is_system_generated` | boolean | no | Used for accountability-generated issues |
| `accountability_target_id` | document ID or null | no | Links system-generated issue to its target |
| `accountability_type` | accountability type or null | no | Explains what accountability task the issue represents |

Issue relationship expectations:

1. Issues can belong to a program, project, week, and/or parent issue.
2. Child/parent issue relationships participate in cascade warnings when closing a parent with incomplete children.

### Program document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `color` | hex string | yes | Visual identity |
| `emoji` | string or null | no | Optional visual badge |
| `owner_id` | user ID or null | no | Responsible person |
| `accountable_id` | user ID or null | no | Approval/accountability owner |
| `consulted_ids` | array of user IDs | no | Stubbed but persisted |
| `informed_ids` | array of user IDs | no | Stubbed but persisted |

### Project document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `impact` | `1..5` or null | yes in completion model | ICE score component |
| `confidence` | `1..5` or null | yes in completion model | ICE score component |
| `ease` | `1..5` or null | yes in completion model | ICE score component |
| `owner_id` | user ID or null | no | Responsible owner |
| `accountable_id` | user ID or null | no | Approval owner |
| `consulted_ids` | array of user IDs | no | Persisted RACI support |
| `informed_ids` | array of user IDs | no | Persisted RACI support |
| `color` | hex string | yes | Visual identity |
| `emoji` | string or null | no | Optional visual badge |
| `plan_validated` | boolean or null | no | Retro outcome field |
| `monetary_impact_expected` | string or null | no | Expected impact copy |
| `monetary_impact_actual` | string or null | no | Actual impact copy |
| `success_criteria` | array of strings or null | no | Shared between plan/retro surfaces |
| `next_steps` | string or null | no | Follow-up recommendations |
| `plan_approval` | `ApprovalTracking` or null | no | Project plan review state |
| `retro_approval` | `ApprovalTracking` or null | no | Project retro review state |
| `has_design_review` | boolean or null | no | Design review marker |
| `design_review_notes` | string or null | no | Design review notes |
| `is_complete` | boolean | computed | Added during update completeness checks |
| `missing_fields` | string array | computed | Added during update completeness checks |

### Week / sprint document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `sprint_number` | number | yes | Week sequence number within workspace cadence |
| `owner_id` | user ID | yes | Current live routes validate this against `users` in the workspace |
| `status` | `planning | active | completed` | yes | Controls visible tabs |
| `plan` | string or null | no | Canonical stored plan statement |
| `success_criteria` | array of strings or null | no | Derived from content when content changes |
| `confidence` | number or null | no | Confidence indicator |
| `plan_history` | array of `PlanHistoryEntry` or null | no | Tracks plan changes |
| `plan_approval` | `ApprovalTracking` or null | no | Approval state for week plan |
| `review_approval` | `ApprovalTracking` or null | no | Approval state for week review/retro |
| `review_rating` | `{ value, rated_by, rated_at }` or null | no | OPM-style rating |
| `assignee_ids` | array of user IDs | compatibility | Older sprint endpoints still read owner from `assignee_ids[0]` |
| `is_complete` | boolean | computed | Added during update completeness checks |
| `missing_fields` | string array | computed | Added during update completeness checks |

Week compatibility notes:

1. UI and docs use the word “week,” but many stored and API-level names still say `sprint`.
2. Authoring and storage treat `owner_id` as canonical, but `GET /api/documents/:id` still resolves sprint owner from `assignee_ids[0]` when flattening.
3. `start_date` and `end_date` are user-facing/completeness concepts even though current week windows are derived from workspace cadence plus `sprint_number`.

### Person document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user_id` | user ID string | runtime-required | Real persisted link to `users.id`; missing from shared TS interface but present in schema/routes |
| `email` | string or null | no | Person contact field |
| `role` | string or null | no | Role/job title |
| `capacity_hours` | number or null | no | Capacity for allocation views |
| `reports_to` | user ID or null | no | Reporting line, edited by admins |

### Weekly plan document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `person_id` | person document ID | yes | Which person this plan belongs to |
| `project_id` | project ID | legacy/optional | Legacy contextual field retained in current product |
| `week_number` | number | yes | Week sequence |
| `submitted_at` | ISO timestamp or null | no | Used to decide due/submitted state |

### Weekly retro document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `person_id` | person document ID | yes | Which person this retro belongs to |
| `project_id` | project ID | legacy/optional | Legacy contextual field retained in current product |
| `week_number` | number | yes | Week sequence |
| `submitted_at` | ISO timestamp or null | no | Used to decide due/submitted state |

### Standup document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `author_id` | user ID | yes | Standup author |
| `date` | ISO date string | no | Standalone day association |
| `submitted_at` | ISO timestamp or null | no | Submission state |

### Weekly review document properties

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `sprint_id` | week document ID | yes | Parent week |
| `owner_id` | user ID | yes | Review owner |
| `plan_validated` | boolean or null | yes | Validation outcome stored with the review |

## ApprovalTracking Contract

Approval-related fields reuse the same object shape.

| Field | Type | Meaning |
| --- | --- | --- |
| `state` | `null | approved | changed_since_approved | changes_requested` | Current approval status |
| `approved_by` | user ID or null | Who approved/requested changes |
| `approved_at` | ISO timestamp or null | When that action happened |
| `approved_version_id` | document-history ID or null | Approved content version |
| `feedback` | string or null | Change-request explanation |
| `comment` | string or null | Optional approval note |

## Computed And Flattened API Fields

`GET /api/documents/:id` currently returns both the raw `properties` object and many top-level convenience fields.

| Top-level field | Source |
| --- | --- |
| `state`, `priority`, `estimate`, `assignee_id`, `source` | Issue properties |
| `impact`, `confidence`, `ease` | Project properties |
| `owner_id`, `owner` | Project or sprint compatibility lookup |
| `accountable_id`, `consulted_ids`, `informed_ids` | Program/project properties |
| `has_design_review`, `design_review_notes` | Project properties |
| `color`, `prefix` | Generic property flattening |
| `status`, `plan`, `plan_approval`, `review_approval`, `review_rating` | Week properties |
| `belongs_to` | Joined from `document_associations` |
| computed weekly doc `title` | Weekly plan/retro titles append the person name |

## Compatibility And Transitional Rules

These rules are load-bearing for current-product fidelity:

1. `program_id` and `sprint_id` are still accepted on create/update document routes as compatibility inputs, even though associations are canonical.
2. `hypothesis` is still accepted on update routes and mapped into canonical `plan`.
3. Person documents truly use `properties.user_id`; do not trust the shared TS omission here as product truth.
4. Week ownership is split across canonical `owner_id` storage and `assignee_ids[0]` compatibility reads.
5. Conversion metadata fields reflect both the old multi-document conversion model and the current in-place snapshot model.
6. Project and week completeness fields are computed during document updates, not authored manually.
