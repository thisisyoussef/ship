# Action Dialog Matrix

## First Action Pack

| Action Type | Surface(s) | Target Type | Dialog Kind | Required Inputs | Option Source | Execution Adapter | Ship Route(s) | Status |
|---|---|---|---|---|---|---|---|---|
| `start_week` | proactive, on-demand | `sprint` | `confirm` | none | none | `single_request` | `POST /api/weeks/:id/start` | first pack |
| `approve_week_plan` | proactive, on-demand | `sprint` | `confirm` | none | none | `single_request` | `POST /api/weeks/:id/approve-plan` | first pack |
| `approve_project_plan` | proactive, on-demand | `project` | `confirm` | none | none | `single_request` | `POST /api/projects/:id/approve-plan` | first pack |
| `assign_owner` | proactive, on-demand | `sprint` | `single_select` | `person_id` | sprint/team people from Ship REST | `document_patch` | `PATCH /api/documents/:id` | first pack |
| `assign_issues` | proactive, on-demand | `sprint` | `multi_select` + `single_select` | `issue_ids[]`, `person_id` | sprint issues plus team people from Ship REST | `multi_request` or `fleetgraph_composed` | `PATCH /api/issues/:id` fan-out or one composed FleetGraph apply path | first pack |
| `post_comment` | proactive, on-demand | `document` | `textarea` | `content` | fixed target document from current context; no model-generated bodies | `single_request` | `POST /api/documents/:id/comments` | first pack |

## Near-Term Roadmap

| Action Type | Target Type | Dialog Kind | Required Inputs | Execution Adapter | Ship Route(s) | Status |
|---|---|---|---|---|---|---|
| `request_plan_changes` | `sprint` or `project` | `textarea` | `reason` | `single_request` | `POST /api/weeks/:id/request-plan-changes` and future project equivalent if added | roadmap |
| `reassign_issue` | `document` or `issue` | `single_select` | `person_id` | `single_request` | `PATCH /api/issues/:id` | roadmap |
| `change_issue_state` | `document` or `issue` | `single_select` | `state` | `single_request` | `PATCH /api/issues/:id` | roadmap |
| `carryover_week` | `sprint` | `confirm` or `multi_select` | optional issue selection | `single_request` or `fleetgraph_composed` | `POST /api/weeks/:id/carryover` | roadmap |
| `bulk_issue_update` | `sprint` or `project` | `multi_select` + typed field inputs | `issue_ids[]`, mutation payload | `fleetgraph_composed` | `POST /api/issues/bulk` or FleetGraph fan-out | roadmap |
| `escalation_comment` | `document`, `project`, or `sprint` | `textarea` | `content` | `single_request` | `POST /api/documents/:id/comments` | roadmap |

## Shared Rules

- The model may choose an action type and target, but it does not get to invent live option sets or free-form request bodies for structured fields.
- Review/apply routes stay server-backed and validate every dialog submission against the action definition and current Ship state.
- All Ship mutations remain human-approved.
- Schema-driven generic forms are a future extension path, not a first-pack requirement.
