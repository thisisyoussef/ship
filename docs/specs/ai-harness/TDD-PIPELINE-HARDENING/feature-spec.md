# Feature Spec

## Metadata
- Story ID: AI-HARNESS-TDD-PIPELINE-HARDENING
- Story Title: Multi-agent TDD pipeline with property and mutation gates
- Author: Codex
- Date: 2026-03-16
- Related PRD/phase gate: Harness TDD improvement brief

## Problem Statement
The current harness treats TDD as a single-agent black box. One agent writes tests, implementation, and refactors in the same context, which weakens adversarial coverage and makes the "red" phase easy to game.

## Story Pack Objectives (for phase packs or multi-story planning)
- Objective 1: Replace the single-agent TDD loop with an isolated three-agent pipeline whose contract is files on disk.
- Objective 2: Add stronger test-quality signals by introducing property-based testing guidance and mutation-testing gates.
- Objective 3: Make the pipeline observable and enforceable through repo-owned scripts, workflow wiring, and escalation rules.
- How this story or pack contributes to the overall objective set: This pack upgrades the harness from a generic red-green-refactor instruction into a concrete, auditable TDD system that resists implementation-aware tests.

## User Stories
- As a harness operator, I want the test author separated from the implementer so tests catch naive implementations.
- As a reviewer, I want objective signals like property and mutation coverage so TDD quality is measurable.
- As a future agent, I want file-based handoffs and loop limits so the TDD flow is deterministic and auditable.

## Acceptance Criteria
- [ ] AC-1: The harness defines a three-agent TDD pipeline with isolated context scopes, on-disk handoff artifacts, red/green/refactor guards, and escalation limits.
- [ ] AC-2: The repo includes TDD handoff scaffolding plus instructions/scripts for initializing, recording, and checking stage artifacts.
- [ ] AC-3: The harness defines when and how property-based tests are generated and run, including separate file conventions and counterexample capture.
- [ ] AC-4: The repo includes targeted mutation-testing support and the harness defines how surviving mutants feed back into the TDD loop.
- [ ] AC-5: Startup/orchestration/wiring docs enforce the new TDD contract and reject regressions.

## Edge Cases
- Empty/null inputs: Agent 1 must be prompted to include these.
- Boundary values: Required in example tests and candidate properties.
- Invalid/malformed data: Must be part of adversarial test design.
- External-service failures: Agent 1 and Agent 3 should include them when the story crosses integration boundaries.

## Non-Functional Requirements
- Security: No secrets or external provider tokens inside handoff artifacts.
- Performance: Property and mutation testing must be scoped so dev loops remain practical.
- Observability: Each stage must leave a durable artifact trail under `.ai/state/tdd-handoff/`.
- Reliability: Loop limits must escalate instead of spinning indefinitely.

## UI Requirements (if applicable)
- Not applicable for this story.

## Out of Scope
- Building a full autonomous multi-agent execution service outside the repo.
- Retrofitting every existing product test immediately.
- Forcing mutation testing across the entire monorepo in normal dev loops.

## Done Definition
- The TDD workflow and specialist-agent surfaces describe the three-agent pipeline.
- Repo-owned scripts/configs support the handoff directory and targeted mutation runs.
- Property and mutation testing dependencies/config are present.
- AI wiring checks enforce the new contract.
