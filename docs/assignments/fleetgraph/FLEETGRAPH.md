# FLEETGRAPH

Use this as the working submission document for the FleetGraph assignment.

## Current Repo Clarification

- The source PDF still mentions Claude-only integration.
- For this repo, FleetGraph should remain provider-agnostic and use OpenAI as the preferred default unless another provider is explicitly justified.

## Agent Responsibility

FleetGraph is a Ship-specific workflow agent, not a general chatbot. In the current codebase it has two responsibilities: run proactive graph checks for workspace and sprint drift, and help the person already looking at a Ship document understand the current page and preview the next guided step from that same surface.

### What it monitors

- Scheduled workspace sweeps and debounced background-event jobs, both of which enqueue proactive runs through the worker.
- `week_start_drift`: the earliest non-completed week whose start date has passed and is still `planning`, or has reached its start window with zero issues.
- `sprint_no_owner`: the earliest planning or active week whose start date has passed and still has no owner.
- `unassigned_sprint_issues`: an eligible active or planning sprint whose start date has passed and still has at least 3 unassigned issues.

### What it reasons about on demand

- The current issue, sprint, project, program, or weekly document surface inside Ship.
- The normalized page-context envelope passed through `/api/fleetgraph/entry`, including the current document, `belongs_to` relations, ancestors, breadcrumbs, children, and route surface.
- Whether the right outcome for this page is quiet, advisory, or approval-required.
- The current document plus one-hop children first, with an optional deeper-context fetch loop when the reason node decides it still needs more evidence.

### What it can do autonomously

- Read Ship state through REST endpoints only and normalize the current document context into FleetGraph’s internal state.
- Fan out scenario checks, rank candidates, and persist proactive findings with dedupe, cooldown, dismiss, snooze, checkpoint, and trace metadata.
- Produce read-only analysis, proactive findings, and approval previews before any Ship mutation occurs.
- Prepare resumable review threads and action payloads for supported Ship mutations.

### What requires human approval

- Any branch that reaches `approval_interrupt`.
- Current surfaced review/apply actions such as starting a week, assigning a sprint owner, approving a project plan, approving a week plan, and validating a week plan.
- Applying a proactive finding through `/api/fleetgraph/findings/:id/apply` or applying an entry approval thread through `/api/fleetgraph/entry/apply`.
- FleetGraph never mutates Ship during proactive advisory runs, `Check this page`, or `Preview next step` until a user explicitly confirms.

### Who it notifies and when

- This repo does not implement email, Slack, or push delivery; FleetGraph notifies by surfacing UI state inside Ship.
- Proactive findings appear in the `FleetGraphFindingsPanel` when the current document, or one of its `belongs_to` parents, matches the finding query for that page.
- On-demand guidance appears only for the current-page viewer, either in the entry card or in the FAB after the user asks FleetGraph to analyze the page.
- In practice that means PM-facing sprint, project, and weekly-plan viewers see proactive drift findings, while the person already on the page gets analysis and guided-step previews.

### How current-view context shapes on-demand mode

- FleetGraph is embedded in `UnifiedDocumentPage`, not on a standalone chat page
- It keys entry threads by workspace, document, active tab, and nested path, so a review-tab thread is distinct from the same document’s default-tab thread.
- It receives `context.current`, `ancestors`, `breadcrumbs`, `children`, `belongs_to`, `workspaceId`, `documentId`, `documentType`, `activeTab`, `nestedPath`, and `surface` from the current view.
- `Preview next step` can build page-native approval drafts from the current surface, such as project-plan approval, week-plan approval, or week-plan validation on a sprint review tab.
- `Check this page` uses the same current-view envelope but hands the analysis off into the FAB conversation so follow-up turns stay grounded in the current page.

## Graph Diagram

The diagram below mirrors the compiled runtime in `api/src/services/fleetgraph/graph/runtime.ts`, including the proactive fan-out, the on-demand fetch/reason loop, and the approval interrupt path.

