# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-MVP-PHASE
- Story Title: Define the FleetGraph MVP execution pack
- Author: Codex
- Date: 2026-03-16

## Proposed Design
- Components/modules affected:
  - `docs/assignments/fleetgraph/README.md`
  - `docs/assignments/fleetgraph/PRESEARCH.md`
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `.ai/docs/references/fleetgraph-prd.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-FOUNDATION-PHASE/`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`
  - `api/src/services/fleetgraph/deployment/`
  - `api/src/services/fleetgraph/worker/`
  - `api/src/services/fleetgraph/entry/`
  - `api/src/services/fleetgraph/graph/`
  - `api/src/routes/fleetgraph.ts`
  - `api/src/openapi/schemas/fleetgraph.ts`
  - `web/src/components/FleetGraphEntryCard.tsx`
  - `web/src/pages/UnifiedDocumentPage.tsx`
  - any new proactive insight persistence or Ship-facing surface introduced by the MVP stories
- Public interfaces/contracts:
  - `FleetGraphReadinessStatus`: shared deploy and runtime readiness contract for API, worker, tracing, and service auth
  - `FleetGraphInsight`: durable surfaced proactive finding with dismiss/snooze/cooldown metadata and trace linkage
  - `FleetGraphEntryResponse`: contextual on-demand answer contract that shares runtime branch taxonomy with proactive mode
  - `FleetGraphApprovalEnvelope`: human-confirmed action contract with post-approval execution result and audit metadata
  - `FleetGraphEvidenceChecklist`: trace-link, deploy, and workbook-evidence contract for final assignment proof
- Data flow summary:
  - Complete the required `FLEETGRAPH.md` design-defense sections first so implementation is driven by a fixed Agent Responsibility, use-case set, graph outline, and trigger decision.
  - Build the MVP stories on top of the merged FleetGraph readiness baseline so API, worker, tracing, and service-auth contracts stay stable during feature execution.
  - Use the existing hybrid trigger model plus worker substrate to detect one narrow high-value proactive use case end to end on real Ship data.
  - Route at least one consequential action through a real approval-required execution path.
  - Close the pack by capturing shared traces, public deploy proof, and final submission evidence from implemented behavior rather than speculative prose.

## Pack Cohesion and Sequencing (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - Close every Tuesday MVP requirement exactly.
  - Prove one end-to-end proactive slice on real Ship surfaces.
  - Prove one real HITL action path plus deployment/trace/doc evidence.
- Story ordering rationale:
  - `T101` fills the required `FLEETGRAPH.md` sections up front so the Tuesday checklist items that define the product shape are locked before implementation starts.
  - `T102` fixes and validates the deployed/public real-data baseline so later stories do not build on a broken Render/AWS readiness path.
  - `T103` implements the proactive week-start drift slice because it is grounded in Ship data, matches the required proactive MVP bar, and creates a natural path to a human-confirmed action.
  - `T104` converts the MVP path into one real implemented HITL gate so Tuesday has more than a preview shell.
  - `T105` captures the shared traces, public deploy proof, and final `FLEETGRAPH.md` evidence sections once the real path exists.
- Gaps/overlap check:
  - No story is reserved for "miscellaneous docs cleanup"; required docs are split between upfront design-defense work and final evidence completion.
  - No on-demand expansion is on the Tuesday critical path unless a later implementation story proves it is necessary to satisfy one of the explicit pass items.
  - No second proactive use case is planned until the first slice is complete and evidenced.
  - The pack assumes the foundation substrate is the only graph/runtime path; stories should extend it, not fork it.
- Whole-pack success signal:
  - A reviewer can open the repo, the public deployment, the shared traces, and `FLEETGRAPH.md` and verify every Tuesday pass item without relying on implied future work.

## Architecture Decisions
- Decision: Anchor the MVP pack on week-start drift as the first proactive end-to-end use case.
- Alternatives considered: missed standup; deadline risk; load imbalance; trying multiple use cases at once.
- Rationale: week-start drift is grounded in current Ship state, has a clear PM-facing value, uses the hybrid trigger model honestly, and maps naturally to a human-confirmed `start week` style action.

- Decision: Treat trace/demo/docs evidence as first-class MVP stories instead of after-the-fact polish.
- Alternatives considered: defer workbook completion and trace capture until the implementation feels "mostly done"; spread evidence updates across every feature story.
- Rationale: the PRD's MVP bar explicitly includes shared traces and the completed workbook, so the pack should reserve explicit closing work for those outputs.

- Decision: Use one narrow proactive slice plus one narrow on-demand slice before expanding use-case breadth.
- Alternatives considered: keep on-demand contextual synthesis on the Tuesday critical path; implement several partial proactive rules in parallel.
- Rationale: the explicit Tuesday checklist does not require a separate on-demand feature slice, so the pack should optimize for proactive + HITL + deploy + trace + docs proof first and defer broader surface breadth.

## Data Model / API Contracts
- Request shape:
  - Proactive stories should continue entering through normalized trigger envelopes and durable worker jobs.
  - On-demand stories should continue entering through normalized Ship page context from `/api/fleetgraph/entry`.
  - Approval execution should accept only typed approved action payloads derived from the approval envelope.
- Response shape:
  - Proactive stories should emit a typed surfaced finding contract with actionable summary, evidence, cooldown state, and trace linkage.
  - On-demand stories should emit contextual status plus next-action synthesis through the existing entry contract.
  - Approval stories should emit a typed success/failure result with audit metadata after confirmation.
- Storage/index changes:
  - Reuse the existing worker/dedupe/checkpoint substrate.
  - Add only the minimum durable storage needed for surfaced proactive findings, dismissals/snoozes, and trace linkage if that surface does not already exist.

## Dependency Plan
- Existing dependencies used:
  - `@langchain/langgraph`
  - `langsmith`
  - `zod`
  - existing Ship API/web/runtime packages
- New dependencies proposed (if any):
  - none by default; only add new packages if a concrete MVP story proves they are necessary
- Risk and mitigation:
- Risk: the public deploy path remains blocked even after T008 because Render and AWS credential assumptions still diverge.
  - Mitigation: make `T102` treat explicit runtime environment variables as the primary config source on non-AWS hosts, keep SSM as an AWS fallback, and record any remaining missing Render prerequisite exactly before the proactive story is considered complete.
  - Risk: proactive delivery remains invisible even if detection works.
  - Mitigation: reserve explicit surfaced-insight output in the proactive MVP story rather than stopping at queue or trace success.
  - Risk: `FLEETGRAPH.md` remains a placeholder until the end.
  - Mitigation: complete the required planning sections in `T101`, then reserve `T105` for final evidence sections and trace links.

## Test Strategy
- Unit tests:
  - `FLEETGRAPH.md` checklist completeness assertions for required sections
  - week-start candidate scoring and cooldown behavior
  - approval payload validation and result handling
  - readiness and evidence checklist helpers
- Integration tests:
  - trigger enqueue -> proactive reasoning -> surfaced insight
  - approval confirm -> Ship write -> audit/result record
- E2E or smoke tests:
  - sanctioned demo readiness route plus FleetGraph deploy smoke
  - visual smoke for proactive finding and approval-required states
- Edge-case coverage mapping:
  - quiet proactive run with no candidate
  - duplicate candidate within cooldown
  - approval denial or timeout
  - blocked deploy or blocked trace sharing

## UI Implementation Plan (if applicable)
- Behavior logic modules:
  - proactive surfaced-finding rendering and lifecycle controls
  - approval confirm/result surface for one real action
- Component structure:
  - add the minimum Ship-facing proactive finding surface required for the MVP use case
  - keep approval UI close to the existing entry/result surface unless a stronger shared component naturally emerges
- Accessibility implementation plan:
  - keyboard-reachable proactive finding controls
  - focus-safe approval confirmation and result states
  - readable evidence summaries tied to actionable labels
- Visual regression capture plan:
  - capture the proactive finding visible state
  - capture the approval-required and approval-success states

## Rollout and Risk Mitigation
- Rollback strategy:
  - keep MVP stories behind reversible route/component/service diffs so proactive detection, approval execution, or surfaced finding UI can be reverted independently if one path destabilizes Ship
- Feature flags/toggles:
  - preserve separate toggles or controlled rollout for proactive worker execution, public trace sharing, and any live write-capable action
- Observability checks:
  - capture at least two traces with different execution paths, including the proactive path and one approval-related path
  - record trace URLs in assignment docs only after confirming sharing intent and safety
  - require deploy smoke to reference both readiness proof and trace evidence

## Validation Commands
```bash
pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts
pnpm --filter @ship/api type-check
pnpm --filter @ship/web type-check
pnpm --filter @ship/api build
pnpm --filter @ship/web build
bash scripts/fleetgraph_deploy_smoke.sh
```
