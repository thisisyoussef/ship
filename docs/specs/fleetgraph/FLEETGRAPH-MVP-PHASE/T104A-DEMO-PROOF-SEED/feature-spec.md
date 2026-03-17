# Feature Spec

## Metadata
- Story ID: T104A
- Story Title: Demo proof seed and bootstrap repair
- Author: Codex
- Date: 2026-03-17
- Related pack: `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/`

## Problem Statement
The public FleetGraph demo cannot currently serve as a dependable UI audit surface. After `T104`, the deployed Render app exposed the visible panel but still failed on authenticated findings because FleetGraph-owned tables were missing there, and the seeded Ship dataset still did not guarantee a named week page with a visible proactive finding and HITL apply path. Without a dedicated proof-lane story, future user audits will keep depending on incidental data, manual digging, or broken deploy assumptions instead of a repeatable public demo path.

## User Stories
- As a reviewer, I want one named Ship page I can open on the public demo and immediately use to inspect FleetGraph’s proactive/HITL behavior.
- As a developer, I want the sanctioned Railway demo bootstrap to create FleetGraph-owned schema and demo proof state reliably enough that `/health` is not the only deploy signal.
- As a future story owner, I want later FleetGraph stories to build on the same inspectable demo lane instead of forcing new UI audits to guess where visible proof might appear.

## Acceptance Criteria
- [ ] AC-1: The sanctioned Railway demo boot path ensures FleetGraph-owned schema and demo seed state exist on every refresh.
- [ ] AC-2: Seeding creates at least one clearly named FleetGraph demo week/page that a reviewer can locate without guesswork.
- [ ] AC-3: The demo week/page exposes a visible proactive finding and the existing `Review and apply` HITL path on the public demo.
- [ ] AC-4: The repo-owned Railway deploy smoke checks authenticated FleetGraph behavior, not `/health` only.
- [ ] AC-5: Story docs and future handoffs can point to exact inspection targets by name.

## Edge Cases
- Public demo boot without FleetGraph tables
- Re-running seed on an existing demo database
- Review/apply being used previously and needing a reset for future audits
- Demo proof existing even while broader FleetGraph env such as entry or tracing remains blocked

## Done Definition
- Demo bootstrap/seed/deploy proof is implemented and validated locally.
- The public demo can be refreshed and checked against a named FleetGraph proof lane.
- The MVP pack and assignment guidance point future audits to the exact inspection targets.
