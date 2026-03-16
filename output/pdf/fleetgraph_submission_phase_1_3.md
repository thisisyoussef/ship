# FleetGraph Submission Brief

Phase 1 through Phase 3 answers, grounded in the Ship codebase.

## Phase 1: Define Your Agent

## 1. Agent Responsibility Scoping

### What events in Ship should the agent monitor proactively?

**Answer:** Missing standups, week-start drift, approval gaps, deadline risk, workload imbalance, and blocker proxies.

**Rationale:** These are the strongest signals Ship already models through week status, approvals, target dates, issue states, assignments, and iterations.

### What constitutes a condition worth surfacing?

**Answer:** Only threshold-crossing conditions that create a concrete next decision, such as a missed standup by noon, a week still in planning after start, or a project with a target date inside 7 days and stale high-priority work.

**Rationale:** The main product risk is notification fatigue, so the agent should stay quiet unless it can explain why the user should care right now.

### What is the agent allowed to do without human approval?

**Answer:** Read Ship state, reason over it, store FleetGraph insight state, send proactive cards, and draft suggested actions or comments.

**Rationale:** Ship does not yet have an agent-specific audit lane or bot-safe mutation scope, so autonomous behavior should stay read-only.

### What must always require confirmation?

**Answer:** Any Ship write that changes visible team state: issue reassignment or state changes, week start and carryover, approvals, request-change actions, persistent comments, bulk edits, and destructive actions.

**Rationale:** These actions affect ownership, scope, and review state, and Ship's permissions are still human-role based.

### How does the agent know who is on a project?

**Answer:** By combining project and program ownership fields, issue assignees, team assignments, team people, and normalized legacy relationship fields such as `project_id` and `assignee_ids`.

**Rationale:** Project membership is not exposed as one clean source. It is a derived view across mixed-shape Ship data.

### How does the agent know who to notify?

**Answer:** Target the person who owns the next decision first: assignee for personal work, week owner for sprint health, accountable person or manager for approvals, and Director lens for cross-project risk.

**Rationale:** Ship's `role` field is a presentation signal, not an auth boundary, so targeting has to be responsibility-first.

### How does the on-demand mode use context from the current view?

**Answer:** The frontend passes `document_id`, `document_type`, `active_tab`, `nested_path`, and optional `project_context_id` from `UnifiedDocumentPage` and `CurrentDocumentContext` into the graph entry state.

**Rationale:** Ship already organizes user context through `/documents/:id/*`, so embedded chat should reuse that instead of inventing a separate page.

## 2. Use Case Discovery

| Use Case | Role | Trigger | Agent Detects or Produces | Human Decides | Rationale |
|---|---|---|---|---|---|
| Engineer standup rescue | Engineer | Active week, business day, no standup by noon | Detects the miss, shows issue count, and links to the right week or standup surface | Post now, snooze, or ignore | Ship already computes this accountability gap dynamically, so it is a real operational pain point |
| PM week-start drift | PM | Start day passes and the week is still `planning` or empty | Produces a short summary of what is missing and who owns the week | Start the week, add scope, or intentionally leave it idle | This maps directly to Ship's explicit week status model and issue associations |
| PM approval gap | PM | Plan or review is `changes_requested` or remains unapproved for 1 business day after submission | Identifies the approver, the blocked artifact, and the next action | Approve, request changes, or revise the document | Approval state already lives in Ship document properties and existing endpoints |
| Director deadline risk | Director | Project target date is within 7 days and high-priority work is still open or stale | Produces a risk brief naming the at-risk project and stale issues | Escalate, rescope, or accept the risk | Ship already exposes target dates, issue priority, and activity timing |
| PM workload rebalance | PM | One person owns more than 50 percent of open estimate or more than 2x the median load | Surfaces the skew and candidate work to move | Reassign now or keep the current distribution | Ship has enough assignment and estimate data to support this even though normalization is required |
| Context-aware page assistant | Engineer or PM | User opens an issue, sprint, or project page and asks a question | Pulls together the current document, related work, comments, and next actions into one answer | What to do next with less digging | The current UI already spreads context across tabs and related documents, which makes this a clear synthesis pain point |

## 3. Trigger Model Decision

### When does the proactive agent run without a user present?

**Answer:** It runs after high-signal Ship writes are enqueued and on a scheduled 4 minute sweep for time-based drift conditions.

**Rationale:** This covers both hot updates and slow-burn accountability or deadline conditions.

### Poll vs. webhook vs. hybrid

**Answer:** Choose hybrid: route-level enqueue hooks for hot writes plus a scheduled sweep. Pure polling is simple but wasteful and close to the latency limit. Pure webhook or socket-driven triggering is not durable in Ship today.

**Rationale:** Ship has browser delivery events but not a replayable backend event bus, so hybrid is the only honest fit.

### How stale is too stale?

**Answer:** Standups are stale the same business day by noon. Week starts are stale after a 4 hour grace window. Approval gaps are stale after 1 business day. High-priority issue risk is stale at 48 hours. Blocker proxies become meaningful after 3 business days or 2 repeated blocker reports.

**Rationale:** Each threshold maps to an actual Ship workflow rather than a generic stale-data rule.

### What does your choice cost at 100 projects and 1,000 projects?

| Scale | Workspaces | Sweeps/day | REST reads/day | Reasoning runs/day |
|---|---|---|---|---|
| 100 projects | 10 | 3,600 | 18,000 | 600 |
| 1,000 projects | 100 | 36,000 | 180,000 | 6,000 |

**Rationale:** The first scaling cliff is Ship API rate limiting, not raw LLM cost.

## Phase 2: Graph Architecture

## 4. Node Design

### What are your context, fetch, reasoning, action, and output nodes?

