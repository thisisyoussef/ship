# FleetGraph Presearch

Grounded in the Ship codebase as explored on 2026-03-15.

## Assumption Update

The assignment brief still says Claude, and Ship already ships Bedrock Claude integrations in `api/src/routes/ai.ts` and `api/src/routes/claude.ts`. Your latest clarification relaxes that requirement, so this presearch treats FleetGraph as provider-agnostic. The graph should sit behind an `LLMAdapter` and not hard-code a single model vendor. Cost math below uses `gpt-5-mini` as the reference model because it keeps proactive monitoring cheap; Ship's existing Claude path remains a viable fallback.

## 1. Codebase Reconnaissance Report

### Ping-Pong

**AI-A:** Ship already exposes enough REST to support FleetGraph without database access. The key resources are projects, issues, weeks, people, accountability items, comments, activity, and document detail pages.

**AI-B:** The API is usable, but it is not perfectly normalized. Some current routes still depend on legacy `properties.project_id` and `assignee_ids`, so a naive `document_associations` only design will miss live behavior.

**AI-A:** Then FleetGraph needs a normalization layer at the REST boundary. It should treat Ship as a mixed-shape document graph and collapse legacy plus canonical fields into one internal model.

**AI-B:** Also, Ship has no durable notification table or backend webhook bus. The `/events` socket is browser-facing only, so proactive delivery and event replay need FleetGraph-owned state.

> **DECISION**
> Build FleetGraph on top of Ship's REST API, but normalize mixed association shapes and own its own insight state, dedupe ledger, and delivery bookkeeping.

> **TRADEOFF**
> We give up a "pure schema" assumption and add a normalization layer, but that is cheaper than pretending the current API surface is cleaner than it is.

### Ground Truth Summary

### API routes and endpoints

- Generic documents:
  - `GET /api/documents/:id`
  - `PATCH /api/documents/:id`
  - `DELETE /api/documents/:id`
- Issues:
  - `GET /api/issues`
  - `GET /api/issues/action-items`
  - `GET /api/issues/by-ticket/:number`
  - `GET /api/issues/:id`
  - `GET /api/issues/:id/children`
  - `GET /api/issues/:id/history`
  - `POST /api/issues/:id/history`
  - `GET /api/issues/:id/iterations`
  - `POST /api/issues/:id/iterations`
  - `POST /api/issues`
  - `PATCH /api/issues/:id`
  - `POST /api/issues/bulk`
  - `POST /api/issues/:id/accept`
  - `POST /api/issues/:id/reject`
  - `DELETE /api/issues/:id`
- Projects:
  - `GET /api/projects`
  - `GET /api/projects/:id`
  - `POST /api/projects`
  - `PATCH /api/projects/:id`
  - `DELETE /api/projects/:id`
  - `GET /api/projects/:id/issues`
  - `GET /api/projects/:id/weeks`
  - `GET /api/projects/:id/sprints` (deprecated naming)
  - `POST /api/projects/:id/sprints`
  - `GET /api/projects/:id/retro`
  - `POST /api/projects/:id/retro`
  - `PATCH /api/projects/:id/retro`
  - `POST /api/projects/:id/approve-plan`
  - `POST /api/projects/:id/approve-retro`
- Programs:
  - `GET /api/programs`
  - `GET /api/programs/:id`
  - `POST /api/programs`
  - `PATCH /api/programs/:id`
- Weeks and sprints:
  - `GET /api/weeks`
  - `GET /api/weeks/lookup`
  - `GET /api/weeks/lookup-person`
  - `GET /api/weeks/my-action-items`
  - `GET /api/weeks/my-week`
  - `GET /api/weeks/:id`
  - `POST /api/weeks`
  - `PATCH /api/weeks/:id`
  - `POST /api/weeks/:id/start`
  - `DELETE /api/weeks/:id`
  - `PATCH /api/weeks/:id/plan`
  - `GET /api/weeks/:id/issues`
  - `GET /api/weeks/:id/scope-changes`
  - `GET /api/weeks/:id/standups`
  - `POST /api/weeks/:id/standups`
  - `GET /api/weeks/:id/review`
  - `POST /api/weeks/:id/review`
  - `PATCH /api/weeks/:id/review`
  - `POST /api/weeks/:id/carryover`
  - `POST /api/weeks/:id/approve-plan`
  - `POST /api/weeks/:id/unapprove-plan`
  - `POST /api/weeks/:id/approve-review`
  - `POST /api/weeks/:id/request-plan-changes`
  - `POST /api/weeks/:id/request-retro-changes`
- Standups and check-ins:
  - `GET /api/standups`
  - `GET /api/standups/status`
  - `POST /api/standups`
  - `PATCH /api/standups/:id`
  - `DELETE /api/standups/:id`
  - Sprint-scoped standup endpoints also exist under `/api/weeks/:id/standups`
- People, team membership, and role context:
  - `GET /api/team/grid`
  - `GET /api/team/projects`
  - `GET /api/team/programs`
  - `GET /api/team/assignments`
  - `POST /api/team/assign`
  - `DELETE /api/team/assign`
  - `GET /api/team/people`
  - `GET /api/team/accountability`
  - `GET /api/team/people/:personId/sprint-metrics`
  - `GET /api/team/accountability-grid`
  - `GET /api/team/accountability-grid-v2`
  - `GET /api/team/accountability-grid-v3`
  - `GET /api/team/reviews`
  - `GET /api/workspaces`
  - `GET /api/workspaces/current`
  - `POST /api/workspaces/:id/switch`
  - Workspace member and invite CRUD exists under `/api/workspaces/*`
- Comments and activity:
  - `GET /api/documents/:id/comments`
  - `POST /api/documents/:id/comments`
  - `PATCH /api/comments/:id`
  - `DELETE /api/comments/:id`
  - `GET /api/activity/:entityType/:entityId` for `program`, `project`, and `sprint`
- Notifications and accountability:
  - `GET /api/accountability/action-items`
  - No REST notification CRUD exists
  - No webhook registration API exists
- Blockers:
  - No first-class blocker endpoint exists
  - Closest structured blocker signal is `blockers_encountered` in issue iterations
