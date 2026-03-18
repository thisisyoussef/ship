# Task Breakdown

## Story
- Story ID: FLEETGRAPH-DYNAMIC-ACTION-MODULE-DESIGN-PACK
- Story Title: FleetGraph dynamic action module design pack

## Execution Notes
- This story is docs/spec first. It should not implement the runtime module itself.
- Keep the first action pack explicit and bounded.
- Keep schema-driven generic forms as a future extension path, not part of the first implementation contract.

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T001 | Update `docs/assignments/fleetgraph/FLEETGRAPH.md` so the workbook reflects the shared action registry, dialog-capable `approval_interrupt`, and expanded action use cases. | must-have | no | Workbook graph, HITL text, and use cases all align with the new shared action language |
| T002 | Update `docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md` with revised state schema, `reason_findings`, `policy_gate`, `approval_interrupt`, `execute_confirmed_action`, one sequence diagram, and the action/dialog matrix references. | blocked-by:T001 | no | Architecture doc is internally consistent and decision complete for the first action pack |
| T003 | Create the new `FLEETGRAPH-DYNAMIC-ACTION-MODULE-DESIGN-PACK` spec folder with constitution, feature spec, technical plan, task breakdown, and action/dialog matrix. | must-have | yes | The new pack is a complete source-of-truth set for the future implementation wave |
| T004 | Publish the near-term roadmap boundary so request-changes, issue state/reassignment, carryover/bulk operations, and escalation flows are named without overcommitting their final UI or payload shapes. | blocked-by:T002,T003 | yes | Docs cleanly separate first-pack implementation from near-term follow-on work |

## Documentation Acceptance Mapping

- T001 maps to:
  - [ ] workbook graph reflects registry-backed review/apply semantics
  - [ ] workbook use cases include assignment and comment-capable action flows
- T002 maps to:
  - [ ] action drafts replace confirm-only wording in the architecture doc
  - [ ] dialog specs/submissions and execution adapters are documented in the shared pipeline
- T003 maps to:
  - [ ] spec pack exists and is coherent
  - [ ] first action pack matrix is explicit
- T004 maps to:
  - [ ] roadmap is named but bounded
  - [ ] schema-driven generic forms stay future-facing

## Completion Criteria
- [ ] Workbook and architecture docs use the same action/dialog vocabulary
- [ ] The new design pack exists under `docs/specs/fleetgraph/`
- [ ] The first action pack is implementation-ready on paper
- [ ] Near-term roadmap items are documented without widening this story into runtime work
