# FleetGraph Approach Reference

Use this file as the short path to the current FleetGraph approach.

Canonical source artifact in this repo:
- `output/pdf/fleetgraph_submission_phase_1_3.md`

Why this exists:
- the phase-1-3 submission brief contains the clearest compact statement of the current FleetGraph approach,
- it was previously easy to miss because it lived under `output/` instead of the docs surface,
- future agents should read this alongside the PDF, PRD reference, and `docs/assignments/fleetgraph/PRESEARCH.md` before planning implementation.

## What this approach document captures

- the proactive monitoring targets that are strongest in Ship today,
- the current thresholding philosophy for "worth surfacing",
- the hybrid trigger model,
- the graph node and branch shape,
- the state/checkpoint design,
- the human-in-the-loop boundaries,
- the deployment model for a separate worker plus same-origin Ship integration,
- the performance and token-budget assumptions behind the current plan.

## The core approach in one screen

1. Use Ship REST only, but normalize mixed relationship shapes before reasoning.
2. Keep the runtime provider-agnostic; default to OpenAI unless later implementation evidence justifies a different provider.
3. Use LangGraph for shared proactive and on-demand graph execution.
4. Enable LangSmith tracing from day one and make quiet versus problem-detected branches visibly different.
5. Run proactive mode through a hybrid of enqueue hooks plus scheduled sweeps, not browser-only events.
6. Keep contextual chat same-origin inside Ship's existing document routes.
7. Put all consequential Ship writes behind a human-in-the-loop approval gate.
8. Treat deployment, worker auth, and trace capture as first-wave platform work, not late polish.

## How to use this with the other FleetGraph docs

Recommended read order:
1. `docs/assignments/fleetgraph/FleetGraph_PRD.pdf`
2. `docs/assignments/fleetgraph/README.md`
3. `docs/assignments/fleetgraph/APPROACH_REFERENCE.md`
4. `.ai/docs/references/fleetgraph-prd.md`
5. `docs/assignments/fleetgraph/PRESEARCH.md`
6. `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/`

Use this reference when you need the concise "current direction" version.
Use `docs/assignments/fleetgraph/PRESEARCH.md` when you need the full evidence and reasoning behind that direction.
