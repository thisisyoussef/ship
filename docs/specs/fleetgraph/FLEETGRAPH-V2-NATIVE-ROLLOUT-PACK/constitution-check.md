## Story Context
- Story ID: FLEETGRAPH-V2-NATIVE-ROLLOUT-PACK
- Story Title: FleetGraph V2 native rollout pack
- Owner: Codex
- Date: 2026-03-19

## Architecture Constraints
- [x] Clean architecture boundaries preserved (Ship product reads/writes remain REST-only)
- [x] New modules respect SRP and dependency direction
- [x] No net-new product-data boundary violations introduced

## Technology Constraints
- [x] Uses existing approved stack unless exception documented
- [x] Reuses existing LangGraph, Zod, pg, and React Query surfaces
- [x] Reuses the existing FleetGraph findings and action-run tables instead of adding a second persistence surface

## Quality Constraints
- [x] TDD-first execution planned
- [x] Coverage target preserved (>90%)
- [x] File/function size limits respected (<250/<30) when practical
- [x] Type hints and linting gates preserved

## Security Constraints
- [x] No hardcoded secrets
- [x] Input validation plan included for invoke/review/resume/apply payloads
- [x] Error handling avoids leaking credentials, cookies, or internal-only debug state
- [x] Ship write execution remains server-backed

## Performance Constraints
- [x] I/O paths remain async
- [x] Existing connection reuse and request-context fetch patterns are preserved
- [x] V2 rollout keeps deterministic scoring ahead of LLM reasoning where possible

## UI-Specific Constraints
- [x] Behavior layer remains separate from visual rendering
- [x] Accessibility requirements defined for typed review dialogs
- [x] Existing FleetGraph surfaces are extended instead of replaced
- [x] Visual regression states are listed in the pack artifacts

## Exceptions
- Exception: none
- Rationale:
- Approval:

## Result
- [x] Constitution check passed
- [ ] Blocking issues identified (list below)

Blocking issues:
- None currently identified.
