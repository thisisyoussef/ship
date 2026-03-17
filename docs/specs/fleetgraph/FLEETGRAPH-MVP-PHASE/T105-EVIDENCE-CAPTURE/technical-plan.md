# Technical Plan

## Metadata
- Story ID: T105
- Story Title: MVP evidence capture and submission closeout
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `api/src/services/fleetgraph/normalize/types.ts`
  - `api/src/routes/fleetgraph.test.ts`
  - `docs/assignments/fleetgraph/FLEETGRAPH.md`
  - `docs/assignments/fleetgraph/README.md`
  - `docs/evidence/`
  - `docs/guides/fleetgraph-demo-inspection.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`
  - `scripts/`
  - `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
  - `.ai/memory/`
- Public interfaces/contracts:
  - document-context payloads with nullable `ticket_number` must be accepted by FleetGraph entry normalization
  - one reproducible FleetGraph MVP evidence artifact with trace URLs, deploy proof, and named UI targets
  - one repeatable helper path for capturing the approval-preview trace from the live demo
- Data flow summary:
  - keep the existing worker-generated proactive finding as the first shared trace source
  - unblock the approval-preview path by accepting nullable `ticket_number` from the real document-context route
  - invoke the approval-preview path against the live demo and share the resulting `fleetgraph.runtime` trace
  - update the submission workbook and evidence artifact with the collected trace and deploy proof

## Architecture Decisions
- Decision: fix the entry blocker at the schema boundary instead of inventing an evidence-only request sanitizer.
- Alternatives considered: patch only a one-off capture script; sanitize the payload in the frontend helper only.
- Rationale: the live Ship context route already returns `ticket_number: null`, so FleetGraph should accept the real payload shape instead of requiring every caller to strip it manually.

- Decision: capture the second trace from the approval-preview runtime path.
- Alternatives considered: force a quiet worker run; use another proactive advisory trace from the same branch.
- Rationale: the approval-preview path gives a clearly distinct execution path and is already part of the visible product surface users can inspect on prod.

## Test Strategy
- Unit/integration tests:
  - add a failing route test that proves `/api/fleetgraph/entry` accepts context payloads with `ticket_number: null`
  - validate any helper script with syntax or focused command checks
- Live proof:
  - verify the worker-generated proactive trace URL from the current Railway findings API
  - verify the approval-preview path on the live Railway demo
  - capture screenshot evidence from the named demo weeks
- Documentation checks:
  - ensure `FLEETGRAPH.md` no longer contains `Pending T105`
  - ensure the evidence artifact includes trace URLs, public demo URL, and UI inspection targets