- Existing AI:
  - `GET /api/ai/status`
  - `POST /api/ai/analyze-plan`
  - `POST /api/ai/analyze-retro`
  - `GET /api/claude/context`
- Dashboard aggregates that can inform FleetGraph:
  - `GET /api/dashboard/my-work`
  - `GET /api/dashboard/my-focus`
  - `GET /api/dashboard/my-week`

### Data model and relationships

- Ship stores core entities in a unified `documents` table with `document_type`, `content`, `properties`, `visibility`, timestamps, and optional `parent_id`.
- Canonical cross-document links live in `document_associations` with `relationship_type` values `parent`, `project`, `sprint`, and `program`.
- Active document types are `wiki`, `issue`, `program`, `project`, `sprint`, `person`, `weekly_plan`, `weekly_retro`, `standup`, and `weekly_review`.
- Issue properties expose the fields FleetGraph needs most: `state`, `priority`, `assignee_id`, `estimate`, `source`, `due_date`, and accountability linkage.
- Project and program properties already encode RACI-style context: `owner_id`, `accountable_id`, `consulted_ids`, `informed_ids`, plus project `target_date`.
- Week properties include `sprint_number`, `owner_id`, `status`, `plan`, `success_criteria`, `plan_approval`, `review_approval`, and `review_rating`.
- Person documents carry functional role signals such as `role` and `reports_to`.
- There is a real mixed-shape risk:
  - `api/src/routes/team.ts`
  - `api/src/utils/allocation.ts`
  - `api/src/routes/weekly-plans.ts`
  - parts of `api/src/routes/weeks.ts`
  - These still depend on legacy `properties.project_id` and `assignee_ids`, even though the canonical model uses `document_associations`.
- There is also a concrete API mismatch today:
  - `web/src/components/sidebars/ProjectContextSidebar.tsx` calls `/api/issues?project_id=...`
  - `GET /api/issues` does not currently implement a `project_id` list filter
  - FleetGraph should use `GET /api/projects/:id/issues` or workspace-wide issue fetch plus `belongs_to`

### Authentication and authorization

- Ship supports two auth modes in `api/src/middleware/auth.ts`:
  - session cookie auth via `session_id`
  - Bearer API token auth via `Authorization: Bearer <token>`
- API tokens are backed by the `api_tokens` table and already have CRUD routes under `/api/api-tokens`.
- Session auth enforces workspace membership on every request and expires on 15 minute inactivity or 12 hour absolute age.
- Workspace authorization is only `admin` versus `member` at the membership layer.
- Functional roles like Director, PM, and Engineer are not enforced auth roles. They live in person documents as free-form `properties.role`.
- Approval gates are document-specific:
  - project approvals use `accountable_id` or workspace admin
  - week approvals use program `accountable_id`, manager chain via `reports_to`, or workspace admin

### Notifications and realtime

- Ship already has a collaboration and events server in `api/src/collaboration/index.ts`.
- Browser clients subscribe to `/events` through `web/src/hooks/useRealtimeEvents.tsx`.
- Server writes often call `broadcastToUser(userId, 'accountability:updated', ...)`.
- This realtime layer is useful for frontend delivery, but it is not a durable backend event bus:
  - no replay
  - no persistence
  - no queue semantics
  - no webhook-style subscriptions

### Frontend structure and context surfaces

- The main contextual route is `/documents/:id/*`.
- `web/src/pages/UnifiedDocumentPage.tsx` parses route params into:
  - `id`
  - `urlTab`
  - `nestedPath`
- That page already fetches `GET /api/documents/:id` and writes current context into `CurrentDocumentContext`.
- `CurrentDocumentContext` stores:
  - `currentDocumentType`
  - `currentDocumentId`
  - `currentDocumentProjectId`
- Tab structure is already contextual:
  - project tabs: `issues`, `details`, `weeks`, `retro`
  - program tabs: `overview`, `issues`, `projects`, `weeks`
  - sprint tabs: `overview`, `plan`, `issues`, `review`, `standups`
- Weekly plan and retro screens can already inherit project context through `currentDocumentProjectId`.
- This is the best insertion point for embedded FleetGraph chat. A standalone chatbot page would fight the existing routing model.

### Existing AI integration

- Ship already has AI-powered plan and retro analysis in `api/src/routes/ai.ts` backed by `api/src/services/ai-analysis.ts`.
- Ship also has a context aggregation endpoint named `/api/claude/context`.
- The current implementation is Claude-flavored by name, but the endpoint shape is really a generic context bundle for standup, review, and retro workflows.
- This means FleetGraph can reuse some context aggregation patterns from existing code even if it does not stay Claude-only.

### Reconnaissance Conclusions

- Ship is already a document graph product. FleetGraph should think in terms of documents plus associations, not isolated SQL tables.
- Runtime truth is mixed between canonical associations and legacy properties. FleetGraph needs a normalization layer before reasoning.
- Authentication for background runs is already solvable with API tokens.
- Context-aware chat should live inside `UnifiedDocumentPage`.
- The `/events` socket is good for delivery, not for durable triggering.
- Existing accountability logic is strong enough to seed FleetGraph heuristics instead of reinventing every stale-work detector.

## 2. Agent Responsibility Definition

## 2.1 Proactive Monitoring Targets

### Ping-Pong

**AI-A:** Start with the signals Ship already models well: missing standups, week start drift, missing plan or review approvals, deadline risk, workload imbalance, and blocker proxies.

**AI-B:** Be careful with blockers. Ship does not have a blocker entity. If FleetGraph promises blocker intelligence, it must admit that it is inferring from iterations, standups, or stale issue state.

**AI-A:** Good. We should mark blocker detection as heuristic, not canonical, and prioritize the stronger structured signals first.

**AI-B:** Also do not duplicate Ship's accountability feed blindly. Use it as a seed set, then add missing project-level and cross-person reasoning on top.

> **DECISION**
> FleetGraph should proactively monitor structured accountability gaps first, then project risk, workload imbalance, and blocker proxies. Existing `/api/accountability/action-items` should be treated as a strong-signal input, not the whole product.

