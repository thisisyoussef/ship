# Domain And Data Spec

Use this document with `document-field-reference.md` for the per-field contract and `workflow-and-action-spec.md` for how these entities change over time.

## Core Domain Model

Ship’s primary data model is a unified document system backed by PostgreSQL. The product does not model wiki pages, issues, projects, programs, weeks, and people as separate primary content tables. Instead, it uses a shared `documents` table with type-specific properties and supporting relationship tables.

## Primary Data Domains

| Domain | What it represents |
| --- | --- |
| Workspace | The top-level tenant boundary and week cadence source |
| User | Global identity/auth principal |
| Workspace membership | Authorization relationship between user and workspace |
| Document | Core content/work object used by most product features |
| Document association | Organizational relationship between documents |
| Audit/session/invite | Security, compliance, and membership lifecycle state |

## Document Contract

### Shared document fields

All major content objects inherit the same core fields:

1. `id`
2. `workspace_id`
3. `document_type`
4. `title`
5. `content` as TipTap JSON
6. `yjs_state` as collaboration state
7. `parent_id` for hierarchy
8. `position`
9. `properties` as JSONB
10. timestamps and creator metadata
11. `visibility`
12. optional issue-status timestamps and conversion metadata

Global document invariants:

1. New titles default to `"Untitled"`.
2. Visibility is either `workspace` or `private`.
3. Rich content is shared across document types.
4. The same canonical detail surface is reused across many document types.

## Document Types

| Document type | Product meaning | Key properties / behaviors |
| --- | --- | --- |
| `wiki` | Knowledge/documentation page | Optional maintainer, tree hierarchy via `parent_id` |
| `issue` | Work item | State, priority, assignee, source, due date, accountability metadata |
| `program` | Long-lived initiative | Color, emoji, RACI-style owner/accountable/consulted/informed fields |
| `project` | Time-bounded delivery unit | ICE scores, owner/accountable fields, design-review flags, retro/approval metadata |
| `sprint` | User-facing “week document” | `sprint_number`, owner, status, plan/review metadata, rating, computed week window |
| `person` | User profile/content layer | Email, role, capacity, `reports_to`, `user_id` link back to auth user |
| `weekly_plan` | Person-week plan document | `person_id`, `week_number`, optional submission timestamp |
| `weekly_retro` | Person-week retro document | `person_id`, `week_number`, optional submission timestamp |
| `standup` | Daily update document | `author_id`, optional date, optional submission timestamp |
| `weekly_review` | Weekly review artifact | `sprint_id`, owner, plan-validation state |

## Associations And Hierarchy

### Containment

`parent_id` is used for containment relationships such as:

1. Wiki child pages
2. Weekly plan under a week document
3. Weekly retro under a week document

### Organizational relationships

`document_associations` is the canonical organizational relationship layer.

Current public association types are expressed as:

1. `program`
2. `project`
3. `sprint`
4. `parent` in some public/client shapes

Important implementation note:

- User-facing copy says “week,” but several persisted/public contracts still use the historical `sprint` name. A rebuild must preserve this compatibility or normalize it very intentionally.

### Removed legacy columns

The old `program_id`, `project_id`, and `sprint_id` columns were removed from the core document model in favor of association-table truth. Some frontend/backend shapes still flatten program/project/week context for convenience, but the canonical relational source is `document_associations`.

## Visibility Model

Ship uses a simple workspace-level permissions model.

Access principles:

1. Membership in a workspace grants access to workspace-visible documents.
2. Private documents are restricted to their creator plus workspace admins.
3. There is no per-program or per-document ACL model beyond this visibility setting.
4. Workspace role is `admin` or `member`.

## Week Model

### Derived week windows

Weeks are derived 7-day windows computed from `workspaces.sprint_start_date`.

Rules:

1. Every workspace shares one global week cadence.
2. Week number determines start and end dates.
3. “Week” is the user-facing term, but historical code/schema still use `sprint`.

### Explicit week documents

A week only becomes an operational object when a `document_type='sprint'` document exists for a specific program and week number.

Week-document requirements:

1. It belongs to a program.
2. It carries `properties.sprint_number`.
3. It carries exactly one `owner_id` pointing at a workspace user.
4. It may have child weekly plan and retro docs.
5. It may have issues assigned into the week.

### Week status