```mermaid
flowchart TD
  start(["START"]) --> rtc["resolve_trigger_context"]
  rtc --> sel["select_scenarios"]
  sel --> mode{"contextKind / mode / requestedAction?"}

  mode -->|proactive| proactive["week_start_drift<br/>sprint_no_owner<br/>unassigned_sprint_issues"]
  mode -->|finding_review| review["finding_action_review"]
  mode -->|entry + requestedAction| entryAction["entry_requested_action"]
  mode -->|entry + on_demand + no requestedAction| analysis["on_demand_analysis"]
  mode -->|entry + other mode + no requestedAction| entryCheck["entry_context_check"]

  proactive -->|Send fan-out per scenario| run["run_scenario"]
  review --> run
  entryAction --> run
  analysis --> run
  entryCheck --> run

  run --> merge["merge_candidates"]
  merge --> rank["score_and_rank"]

  rank -->|no score > 0| quiet["quiet_exit"]
  rank -->|fallback| fallback["fallback"]
  rank -->|approval_required| interrupt["approval_interrupt"]
  rank -->|reasoned non-analysis| deliver["reason_and_deliver"]
  rank -->|reasoned on-demand analysis| fetchMedium["fetch_medium"]

  fetchMedium --> reason["reason"]
  reason -->|needsDeeperContext = true| fetchDeep["fetch_deep"]
  fetchDeep --> reason
  reason -->|needsDeeperContext = false| persist["persist_result"]

  quiet --> persist
  deliver --> persist

  interrupt -->|selectedAction missing| fallback
  interrupt -->|approved| execute["execute_action"]
  interrupt -->|dismissed / not approved| actionPersist["persist_action_outcome"]
  execute --> actionPersist

  persist --> done(["END"])
  actionPersist --> done
  fallback --> done
```

### Node types

- Context nodes:
  - `resolve_trigger_context`
- Scenario-selection nodes:
  - `select_scenarios`
  - `run_scenario`
- Current scenario families:
  - `week_start_drift`
  - `sprint_no_owner`
  - `unassigned_sprint_issues`
  - `on_demand_analysis`
  - `entry_context_check`
  - `entry_requested_action`
  - `finding_action_review`
- Merge/rank nodes:
  - `merge_candidates`
  - `score_and_rank`
- On-demand fetch/reason nodes:
  - `fetch_medium`
  - `reason`
  - `fetch_deep`
- Delivery nodes:
  - `quiet_exit`
  - `reason_and_deliver`
- Human gate and action nodes:
  - `approval_interrupt`
  - `execute_action`
  - `persist_action_outcome`
- Output and persistence nodes:
  - `persist_result`
- Failure node:
  - `fallback`

### Edges

- `START -> resolve_trigger_context -> select_scenarios`
- `select_scenarios -> run_scenario` uses LangGraph `Send` fan-out after choosing:
  - proactive mode -> `week_start_drift`, `sprint_no_owner`, `unassigned_sprint_issues`
  - `finding_review` context -> `finding_action_review`
  - entry with `requestedAction` -> `entry_requested_action`
  - entry with on-demand page analysis -> `on_demand_analysis`
  - entry without requested action in other modes -> `entry_context_check`
- `run_scenario -> merge_candidates -> score_and_rank`
- `score_and_rank -> quiet_exit -> persist_result` when no candidate survives thresholds
- `score_and_rank -> reason_and_deliver -> persist_result` for reasoned non-analysis branches
- `score_and_rank -> fetch_medium -> reason` for `on_demand_analysis`
- `reason -> fetch_deep -> reason` while the model asks for deeper context
- `reason -> persist_result` once deeper context is no longer needed
- `score_and_rank -> approval_interrupt` for approval-required branches
- `approval_interrupt -> execute_action -> persist_action_outcome` after explicit `resume(approved)`
- `approval_interrupt -> persist_action_outcome` when the review is dismissed or not approved
- `approval_interrupt -> fallback` if no actionable selection is present
- `fallback -> END`, `persist_result -> END`, and `persist_action_outcome -> END`

