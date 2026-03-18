# Constitution Check

## Story Context
- Story ID: FLEETGRAPH-ON-DEMAND-ACTION-FLOW-V1
- Story Title: FleetGraph on-demand action flow v1
- Owner: Codex
- Date: 2026-03-18

## Architecture Constraints
- [x] Clean architecture boundaries preserved: proactive findings and V2 runtime remain unchanged; the story stays inside the existing on-demand FleetGraph path.
- [x] New modules respect SRP and dependency direction: server routes validate/review/apply, runtime sanitizes action drafts, web hooks render dialogs and invoke FleetGraph.
- [x] No net-new boundary violations introduced: Ship product reads and writes stay REST-only.

## Technology Constraints
- [x] Uses existing approved stack unless exception documented.
- [x] New dependency justified and risk-assessed: no new dependencies required.
- [x] Provider integrations use existing adapters/contracts where possible: existing LLM adapter, request-context forwarding, and action-executor patterns are reused.

## Quality Constraints
- [x] TDD-first execution planned.
- [x] Coverage target preserved (>90%) through focused API/runtime/web tests.
- [x] File/function size limits respected (<250/<30) by extending current modules instead of introducing a large parallel action system.
- [x] Type hints and linting gates preserved.

## Security Constraints
- [x] No hardcoded secrets.
- [x] Input validation plan included via typed action draft validation plus workspace/thread checks on review/apply routes.
- [x] Error handling avoids secret/path leakage and keeps user-facing failures human-readable.
- [x] External calls include the existing same-origin request-context forwarding path.

## Performance Constraints
- [x] I/O paths are async where applicable.
- [x] Connection reuse/pooling considered through the existing API/runtime services.
- [x] Expected latency/cost impact documented: no new proactive calls; on-demand adds one review/apply round-trip only when the user acts.

## UI-Specific Constraints
- [x] Behavior layer separated from visual fiddling layer.
- [x] Accessibility requirements defined: controlled modal, explicit title/description, keyboard-close behavior, and truthful action feedback.
- [x] Existing design tokens/classes reused instead of introducing a new visual system.
- [x] Visual regression states listed in the feature spec.

## Exceptions
- Exception: none
- Rationale:
- Approval:

## Result
- [x] Constitution check passed
- [ ] Blocking issues identified (list below)

Blocking issues:
- none
