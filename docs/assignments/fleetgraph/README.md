# FleetGraph Assignment Brief

Source PRD: `docs/assignments/fleetgraph/FleetGraph_PRD.pdf`

## What this assignment is asking for

Build a project-intelligence agent for Ship that does more than answer questions. It should read project state, reason about what matters, surface useful findings proactively, and support context-aware on-demand interaction inside the Ship UI.

## Required operating modes

- Proactive: the graph runs without a user present and pushes findings when project state warrants action.
- On-demand: the graph runs from an embedded chat surface and starts from the current Ship context, such as an issue or sprint view.

Both modes must use the same graph architecture. The trigger changes, not the graph.

## Hard constraints

- Data source: Ship REST API only
- AI provider: Claude API
- Observability: LangSmith tracing from day one
- Framework: LangGraph recommended; if not used, equivalent manual LangSmith instrumentation is required
- UX: chat must be embedded in context, not a standalone chatbot page
- Safety: consequential actions must pass through a human-in-the-loop confirmation gate
- Performance target: detect and surface a relevant problem within 5 minutes

## Main deliverables

- `PRESEARCH.md`
- `FLEETGRAPH.md`
- Shared LangSmith trace links showing different execution paths
- A deployed, publicly accessible implementation running against real Ship data

## PRD checkpoints

- Pre-Search: 2 hours after assignment start
- MVP: Tuesday, 11:59 PM
- Early Submission: Friday, 11:59 PM
- Final Submission: Sunday, 11:59 PM

## What to lock down before coding

1. What the agent monitors proactively.
2. What the agent reasons about on demand.
3. What it may do autonomously.
4. What always requires confirmation.
5. Who gets notified and under what conditions.
6. How project membership and role context are derived.
7. Which trigger model best balances latency, cost, and reliability.

## Suggested start order

1. Read the PRD PDF once end to end.
2. Fill in `PRESEARCH.md`.
3. Draft the Agent Responsibility, Use Cases, and Trigger Model sections in `FLEETGRAPH.md`.
4. Decide the proactive trigger model and defend it.
5. Only then start implementation planning and graph design.
