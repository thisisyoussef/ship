# Constitution Check

## Story Context
- Story ID: T103
- Story Title: Proactive week-start drift slice
- Owner: Codex
- Date: 2026-03-17

## Architecture Constraints
- [x] Clean architecture boundaries preserved by extending FleetGraph runtime, worker, and Ship-facing routes instead of bypassing them.
- [x] New modules will stay inside the existing FleetGraph service boundaries.
- [x] No net-new boundary violations introduced; Ship data remains REST-sourced for product logic.

## Technology Constraints
- [x] Uses existing approved stack and FleetGraph substrate.
- [x] No new dependency required for the story plan.
- [x] Provider integrations stay behind the existing `LLMAdapter` contract.

## Quality Constraints
- [x] TDD-first execution planned through the isolated TDD pipeline.
- [x] Coverage target preserved for added behavior and regression cases.
- [x] File/function size limits remain active; extract helpers when the proactive path grows.
- [x] Type hints and existing TypeScript/runtime validation gates remain preserved.

## Security Constraints
- [x] No hardcoded secrets.
- [x] Input validation plan includes typed proactive finding contracts and route payload validation.
- [x] Error handling plan avoids leaking provider/config internals into surfaced findings.
- [x] External calls stay on existing timeout/retry boundaries through Ship REST, worker retry, and provider adapters.

## Performance Constraints
- [x] I/O paths remain async.
- [x] Existing PostgreSQL pooling and worker queue reuse remain in place.
- [x] Expected latency/cost impact is documented: deterministic candidate scoring first, LLM only for candidate-producing runs, under-5-minute proactive target preserved.

## UI-Specific Constraints (Only if UI scope exists)
- [x] Behavior layer stays separated from visual presentation of proactive findings.
- [x] Accessibility requirements will include keyboard-reachable dismiss/snooze controls and readable state labels.
- [x] Existing Ship tokens/layout conventions will be reused instead of hardcoded visual one-offs.
- [x] Visual regression states are defined for quiet, active finding, dismissed, and snoozed surfaces.

## Exceptions
- Exception: none
- Rationale:
- Approval:

## Result
- [x] Constitution check passed
- [ ] Blocking issues identified (list below)

Blocking issues:
- none at planning time
