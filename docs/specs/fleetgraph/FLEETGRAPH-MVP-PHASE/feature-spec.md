# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-MVP-PHASE
- Story Title: Deliver the FleetGraph MVP bar from the PRD
- Author: Codex
- Date: 2026-03-16
- Related PRD/phase gate: FleetGraph PRD minimum MVP bar after the foundation phase

## Problem Statement
FleetGraph now has most of the platform substrate defined or in progress, but the repo still does not satisfy the Tuesday MVP pass bar as a reviewable, end-to-end product slice. The current workbook in `docs/assignments/fleetgraph/FLEETGRAPH.md` is still mostly blank, shared trace evidence is not yet captured, the public deployment path is not reliably green, and the codebase does not yet prove one proactive finding plus one implemented human gate on real Ship data. Without a dedicated MVP pack, FleetGraph risks spending time on adjacent features without closing the exact checklist that determines whether the Tuesday submission passes.

## Story Pack Objectives (for phase packs or multi-story planning)
- Objective 1: Satisfy every Tuesday MVP pass item exactly, with no required item left implied or deferred.
- Objective 2: Ship one narrow proactive FleetGraph slice on real Ship data, with at least one implemented human-in-the-loop gate.
- Objective 3: Produce the deploy, LangSmith, and `FLEETGRAPH.md` evidence needed to defend the MVP publicly and in the submission.
- Objective 4: Keep each runtime story visually monitorable in Ship so progress can be inspected on the public demo as the MVP is built.
- How this story or pack contributes to the overall objective set: this pack turns the FleetGraph substrate into a checklist-complete Tuesday submission path instead of a broader product roadmap.

## User Stories
- As a PM, I want FleetGraph to detect a high-value project-state problem proactively so I do not have to manually poll Ship for obvious drift.
- As a reviewer, I want at least one consequential action to stop for approval and execute only after confirmation so the MVP stays safe and defensible.
- As an assignment evaluator, I want the workbook, trace links, trigger model defense, and deployment evidence to match the implemented MVP so the submission can be audited end to end.

## Acceptance Criteria
- [ ] AC-1: The graph is running with at least one proactive detection wired end to end against real Ship data, with no mocked responses in the MVP path.
- [ ] AC-2: At least one human-in-the-loop gate is implemented on the MVP path, with confirmation required before the consequential action executes.
- [ ] AC-3: LangSmith tracing is enabled and at least two shared trace links showing different execution paths are captured and referenced in the submission artifacts.
- [ ] AC-4: `docs/assignments/fleetgraph/FLEETGRAPH.md` has Agent Responsibility completed and at least 5 use cases defined.
- [ ] AC-5: `docs/assignments/fleetgraph/FLEETGRAPH.md` includes a complete graph outline documenting node types, edges, and branching conditions.
- [ ] AC-6: `docs/assignments/fleetgraph/FLEETGRAPH.md` documents and defends the trigger model decision.
- [ ] AC-7: The MVP is deployed and publicly accessible, with explicit environment proof and exact blocked-state reporting if the deployment surface cannot be refreshed.
- [ ] AC-8: Each runtime story after the docs/deploy baseline establishes or extends a visible Ship UI surface early enough that reviewers can monitor behavior on the public demo as the MVP evolves.
- [ ] AC-9: The public demo includes a repeatable FleetGraph proof lane with named Ship inspection targets, a Railway-safe bootstrap path, and a seeded visible finding/action state that future stories can extend.

## Tuesday MVP Checklist Mapping
- [ ] Graph running with at least one proactive detection wired end-to-end: `T103`, `T104A`
- [ ] LangSmith tracing enabled with at least two shared trace links showing different execution paths: `T105`
- [ ] `FLEETGRAPH.md` submitted with Agent Responsibility and Use Cases completed, at least 5 use cases defined: `T101`, `T105`
- [ ] Graph outline complete in `FLEETGRAPH.md`: `T101`, `T105`
- [ ] At least one human-in-the-loop gate implemented: `T104`
- [ ] Running against real Ship data with no mocked responses: `T102`, `T103`, `T104`, `T104A`
- [ ] Deployed and publicly accessible: `T102`, `T104A`, `T105`
- [ ] Trigger model decision documented and defended in `FLEETGRAPH.md`: `T101`

## Edge Cases
- Empty/null inputs: proactive sweeps may find no qualifying candidates and should still leave a traceable quiet path.
- Boundary values: a workspace may have only partial weekly/project data, so the MVP use case must tolerate sparse context without hallucinating missing state.
- Invalid/malformed data: mixed Ship payloads and stale associations may leave the graph with incomplete project or assignee context.
- External-service failures: LangSmith, OpenAI, Railway, or AWS dependencies may be unavailable, so deploy and trace evidence stories need explicit blocked-state handling instead of vague failure notes.

## Non-Functional Requirements
- Security: all provider, LangSmith, service-user, and deploy credentials remain environment-backed only; public trace links stay explicit opt-in.
- Performance: the proactive MVP use case must preserve the under-5-minute latency target from trigger to surfaced result.
- Observability: MVP completion requires at least two shared traces with distinct branch paths plus documented trace-link workflow.
- Reliability: dedupe, cooldown, and retry behavior must remain explicit for the proactive slice; approval flows must avoid duplicate execution on retries.

## UI Requirements (if applicable)
- Required states: proactive finding visible in Ship, approval-required, action success, action failure, and empty/quiet state.
- Accessibility contract: keyboard-accessible entry and approval flows, semantic labels for evidence/action states, and readable traceable error messaging.
- Design token contract: preserve Ship's existing visual language; this pack prioritizes submission proof and clarity over broader surface expansion.
- Visual-regression snapshot states: proactive finding visible, approval-required visible, and post-approval result visible.

## Out of Scope
- Covering every candidate proactive use case from `PRESEARCH.md`
- Making on-demand contextual synthesis a Tuesday critical-path requirement
- Building a standalone FleetGraph chat product outside Ship
- Adding autonomous Ship writes without approval
- Broad cost optimization or scale tuning beyond what the MVP evidence requires

## Done Definition
- The MVP pack exists under `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/` with explicit objectives, task sequencing, and validation.
- The pack defines one proactive real-data MVP slice plus the exact Tuesday evidence and submission outputs needed to pass.
- The pack reserves explicit stories for docs/design-defense work, public deploy proof, and shared traces instead of leaving them as implied cleanup.
- SSOT, assignment guidance, and memory all point future work at the new MVP pack after the foundation phase.