**Answer:** Context nodes resolve trigger type, actor lens, and current page metadata. Fetch nodes load workspace snapshots or document-centric clusters. Reasoning nodes score candidates and synthesize next actions. Action nodes classify quiet output versus HITL-gated writes. Output nodes emit chat answers, proactive cards, or approved mutations.

**Rationale:** This split keeps the graph traceable and ensures the model only reasons after real Ship data has been normalized.

### Which fetch nodes run in parallel?

**Answer:** For proactive sweeps: projects, weeks, issues, team people, and accountability items. For issue pages: issue detail, history, iterations, children, comments, and people. For week pages: week detail, issues, standups, review, and people. For project pages: project detail, issues, weeks, retro, activity, and people.

**Rationale:** These calls are independent once the scope is known, so parallelism reduces latency without complicating correctness.

### Where are your conditional edges and what triggers each branch?

**Answer:** After normalization and deterministic scoring, the graph branches to a quiet exit when no candidate survives thresholds, to reasoning when at least one candidate matters, to HITL when a Ship write is proposed, and to fallback when fetches fail or data is incomplete.

**Rationale:** Distinct branches are necessary so LangSmith clearly shows clean runs versus problem-detected runs.

## 5. State Management

### What state does the graph carry across a session?

**Answer:** Trigger metadata, actor lens, route context, raw payloads, normalized Ship graph, candidate findings, reasoning output, action plan, and partial-failure flags.

**Rationale:** The graph needs that state to keep fetches and reasoning coherent inside a single run.

### What state persists between proactive runs?

**Answer:** Insight fingerprints, evidence hashes, first-seen and last-seen timestamps, last-notified time, snooze windows, dismissals, resolved state, and LangGraph checkpoint data.

**Rationale:** Without durable state, the agent cannot dedupe, interrupt safely, or respect user snoozes.

### How do you avoid redundant API calls?

**Answer:** Use in-run memoization plus short TTL caches: team people for 10 to 15 minutes, project lists for 2 minutes, week lists for 1 to 2 minutes, and issue-heavy views for 30 to 60 seconds.

**Rationale:** Ship remains the source of truth, but short caches prevent waste and help stay under rate limits.

## 6. Human-in-the-Loop Design

### Which actions require confirmation?

**Answer:** Any persistent Ship mutation: issue changes, week start or carryover, approvals, request-change actions, and posting comments.

**Rationale:** These actions change visible team state and should stay human-owned in MVP.

### What does the confirmation experience look like in Ship?

**Answer:** An embedded FleetGraph card offers `Apply`, `Dismiss`, `Snooze`, and `View evidence`. `Apply` opens a small confirm modal that shows the exact object, change, and endpoint that will be called.

**Rationale:** The confirmation path should live where the user is already working, not in a separate admin flow.

### What happens if the human dismisses or snoozes?

**Answer:** Dismiss writes a cooldown against the current insight fingerprint. Snooze delays resurfacing until the selected time or until evidence changes materially.

**Rationale:** This keeps the agent useful without repeating the same advice on every sweep.

## 7. Error and Failure Handling

### What does the agent do when Ship API is down?

**Answer:** Retry briefly with jitter, mark the run degraded, suppress proactive alerts, and fall back to read-only help only when cached context is still safe to use.

**Rationale:** The right failure mode is quiet caution, not speculative action.

### How does it degrade gracefully?

**Answer:** Lower confidence on partial data, label blocker findings as heuristic when necessary, and avoid any mutation or high-confidence escalation until live evidence is complete again.

**Rationale:** This preserves trust when only part of the context is available.

### What gets cached and for how long?

**Answer:** People and role data up to 15 minutes, project and week list snapshots up to 5 minutes in degraded mode, and issue details only briefly for read-only answers.

**Rationale:** That balances usability with the rule that Ship is still the live system of record.

## Phase 3: Stack and Deployment

## 8. Deployment Model

### Where does the proactive agent run when no user is present?

**Answer:** In a dedicated FleetGraph background worker process that sits alongside Ship's API routes but still calls Ship through REST only.

**Rationale:** This preserves the REST-only boundary while allowing scheduled and queued work.

### How is it kept alive?

**Answer:** A long-running worker handles queued event runs and a scheduler fires the 4 minute sweeps.

**Rationale:** That is more reliable than trying to fake proactive behavior out of browser sessions.

### How does it authenticate with Ship without a user session?

**Answer:** With a Ship API token created through `/api/api-tokens`, ideally tied to a dedicated FleetGraph service user per workspace.

**Rationale:** Ship already supports Bearer token auth, so background runs do not need a browser session.

## 9. Performance

### How does your trigger model achieve the under 5 minute detection latency goal?

**Answer:** Event-driven runs enqueue immediately, debounce for about 60 to 90 seconds, then execute in about 30 to 60 seconds. Sweep-driven runs happen every 4 minutes, so worst-case latency lands at about 4.5 to 5 minutes.

**Rationale:** This is the tightest defensible window given Ship's current architecture.

### What is your token budget per invocation?

| Invocation | Input tokens | Output tokens | Approx. cost |
|---|---|---|---|
| Proactive reasoning | 4,000 | 700 | $0.0024 |
| On-demand chat | 6,000 | 1,000 | $0.0035 |

**Rationale:** Rule gating keeps clean sweeps out of the model entirely, so only candidate-producing runs consume tokens.

### Where are the cost cliffs in your architecture?

**Answer:** The first cliff is Ship API rate limiting at scale. The second is removing deterministic pre-filtering and sending every sweep to the model. The third is swapping the cheap default model for a far more expensive frontier model without tightening thresholds.

**Rationale:** The architecture is affordable only because it controls both API volume and LLM volume before they compound.