> **TRADEOFF**
> We give up a flashy "detect every blocker" promise in MVP, but we gain a more truthful and lower-noise monitor grounded in fields Ship actually stores.

| Target | Fields and endpoints | Why it is valid in Ship |
|---|---|---|
| Missing standups | `GET /api/accountability/action-items`, `GET /api/weeks/:id/standups`, assigned issues from `GET /api/weeks/:id/issues` or `GET /api/issues` | Ship already infers missing standups dynamically and only on business days for users with active sprint work |
| Week start drift | week `properties.status`, `sprint_number`, `owner_id` from `GET /api/weeks` or `GET /api/weeks/:id` | Ship tracks planning versus active versus completed explicitly |
| Empty or unhealthy active week | `GET /api/weeks/:id/issues`, `GET /api/weeks/:id/scope-changes`, `GET /api/weeks/:id/review` | Ship exposes week scope, issue count, and review status |
| Approval gaps and requested changes | project `plan_approval` and `retro_approval`, week `plan_approval` and `review_approval` | Approval state is already modeled in document properties and existing write endpoints |
| Deadline risk | project `target_date`, open issue states, high priorities, `updated_at`, project activity | Ship exposes due dates, priority, and activity timing |
| Workload imbalance | issue `assignee_id`, `estimate`, team people and assignments, week ownership | Ship exposes assignment and estimate data, even if some assignment context is mixed-shape |
| Blocker aging proxy | issue iterations `blockers_encountered`, repeated stale `in_progress` or `in_review`, standup text | This is the closest structured blocker signal available today |

## 2.2 What Constitutes "Worth Surfacing"

### Ping-Pong

**AI-A:** FleetGraph should stay quiet unless there is urgency, persistence, or a decision to make. One stale update alone is not enough.

**AI-B:** Agreed, but "quiet" needs rules. Otherwise the graph will nag on every missed standup and every mildly old issue.

**AI-A:** Then thresholds should combine severity, time, and context. Only business-day accountability misses, only near-term deadline risk, only real load imbalance, and no repeats without evidence change.

**AI-B:** And if the graph cannot explain why a human should care right now, it should suppress the finding.

> **DECISION**
> A finding is worth surfacing only when it crosses a rule threshold and the graph can name a concrete next decision for the user.

> **TRADEOFF**
> Some low-signal risks will be intentionally ignored in MVP. That is acceptable because notification fatigue is a bigger threat than under-detection early on.

| Condition | Threshold | Stay quiet when |
|---|---|---|
| Missing standup | Business day, active week, assignee has at least 1 active issue, and no standup posted by local noon | The user has no assigned work in the active week, already snoozed, or already nudged today |
| Week not started | Week start day has passed and `status` is still `planning` after a 4 hour grace window | The week is future-dated or there is a known approval gate still pending |
| Empty active week | Week is `active` and has 0 associated issues after the start grace window | The team intentionally runs an admin week and the user dismissed this exact insight |
| Approval gap | `changes_requested` immediately, or still unapproved 1 business day after submission with content present | The document has not actually been submitted yet |
| Deadline risk | Project `target_date` within 7 days and either 3 or more open issues remain, or any urgent/high issue has been stale for 48 hours | The project has no target date, or all remaining work is low priority and recently updated |
| Workload imbalance | At least 3 active assignees and one person owns more than 50 percent of open estimate or more than 2x the median load | Estimates are mostly null and issue counts are too small to be meaningful |
| Blocker aging | Same issue reports blocker text in 2 consecutive iterations, or blocker proxy plus no update for 3 business days | The issue moved recently or the blocker text was resolved in the latest iteration |

Cross-cutting quiet rules:

- Do not repeat the same insight until evidence changes or cooldown expires.
- Do not escalate if confidence is low because required endpoints failed.
- Do not surface a "problem" if there is no proposed next action.

## 2.3 Autonomous vs Human-Approved Actions

### Ping-Pong

**AI-A:** Because Ship exposes many write endpoints, FleetGraph could patch issues, start weeks, request changes, or even post comments.

**AI-B:** It should not do that autonomously in MVP. Those endpoints change visible team state, and Ship has no agent-specific audit lane or bot permissions model yet.

**AI-A:** Then autonomy should stop at read, reasoning, insight delivery, and draft generation. Persistent Ship mutations should go through a confirmation gate.

**AI-B:** Exactly. Since there is no notification API or tag system, "autonomous actions" should mostly be FleetGraph-owned UI state, not Ship mutations.

> **DECISION**
> In MVP, FleetGraph should make zero consequential Ship writes without confirmation. Autonomous behavior is limited to reads, reasoning, trace logging, insight storage, and ephemeral UI delivery.

> **TRADEOFF**
> This gives up "self-driving PM" demos, but it fits Ship's current permission model and keeps the first version trustworthy.

| Action | Ship endpoint involved | Default policy |
|---|---|---|
| Generate a summary, risk note, or next-step recommendation | none | Autonomous |
| Emit a proactive FleetGraph card, inbox item, or websocket nudge | FleetGraph-owned endpoint and `/events` bridge | Autonomous |
| Store dedupe, snooze, dismissal, and insight status | FleetGraph store only | Autonomous |
| Draft a comment for review | `POST /api/documents/:id/comments` only after approval | Human required |
| Reassign an issue, change issue state, or alter associations | `PATCH /api/issues/:id` | Human required |
| Start a week, carry over scope, approve plan, approve review, or request changes | week write endpoints under `/api/weeks/:id/*` | Human required |
| Approve project plan or retro | `/api/projects/:id/approve-plan`, `/api/projects/:id/approve-retro` | Human required |
| Create bulk issues or archive/delete things | `/api/issues/bulk`, delete endpoints | Human required |

## 2.4 Role Awareness

### Ping-Pong

**AI-A:** Role awareness can come from `/api/team/people`, because person docs already include `role` and `reportsTo`.

**AI-B:** That is necessary but not sufficient. Workspace membership only knows admin versus member, and responsibility is also encoded in project owner, project accountable, week owner, and issue assignee fields.