### Branching conditions

- `quiet`: scenario fan-out produced no candidate with a positive score
- `reasoned`: a scenario produced output that can continue without an immediate Ship mutation
- `reasoned + on_demand_analysis`: the graph enters the fetch/reason loop instead of delivering immediately
- `approval_required`: a scenario produced a consequential action and the graph paused in `approval_interrupt`
- `needsDeeperContext = true`: the reason node loops through `fetch_deep` before reasoning again
- `fallback`: the graph could not safely continue because required evidence or execution preconditions failed

## Use Cases

Minimum: 5.

| # | Role | Trigger | Agent Detects / Produces | Human Decides |
|---|------|---------|---------------------------|---------------|
| 1 | PM | Week start day passes and the week is still `planning` or has zero issues | Week-start drift summary with owner and missing setup details | Start the week, add scope, or intentionally leave it idle |
| 2 | PM | A planning or active week has reached its start window with no owner assigned | Sprint-owner gap summary naming the week and missing accountability | Assign an owner now, defer intentionally, or leave the week unchanged |
| 3 | PM | An active or planning week has a meaningful cluster of unassigned issues | Unassigned-issues brief with count, sprint context, and why assignment is needed | Assign work now, rebalance later, or leave the issues unassigned intentionally |
| 4 | Engineer or PM | User is on an issue, sprint, project, program, or weekly-doc page and wants FleetGraph to preview the next consequential step | Current-page guided-step preview, including the action target, visible proof on the current surface, and exact next step | Confirm, cancel, or refine the action before anything is executed |
| 5 | Engineer or PM | User opens an issue, sprint, project, program, or weekly-doc page and asks for help | Context-aware page analysis that pulls current document state, related work, history, comments, and next actions into one response | Choose the next step with less digging |

## Trigger Model

FleetGraph should use a hybrid trigger model:

1. Event-driven enqueue from high-signal Ship write routes
2. A scheduled sweep every 4 minutes for time-based and drift-based conditions

### Latency tradeoffs

- Pure polling is simpler, but it struggles to stay under the required 5-minute detection target once runtime and queueing are included
- Hybrid gives near-immediate enqueue for hot writes and bounded detection latency for drift conditions
- Event path target:
  - enqueue immediately on write
  - debounce/coalesce for 60 to 90 seconds
  - reason and deliver within about 30 to 60 seconds
  - typical total latency around 2 minutes
- Sweep path target:
  - worst-case wait under 4 minutes
  - plus 30 to 60 seconds for graph execution and delivery
  - worst-case total latency about 4.5 to 5 minutes

### Reliability tradeoffs

- Pure webhook/event-driven is not defensible because Ship does not expose a durable backend event bus today
- The existing `/events` socket is delivery plumbing for connected browsers, not a replayable worker trigger source
- Hybrid is more complex than pure polling, but it tolerates both:
  - hot change detection from route-level enqueue hooks
  - time-based drift detection from scheduled sweeps

### Cost tradeoffs

- Hybrid keeps clean sweeps mostly deterministic and only invokes the LLM for candidate-producing runs
- Public-API sweep cost scales with workspace count, so the worker must narrow or debounce work instead of invoking the model on every interval
- At higher scale, Ship API rate limits become the first real cliff, not raw LLM spend

### Why this model is defensible for Ship

- It reuses real Ship write touchpoints in:
  - `api/src/routes/issues.ts`
  - `api/src/routes/weeks.ts`
  - `api/src/routes/projects.ts`
  - `api/src/routes/documents.ts`
- It stays honest to the current architecture by not pretending `/events` is a durable queue
- It meets the under-5-minute detection target better than pure polling
- It supports both proactive drift detection and same-origin contextual entry on one shared graph

## Test Cases

I refreshed this table against live `ship-fleetgraph` LangSmith CLI data on March 22, 2026 and March 23, 2026 UTC. Rows 1, 4, and 5 link to shared `fleetgraph.runtime` root traces. Rows 2 and 3 link to shared scenario-level `fleetgraph.run` traces captured inside the same March 23 proactive sweep, because the root ranking still selected `week_start_drift` as the top proactive outcome for that workspace state.

