# Technical Plan

## Metadata
- Story ID: T104A
- Story Title: Demo proof seed and bootstrap repair
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `api/src/index.ts`
  - `api/src/db/seed.ts`
  - new FleetGraph demo/bootstrap helpers under `api/src/services/fleetgraph/` and/or `api/src/db/`
  - `scripts/deploy-railway-demo.sh`
  - `docs/guides/fleetgraph-deployment-readiness.md`
  - `docs/assignments/fleetgraph/README.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`
- Public interfaces/contracts:
  - one named FleetGraph demo inspection target
  - stronger Railway deploy smoke that verifies authenticated FleetGraph behavior
- Data flow summary:
  - deploy the sanctioned public demo through Railway instead of relying on Render free-plan behavior
  - ensure FleetGraph-owned schema/setup is applied for that host
  - ensure a repeatable demo week plus visible FleetGraph proof state exists
  - verify the proof lane after deploy through the demo account

## Architecture Decisions
- Decision: repair demo bootstrap in the app/deploy path and move the sanctioned public demo to Railway instead of continuing to depend on Render free-plan behavior.
- Alternatives considered: manual SQL fixes after each deploy; direct Render DB access from the local machine; one-off Render jobs on the free plan; keeping Render as the sanctioned public demo anyway.
- Rationale: Railway can run the containerized boot path we already control, including migrations and optional demo seeding, while Render's free-plan limits kept blocking reliable proof-lane refreshes.

- Decision: seed a named FleetGraph demo proof lane rather than relying on incidental workspace state.
- Alternatives considered: only seed Ship weeks and hope the worker produces a visible finding; point audits at arbitrary existing weeks.
- Rationale: future user audits need one stable, named target that remains inspectable as the MVP evolves.

## Test Strategy
- Unit tests:
  - demo-host bootstrap detection
  - deploy smoke helper expectations
- Integration tests:
  - idempotent FleetGraph demo fixture creation against a real PostgreSQL test database
  - visible finding state reset for repeated inspections
- Manual/demo proof:
  - login as `dev@ship.local`
  - open the named FleetGraph demo week
  - confirm the proactive panel shows the review/apply state
