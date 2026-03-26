# Acceptance And Rebuild Checklist

This checklist is the final acceptance contract for a rebuild of the current Ship product. It is intentionally route- and behavior-specific so QA does not have to rediscover the product from source.

Use `developer-build-queue.md` to reach this checklist in dependency-safe order. This file is the exit gate after the rebuild slices are in place, not the first document to drive implementation.

## Pack-Wide Exit Criteria

- [ ] Canonical routes, redirects, and query params match `navigation-and-routing-spec.md`.
- [ ] Loading, empty, blocked, and review states match `screen-state-spec.md`.
- [ ] Shared list, selection, keyboard, and persistence behavior matches `shared-interaction-patterns-spec.md`.
- [ ] Document fields, compatibility shims, and computed properties match `document-field-reference.md`.
- [ ] Workflow and action behavior matches `workflow-and-action-spec.md`.

## Phase Checklist

### Phase 1: Auth, setup, workspace, and shell

- [ ] `/setup` supports first-run initialization and redirects to `/login` when setup already exists.
- [ ] `/login` supports standard login, expired-session recovery, and preserved return targets.
- [ ] `/invite/:token` supports valid, invalid, expired, already-member, and already-accepted states.
- [ ] `/` redirects authenticated users to `/my-week`.
- [ ] App shell derives left-rail mode correctly from path plus current document type.
- [ ] Left sidebar hides for My Week, weekly plans, weekly retros, and standups.
- [ ] `Cmd+K` / `Ctrl+K` opens the command palette.

### Phase 2: Unified documents and detail routing

- [ ] `/documents/:id/*` is the canonical detail route for wiki, issue, project, program, sprint/week, weekly plan, weekly retro, and standup docs.
- [ ] Invalid detail tabs redirect to `/documents/:id`.
- [ ] Project tabs are `issues`, `details`, `weeks`, `retro`.
- [ ] Program tabs are `overview`, `issues`, `projects`, `weeks`.
- [ ] Planning weeks expose `overview` and `plan`.
- [ ] Active/completed weeks expose `overview`, `issues`, `review`, and `standups`.
- [ ] `/team/:id` remains the canonical person detail route.

### Phase 3: Shared collection interactions

- [ ] Lists preserve hover-visible checkboxes, range selection, toggle selection, context-menu selection, and keyboard navigation.
- [ ] Bulk action bars appear only when rows are selected.
- [ ] Documents page supports tree and list views.
- [ ] Issues page supports list and kanban views.
- [ ] Projects page supports list and kanban-style browsing.
- [ ] Column visibility is persisted per screen.
- [ ] View mode is persisted when that screen opts into it.

### Phase 4: Core work-management surfaces

- [ ] `/docs` supports visibility filtering, search, create, nested create, single delete, and bulk delete.
- [ ] `/issues` supports state filter tabs, issue creation, update, bulk actions, and promote-to-project behavior.
- [ ] `/projects` supports status filtering, program filtering, ICE sorting, create, archive/delete, and conversion dialog behavior.
- [ ] `/programs` supports create, open, archive, delete, and sortable list columns.
- [ ] `/dashboard` supports `my-work` and `overview` variants with accountability banner.
- [ ] `/my-week` supports week navigation, plan/retro/standup creation, due-state messaging, and previous-retro nudge behavior.

### Phase 5: Week and review workflows

- [ ] Week planning supports start-week behavior.
- [ ] Week review supports draft vs saved state, plan validation, and save/update flows.
- [ ] Week reconciliation supports `next_sprint`, `backlog`, `close_done`, and `close_cancelled`.
- [ ] Project retro supports draft vs saved state, issues summary, expected vs actual impact, success criteria editing, and plan validation.
- [ ] Weekly plan/retro review mode works through `?review=true&sprintId=:id`.
- [ ] Review queue actions advance correctly after approval or request-changes actions.

### Phase 6: Team surfaces

