# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE
- Story Title: Finish the remaining FleetGraph assignment use cases
- Author: Codex
- Date: 2026-03-22
- Related workbook: `docs/assignments/fleetgraph/FLEETGRAPH.md`

## Problem Statement
FleetGraph already clears the narrow Tuesday proof lane, but the workbook still lists four remaining use cases that are not all finished end to end on the current codebase: sprint-owner gaps, unassigned sprint issues, current-page approval preview, and context-aware page analysis. The repo is also unevenly complete across those paths. Current-page approval preview is already close, page analysis has real graph/UI seams but an incomplete follow-up turn path, and the two remaining proactive cases already exist in the runtime but are blocked by shared proactive persistence and UI plumbing that still assumes only `week_start_drift`. Without a dedicated completion pack, the assignment risks oscillating between nearly-finished surfaces without ever closing the full workbook credibly.

## Story Pack Objectives
- Objective 1: Finish the two remaining on-demand workbook cases on the surfaces that already exist in the repo.
- Objective 2: Converge current-page approval preview onto the same graph-mediated apply path as the broader FleetGraph approval model.
- Objective 3: Generalize FleetGraph from a single proactive finding type to a small shared proactive findings surface that can support the remaining proactive workbook cases.
- Objective 4: Ship `sprint_no_owner` and `unassigned_sprint_issues` end to end on the same visible FleetGraph surfaces as the current proof lane.
- Objective 5: Refresh the assignment docs, traces, and audit path so the workbook tells the truth about what is actually complete.
- How this pack contributes to the overall objective set: it closes the remaining workbook use cases with the lowest-rework sequence available in the current codebase instead of reopening broader product ideas.

## User Stories
- As a PM, I want FleetGraph to preview a consequential action from the page I am already on so I can confirm the next step without guessing what will happen.
- As an engineer or PM, I want FleetGraph to analyze the current Ship page and answer a follow-up question using the same thread context so I can get useful page-specific help.
- As a PM, I want FleetGraph to surface sprint-owner gaps proactively so missing accountability is obvious before the sprint drifts.
- As a PM, I want FleetGraph to surface unassigned sprint-issue clusters proactively so ownership gaps are visible before work stalls.
- As an assignment reviewer, I want the workbook, traces, and visible Ship surfaces to match the actual implemented use cases so the submission is auditable end to end.

## Acceptance Criteria
- [ ] AC-1: Current-page approval preview is complete on the supported FleetGraph entry surface, with a typed approval envelope, visible confirmation state, and a traceable approval-required path.
- [ ] AC-2: The final `Apply` step for current-page approval preview is routed through the FleetGraph graph runtime rather than bypassing it with a direct UI call.
- [ ] AC-3: Context-aware page analysis produces a meaningful current-page analysis and uses the user’s follow-up message on subsequent turns instead of replaying a generic first-turn analysis.
- [ ] AC-4: Shared proactive finding storage, route serialization, frontend types, and proactive UI are generalized beyond `week_start_drift` so additional finding types can surface without one-off hacks.
- [ ] AC-5: `sprint_no_owner` is shipped end to end as a proactive FleetGraph finding with evidence, summary, trace linkage, dismiss/snooze lifecycle, and visible Ship UI proof.
- [ ] AC-6: `unassigned_sprint_issues` is shipped end to end as a proactive FleetGraph finding with evidence, summary, trace linkage, dismiss/snooze lifecycle, and visible Ship UI proof.
- [ ] AC-7: `docs/assignments/fleetgraph/FLEETGRAPH.md`, `docs/assignments/fleetgraph/README.md`, and the pack-level audit path reflect the completed remaining use cases accurately.

## Workbook Mapping
- [ ] Use case 2 `Sprint-owner gap`: `T604`
- [ ] Use case 3 `Unassigned sprint issues`: `T605`
- [ ] Use case 4 `Approval preview from current page`: `T601`
- [ ] Approval-preview runtime convergence: `T601A`
- [ ] Use case 5 `Context-aware page analysis`: `T602`
- [ ] Final workbook / trace / audit sync: `T606`

## Edge Cases
- Empty/null inputs: current-page entry may lack enough route context for approval preview or page analysis and should fail with a truthful empty/advisory state.
- Boundary values: sprint-owner and unassigned-issue detectors must tolerate planning versus active weeks, empty weeks, preserved demo lanes, and sparse mixed-shape Ship data.
- Invalid/malformed data: current proactive storage still uses a single-type DB check, so the shared plumbing story must widen the schema and code contracts together.
- External-service failures: on-demand analysis depends on LLM and Ship-context fetches; proactive traces depend on LangSmith sharing; the evidence story must record blocked states explicitly if either path cannot be refreshed.

## Non-Functional Requirements
- Security: keep Ship reads/writes REST-only and keep consequential actions behind explicit human confirmation.
- Performance: preserve the under-5-minute proactive detection target for the proactive cases and keep on-demand analysis responsive enough for interactive use.
- Observability: each remaining completed use case must have a traceable path, with public/shared traces captured where the assignment evidence expects them.
- Reliability: proactive findings must preserve dedupe, dismiss, snooze, and stale-resolution behavior across multiple finding types; on-demand follow-up turns must preserve thread continuity.

## UI Requirements
- Required states: approval preview ready, approval-required, page analysis loading, page analysis response, follow-up response, multiple proactive finding types, dismiss/snooze success, and quiet state.
- Accessibility contract: entry actions, proactive controls, and follow-up inputs remain keyboard-reachable with readable status/error copy.
- Design contract: preserve Ship’s existing FleetGraph UI language; this pack is about completion and trust, not redesign.
- Visual proof contract: the pack should end with one audit path that can inspect all remaining workbook use cases from visible Ship surfaces.

## Out of Scope
- Adding new workbook cases beyond the current five listed in `FLEETGRAPH.md`
- Generalizing FleetGraph to autonomous mutations beyond the already-established approval boundary
- Replacing the shared-graph architecture with separate proactive and on-demand runtimes
- Cross-system finding prioritization beyond what is strictly needed to finish the current workbook
- Reviving deferred wishlist items such as standup-specific proactive monitoring, deadline risk, or workload imbalance

## Done Definition
- The completion pack exists under `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/` with explicit objectives, sequencing, validation, and audit steps.
- The pack orders the remaining workbook use cases by true integration effort in the current repo, not by the original PRD wishlist.
- The pack records the one-time shared proactive plumbing story needed before the remaining proactive use cases can ship safely.
- FleetGraph assignment docs point future work at this completion pack rather than stale `.ai` references or abandoned backlog notes.
