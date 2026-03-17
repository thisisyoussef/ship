# Constitution Check

## Story Context
- Story ID: FLEETGRAPH-POLISH-PHASE
- Story Title: Define the remaining FleetGraph UI polish pack
- Owner: Codex
- Date: 2026-03-17

## Architecture Constraints
- [x] Clean architecture boundaries preserved; this story creates planning/docs artifacts only.
- [x] The planned stories stay inside the existing FleetGraph UI/runtime boundary instead of adding new graph capabilities.
- [x] Ship product reads and writes remain behind Ship REST; the pack does not propose direct Ship database access.

## Technology Constraints
- [x] Uses the existing Ship stack and current FleetGraph UI surfaces.
- [x] New dependency ideas remain proposal-level only in this planning pack.
- [x] Railway remains the sanctioned public demo proof surface for this pack.

## Quality Constraints
- [x] TDD-first execution remains required for downstream implementation stories.
- [x] Coverage and validation expectations stay explicit in the task breakdown.
- [x] File/function limits are preserved because this planning story only adds docs/memory artifacts.
- [x] The pack ends with a refreshed prod QA path instead of assuming polish is “obvious.”

## Security Constraints
- [x] No hardcoded secrets added.
- [x] No auth or visibility bypass is proposed.
- [x] Any new debug surface remains secondary and inspection-oriented, not a new privileged control path.

## Performance Constraints
- [x] The pack avoids new heavy queries or polling loops for UI polish.
- [x] The optional debug surface should reuse already-fetched data where possible.
- [x] The live demo remains refreshable for repeated user inspection.

## UI-Specific Constraints (Only if UI scope exists)
- [x] The pack keeps FleetGraph embedded in Ship context; no standalone FleetGraph UI is introduced.
- [x] Calm over clever, earned complexity, and honest interfaces remain the governing design principles.
- [x] The visual work is intentionally bounded to modest hierarchy and scanability improvements, not a redesign.

## Exceptions
- Exception: None.
- Rationale: N/A
- Approval: N/A

## Result
- [x] Constitution check passed
- [ ] Blocking issues identified (list below)

Blocking issues:
- None.
