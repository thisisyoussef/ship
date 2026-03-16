# Technical Plan

## Metadata
- Story ID: AI-HARNESS-LIFECYCLE-SIMPLIFICATION
- Story Title: Simplify harness lifecycle, finalization, and recovery paths
- Author: Codex
- Date: 2026-03-16

## Proposed Design
- Components/modules affected:
  - `AGENTS.md`, `.ai/codex.md`, compatibility mirrors
  - `.ai/workflows/story-lookup.md`, `.ai/workflows/feature-development.md`, `.ai/workflows/parallel-flight.md`, `.ai/workflows/user-correction-triage.md`, `.ai/workflows/story-handoff.md`, `.ai/workflows/git-finalization.md`
  - `scripts/flight_slot.sh`, `scripts/git_finalize_guard.sh`, `scripts/check_ai_wiring.sh`
  - `.husky/pre-commit`
  - `.ai/state/` metadata files for lock and triage counts
- Public interfaces/contracts:
  - `scripts/flight_slot.sh claim|release|status|init` stays as the visible CLI
  - handoff becomes the single user-facing completion gate and must emit a finalization plan
  - finalization must route into a new named recovery workflow on failure
- Data flow summary:
  - preflight -> lookup -> story-size classification -> trivial lane or standard lane
  - correction triage increments persisted story-local count and may escalate
  - handoff emits evidence + finalization plan -> user approval -> finalization executes or routes to recovery

## Pack Cohesion and Sequencing (for phase packs or multi-story planning)
- Higher-level pack objectives: reduce lifecycle friction while preserving explicit approval and deterministic guardrails.
- Story ordering rationale: route sizing first, then coordination simplification, then automatic checks, then bounded triage, then unified completion, then recovery path.
- Gaps/overlap check: each requested change maps to one primary workflow or script surface, but all are tied together through the completion lifecycle.
- Whole-pack success signal: the harness has one lighter lane, one simpler lock, one completion gate, and one explicit recovery path, all enforced in wiring checks.

## Architecture Decisions
- Decision: keep stable filenames and patch the existing surfaces instead of introducing a parallel set of “v2” workflows.
- Alternatives considered: create separate replacement workflows and migrate later; only document the changes without helper scripts/state.
- Rationale: the harness already relies on stable file references and check scripts, so in-place simplification is lower risk.

## Data Model / API Contracts
- Request shape: none
- Response shape: none
- Storage/index changes:
  - add a simple lock state file under `.ai/state/`
  - add a simple correction-triage counter file under `.ai/state/`

## Dependency Plan
- Existing dependencies used: git, husky, bash/python scripts already in repo
- New dependencies proposed (if any): none
- Risk and mitigation:
  - risk: trivial lane misclassifies real feature work; mitigate with strict criteria and explicit “if any condition fails, use standard lane”
  - risk: simplified lock loses too much context; mitigate by still recording owner/story/branch in the lock file
  - risk: combined completion gate becomes ambiguous; mitigate with a single required template that includes both evidence and finalization plan

## Test Strategy
- Unit tests: helper-script smoke checks for lock file, triage counter, and recovery routing
- Integration tests: `bash scripts/check_ai_wiring.sh`, pre-commit hook path, finalization guard path
- E2E or smoke tests: claim/release lock, third triage cycle escalation, AI-architecture staged hook execution
- Edge-case coverage mapping:
  - malformed lock/triage files
  - trivial classifier rejection for multi-file/API/AI changes
  - finalization recovery when merge/guard/push state fails

## Rollout and Risk Mitigation
- Rollback strategy: revert the harness docs/scripts/state helpers together; no product runtime rollback needed
- Feature flags/toggles: none
- Observability checks: handoff must report whether completion ended in `ready`, `approved+executed`, or `recovery`

## Validation Commands
```bash
bash scripts/check_ai_wiring.sh
python scripts/verify_agent_contract.py
git diff --check
```
