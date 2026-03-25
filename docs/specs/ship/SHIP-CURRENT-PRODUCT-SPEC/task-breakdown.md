# Task Breakdown

## Story

- Story ID: US-103
- Story Title: Current product spec implementation-contract deepening

## Execution Notes

- Keep the pack grounded in checked-in code and docs.
- Prefer canonical routes and current behaviors over legacy aliases.
- Sequence the rebuild in a way that respects Ship’s shared editor and unified-document architecture.
- Treat the new deep-dive docs as the primary build contract and the older overview docs as orientation layers.
- Preserve the exact current access boundaries, payload families, lifecycle transitions, and post-mutation fan-out behavior instead of normalizing them away.

## Rebuild Workstreams

| Task ID | Description | Dependency | Parallelizable | Validation |
| --- | --- | --- | --- | --- |
| T001 | Establish auth, setup, invite acceptance, sessions, workspace switching, and the protected-shell provider stack | must-have | no | bootstrap and auth behavior are explicit down to redirect rules and session-expiry handling |
| T002 | Rebuild the unified document model: `documents`, `document_associations`, visibility, compatibility fields, and per-type properties | blocked-by:T001 | no | field-level data contracts and compatibility layers are fully specified |
| T003 | Rebuild the app-shell navigation contract: mode derivation, left-rail behavior, query-param conventions, route redirects, and detail-route tab parsing | blocked-by:T001,T002 | no | canonical routing behavior is fully documented |
| T004 | Rebuild the shared list substrate: filters, view toggles, column persistence, selection, bulk actions, context menus, and keyboard shortcuts | blocked-by:T001,T003 | yes | list interaction patterns are fully specified |
| T005 | Rebuild the shared editor/collaboration substrate used by documents, issues, projects, programs, people, and week docs | blocked-by:T001,T002,T003 | no | editor and collaboration behaviors are fully specified |
| T006 | Rebuild core work-management flows for docs, issues, projects, programs, weeks, dashboard, and My Week | blocked-by:T002,T003,T004,T005 | yes | core route, state, and action flows are covered end to end |
| T007 | Rebuild team surfaces: allocation, directory, reviews, status overview, org chart, and person detail | blocked-by:T002,T003,T004 | yes | team routes and management flows are explicitly covered |
| T008 | Rebuild workspace settings, conversions, public feedback, and super-admin surfaces | blocked-by:T001,T002,T003 | yes | supporting admin/public surfaces are fully documented |
| T009 | Rebuild backend route groups, collaboration service, uploads/comments/history, and supporting storage contracts | blocked-by:T002,T005 | yes | API/service groups and persistence rules are documented |
| T010 | Rebuild FleetGraph runtime, proactive queue, document-context overlays, review/apply flows, and readiness contracts | blocked-by:T003,T005,T009 | no | FleetGraph’s proactive and on-demand layers are documented as a product module |
| T011 | Validate the rebuild against route-by-route acceptance and the transition/compatibility checklist | blocked-by:T006,T007,T008,T009,T010 | no | acceptance matrix is complete enough to drive QA without code spelunking |
| T012 | Package the blueprint handoff with an index, implementation constraints, and repo metadata updates | blocked-by:T001,T002,T003,T004,T005,T006,T007,T008,T009,T010,T011 | no | the pack stands alone and queue/checkpoint docs point to it |

## Suggested Rebuild Order

1. Auth, sessions, setup, invites, and workspace switching
2. Unified documents table, document associations, and shared document types
3. Shared app shell, route layout, tab parsing, redirects, and query-param conventions
4. Shared list substrate: toolbars, filters, selection, bulk actions, and keyboard support
5. Shared editor, collaboration, offline/cache, uploads, comments, and content history
6. Core work-management surfaces: docs, issues, projects, programs, weeks, My Week, dashboard
7. Team/accountability surfaces: allocation, directory, reviews, status overview, org chart, person profile
8. Workspace admin/settings/public feedback/conversions/admin-dashboard surfaces
9. FleetGraph worker/runtime, queue, findings panel, overlay, analysis FAB, and action flows
10. Final verification against the acceptance matrix, especially the compatibility behaviors

## Coverage Checklist

- [ ] Route map, redirects, shell mode derivation, and query-param behaviors
- [ ] Screen-state coverage for loading, empty, blocked, review, and mutation-result states
- [ ] Shared list, selection, keyboard, persistence, and toolbar interaction patterns
- [ ] Document-type tabs and shared editor patterns
- [ ] Domain/data model, field reference, and weekly/accountability logic
- [ ] Workflow/action contracts for approvals, reconciliation, conversion, allocation, and admin flows
- [ ] Permissions/access boundaries, blocked-result semantics, and reviewer authorization rules
- [ ] Request/response envelopes, dominant payload families, and raw-vs-wrapped compatibility quirks
- [ ] Lifecycle/state-machine coverage for sessions, invites, documents, approvals, and FleetGraph
- [ ] Mutation side effects, query invalidation, broadcasts, navigation replacement, and collaboration resets
- [ ] REST/WebSocket/service inventory
- [ ] FleetGraph proactive and on-demand functionality
- [ ] Auth/admin/settings/public feedback edge surfaces
- [ ] Build constraints, security, caching, and deployment notes

## Completion Criteria

- [ ] All must-have workstreams are represented in the pack
- [ ] An engineer can follow the rebuild order without first reading the whole repo
- [ ] Major product surfaces are grouped coherently by implementation question instead of scattered across unrelated files
- [ ] The acceptance checklist is concrete enough to drive manual QA of a rebuild
- [ ] Queue/story metadata is updated so the pack is discoverable from the repo
