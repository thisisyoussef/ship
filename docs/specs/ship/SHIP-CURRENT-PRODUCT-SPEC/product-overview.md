# Product Overview

## Product Thesis

Ship is a project-management product that combines rich documents, issue tracking, project/program organization, weekly planning/accountability, and team-management views in one unified document graph. The product’s core architectural claim is that wiki pages, issues, projects, programs, weeks, people, and weekly accountability artifacts are all documents with different properties and workflows rather than separate silos.

## Core Product Principles

1. Everything is a document with properties.
2. Weekly planning and retrospectives are first-class operational behavior, not side paperwork.
3. Programs, projects, weeks, and issues are different lenses over the same graph.
4. Collaboration is real-time and rich-text-first, not plain-text comment-first.
5. Workspace-level access is simple; visibility is mostly workspace-wide with optional private documents.

## Primary User Roles

| Role | What they do in the product |
| --- | --- |
| Workspace member | Read/edit documents, create issues/projects/programs, participate in weekly planning and retros, and use team views |
| Manager / reviewer | Review plans and retros, approve or request changes, rate weekly review outcomes, inspect allocation and accountability surfaces |
| Workspace admin | Manage members, invites, API tokens, audit logs, workspace settings, and archived members |
| Super admin | Manage all workspaces and users, archive workspaces, impersonate users, and inspect global audit/admin surfaces |
| External submitter | Submit public feedback to a program through the public feedback form |

## Canonical Product Areas

| Product Area | Canonical route(s) | Purpose |
| --- | --- | --- |
| Bootstrap and auth | `/setup`, `/login`, `/invite/:token` | First-run setup, sign-in, session recovery, invite acceptance |
| Dashboard | `/dashboard`, `/my-week` | Personal work focus, active-week/accountability surfaces, standup context |
| Documents | `/docs`, `/documents/:id/*` | Knowledge base plus the canonical detail page for almost every document type |
| Issues | `/issues`, `/documents/:id` for issue docs | Work-item creation, filtering, bulk updates, kanban/list views |
| Projects | `/projects`, `/documents/:id/*` for project docs | Prioritized delivery units with ICE scoring, details, weeks, and retro |
| Programs | `/programs`, `/documents/:id/*` for program docs | Long-lived initiative containers with overview, issues, projects, and weeks |
| Weeks | `/my-week`, `/documents/:id/*` for week docs, legacy `/sprints/*` aliases | Week containers, plans, reviews, standups, and scoped active issues |
| Team | `/team/allocation`, `/team/directory`, `/team/status`, `/team/reviews`, `/team/org-chart`, `/team/:id` | Allocation, people directory, accountability heatmaps, review workflow, org-chart editing, person profiles |
| Settings | `/settings`, `/settings/conversions` | Members, invites, tokens, audit logs, and converted-document history |
| Admin | `/admin`, `/admin/workspaces/:id` | Super-admin-only workspace and user administration |
| Public feedback | `/feedback/:programId` and internal `/feedback/:id` redirect | External feedback submission and internal issue-style follow-up |

## Navigation Model

Ship’s authenticated experience lives inside a shared app shell (`AppLayout`) that keeps the left navigation, current-mode sidebar, command palette, session timeout handling, and global modals consistent across modes.

Shared shell behavior:

1. `Cmd+K` or `Ctrl+K` toggles the command palette.
2. The active left-rail mode is derived from the current route and, for `/documents/:id/*`, from the current document type.
3. The left sidebar collapse state is stored in localStorage.
4. The app can auto-open accountability/action-item prompts on load unless the current route suppresses them.
5. Session timeout warning and redirect behavior is global.

## Major User Workflows

### 1. Bootstrap and session entry

1. First-time operators land on `/setup` if no admin account exists.
2. Returning users land on `/login`, can authenticate with email/password, and may optionally use CAIA/PIV if configured.
3. Accepted invite flows route through `/invite/:token` and either create/join the account or inform the user they are already a member.
4. After authentication, the canonical landing route is `/my-week`.

### 2. Knowledge/document workflow

1. Members browse `/docs` in tree or list form.
2. New docs default to `"Untitled"` and open in `/documents/:id`.
3. Nested docs use `parent_id` hierarchy.
4. Documents can be workspace-visible or private.
5. The shared editor supports rich text, embeds, mentions, uploads, comments, and real-time collaboration.

### 3. Work-management workflow

1. Issues represent actionable work and can belong to programs, projects, weeks, or parent issues.
2. Projects collect issues, carry ICE scoring, and expose details/weeks/retro tabs.
3. Programs collect issues, projects, and weeks and provide the top-level product/initiative grouping.
4. Weeks are explicit per-program documents tied to derived workspace week windows and carry planning/review/accountability behavior.

### 4. Weekly-accountability workflow

1. The My Week page gives each person their current or selected week, assigned projects, plan/retro state, and standup entry points.
2. Weekly plans and retros are separate child documents with submission state.
3. Managers use team review surfaces to approve, request changes on, or rate plan/review artifacts.
4. Dashboard and accountability views surface overdue or missing weekly artifacts.

### 5. Team-management workflow

1. Allocation view shows people by week, grouped by program assignment, with drag/drop or dialog-based assignment management.
2. Team Directory lists members and archived people, with profile access and admin removal controls.
3. Status Overview and review pages expose accountability heatmaps and management workflows.
4. Org Chart provides editable reporting relationships.

### 6. Settings/admin workflow

1. Workspace admins manage members, invites, API tokens, audit logs, and converted documents.
2. Super admins manage workspaces, users, audit exports, impersonation, and workspace-level membership/invite state.

### 7. Feedback workflow

1. External users submit public feedback through `/feedback/:programId`.
2. Internal feedback items are represented as issues with `source='external'`.
3. Existing `/feedback/:id` routes redirect to the canonical issue/document view.

## Canonical Compatibility Rules

1. `/documents/:id/*` is the canonical detail route for most document types.
2. Legacy `/docs/:id`, `/issues/:id`, `/projects/:id`, `/programs/:id/*`, and `/sprints/:id/*` routes redirect into `/documents/:id/*`.
3. `/team/:id` remains a distinct person-profile route instead of redirecting into `/documents/:id`.

## What Makes Ship Distinct

1. The unified-document model means most product surfaces share a common detail page and editor.
2. The weekly plan/retro system is baked into the core workflow, not an add-on.
3. Team allocation, accountability, and reviews use the same underlying data graph as projects and issues.
