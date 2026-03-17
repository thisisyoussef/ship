# Technical Plan

## Metadata
- Story ID: UI-HUMAN-CENTERED-GUARDRAILS
- Story Title: Add human-centered UI workflow guardrails and pack-level QA artifacts
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `AGENTS.md`
  - `.ai/codex.md`
  - `.ai/agents/claude.md`
  - `.ai/agents/cursor-agent.md`
  - `.ai/docs/WORKSPACE_INDEX.md`
  - `.clauderc`
  - `.cursorrules`
  - `.ai/workflows/feature-development.md`
  - `.ai/workflows/story-handoff.md`
  - `.ai/workflows/spec-driven-delivery.md`
  - `.ai/workflows/ui-qa-critic.md`
  - `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`
  - `scripts/check_ai_wiring.sh`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/user-audit-checklist.md`
- Public interfaces/contracts:
  - `UIQACriticBrief`: evidence-based post-UI review with findings and suggested follow-ons
  - `PackUserAuditChecklist`: full-pack UI QA checklist artifact for completed visible packs
- Data flow summary:
  - visible UI story finishes validation
  - post-UI critic workflow runs against the best visible surface
  - critic emits findings and optional follow-on stories
  - if the story closes a visible pack, Codex updates the pack-level audit checklist artifact
  - completion gate references both the story-level audit and the pack-level checklist when relevant

## Pack Cohesion and Sequencing
- Higher-level pack objectives:
  - keep story-level UI audits intact
  - add one post-UI critic path
  - add one pack-level audit artifact rule
  - make human-centered UI checks explicit instead of implied
- Story ordering rationale:
  - add the new workflow and prompt-brief guardrails first
  - wire them into startup/feature/handoff/guard checks second
  - publish the FleetGraph MVP checklist as the first concrete artifact third
- Gaps/overlap check:
  - the critic should not duplicate the user audit checklist
  - the pack-level audit doc should complement, not replace, per-story completion gates
  - the new guardrails should stay bounded to visible UI concerns, not grow into a full design-review phase
- Whole-pack success signal:
  - a user can QA the whole FleetGraph MVP from one checklist doc, and future visible stories now have an explicit critic pass that checks for the same class of human-centered UI issues we just saw in prod

## Architecture Decisions
- Decision: keep the critic flow lightweight and post-story, not a new heavyweight gate before merge.
- Alternatives considered: a mandatory separate QA phase for every story; manual-only post-pack auditing; automatic story-pack generation from critic findings.
- Rationale: the user asked for a minimal workflow addition that preserves momentum while still generating actionable next stories.

- Decision: make human-centered copy, truthful feedback, and debug-detail containment explicit workflow checks instead of hoping design philosophy alone will cover them.
- Alternatives considered: rely only on the design philosophy doc; handle each issue ad hoc in future handoffs.
- Rationale: recent FleetGraph QA exposed these as repeated failure modes, so they need a named workflow contract.

## Data Model / API Contracts
- Request shape:
  - none beyond current workflow inputs
- Response shape:
  - critic brief: strengths, findings, suggested follow-ons, evidence refs
  - pack audit checklist: route, click path, expected state, failure hint
- Storage/index changes:
  - none

## Dependency Plan
- Existing dependencies used:
  - current `.ai` workflow/docs stack
  - existing browser/screenshot capability references
- New dependencies proposed:
  - none
- Risk and mitigation:
  - Risk: the critic becomes another bloated mandatory ritual.
    - Mitigation: run it only for visible UI stories and keep it lightweight.
  - Risk: prompt-brief additions become too abstract to help implementation.
    - Mitigation: tie them directly to primary-language, feedback-trust, and diagnostic-disclosure decisions.
  - Risk: the checklist artifact drifts from the live demo.
    - Mitigation: keep the first checklist grounded in named FleetGraph demo routes and interactions.

## Test Strategy
- Unit tests:
  - wiring-audit checks for the new workflow references
- Integration tests:
  - N/A for runtime code
- E2E or smoke tests:
  - `bash scripts/check_ai_wiring.sh`
  - `python3 scripts/verify_agent_contract.py`
- Edge-case coverage mapping:
  - visible story that does not close a pack
  - pack completion with deployed UI proof
  - blocked deploy state with fallback local proof

## UI Implementation Plan
- Behavior logic modules:
  - workflow text only
- Component structure:
  - N/A
- Accessibility implementation plan:
  - checklist uses exact visible text and routes
  - human-centered copy guidance emphasizes recovery and user language
- Visual regression capture plan:
  - require screenshot evidence references when available

## Rollout and Risk Mitigation
- Rollback strategy:
  - revert workflow/doc additions independently
- Feature flags/toggles:
  - none
- Observability checks:
  - `bash scripts/check_ai_wiring.sh`
  - `python3 scripts/verify_agent_contract.py`

## Validation Commands
```bash
bash scripts/check_ai_wiring.sh
python3 scripts/verify_agent_contract.py
git diff --check
```
