# Task Breakdown

## Story

- Story ID: US-101
- Story Title: Current product spec pack

## Execution Notes

- Keep the pack grounded in checked-in code and docs.
- Prefer canonical routes and current behaviors over legacy aliases.
- Sequence the rebuild in a way that respects Ship’s shared editor and unified-document architecture.

## Rebuild Workstreams

| Task ID | Description | Dependency | Parallelizable | Validation |
| --- | --- | --- | --- | --- |
| T001 | Establish product foundations: auth, workspaces, unified document model, associations, and app shell | must-have | no | auth/workspace/document rules are documented clearly |
| T002 | Rebuild the shared editor/collaboration substrate used by documents, issues, projects, programs, people, and week docs | blocked-by:T001 | no | editor and collaboration behaviors are fully specified |
| T003 | Rebuild list and detail flows for docs, issues, projects, programs, weeks, and My Week/dashboard/accountability surfaces | blocked-by:T001,T002 | yes | route and tab behaviors are covered end to end |
| T004 | Rebuild team, review, status, org-chart, settings, conversions, public feedback, and admin surfaces | blocked-by:T001 | yes | non-core but shipped surfaces are explicitly covered |
| T005 | Rebuild backend route groups, collaboration service, uploads/comments/history, and supporting storage contracts | blocked-by:T001,T002 | yes | API/service groups and persistence rules are documented |
| T006 | Rebuild FleetGraph runtime, proactive queue, document-context overlays, review/apply flows, and readiness contracts | blocked-by:T001,T002,T005 | no | FleetGraph’s proactive and on-demand layers are documented as a product module |
| T007 | Package the current-product handoff with an index, implementation constraints, and repo metadata updates | blocked-by:T001,T002,T003,T004,T005,T006 | no | the pack stands alone and queue/checkpoint docs point to it |

## Suggested Rebuild Order

1. Auth, sessions, setup, invites, and workspace switching
2. Unified documents table, document associations, and shared document types
3. Shared app shell and route layout
4. Shared editor, collaboration, offline/cache, uploads, comments, and content history
5. Core work-management surfaces: docs, issues, projects, programs, weeks, My Week, dashboard
6. Team/accountability surfaces: allocation, directory, reviews, status overview, org chart
7. Workspace admin/settings/public feedback/conversions/admin-dashboard surfaces
8. FleetGraph worker/runtime, queue, findings panel, overlay, analysis FAB, and action flows

## Coverage Checklist

- [ ] Route map and screen behaviors
- [ ] Document-type tabs and shared editor patterns
- [ ] Domain/data model and weekly/accountability logic
- [ ] REST/WebSocket/service inventory
- [ ] FleetGraph proactive and on-demand functionality
- [ ] Auth/admin/settings/public feedback edge surfaces
- [ ] Build constraints, security, caching, and deployment notes

## Completion Criteria

- [ ] All must-have workstreams are represented in the pack
- [ ] An engineer can follow the rebuild order without first reading the whole repo
- [ ] Major product surfaces are grouped coherently instead of scattered across unrelated files
- [ ] Queue/story metadata is updated so the pack is discoverable from the repo
