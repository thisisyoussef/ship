# Constitution Check

## Story Context
- Story ID: FLEETGRAPH-DYNAMIC-ACTION-MODULE-DESIGN-PACK
- Story Title: FleetGraph dynamic action module design pack
- Owner: Codex
- Date: 2026-03-18

## Architecture Constraints
- [x] Clean architecture boundaries preserved: this story updates docs/specs first and keeps Ship product reads/writes on REST.
- [x] The design stays inside the existing FleetGraph runtime boundary instead of inventing a second action system.
- [x] The design keeps `approval_interrupt` as the human gate node and broadens its payload rather than renaming core graph concepts.

## Technology Constraints
- [x] Uses the existing approved stack and current FleetGraph architecture docs.
- [x] No new dependency is introduced in this story.
- [x] LangGraph, LangSmith, and same-origin FleetGraph review/apply routes remain the canonical substrate.

## Quality Constraints
- [x] The first action pack is decision complete and bounded.
- [x] The docs distinguish first-pack behavior from near-term roadmap behavior.
- [x] The action/dialog design avoids vague "generic form engine" wording and specifies typed dialog primitives first.

## Security Constraints
- [x] All consequential Ship mutations remain human-approved.
- [x] Dialog options are hydrated from Ship REST or deterministic FleetGraph services, not model-generated.
- [x] Validation remains server-side on FleetGraph review/apply paths.

## Performance Constraints
- [x] The design keeps deterministic option hydration and validation outside the LLM path.
- [x] The design preserves replay-safe `task()` boundaries and stale-state checks before Ship writes.
- [x] The docs call out composed execution for multi-request actions instead of assuming one raw Ship endpoint per action.

## UI-Specific Constraints
- [x] Progressive disclosure preserved: dialogs stay controlled and contextual instead of becoming a free-form action studio.
- [x] User-facing feedback must remain truthful and tied to confirmed mutation outcomes.
- [x] The first dialog set is limited to `confirm`, `single_select`, `multi_select`, `text_input`, and `textarea`.

## Exceptions
- Exception: none

## Result
- [x] Constitution check passed
- [ ] Blocking issues identified (list below)

Blocking issues:
- none
