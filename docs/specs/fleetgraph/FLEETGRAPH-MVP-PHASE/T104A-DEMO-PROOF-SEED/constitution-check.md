# Constitution Check

## Story
- Story ID: T104A
- Story Title: Demo proof seed and bootstrap repair

## Why this story exists
- The previous Render demo was not a trustworthy FleetGraph audit surface.
- The next sanctioned public demo must make authenticated FleetGraph findings and the named inspection target visible after every refresh.
- Even when the route is healthy, the default seed does not guarantee a visible proactive finding or a clear page for UI inspection.

## Scope guardrails
- Keep Ship product data read/write boundaries unchanged:
  - Ship runtime data source remains Ship REST only.
  - Any direct database writes in this story are limited to schema/bootstrap work and FleetGraph-owned demo/inspection state.
- Do not broaden the product into new use cases.
- Optimize for repeatable public-demo inspection, not new reasoning depth.

## Required outputs
- A Railway-safe FleetGraph bootstrap path that ensures FleetGraph-owned tables and demo fixture state exist on the demo host.
- Named demo inspection targets that a reviewer can open directly in Ship.
- A repeatable visible FleetGraph finding/HITL state on the public demo.
- Stronger deploy proof than `/health` alone.
