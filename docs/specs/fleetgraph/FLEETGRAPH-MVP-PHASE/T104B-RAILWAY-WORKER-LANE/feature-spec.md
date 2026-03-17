# Feature Spec

## Metadata
- Story ID: T104B
- Story Title: Railway worker deployment lane
- Author: Codex
- Date: 2026-03-17
- Related pack: `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`

## Problem Statement
`T104A` made the public demo inspectable and stable, but it still does not prove the Tuesday MVP requirement that FleetGraph is running a proactive detection end to end in the deployed environment. The current Railway demo exposes a seeded finding and a real HITL apply path, while `/api/fleetgraph/ready` remains partial because no deployed worker lane is running there. Without a dedicated worker deployment story, the public demo can show FleetGraph UI without proving that the live worker is actually reading Ship through REST, detecting drift, and producing a finding on its own.

## User Stories
- As a reviewer, I want the public demo to show a proactive FleetGraph finding that was created by the live worker path, not only by seed/bootstrap state.
- As a developer, I want the Railway demo topology to include a dedicated worker service without forking the Ship runtime model or violating the REST-only data boundary.
- As a future story owner, I want the seeded HITL lane to remain stable while a second named worker-generated lane proves deployed proactive execution.

## Acceptance Criteria
- [ ] AC-1: The sanctioned Railway public demo includes a dedicated FleetGraph worker runtime lane that boots from the shared repo-owned build path.
- [ ] AC-2: The Railway API readiness route returns worker-ready status once the worker lane is deployed and configured.
- [ ] AC-3: The demo bootstrap seeds at least one named worker-target week that starts without a direct seeded finding and is instead expected to be surfaced by the live worker path.
- [ ] AC-4: The deployed demo exposes a worker-generated proactive finding for the named target on real Ship data through the existing FleetGraph UI.
- [ ] AC-5: The seeded `Review and apply` lane remains intact so UI audits can still inspect the HITL path deterministically.
- [ ] AC-6: The repo-owned Railway deploy smoke verifies both the stable seeded proof lane and the worker-generated proof lane.

## Edge Cases
- Worker service not yet created in Railway
- API service updated while worker service remains on an older image
- Worker boot succeeds but no sweep is scheduled, so no finding ever appears
- Worker-generated finding already exists from a prior deploy and needs a deterministic reset path
- Railway credentials or service config access missing from the current machine

## Done Definition
- The public Railway demo has a deployed worker lane.
- A named worker-generated FleetGraph finding is visible on the public demo.
- The seeded HITL lane still exists for deterministic UI inspection.
- Deploy smoke and inspection docs prove both lanes explicitly.