- [ ] `/team/allocation` supports my-team/everyone filter, archived toggle, past-weeks toggle, search, lazy week loading, assignment, and unassignment.
- [ ] `/team/directory` supports archived toggle, person open, and admin management affordances.
- [ ] `/team/reviews` supports plan approval, retro approval, request-changes, rating, and queue assistance.
- [ ] `/team/status` renders the accountability heatmap.
- [ ] `/team/org-chart` supports search, keyboard navigation, drag/drop reporting-line edits, and invalid-drop prevention.
- [ ] `/team/:id` supports person detail editing and metrics visibility.

### Phase 7: Settings, admin, conversions, and public feedback

- [ ] `/settings?tab=members` supports role changes, archive, restore, and archived toggle.
- [ ] `/settings?tab=invites` supports invite creation and revoke, including optional PIV/X.509 subject DN.
- [ ] `/settings?tab=tokens` supports list/create/revoke API tokens.
- [ ] `/settings?tab=audit` supports recent workspace audit logs.
- [ ] `/settings/conversions` shows the historical conversion ledger with filter tabs.
- [ ] `/admin?tab=workspaces` supports create/archive workspace.
- [ ] `/admin?tab=users` supports toggle super-admin and impersonate.
- [ ] `/admin?tab=audit` supports audit export.
- [ ] `/admin/workspaces/:id` supports members, invites, add-existing-user, role update, remove member, and copy invite link.
- [ ] `/feedback/:programId` supports public submission success flow.

## Route Verification Matrix

| Route | Interaction | Expected visible result |
| --- | --- | --- |
| `/login` | Submit valid credentials with a stored `returnTo` | User lands on the requested route rather than a generic dashboard |
| `/my-week` | Click next/previous week | URL and visible week state stay in sync |
| `/docs` | Toggle tree/list and change visibility filter | Layout and visible documents update without losing create affordance |
| `/issues` | Select rows and trigger bulk action bar | Selection count, dropdowns, and row state appear correctly |
| `/projects` | Filter by status and program | Counts and visible projects recompute consistently |
| `/programs` | Create a new program | New program opens at `/documents/:id` |
| `/documents/:projectId/details` | Edit fields in the properties panel | Field changes persist while staying in canonical detail route |
| `/documents/:programId/weeks` | Drill into a nested week | Program weeks tab handles nested week context without leaving canonical document routing |
| `/documents/:weekId/plan` | Start the week | Week exits planning-only state and exposes active/completed tabs |
| `/documents/:weekId/review` | Reconcile incomplete issues | Each issue action updates the week’s reconciliation state |
| `/documents/:weeklyPlanId?review=true&sprintId=:weekId` | Approve or request changes | Review-mode UI updates approval state instead of acting like a plain editor save |
| `/team/allocation` | Assign project work to a person/week cell | Cell updates and grouping stays coherent |
| `/settings?tab=members` | Archive a member | Member access changes and archived-person state is reflected |
| `/admin?tab=users` | Start impersonation | Admin enters impersonation banner flow and lands in normal product context |

## Transitional Behaviors That Must Be Deliberately Preserved Or Deliberately Fixed

- [ ] User-facing “week” terminology still interoperates with `sprint`-named routes, tables, and API shapes.
- [ ] Legacy detail routes still redirect into `/documents/:id/*`.
- [ ] Conversion behavior is documented and implemented as the current split model: live conversion is in-place, while history/older copy still reflects archived-original records.
- [ ] Person documents keep `properties.user_id` as the real link to `users.id`.
- [ ] Week ownership compatibility through `assignee_ids[0]` remains understood anywhere older sprint readers still depend on it.

## Suggested QA Order

1. Verify auth/bootstrap and shell navigation first.
2. Verify list interactions next because they underpin multiple surfaces.
3. Verify canonical detail routing and week-state transitions before reviewing team/admin surfaces.
4. Verify conversion last because it carries the heaviest transitional behavior.
