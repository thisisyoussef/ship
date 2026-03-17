# Constitution Check

## Story
- Story ID: T105
- Story Title: MVP evidence capture and submission closeout

## Why this story exists
- The deployed Railway MVP is now visually inspectable and worker-ready, but the Tuesday pass bar is still not fully documented in submission artifacts.
- `docs/assignments/fleetgraph/FLEETGRAPH.md` still contains `Pending T105` placeholders for trace and usage evidence.
- The evidence story also has one narrow runtime blocker: the live `Preview approval gate` path rejects real document-context payloads when `ticket_number` is `null`.

## Scope guardrails
- Keep Ship product reads and writes on the REST boundary only.
- Do not broaden FleetGraph feature scope beyond evidence capture and the minimum blocker fix required to capture the second trace.
- Keep the public demo as the primary proof surface and include named UI inspection steps.
- Treat trace sharing as explicit opt-in evidence only.

## Required outputs
- At least two shared LangSmith trace links showing different execution paths.
- Final `docs/assignments/fleetgraph/FLEETGRAPH.md` evidence sections completed.
- One submission-ready evidence artifact tying together deploy proof, trace proof, and named UI proof targets.
- A working approval-preview trace capture path against the live demo.
