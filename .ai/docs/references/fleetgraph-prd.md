# FleetGraph PRD Reference

Canonical source: `docs/assignments/fleetgraph/FleetGraph_PRD.pdf`

## Assignment intent

FleetGraph is not meant to be a generic chatbot. It is a project-intelligence agent for Ship that reads real project state, reasons about it, and makes the next useful action obvious.

## Required modes

- Proactive mode: runs without a user present and pushes findings
- On-demand mode: runs from an embedded contextual chat surface inside Ship

Both modes must share the same graph architecture.

## Non-negotiable constraints

- Ship REST API only
- Provider-agnostic AI integration with OpenAI preferred in this repo direction
- LangSmith tracing from day one
- LangGraph recommended
- Embedded contextual chat only
- Human confirmation before consequential actions
- Real Ship data, not mocked responses
- Public deployment required

## Minimum MVP bar

- One proactive detection running end to end
- At least two shared LangSmith traces showing different execution paths
- `docs/assignments/fleetgraph/FLEETGRAPH.md` with Agent Responsibility, Use Cases, Trigger Model, and graph outline
- At least one human-in-the-loop gate
- A defended trigger-model decision

## Deliverables to keep current

- `docs/assignments/fleetgraph/PRESEARCH.md`
- `docs/assignments/fleetgraph/FLEETGRAPH.md`
- shared trace links

## What to decide before coding

1. What the agent is responsible for
2. Which use cases matter for Director, PM, and Engineer roles
3. Which actions can be autonomous
4. Which actions must stop for approval
5. Whether proactive execution is poll, webhook, or hybrid
6. How proactive auth and deployment work