**AI-A:** So FleetGraph should derive role from a stack: auth role, functional title, current responsibility, and manager chain.

**AI-B:** Yes, and it should treat Director, PM, and Engineer as presentation lenses, not security boundaries.

> **DECISION**
> Role awareness should be derived from multiple Ship signals: workspace membership for auth, person docs for functional role, RACI fields for current responsibility, and `reports_to` for escalation targeting.

> **TRADEOFF**
> This is more work than reading one enum, but Ship does not actually have one enum that captures both permission and operating role.

| Signal | Source | How FleetGraph should use it |
|---|---|---|
| Auth permission | `workspace_memberships.role`, `req.isSuperAdmin` | Gate admin-only views and approval capabilities |
| Functional title | `GET /api/team/people` -> `role` | Map to Director, PM, Engineer lens when present |
| Manager chain | `GET /api/team/people` -> `reportsTo` | Route escalations and identify who can approve changes |
| Responsible person | project/program `owner_id`, week `owner_id`, issue `assignee_id` | Target "you own this" style nudges |
| Accountable approver | project/program `accountable_id`, manager chain | Target "you need to decide" insights |
| Broader stakeholders | `consulted_ids`, `informed_ids` | Support FYI summaries without over-escalation |

Default lensing rules:

- Director lens: person `role` says Director, or user is accountable across multiple projects/programs, or is a workspace admin with multi-project ownership.
- PM lens: person `role` says PM, or user owns weeks/projects, or reviews plans/retros for others.
- Engineer lens: default when the user primarily owns issues and submits standups/plans/reviews.

## 2.5 On-Demand Context

### Ping-Pong

**AI-A:** The best chat entry point is the existing `/documents/:id/*` route because the page already knows the current document, tab, and project context.

**AI-B:** True, but the graph must not treat every page the same. Issue chat, sprint chat, and project chat should fetch different context bundles and produce different answer styles.

**AI-A:** Then the frontend should inject route metadata into the graph entry state, and the graph should branch by `document_type` and `active_tab`.

**AI-B:** Also reuse `currentDocumentProjectId` for weekly plan and retro pages, because those pages are project-adjacent even when the primary doc is not a project.

> **DECISION**
> On-demand FleetGraph should be embedded inside `UnifiedDocumentPage` and should start from route-derived context: `document_id`, `document_type`, `active_tab`, `nested_path`, and optional `project_context_id`.

> **TRADEOFF**
> This means the chat is context-bound rather than globally reusable, but that is exactly what the PRD and Ship's frontend architecture both want.

| Surface | Injected context | Primary Ship fetches |
|---|---|---|
| Issue page `/documents/:id` | `document_id`, `document_type=issue`, `belongs_to`, current user, optional project/sprint ids | `GET /api/issues/:id`, history, iterations, comments, parent project or week as needed |
| Sprint page `/documents/:id/<tab>` | `document_id`, `document_type=sprint`, `active_tab`, `sprint_number`, owner | `GET /api/weeks/:id`, week issues, standups, review |
| Project page `/documents/:id/<tab>` | `document_id`, `document_type=project`, `active_tab`, target date, owner/accountable | `GET /api/projects/:id`, project issues, project weeks, retro, activity |
| Program page `/documents/:id/<tab>` | `document_id`, `document_type=program`, `active_tab` | `GET /api/programs/:id` plus program projects, weeks, issues via existing tab routes |
| Weekly plan or retro page | primary doc plus `currentDocumentProjectId` from context | weekly doc detail plus related project context |

## 3. Use Cases Table

### Ping-Pong

**AI-A:** The strongest use cases are already visible in Ship's accountability and planning model. We should not invent fanciful automations before covering missed standups, week drift, approval gaps, deadline risk, and load imbalance.

**AI-B:** And at least one use case must be on-demand, not proactive. Otherwise FleetGraph becomes a background nagger instead of a contextual assistant.

**AI-A:** Agreed. The use cases should split across Engineer, PM, and Director lenses and show where the graph makes the next action obvious.

**AI-B:** Good. Every use case should map to data Ship really has, not to fields we wish existed.

> **DECISION**
> MVP use cases should be anchored in Ship's accountability model, ownership fields, and unified document context, with at least one high-value on-demand flow.

> **TRADEOFF**
> This narrows the early surface area, but it keeps the first graph deeply grounded instead of superficially broad.

| # | Role | Trigger | Agent Detects / Produces | Human Decides |
|---|---|---|---|---|
| 1 | Engineer | Business day, active week, no standup posted by noon | Missing standup with issue count and direct link to the right week or standup surface | Post now, snooze, or ignore |
| 2 | PM | Week start day passes and the week is still `planning` or has zero issues | Week-start drift summary with who owns the week and what is missing | Start the week, add scope, or leave it intentionally idle |
| 3 | PM | Plan or review enters `changes_requested`, or remains unapproved for 1 business day after submission | Approval-gap summary with the exact approver and missing follow-up | Approve, request changes, or rework the document |
| 4 | Director | Project target date is within 7 days and high-priority work is still open or stale | Deadline-risk brief that names the at-risk project, the stale issues, and likely impact | Escalate, rescope, or accept the risk |
| 5 | PM | One project or active week shows clear workload skew | Load-imbalance brief with overloaded assignee, lighter peers, and candidate issues to move | Reassign, rebalance later, or keep current distribution |
| 6 | Engineer or PM | User opens an issue, sprint, or project page and asks a question | Context-aware answer that pulls the current document, related work, history, comments, and next actions into one response | Choose the next step with less digging |

Why these are real pain points in Ship:

- Ship already has dynamic accountability checks, which means missed standups and approval gaps are known team problems.
- Weeks have explicit planning and active states, so start drift and empty scope are operationally visible.
- Projects expose `target_date`, issue state, and activity, making deadline risk real and detectable.
- Assignment and estimate data make workload skew measurable, even if it needs normalization.
- The current UI already spreads context across tabs, comments, reviews, and activity, which creates a genuine need for contextual status synthesis.

## 4. Trigger Model Decision

### Ping-Pong

**AI-A:** Pure polling is the safest baseline because Ship does not expose durable webhooks or a backend queue.