| # | Ship State | Expected Output | Trace Link |
|---|------------|-----------------|------------|
| 1 | A scheduled sweep finds the earliest non-completed week whose calculated start date has passed and that week is still `planning`, or has reached its start window with `issue_count = 0`. | A persisted `week_start_drift` finding titled `Week start drift: ...`, with evidence about the passed start date, week state, and current owner state, plus a human-gated `Start week` action. | [proactive sweep root trace](https://smith.langchain.com/public/019d18d7-746e-74e8-b2c9-01ed0e002d4a/r) |
| 2 | A scheduled sweep finds the earliest `planning` or `active` week whose calculated start date has passed and `owner === null`. | A persisted `sprint_no_owner` finding titled `Sprint owner gap: ...`, with accountability evidence and a human-gated `Assign sprint owner` action. | [sprint owner scenario trace](https://smith.langchain.com/public/019d18d7-7f06-7000-8000-03b54e455d91/r) |
| 3 | A scheduled sweep finds an eligible `active` or `planning` week whose calculated start date has passed and at least 3 sprint issues have `assignee_id === null`. | A persisted `unassigned_sprint_issues` finding titled `{n} unassigned issues in ...`, with count/context evidence and a human-gated `Assign sprint issues` review/apply path that requires an assignee selection before execution. | [unassigned issues scenario trace](https://smith.langchain.com/public/019d18d7-81b2-7000-8000-00a127321df1/r) |
| 4 | `POST /api/fleetgraph/entry` runs from a current document surface with `mode: on_demand`, document context present, and a validated `requestedAction` in the draft payload. | An `approval_required` preview on the entry thread, showing the requested action title, summary, evidence, and `Apply` / `Dismiss` / `Snooze` choices before any Ship mutation runs. | [approval-preview root trace](https://smith.langchain.com/public/019d18cb-c732-724f-9e62-85f95733e600/r) |
| 5 | `POST /api/fleetgraph/entry` runs from a current document surface with `mode: on_demand`, document context present, and no `requestedAction`. | An `on_demand_analysis` run that fetches the document plus one-hop children, reasons over current page state, returns narrative analysis plus structured findings, and can request deeper context for follow-up turns. | [on-demand analysis root trace](https://smith.langchain.com/public/019d18ca-6e09-7168-859f-1381c196316b/r) |

## Tuesday MVP Evidence

- Public demo URL: `https://ship-demo-production.up.railway.app`
- Public demo readiness: authenticated FleetGraph readiness returned HTTP `200` during the final evidence capture on `2026-03-17T12:36:53Z`
- Demo inspection guide: `docs/guides/fleetgraph-demo-inspection.md`
- Evidence bundle: `docs/evidence/fleetgraph-mvp-evidence.json` and `docs/evidence/fleetgraph-mvp-evidence.md`
- Named public demo inspection targets:
  - `FleetGraph Demo Week - Review and Apply`
  - `FleetGraph Demo Week - Owner Gap`
  - `FleetGraph Demo Week - Unassigned Issues`
  - `FleetGraph Demo Week - Validation Ready`
  - `FleetGraph Demo Week - Worker Generated`
- Stable public-demo proof lanes during the March 22, 2026 audit:
  - `FleetGraph Demo Week - Review and Apply`
  - `FleetGraph Demo Week - Owner Gap`
  - `FleetGraph Demo Week - Validation Ready`
  - `FleetGraph Demo Week - Worker Generated`
- Known public-demo blocker:
  - `FleetGraph Demo Week - Unassigned Issues` is seeded in repo but blocked on the current public Railway findings feed, so the evidence bundle records that lane as implemented but not currently publicly inspectable on Railway
- Screenshot artifacts:
  - `docs/evidence/screenshots/fleetgraph-review-apply-live.png`
  - `docs/evidence/screenshots/fleetgraph-approval-preview-live.png`
  - `docs/evidence/screenshots/fleetgraph-worker-generated-live.png`
- Shared trace links showing different execution paths, refreshed from live LangSmith CLI data on March 23, 2026 UTC:
  - Proactive sweep root path: [worker trace](https://smith.langchain.com/public/019d18d7-746e-74e8-b2c9-01ed0e002d4a/r)
  - Proactive sprint-owner path: [sprint owner trace](https://smith.langchain.com/public/019d18d7-7f06-7000-8000-03b54e455d91/r)
  - Proactive unassigned-issues path: [unassigned issues trace](https://smith.langchain.com/public/019d18d7-81b2-7000-8000-00a127321df1/r)
  - On-demand analysis path: [analysis trace](https://smith.langchain.com/public/019d18ca-6e09-7168-859f-1381c196316b/r)
  - On-demand guided-step path: [approval-preview trace](https://smith.langchain.com/public/019d18cb-c732-724f-9e62-85f95733e600/r)

- Tuesday MVP slice shipped:
  - one proactive week-start drift detection wired end to end
  - one human-confirmed `start week` gate routed through Ship REST
  - one proactive unassigned-sprint-issues lane with advisory-only next-step guidance
  - one current-page review-tab validation lane with visible page-state proof
  - real Ship data on the public Railway deployment
  - visible Ship UI proof for the seeded review/apply lane, the owner-gap lane, the validation-ready review lane, and the worker-generated proactive lane
  - a seeded but currently blocked public Railway proof lane for unassigned-sprint issues, recorded explicitly in the evidence bundle instead of being treated as already visible

## Architecture Decisions

### Framework choice

FleetGraph is built as a LangGraph workflow inside the Ship API, not as a single prompt handler or an ad hoc queue processor. The implementation in `api/src/services/fleetgraph/graph/runtime.ts` uses `StateGraph`, `Send`, `interrupt`, and `task()` to model the real execution paths we already need: proactive sweeps, on-demand page analysis, approval-gated actions, and resumable review flows. That choice fits the code better than a plain service class because FleetGraph has real branching, resumability, and checkpoint inspection requirements.

We kept the model layer behind a provider-agnostic adapter and wrapped it with LangSmith tracing, but the core decision is that LangGraph owns workflow orchestration while the worker queue stays outside the graph. The tradeoff is extra runtime complexity compared with a simpler request-response controller, but the benefit is that the graph shape, traces, interrupts, and checkpoint history all line up with how FleetGraph actually behaves in production.

### Node design rationale

The node layout is intentionally split by responsibility. `select_scenarios` and `run_scenario` handle deterministic candidate generation first, which lets proactive runs check week-start drift, missing sprint owners, and unassigned issues before spending tokens on deeper reasoning. From there, `score_and_rank`, `fetch_medium`, `reason`, and `fetch_deep` form the analysis lane, while `approval_interrupt`, `execute_action`, and `persist_action_outcome` form the action lane.

This is more verbose than a single "analyze and act" node, but it buys us three things the code needs today. First, the graph can distinguish quiet, advisory, fallback, and approval-required outcomes explicitly. Second, expensive model work is scoped to branches that produced a real candidate instead of every sweep. Third, side effects stay isolated behind explicit nodes and `task()` boundaries, which makes resume and replay behavior safer when the graph is interrupted for human review.

### State management approach

FleetGraph uses layered state instead of forcing every concern into one store. Run-local orchestration state lives in the LangGraph state object and is checkpointed per `thread_id`, which is what lets the runtime resume pending approvals and inspect prior graph state. `api/src/services/fleetgraph/graph/checkpointer.ts` keeps local and test runs lightweight with `MemorySaver`, but switches to `PostgresSaver` when `DATABASE_URL` is configured so deployed runs can survive process restarts.

Durable product state is stored separately by lifecycle. Proactive findings live in `fleetgraph_proactive_findings`, worker scheduling and dedupe live in the worker tables, and action/finding review records live in their own stores. The tradeoff is that FleetGraph has more than one persistence surface to reason about, but the separation keeps each table honest about its job: checkpoints are for workflow recovery, findings are for user-visible status, and queue tables are for worker coordination and cooldown control.

### Deployment model

FleetGraph deploys as two cooperating surfaces that share the same graph contract. The Ship API handles same-origin entry, findings, and review/apply routes, while the separate worker process handles scheduled sweeps, dirty-context enqueueing, and queued proactive execution. The worker runtime in `api/src/services/fleetgraph/worker/runtime.ts` claims due sweep schedules, dedupes jobs, runs the graph, and records checkpoint summaries, which keeps long-running or retried proactive work out of request handlers.

That split is more operationally involved than embedding everything in the API process, but it matches the actual trigger model and keeps proactive detection reliable. The deployment config also makes the separation explicit: production requires `FLEETGRAPH_ENTRY_ENABLED` for the API surface, `FLEETGRAPH_WORKER_ENABLED` plus `FLEETGRAPH_API_TOKEN` for the worker surface, `FLEETGRAPH_SERVICE_TOKEN` for service-auth checks, and LangSmith tracing for readiness proof. In practice, that gives FleetGraph a same-origin user entry point with a separately operable background lane instead of pretending one process can do both jobs well.

## Cost Analysis

### Development and Testing Costs

| Item | Amount |
|------|--------|
| OpenAI API - input tokens | about 5,386 input tokens in the captured Tuesday evidence window |
| OpenAI API - output tokens | about 924 output tokens in the captured Tuesday evidence window |
| Total invocations during development | 9 `fleetgraph.llm.generate` invocations in the captured Tuesday evidence window |
| Total development spend | about $0.0014 in OpenAI API-equivalent cost at the live traced `gpt-4o-mini` rate for the captured Tuesday evidence window |

Observed live trace totals for the Tuesday evidence window (`2026-03-17T12:02:20Z` to `2026-03-17T12:32:47Z`):

- I re-queried the `ship-fleetgraph` LangSmith project through the LangSmith CLI on March 22, 2026 and March 23, 2026 UTC and confirmed the Tuesday workbook totals still match the recorded evidence window exactly.
- `fleetgraph.runtime` root traces: 13
- `fleetgraph.llm.generate` child invocations: 9
- Total tokens recorded on child runs: 6,310
- Average tokens per `fleetgraph.llm.generate` invocation: about 701
- Current live model proof: the March 23 public LangSmith refresh traces show the Railway demo executing `gpt-4o-mini-2024-07-18` today, even though `api/src/services/fleetgraph/llm/factory.ts` still defaults to `gpt-5-mini` when `FLEETGRAPH_OPENAI_MODEL` is unset
- Trace limitation: the Tuesday LangSmith payloads still expose `outputs.total_tokens`, but not populated `prompt_tokens`, `completion_tokens`, or `total_cost` fields for that window, so the input/output split above remains an estimated reuse of the same proactive/on-demand prompt mix used elsewhere in this workbook

### Production Cost Projections

| Users | Monthly Cost |
|-------|--------------|
| 100 | about $1.00 |
| 1,000 | about $10.00 |
| 10,000 | about $99.99 |

Assumptions:
- Preferred default provider: OpenAI
- Current live traced deployment model: `gpt-4o-mini`
- Repo fallback default when unset: `gpt-5-mini`
- Proactive runs per project per day: about 6 after debounce and thresholding
- On-demand invocations per user per day: about 0.7
- Active project assumption: about 1 project per 4 users
- Average tokens per invocation: about 701 based on the LangSmith Tuesday evidence window
- Cost per run: about $0.0001515 using current `gpt-4o-mini` pricing and the same estimated 85.4% input / 14.6% output token mix
- Estimated runs per day:
  - 100 users: about 220
  - 1,000 users: about 2,200
  - 10,000 users: about 22,000
- Clean sweeps stay deterministic and are not counted as LLM invocations
