# FleetGraph Assignment Brief

Source PRD: `docs/assignments/fleetgraph/FleetGraph_PRD.pdf`

Supporting repo docs:
- `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
- `.ai/docs/references/fleetgraph-prd.md`
- `docs/assignments/fleetgraph/PRESEARCH.md`
- `docs/assignments/fleetgraph/FLEETGRAPH.md`
- `docs/guides/fleetgraph-deployment-readiness.md`
- `docs/guides/fleetgraph-demo-inspection.md`
- `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/`
- `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/`

## What this assignment is asking for

Build a project-intelligence agent for Ship that does more than answer questions. It should read project state, reason about what matters, surface useful findings proactively, and support context-aware on-demand interaction inside the Ship UI.

## Required operating modes

- Proactive: the graph runs without a user present and pushes findings when project state warrants action.
- On-demand: the graph runs from an embedded chat surface and starts from the current Ship context, such as an issue or sprint view.

Both modes must use the same graph architecture. The trigger changes, not the graph.

## Hard constraints

- Data source: Ship REST API only
- AI provider: provider-agnostic in this repo; OpenAI is the preferred default
- Observability: LangSmith tracing from day one
- Framework: LangGraph recommended; if not used, equivalent manual LangSmith instrumentation is required
- UX: chat must be embedded in context, not a standalone chatbot page
- Safety: consequential actions must pass through a human-in-the-loop confirmation gate
- Performance target: detect and surface a relevant problem within 5 minutes

## Repo clarification on the source PRD

- The checked-in PDF is the canonical assignment source and matches the downloaded copy used for this story.
- The source PDF still contains a Claude-only AI bullet. That requirement is superseded for this repo's planning and implementation.
- FleetGraph should remain provider-agnostic behind an adapter boundary, with OpenAI as the preferred default unless another provider is explicitly justified later.

## Main deliverables

- `docs/assignments/fleetgraph/PRESEARCH.md`
- `docs/assignments/fleetgraph/FLEETGRAPH.md`
- `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
- Shared LangSmith trace links showing different execution paths
- A deployed, publicly accessible implementation running against real Ship data

## PRD checkpoints

- Pre-Search: 2 hours after assignment start
- MVP: Tuesday, 11:59 PM
- Early Submission: Friday, 11:59 PM
- Final Submission: Sunday, 11:59 PM

## Tuesday MVP Pass Checklist

All items are required to pass:

- Graph running with at least one proactive detection wired end to end
- LangSmith tracing enabled with at least two shared trace links showing different execution paths
- `docs/assignments/fleetgraph/FLEETGRAPH.md` submitted with Agent Responsibility and Use Cases completed, with at least 5 use cases defined
- Graph outline complete in `docs/assignments/fleetgraph/FLEETGRAPH.md`, including node types, edges, and branching conditions
- At least one human-in-the-loop gate implemented
- Running against real Ship data, with no mocked responses
- Deployed and publicly accessible
- Trigger model decision documented and defended in `docs/assignments/fleetgraph/FLEETGRAPH.md`

## Current MVP Proof Lane

- Public demo: `https://ship-demo-production.up.railway.app`
- Demo inspection guide: `docs/guides/fleetgraph-demo-inspection.md`
- Final evidence bundle: `docs/evidence/fleetgraph-mvp-evidence.json` and `docs/evidence/fleetgraph-mvp-evidence.md`
- Submission workbook: `docs/assignments/fleetgraph/FLEETGRAPH.md`
- Post-MVP feedback pack: `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-PHASE/`
- Post-feedback polish pack audit: `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/user-audit-checklist.md`
- Round-two feedback pack: `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/`
- Round-two audit checklist: `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/user-audit-checklist.md`

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
3. Read `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/` for the substrate sequencing.
4. Read `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/` for the PRD-aligned MVP execution order.
5. Use `docs/guides/fleetgraph-deployment-readiness.md` and `docs/guides/fleetgraph-demo-inspection.md` once you reach deploy-relevant MVP stories.
6. Draft the Agent Responsibility, Use Cases, and Trigger Model sections in `FLEETGRAPH.md`.
7. Decide the proactive trigger model and defend it.
8. After MVP feedback arrives, use `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-PHASE/` to restore discoverability, scrolling, and trust.
9. Use `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/` for the remaining human-language, debug-surface, and light visual polish sequence.
10. Use `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/` for the remaining scroll, safe-confirmation, and readability follow-on fixes from the next live inspection.
11. Run `docs/specs/fleetgraph/FLEETGRAPH-FEEDBACK-ROUND2-PHASE/user-audit-checklist.md` for the next full FleetGraph UI inspection path once that pack is complete.
12. Only then start any new extension planning beyond the current FleetGraph proof lane.

## Post-MVP Backlog

| ID | Title | Priority | Doc |
|----|-------|----------|-----|
| T305 | Cross-system finding priority | Post-MVP | `.ai/memory/codex/fleetgraph-t305-cross-system-finding-priority.md` |

**T305 Summary:** Proactive FAB and on-demand modal show different suggestions without prioritization. Fix by adding cross-system awareness so findings are unified and ranked by severity.
