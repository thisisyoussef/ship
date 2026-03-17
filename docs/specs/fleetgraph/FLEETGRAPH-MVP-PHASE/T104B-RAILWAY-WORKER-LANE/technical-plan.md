# Technical Plan

## Metadata
- Story ID: T104B
- Story Title: Railway worker deployment lane
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `Dockerfile`
  - `railway.json`
  - `scripts/deploy-railway-demo.sh`
  - `api/src/db/seed.ts`
  - `api/src/services/fleetgraph/demo/`
  - `api/src/services/fleetgraph/worker/`
  - `api/src/services/fleetgraph/deployment/`
  - `docs/guides/fleetgraph-demo-inspection.md`
  - `docs/guides/fleetgraph-deployment-readiness.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`
- Public interfaces/contracts:
  - one shared Railway image with explicit runtime roles for API vs worker
  - one seeded HITL proof lane
  - one named worker-generated proof lane
  - one repo-owned deploy smoke path that verifies both
- Data flow summary:
  - keep the existing Railway API service serving Ship web/API plus the seeded HITL lane
  - add a Railway worker service that boots the FleetGraph worker CLI from the same build artifact
  - seed a second named week that satisfies week-start drift conditions without inserting the finding directly
  - register immediate sweep work so the deployed worker can surface that finding through Ship REST and FleetGraph-owned persistence
  - strengthen deploy smoke to verify the seeded lane and then wait for the worker-generated lane

## Architecture Decisions
- Decision: use one shared image with a runtime-role switch instead of maintaining separate Dockerfiles or repos for API and worker.
- Alternatives considered: keep API and worker in the same long-running process; maintain a second Dockerfile; rely on dashboard-only start-command overrides.
- Rationale: one image keeps the deploy path repo-owned and consistent, while a role switch still gives Railway distinct long-running services.

- Decision: preserve the current seeded HITL proof lane and add a second worker-generated lane instead of replacing the seeded lane.
- Alternatives considered: replace the seeded finding with a worker-only lane; add no new named target and rely on incidental worker results.
- Rationale: the seeded lane remains the deterministic UI inspection anchor, while the second lane proves autonomous proactive execution.

## Test Strategy
- Unit tests:
  - runtime-role resolution for API vs worker
  - demo fixture behavior for seeded vs worker-generated lanes
- Integration tests:
  - worker-target seed resets prior worker-generated finding state and schedules immediate sweep work
  - deploy smoke helper verifies both proof lanes
- Manual/demo proof:
  - login to the Railway demo as `dev@ship.local`
  - open the seeded HITL week and confirm `Review and apply` remains visible
  - open the worker-target week and confirm the finding appears through the deployed worker path