**AI-B:** Pure polling alone is clumsy here. The latency target is under 5 minutes, and polling every 5 minutes is already too slow once runtime is included.

**AI-A:** Then pure event-driven should be next.

**AI-B:** Not with the current code. The `/events` socket is browser-facing only, not durable, not replayable, and not consumable by a separate worker. The right answer is hybrid: route-level enqueue hooks for hot changes plus a time-based sweep for drift conditions.

> **DECISION**
> Use a hybrid trigger model:
> 1. Event-driven enqueue from high-signal Ship write routes.
> 2. A scheduled sweep every 4 minutes for time-based and drift-based conditions.

> **TRADEOFF**
> Hybrid is more complex than pure polling, but it is the only option that honestly fits both Ship's existing architecture and the under-5-minute latency target.

### Why hybrid fits Ship

- Reuse the same route touchpoints that already call `broadcastToUser(...)`:
  - `api/src/routes/issues.ts`
  - `api/src/routes/weeks.ts`
  - `api/src/routes/projects.ts`
  - `api/src/routes/documents.ts`
- Do not consume the existing `/events` socket as the trigger source. It is delivery plumbing, not a durable queue.
- Add a lightweight "dirty workspace / dirty document" enqueue step in those write paths.
- Run a 4 minute workspace sweep for:
  - missed daily standups
  - week start drift
  - deadline windows crossing
  - reminder cooldown expiry

### Detection latency math

- Event path:
  - Ship write happens at `t0`
  - dirty context is enqueued immediately
  - debounce and coalescing window: 60 to 90 seconds
  - graph run plus delivery: 30 to 60 seconds
  - typical latency: about 2 minutes
- Sweep path:
  - worst case wait for next 4 minute sweep: under 4 minutes
  - graph run plus delivery: about 30 to 60 seconds
  - worst case latency: about 4.5 to 5 minutes

### Cost and scale at 100 versus 1,000 projects

Assumptions:

- Average 10 active projects per workspace
- One sweep uses 5 batched REST reads:
  - `GET /api/projects`
  - `GET /api/weeks`
  - `GET /api/issues`
  - `GET /api/team/people`
  - `GET /api/accountability/action-items`
- One workspace sweep runs every 4 minutes, so 360 times per day
- High-signal event traffic is debounced down to about 6 proactive reasoning runs per project per day

| Scale | Approx. workspaces | Sweeps per day | REST reads per day | Proactive reasoning runs per day |
|---|---|---|---|---|
| 100 projects | 10 | 3,600 | 18,000 | 600 |
| 1,000 projects | 100 | 36,000 | 180,000 | 6,000 |

Important scaling implication:

- Ship's production API limiter is 100 requests per minute per client IP by default.
- At 1,000 projects, a public-API-only worker would hit that limit unless one of these happens:
  - FleetGraph runs adjacent to Ship with an internal allowlist or bypass
  - service-token traffic gets a higher rate class
  - the sweep narrows to only active workspaces and recently touched projects
- This is the main trigger-model cliff, not raw LLM cost.

## 5. Graph Architecture

### Ping-Pong

**AI-A:** The graph should start with context, fan out to fetch nodes in parallel, normalize Ship state, apply deterministic thresholds, and only then spend tokens on reasoning.

**AI-B:** Good, but the trace must visibly branch. A clean run cannot look like a problem-detected run, or LangSmith will not prove the graph is really conditional.

**AI-A:** Then the graph needs explicit `quiet_exit`, `reason_and_deliver`, `approval_interrupt`, and `fallback` branches.

**AI-B:** And every fetch node should call real Ship endpoints, not hidden ORM helpers, so the architecture stays honest to the REST-only boundary.

> **DECISION**
> Use a conditional LangGraph with deterministic pre-filtering, parallel REST fetch fan-out, explicit branch edges, and a dedicated human-interrupt branch for any Ship mutation.

> **TRADEOFF**
> The graph is more stateful than a single prompt chain, but it is easier to trace, cheaper to run, and far more defensible for proactive monitoring.

## 5.1 Node Design

| Node | Input state | What it does | Output state | Ship endpoints |
|---|---|---|---|---|
| `resolve_trigger_context` | trigger type, workspace id, actor id, document id, route metadata | Normalizes proactive vs on-demand entry and attaches trace metadata | `run_context` | none |
| `fetch_actor_and_roles` | workspace id, actor id | Loads user lens, person role, manager chain, and visibility context | `actor_profile`, `role_map` | `GET /api/workspaces/current`, `GET /api/team/people` |
| `fetch_workspace_snapshot` | workspace id | Loads workspace-wide candidate signals for proactive sweeps | raw projects, weeks, issues, accountability items | `GET /api/projects`, `GET /api/weeks`, `GET /api/issues`, `GET /api/accountability/action-items` |
| `fetch_primary_document` | document id | Loads the current issue, project, program, week, or person doc | `primary_document` | `GET /api/documents/:id` |
| `fetch_issue_cluster` | issue id, associations | Loads issue detail, history, iterations, comments, and children | `issue_context` | `GET /api/issues/:id`, `GET /api/issues/:id/history`, `GET /api/issues/:id/iterations`, `GET /api/issues/:id/children`, `GET /api/documents/:id/comments` |
| `fetch_week_cluster` | week id | Loads week detail, issues, standups, review, and scope changes | `week_context` | `GET /api/weeks/:id`, `GET /api/weeks/:id/issues`, `GET /api/weeks/:id/standups`, `GET /api/weeks/:id/review`, `GET /api/weeks/:id/scope-changes` |
| `fetch_project_cluster` | project id | Loads project detail, issues, weeks, retro, and activity | `project_context` | `GET /api/projects/:id`, `GET /api/projects/:id/issues`, `GET /api/projects/:id/weeks`, `GET /api/projects/:id/retro`, `GET /api/activity/project/:id` |
| `fetch_program_cluster` | program id | Loads program detail and related projects or weeks when needed | `program_context` | `GET /api/programs/:id`, plus existing project/week fetch nodes |
| `normalize_ship_state` | all fetched payloads | Collapses `document_associations`, `belongs_to`, legacy `project_id`, and `assignee_ids` into one internal graph | `normalized_context` | none |
| `score_candidates` | normalized context | Applies deterministic thresholds and dedupe pre-checks before the LLM | `candidate_findings` | none |
| `reason_findings` | candidate findings or on-demand question | Uses the LLM for prioritization, synthesis, and concrete next actions | `reasoned_findings` | none |
| `policy_gate` | reasoned findings, actor role, capability map | Decides quiet output, proactive insight, answer-only, or HITL-required action | `action_plan` | none |
| `approval_interrupt` | action plan that includes Ship mutation | Pauses graph execution until user confirms | `pending_approval` | none |
| `execute_confirmed_action` | approved action payload | Calls the real Ship write endpoint after approval | mutation result | `PATCH /api/issues/:id`, week approval endpoints, project approval endpoints, comment write endpoints |
| `emit_result` | final action plan | Returns chat answer, proactive insight, or silent completion | response payload | FleetGraph endpoints, optional `/events` bridge |
| `persist_run_state` | findings, fingerprints, dismissals, cooldowns | Stores dedupe state, snoozes, and insight lifecycle | persistent ledger rows | FleetGraph store only |
| `fallback` | errors, partial data | Handles retries, stale cache fallback, and degraded responses | degraded output | none |

