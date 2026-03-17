# Constitution Check

## Story
- Story ID: T104B
- Story Title: Railway worker deployment lane

## Why this story exists
- The public demo is now stable and inspectable, but it still does not prove deployed autonomous proactive execution.
- Tuesday MVP requires a real end-to-end proactive path, not only seeded UI state.
- The repo already has a worker substrate, so the remaining gap is deployed topology and proof.

## Scope guardrails
- Keep Ship runtime reads and writes on the REST boundary only.
- Preserve the current seeded HITL proof lane instead of replacing it.
- Do not broaden the proactive use-case set; this story is about deploying the existing week-start drift slice.
- Keep the deploy path repo-owned rather than relying on hidden dashboard-only steps when avoidable.

## Required outputs
- A deployed Railway worker lane for FleetGraph.
- A named worker-generated demo inspection target.
- Updated deploy smoke and inspection docs that verify both the seeded HITL lane and the worker-generated lane.
