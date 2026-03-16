# Technical Plan

## Metadata
- Story ID: AI-HARNESS-TDD-PIPELINE-HARDENING
- Story Title: Multi-agent TDD pipeline with property and mutation gates
- Author: Codex
- Date: 2026-03-16

## Proposed Design
- Components/modules affected:
  - `.ai/agents/tdd-*.md` specialist docs
  - `.ai/skills/tdd-workflow.md`
  - `.ai/workflows/feature-development.md`
  - `.ai/workflows/spec-driven-delivery.md`
  - startup/orchestrator docs (`AGENTS.md`, `.ai/codex.md`, mirrors, workspace index)
  - `scripts/tdd_handoff.sh`
  - `scripts/check_ai_wiring.sh`
  - root package config and Stryker config
- Public interfaces/contracts:
  - `.ai/state/tdd-handoff/<story-id>/...` directory contract
  - `scripts/tdd_handoff.sh <command> --story <id>` helper surface
  - mutation script/config for changed-file-only runs
- Data flow summary:
  - Spec artifacts identify story scope
  - Agent 1 writes tests and metadata into handoff storage
  - Agent 2 reads tests only, writes impl results/escalations
  - Mutation step runs after green and feeds survivors back into test authoring
  - Agent 3 refactors, records quality output, and lists missing tests

## Pack Cohesion and Sequencing (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - isolate test authorship,
  - add property testing,
  - add mutation-testing quality gates
- Story ordering rationale:
  - Phase 1 must land first because property/mutation stages depend on a real multi-agent handoff contract.
  - Phase 2 extends Agent 1 behavior after the handoff pipeline exists.
  - Phase 3 adds mutation feedback between Agent 2 and Agent 3 after green is well-defined.
- Gaps/overlap check:
  - Phase 1 owns orchestration and handoff.
  - Phase 2 owns property-test generation and execution guidance.
  - Phase 3 owns mutation tooling and thresholds.
- Whole-pack success signal:
  - A real story can follow the pipeline end-to-end with isolated stages, handoff artifacts, and quality outputs.

## Architecture Decisions
- Decision: Treat the multi-agent TDD system as a harness contract plus helper scripts/config rather than a hidden conversational convention.
- Alternatives considered: Leave TDD as a single-agent prompt; implement a full orchestration service first.
- Rationale: The harness is doc-driven today, so making the contract and artifacts explicit is the smallest enforceable step.

## Data Model / API Contracts
- Request shape:
  - `scripts/tdd_handoff.sh init --story <story-id> --spec <path>`
  - `scripts/tdd_handoff.sh record --story <story-id> --stage <agent1|agent2|agent3> --status <...>`
- Response shape:
  - JSON metadata files under `.ai/state/tdd-handoff/<story-id>/`
- Storage/index changes:
  - Add `.ai/state/tdd-handoff/README.md`
  - Add per-story directory scaffolding

## Dependency Plan
- Existing dependencies used:
  - `vitest`
  - monorepo `pnpm` tooling
  - Husky pre-commit support
- New dependencies proposed (if any):
  - `fast-check`
  - `@stryker-mutator/core`
  - `@stryker-mutator/vitest-runner`
  - `@stryker-mutator/typescript-checker`
- Risk and mitigation:
  - Mutation tooling can be slow, so keep runs scoped to changed files and allow degraded reporting after limited retries.

## Test Strategy
- Unit tests:
  - wiring/config validation through `check_ai_wiring.sh`
  - shell-script smoke checks for `scripts/tdd_handoff.sh`
- Integration tests:
  - targeted config/CLI validation for mutation tooling
- E2E or smoke tests:
  - run the wiring audit and targeted script commands on a sample story id
- Edge-case coverage mapping:
  - tests already green before Agent 2 -> fail fast
  - Agent 2 edits tests -> escalation artifact expected
  - mutation score below threshold -> feedback loop or flag after limit

## UI Implementation Plan (if applicable)
- Not applicable for this story.

## Rollout and Risk Mitigation
- Rollback strategy:
  - Revert the new TDD workflow/agent references and remove the helper script/config if the contract proves too heavy.
- Feature flags/toggles:
  - Mutation runs remain targeted and opt-in through the dedicated script/config path.
- Observability checks:
  - Use handoff metadata plus quality JSON files to understand stage outcomes.

## Validation Commands
```bash
bash scripts/check_ai_wiring.sh
pnpm install
pnpm exec stryker --version
```