## 5.2 Conditional Edges

- `resolve_trigger_context -> fetch_workspace_snapshot` when `mode=proactive`
- `resolve_trigger_context -> fetch_primary_document` when `mode=on_demand`
- `fetch_* -> normalize_ship_state` after all required fan-out nodes finish
- `normalize_ship_state -> score_candidates` always
- `score_candidates -> persist_run_state -> emit_result(quiet)` when no candidate survives thresholds
- `score_candidates -> reason_findings` when there is at least one high-confidence candidate or an on-demand question
- `reason_findings -> policy_gate`
- `policy_gate -> emit_result` when result is answer-only or proactive insight only
- `policy_gate -> approval_interrupt` when any Ship write is requested
- `approval_interrupt -> execute_confirmed_action -> emit_result` only after approval
- Any fetch or mutation error can route to `fallback`

LangSmith-visible path difference:

- Clean proactive run:
  - context
  - workspace fetch fan-out
  - normalize
  - score
  - quiet exit
- Problem proactive run:
  - context
  - workspace fetch fan-out
  - normalize
  - score
  - reason
  - policy gate
  - insight emit or approval interrupt

## 5.3 Parallel Execution Plan

Parallel fan-out should be aggressive only where dependencies are independent.

### Proactive workspace sweep

Run these in parallel:

- `GET /api/projects`
- `GET /api/weeks`
- `GET /api/issues`
- `GET /api/team/people`
- `GET /api/accountability/action-items`

Then branch into targeted expansions only for suspicious entities:

- project activity for deadline-risk candidates
- week detail for unhealthy-week candidates
- issue iterations for blocker candidates

### On-demand issue page

After `GET /api/documents/:id` confirms this is an issue, run in parallel:

- `GET /api/issues/:id`
- `GET /api/issues/:id/history`
- `GET /api/issues/:id/iterations`
- `GET /api/issues/:id/children`
- `GET /api/documents/:id/comments`
- `GET /api/team/people`

### On-demand week page

After primary doc fetch, run in parallel:

- `GET /api/weeks/:id`
- `GET /api/weeks/:id/issues`
- `GET /api/weeks/:id/standups`
- `GET /api/weeks/:id/review`
- `GET /api/team/people`

### On-demand project page

After primary doc fetch, run in parallel:

- `GET /api/projects/:id`
- `GET /api/projects/:id/issues`
- `GET /api/projects/:id/weeks`
- `GET /api/projects/:id/retro`
- `GET /api/activity/project/:id`
- `GET /api/team/people`

## 5.4 Human-in-the-Loop Gates

Actions that must pause:

- issue reassignment or state change
- week start
- carryover moves
- project or week approval actions
- request-change actions
- posting persistent comments

Recommended UX inside Ship:

- Embedded FleetGraph card in the current page rail
- Buttons:
  - `Apply`
  - `Dismiss`
  - `Snooze`
  - `View evidence`
- `Apply` opens a lightweight confirm modal that shows:
  - proposed change
  - impacted Ship object
  - exact endpoint that will be called
  - why FleetGraph thinks it is safe
- `Dismiss` writes a cooldown into FleetGraph state
- `Snooze` delays re-surfacing until a user-selected time

## 6. State Management Strategy

### Ping-Pong

**AI-A:** The graph needs both run-local state and durable state. Otherwise it cannot do interrupts, dedupe, or notification fatigue control.

**AI-B:** Correct, and that durable state cannot live in Ship's database because the runtime constraint is REST-only. FleetGraph needs its own store.

**AI-A:** Then use FleetGraph-owned persistence for insight lifecycle, checkpointer state, and API response caching metadata.

**AI-B:** And keep caching conservative so stale Ship data never becomes a hidden second source of truth.

> **DECISION**
> Carry rich state inside each LangGraph run, and persist only the pieces needed for interrupts, dedupe, caching metadata, and notification lifecycle in a FleetGraph-owned store.

> **TRADEOFF**
> This adds one more service-owned data store, but it keeps Ship as the only business-data source while still allowing reliable graph behavior.

### Run-local state

- trigger metadata
- workspace id
- actor id and derived role lens
- surface metadata: document id, document type, active tab, nested path
- raw fetch payloads
- normalized document graph
- candidate findings with severities
- reasoning output
- proposed action plan
- partial failure flags
- trace metadata

### Persistent state between runs

- `insight_fingerprint`
- `evidence_hash`
- `first_seen_at`
- `last_seen_at`
- `last_notified_at`
- `snoozed_until`
- `dismissed_until`
- `resolved_at`
- `approval_request_id`
- LangGraph checkpoint state keyed by `thread_id`

### Caching strategy

