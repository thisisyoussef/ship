# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE
- Story Title: Strategic completion plan for the remaining FleetGraph workbook use cases
- Author: Codex
- Date: 2026-03-22

## Proposed Design
- Components/modules affected:
  - `docs/assignments/fleetgraph/README.md`
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/services/fleetgraph/entry/`
  - `api/src/services/fleetgraph/graph/`
  - `api/src/services/fleetgraph/findings/`
  - `api/src/services/fleetgraph/actions/`
  - `api/src/db/migrations/039_fleetgraph_proactive_findings.sql` plus the next widening migration
  - `web/src/lib/fleetgraph-entry.ts`
  - `web/src/lib/fleetgraph-findings.ts`
  - `web/src/lib/fleetgraph-findings-presenter.ts`
  - `web/src/components/FleetGraphEntryCard.tsx`
  - `web/src/components/FleetGraphFindingsPanel.tsx`
  - `web/src/components/FleetGraphFab.tsx`
- Public interfaces/contracts:
  - `FleetGraphEntryResponse`: current-page approval preview and current-page summary contract
  - `FleetGraphAnalysisResponse`: current-page analysis and follow-up turn response contract
  - `FleetGraphFindingRecord` / `FleetGraphFindingType`: shared proactive surfaced-finding contract across multiple finding types
  - `FleetGraphFindingActionReview`: existing human-review contract retained for consequential actions
- Data flow summary:
  - Close the already-near-complete on-demand cases first because they do not depend on widening proactive finding storage.
  - Widen proactive finding persistence, route serialization, and frontend rendering once so the remaining proactive cases can share the same surface.
  - Ship `sprint_no_owner` next because its runtime path is already narrower and better defined than the unassigned-issues path.
  - Ship `unassigned_sprint_issues` after the shared proactive surface is proven with a second finding type.
  - End by refreshing workbook references, traces, and audit instructions from real completed behavior.

## Pack Cohesion and Sequencing
- Higher-level pack objectives:
  - finish all workbook use cases that remain beyond the existing week-start drift proof lane
  - minimize rework by sequencing independent on-demand completion before shared proactive widening
  - converge the assignment docs and visible proof surfaces around what the repo actually ships
- Story ordering rationale:
  - `T601` first because approval preview is already real in `web/src/lib/fleetgraph-entry.ts`, `api/src/services/fleetgraph/entry/`, and `FleetGraphEntryCard`; this is the cheapest remaining use case to harden and evidence.
  - `T602` second because the page-analysis graph, reason node, and FAB already exist; the main missing gap is carrying user follow-up messages through `/thread/:threadId/turn` and tightening the canonical surface.
  - `T603` third because the remaining proactive use cases cannot ship cleanly until finding storage, serialization, and UI stop assuming `week_start_drift` only.
  - `T604` fourth because `sprint_no_owner` already has a dedicated runtime runner and a narrower candidate rule than unassigned-issue clustering.
  - `T605` fifth because `unassigned_sprint_issues` depends on the widened proactive surface and has more thresholding/data-shape risk than sprint-owner gaps.
  - `T606` last because traces, workbook wording, and the pack-level audit checklist should be updated only after the actual remaining use cases are complete.
- Whole-pack success signal:
  - A reviewer can open the workbook, the FleetGraph entry surface, the FleetGraph analysis surface, and the proactive findings surface and see truthful, implemented support for all five workbook use cases.

## Architecture Decisions
- Decision: Finish the current-page approval preview before changing proactive persistence.
  - Alternatives considered: widen proactive finding storage first because it blocks two workbook cases.
  - Rationale: approval preview is already close and independent, so shipping it first reduces assignment risk with minimal cross-cutting change.

- Decision: Treat page-analysis follow-up continuity as part of completing the workbook use case.
  - Alternatives considered: call single-turn page analysis “done” and defer follow-ups.
  - Rationale: the current route already exposes a thread-turn API, and the remaining TODO is specifically that the user’s follow-up message is dropped. Completing that seam turns a partially wired demo into a believable use case.

- Decision: Add one explicit enabling story for shared multi-finding plumbing before the remaining proactive use cases.
  - Alternatives considered: ship `sprint_no_owner` and `unassigned_sprint_issues` with bespoke code paths or docs-only caveats.
  - Rationale: the runtime already knows about both scenarios, so the cleanest path is to pay the one-time storage/UI generalization cost once and then land both use cases on the same surface.

- Decision: Keep the new proactive cases advisory-only in this pack unless they can safely reuse an existing action contract.
  - Alternatives considered: add new `assign_owner` and `assign_issues` mutation execution flows immediately.
  - Rationale: the assignment requires the use cases to be finished, not every recommended action to be executable. Advisory-only findings keep scope truthful and lower-risk while still closing the workbook cases end to end.

## Data Model and API Contract Notes
- Current blocking mismatch:
  - `api/src/services/fleetgraph/findings/types.ts` already allows `sprint_no_owner` and `unassigned_sprint_issues`.
  - `api/src/db/schema.sql` and `api/src/db/migrations/039_fleetgraph_proactive_findings.sql` still restrict stored findings to `week_start_drift`.
  - `web/src/lib/fleetgraph-findings.ts`, `web/src/lib/fleetgraph-findings-presenter.ts`, and `web/src/components/FleetGraphFindingsPanel.tsx` still present the surface as week-start-only.
- Shared proactive widening should include:
  - DB migration for the expanded finding-type check
  - backend store/route tests for multiple finding types
  - frontend types and presenter logic that branch by finding type only where copy or metadata needs it
  - panel-level copy that no longer labels the whole surface as “Week-start drift findings”
- On-demand completion should include:
  - passing `userMessage` into the runtime on `/api/fleetgraph/thread/:threadId/turn`
  - keeping thread reuse on the same page/document context
  - deciding whether `FleetGraphEntryCard` or `FleetGraphFab` is the canonical surface for each remaining on-demand use case, then documenting that choice

## Dependency Plan
- Existing dependencies used:
  - `@langchain/langgraph`
  - `langsmith`
  - `zod`
  - existing Ship REST routes and web FleetGraph surfaces
- New dependencies proposed:
  - none
- Dependency-specific risks:
  - widening proactive storage requires a real DB migration because the current check constraint is part of the persisted schema
  - on-demand analysis quality depends on the current reason/fetch nodes, so the pack should avoid inventing a second chat architecture

## Test Strategy
- Unit tests:
  - entry payload / approval preview contract tests
  - on-demand turn routing tests that assert `userMessage` reaches the graph
  - proactive finding-store tests for multiple `findingType` values
  - presenter tests for multi-type finding rendering
- Integration tests:
  - current-page approval preview path from entry request through approval-required response
  - current-page analysis path through initial analyze plus follow-up turn
  - proactive runtime path for `sprint_no_owner`
  - proactive runtime path for `unassigned_sprint_issues`
- UI tests:
  - `FleetGraphEntryCard` approval preview visibility and controls
  - `FleetGraphFab` or chosen canonical analysis surface for initial analysis and follow-up response
  - `FleetGraphFindingsPanel` rendering of mixed proactive finding types without week-start-only assumptions
- Evidence tests:
  - workbook and README references point to the completion pack and current proof path
  - pack-level audit checklist reflects the actual visible surfaces

## Rollout and Risk Mitigation
- Rollback strategy:
  - keep the shared proactive widening separate from the individual proactive use-case stories so a single issue does not block on-demand completion
- Feature-scope guardrails:
  - do not add new autonomous writes
  - do not reopen deferred use cases from older wishlist docs
  - do not merge FAB/entry surfaces unless the chosen story explicitly covers that convergence
- Observability checks:
  - capture at least one refreshed on-demand trace and one refreshed proactive trace for the newly completed use cases
  - keep existing Tuesday proof-lane traces intact while adding the new completion evidence

## Validation Commands
```bash
pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts
pnpm --filter @ship/api type-check
pnpm --filter @ship/web type-check
pnpm --filter @ship/api build
pnpm --filter @ship/web build
git diff --check
```
