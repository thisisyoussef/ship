# FleetGraph T104B - Railway worker lane

## Summary

- Added a shared runtime-role boot path so Railway can run the Ship API and FleetGraph worker from the same image.
- Deployed a dedicated Railway worker service for the sanctioned public demo.
- Preserved the seeded HITL proof lane and added a second named worker-generated proof lane.
- Fixed the proactive Ship REST client to accept the real `/api/weeks` payload shape used by Ship in production.

## Named Demo Targets

- Project: `FleetGraph Demo Project`
- Seeded HITL week: `FleetGraph Demo Week - Review and Apply`
- Worker-generated week: `FleetGraph Demo Week - Worker Generated`

## Key Decisions

- Keep Ship product reads and writes on Ship REST only; use DB access only for FleetGraph-owned state and demo fixture setup.
- Preserve the seeded review/apply lane as deterministic UI proof, but let the second named finding come from the live worker path.
- Make demo bootstrap clear stale FleetGraph worker ledger state and enqueue one fresh proactive job so the worker-generated lane stays visible after refreshes.
- Normalize the live `/api/weeks` payload instead of forcing production to match a narrow mocked schema.

## Live Outcome

- Public demo URL: `https://ship-demo-production.up.railway.app`
- Demo login: `dev@ship.local / admin123`
- Service-auth readiness is fully ready.
- Live findings now show both:
  - `Week start drift: FleetGraph Demo Week - Review and Apply`
  - `Week start drift: FleetGraph Demo Week - Worker Generated`

## Evidence

- Worker-generated finding title appears via the live authenticated findings feed.
- Worker-generated finding includes a public LangSmith trace URL.
- Demo inspection guide now lists both named weeks and the expected UI state for each.