- In-run memoization for repeated endpoint calls
- Short TTL response cache:
  - `GET /api/team/people`: 10 to 15 minutes
  - `GET /api/projects`: 2 minutes
  - `GET /api/weeks`: 1 to 2 minutes
  - `GET /api/issues`: 30 to 60 seconds
  - comments, history, iterations: 30 to 60 seconds on active pages
- Never cache Ship writes as success until the write endpoint confirms

### Avoiding notification fatigue

- Dedup key = finding type + target id + severity + evidence hash
- No repeat proactive insight until:
  - the underlying Ship evidence changes
  - the snooze window ends
  - severity escalates
- Default cooldown:
  - accountability nudges: same day only once
  - deadline risk: every 24 hours unless severity changes
  - workload imbalance: every 48 hours unless distribution changes materially

## 7. Error Handling Strategy

### Ping-Pong

**AI-A:** If Ship API calls fail, FleetGraph should fall back to cached context and keep the user unblocked where possible.

**AI-B:** Only for read-only help. A degraded or partial run should never mutate Ship or send a high-confidence proactive alert unless the evidence is complete enough.

**AI-A:** Agreed. Partial data should downgrade confidence and suppress consequential actions.

**AI-B:** Also respect the API limiter. At scale, rate limiting is a first-class failure mode here.

> **DECISION**
> Separate read-only degradation from action-taking. If required Ship data is missing, FleetGraph may answer cautiously, but it must suppress proactive escalations and all mutations.

> **TRADEOFF**
> Some runs will end quietly during outages instead of "doing something anyway," but that is the right failure mode for trust.

| Failure | FleetGraph behavior |
|---|---|
| Ship API `5xx` or timeout | Retry with jitter up to 2 times, then mark run degraded and stop proactive delivery |
| Ship API `401` or `403` for worker token | Mark workspace integration unhealthy and notify the workspace admin in FleetGraph UI |
| Ship API `429` | Back off, reduce concurrency, and defer lower-priority sweeps |
| Partial data | Keep only read-only answer paths, lower confidence, attach `partial_data=true` metadata |
| Missing role data | Fall back to ownership fields and generic lensing instead of failing hard |
| Missing blocker structure | Downgrade blocker insights to heuristic and label them as such |

Caching under failure:

- static people and role data can be reused for up to 15 minutes
- project and week list snapshots can be reused for up to 5 minutes if clearly labeled stale internally
- issue detail, comments, and approvals should not be reused for mutations if the live fetch failed

## 8. Deployment Model

### Ping-Pong

**AI-A:** The cleanest deployment is a separate FleetGraph service.

**AI-B:** For proactive work maybe, but on-demand chat would then have to bridge Ship's session-cookie auth across origins, and Ship has no JWT handoff flow today.

**AI-A:** Then the better MVP is same-repo, same-origin FleetGraph API routes plus a separate worker process. The worker can still call Ship REST only.

**AI-B:** Yes. That keeps runtime honest to the REST boundary while reusing Ship's auth, frontend routing, and websocket delivery path.

> **DECISION**
> Deploy FleetGraph as two runtime surfaces in the Ship stack:
> 1. same-origin FleetGraph API routes for on-demand chat and HITL callbacks
> 2. a separate background worker process for proactive sweeps and queued event runs

> **TRADEOFF**
> This is less cleanly separated than a fully external agent service, but it removes the hardest auth and UI-integration problems from MVP.

### Recommended runtime shape

- Ship web app:
  - embeds FleetGraph UI in `UnifiedDocumentPage`
- Ship API:
  - adds `/api/fleetgraph/*` for chat, insight reads, dismiss/snooze, and approval callbacks
  - reuses session-cookie auth for on-demand user requests
- FleetGraph worker:
  - runs scheduled sweeps
  - consumes dirty-context queue
  - calls Ship REST using API tokens only
- FleetGraph store:
  - persists insight ledger
  - LangGraph checkpoints
  - snoozes and dismissals

### Auth model

- On-demand mode:
  - use the user's normal Ship session cookie against same-origin `/api/fleetgraph/*`
- Proactive mode:
  - use a dedicated Ship API token from `/api/api-tokens`
  - best option: a dedicated FleetGraph bot user per workspace with admin membership
  - current limitation: Ship has no special bot principal type, so MVP likely uses a normal service user plus workspace API token

### Delivery model

- Persist proactive insights in FleetGraph state first
- If the user is currently connected, mirror the new insight over Ship's `/events` socket with a new event type such as `fleetgraph:insight`
- If the user is offline, surface the insight on next page load from FleetGraph's own insight API

## 9. Cost Analysis

### Ping-Pong

**AI-A:** Since the graph is provider-agnostic now, use a cheap, capable model for the default budget and keep the LLM behind an adapter.

**AI-B:** Fine, but the graph should still avoid paying for every sweep. Deterministic thresholding must happen before the LLM.

**AI-A:** Right. Only suspicious proactive contexts reach the model, while clean sweeps stay rule-based.

**AI-B:** Then document both the token budget per real invocation and the fact that sweep checks themselves are not LLM calls.

> **DECISION**
> Budget FleetGraph around a cheap mid-tier reasoning model and keep clean sweeps LLM-free. Only candidate-producing runs and on-demand chats should consume tokens.

> **TRADEOFF**
> This shifts some intelligence into deterministic rules before the LLM, but it is the only way to keep proactive cost predictable.

### Reference model

- Default cost reference: `gpt-5-mini`
- Official pricing assumption used here:
  - input: $0.25 per 1M tokens
  - output: $2.00 per 1M tokens
- Architecture note:
  - the graph remains provider-agnostic
  - if you later switch to Claude Sonnet-class pricing, expect roughly 8x to 12x higher model spend

### Token budget per invocation

Proactive reasoning run after deterministic pre-filter:

| Token bucket | Avg tokens |
|---|---|
| Context and instructions | 700 |
| Normalized fetch results | 2,500 |
| Reasoning scratch and chain state | 500 |
| Action framing | 300 |
| Output | 700 |

Approximate proactive cost:

- input: 4,000 tokens -> about $0.0010
- output: 700 tokens -> about $0.0014
- total: about $0.0024 per proactive reasoning run

On-demand contextual chat run:

| Token bucket | Avg tokens |
|---|---|
| Context and instructions | 900 |
| Current page and related fetch results | 3,500 |
| Reasoning scratch and chain state | 800 |
| Action framing | 800 |
| Output | 1,000 |

Approximate on-demand cost:

- input: 6,000 tokens -> about $0.0015
- output: 1,000 tokens -> about $0.0020
- total: about $0.0035 per on-demand run

### Cost projection assumptions

- 1 active project per 4 users
- 6 proactive reasoning runs per project per day after debounce and thresholding
- 0.7 on-demand runs per user per day
- clean sweeps are deterministic and not counted as LLM invocations
- monthly cost below is model spend only and excludes infrastructure

| Scale | Proactive runs/day | On-demand/day | Cost/month |
|---|---|---|---|
| 100 users | 150 | 70 | about $18 |
| 1,000 users | 1,500 | 700 | about $182 |
| 10,000 users | 15,000 | 7,000 | about $1,815 |

These numbers stay low because the graph does not call the LLM on every sweep. If you remove rule gating, proactive cost becomes the first serious cliff.

## 10. Chat Interface Design

### Ping-Pong

**AI-A:** The chat should live in a side panel inside `UnifiedDocumentPage`, because that page already resolves the current document and tab context.

**AI-B:** Yes, but the panel must not just pass the document id. The graph needs the active tab and any project-context inheritance too.

**AI-A:** Then the frontend should inject a compact context object from route params and `CurrentDocumentContext`.

**AI-B:** And entry behavior should differ by surface. An issue question is not the same as a sprint question.

> **DECISION**
> Embed FleetGraph inside the existing document-detail experience and inject route-aware context into the graph entry point instead of building a separate chat page.

> **TRADEOFF**
> The chat becomes tightly coupled to Ship's document routes, but that coupling is what makes it valuable.

### Recommended UX shape

- Place a `FleetGraphPanel` in the right rail or slide-over of `UnifiedDocumentPage`
- Always inject:
  - `document_id`
  - `document_type`
  - `active_tab`
  - `nested_path`
  - `project_context_id`
  - `viewer_user_id`
- Vary the graph's first fetch fan-out by surface:
  - issue page: issue, history, iterations, comments, parents
  - week page: week, issues, standups, review
  - project page: project, issues, weeks, retro, activity
  - program page: program plus related projects and weeks

### Entry-point behavior by page

| Page | Frontend context injected | Graph entry behavior |
|---|---|---|
| Issue detail | issue id, parent project/week ids, current user | answer from issue-centric fetch cluster |
| Sprint overview or review tab | week id, active tab, sprint number, owner | answer from week-centric fetch cluster |
| Project details, issues, weeks, or retro tab | project id, active tab, target date, owner/accountable | answer from project-centric fetch cluster |
| Weekly plan or retro | weekly doc id plus inherited project context | answer using weekly doc plus project context |

## 11. Observability Plan

### Ping-Pong

**AI-A:** LangSmith should capture every node, every branch decision, and the metadata needed to slice traces by workspace, trigger, and role.

**AI-B:** And it needs contrasting trace stories. A quiet sweep and a risky proactive run must be visibly different, or the graph is not proving anything.

**AI-A:** Then every run should attach branch metadata, candidate counts, dedupe hits, and whether approval was required.

**AI-B:** Also track API reliability and insight fatigue. Observability here is not only model quality.

> **DECISION**
> Instrument FleetGraph from day one with trace metadata that explains who triggered the run, what context it saw, which branch it took, and whether the outcome was quiet, advisory, or gated for approval.

> **TRADEOFF**
> This adds tracing discipline up front, but it will save far more time than it costs once the graph starts branching in production.

### Trace structure

- One LangSmith trace per graph invocation
- One child span per fetch node, normalization node, scoring node, reasoning node, and action node
- Branch tags:
  - `branch:quiet`
  - `branch:reasoned`
  - `branch:approval_required`
  - `branch:fallback`

### Trace metadata

- `workspace_id`
- `trigger_type`
- `trigger_source`
- `mode`
- `surface`
- `document_id`
- `document_type`
- `project_id`
- `sprint_id`
- `actor_id`
- `role_lens`
- `candidate_count`
- `finding_types`
- `dedupe_hit`
- `approval_required`
- `partial_data`
- `ship_api_calls`
- `llm_provider`
- `llm_model`

### Two contrasting trace scenarios to capture early

1. Quiet proactive sweep
   - Trigger: scheduled 4 minute sweep
   - Inputs: active workspace with no threshold breaches
   - Path: fetch fan-out -> normalize -> score -> quiet exit
   - Success metric: no LLM call, no notification, low latency

2. Risk-detected proactive run
   - Trigger: issue update or week-start enqueue
   - Inputs: week still planning after start, or project deadline risk
   - Path: fetch fan-out -> normalize -> score -> reason -> policy gate -> insight emit or approval interrupt
   - Success metric: clear evidence, right target person, correct branch metadata

Optional third scenario worth adding quickly:

3. On-demand issue chat
   - Trigger: user opens an issue page and asks for next steps
   - Path: document-context fetch fan-out -> normalize -> reason -> answer

### Custom metrics

- proactive detection latency
- percent of sweeps that stay quiet
- Ship API error rate per endpoint
- dedupe suppression rate
- snooze rate
- approval acceptance rate
- insight-to-action conversion rate
- tokens per proactive run
- tokens per on-demand run

## Final Recommendation

Ship is already close enough to support FleetGraph, but only if the implementation respects four truths from the codebase:

1. Ship is a unified document graph with mixed-shape relationship data.
2. Ship already has strong accountability and context signals that FleetGraph should reuse first.
3. Ship has delivery-oriented realtime plumbing, not a durable trigger bus.
4. Embedded, route-aware chat is the right UI shape. A standalone chatbot would be a regression.

That leads to the recommended MVP architecture:

- provider-agnostic LangGraph
- same-origin chat routes inside Ship
- separate background worker
- hybrid trigger model
- deterministic thresholding before LLM reasoning
- no consequential Ship writes without HITL approval