Current week-document status values:

1. `planning`
2. `active`
3. `completed`

These control which tabs appear on the detail page.

## Accountability And Approval Model

### Weekly-accountability artifacts

The product treats weekly plans and retros as required-but-non-blocking accountability documents.

Core behaviors:

1. Missing or overdue artifacts surface through dashboards, banners, and review/status surfaces.
2. Reviewers can approve or request changes on plans and retros.
3. Week reviews can also carry ratings.

### Approval states

Approval-tracking objects can be:

1. `null` / pending
2. `approved`
3. `changed_since_approved`
4. `changes_requested`

Approval metadata includes approver, time, approved version, and optional feedback/comment.

## Issue Model

### Issue states

Current canonical issue states:

1. `triage`
2. `backlog`
3. `todo`
4. `in_progress`
5. `in_review`
6. `done`
7. `cancelled`

### Issue priorities

Current runtime surfaces primarily use:

1. `urgent`
2. `high`
3. `medium`
4. `low`

Implementation note:

- Some backend validation also tolerates `none` as a priority value. The rebuild should decide whether to preserve that compatibility explicitly.

### Issue source

Issue source/provenance values:

1. `internal`
2. `external`
3. `action_items`

`external` represents feedback-derived issues. `action_items` represents system-generated accountability issues.

### Issue lifecycle expectations

1. Issues can belong to a program, a project, a week, and/or a parent issue.
2. Status timestamp fields track first transitions into started/completed/cancelled/reopened states.
3. Certain parent-child closing flows warn about incomplete children.
4. Issues also support issue-iteration logging.

## Program And Project Model

### Programs

Programs are the top-level long-lived initiative container.

Program requirements:

1. Visual identity through color and optional emoji
2. Ownership/accountability metadata
3. Containment of projects, issues, and week documents
4. Merge-preview and merge behavior

### Projects

Projects are time-bounded delivery units.

Project requirements:

1. ICE scoring via `impact`, `confidence`, and `ease`
2. Ownership/accountability metadata
3. Design review flags and notes
4. Related issues, related weeks, and retro data
5. Plan-validation and approval tracking in the retro workflow

### Conversion model

Issue and project documents can convert into one another.

Conversion expectations:

1. Current conversion is an in-place type change on the same document ID backed by `document_snapshots`.
2. Conversion metadata still tracks actor, time, source type, and conversion count on the document row.
3. Legacy conversions from the older archived-original/new-document model still exist and still drive redirect behavior plus the conversion-history screen.
4. The pack must preserve this split model explicitly instead of pretending conversion is fully normalized.

## Person Model

Person documents are the content/profile layer for people, separate from authorization.

Important rules:

1. Membership lives in `workspace_memberships`, not in person documents.
2. Person docs link back to auth users via `properties.user_id`.
3. Person docs store reporting structure through `reports_to`.
4. Person docs drive team allocation, directory, reviews, and org-chart features.

## Workspace, Auth, And Compliance Model

### Workspaces

A workspace stores:

1. Name
2. `sprint_start_date`
3. archive state
4. timestamps

### Users and memberships

Users are global identities that can belong to multiple workspaces.

Membership responsibilities:

1. Role assignment (`admin` or `member`)
2. authorization only
3. no coupling to person-document lifecycle

### Invites

Invites support:

1. email-based acceptance
2. optional PIV/X.509 subject DN
3. expiration and revocation
4. workspace-scoped role at invitation time

### Sessions and audit

Current runtime tracks:

1. cookie-backed sessions with inactivity and absolute expiry
2. audit logs for compliance-grade activity tracking
3. optional impersonation metadata for super-admin sessions
4. OAuth state for CAIA/PIV flows

## Supporting Data Domains

### History and comments

The current product also maintains supporting document-history/comment systems used for:

1. weekly-plan and retro change history
2. comments and comment display inside documents
3. approvals tied back to historical versions

### Iterations

The product tracks iteration-style progress logs for:

1. week/story attempts
2. issue-level iterations

## Data Invariants To Preserve In A Rebuild

1. Everything content-like is a document.
2. Organizational relationships are association-table-backed.
3. Weekly behavior is derived from workspace cadence plus explicit week documents.
4. Plans and retros are explicit documents with approval/change-request lifecycle.
5. Person documents and authorization memberships remain separate.
