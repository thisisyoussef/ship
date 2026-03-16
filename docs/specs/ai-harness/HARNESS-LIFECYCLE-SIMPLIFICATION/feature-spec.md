# Feature Spec

## Metadata
- Story ID: AI-HARNESS-LIFECYCLE-SIMPLIFICATION
- Story Title: Simplify harness lifecycle, finalization, and recovery paths
- Author: Codex
- Date: 2026-03-16
- Related PRD/phase gate: Harness workflow simplification feedback

## Problem Statement
The current harness applies full ceremony to every story, carries a heavier-than-needed flight coordination system, relies on remembered wiring checks, allows unbounded correction loops, splits user review from finalization into two separate human-touching phases, and lacks an explicit recovery path when finalization fails.

## Story Pack Objectives (for phase packs or multi-story planning)
- Objective 1: Route small/mechanical work through a proportionate low-friction lane without weakening safeguards for API, AI, or deployment changes.
- Objective 2: Reduce coordination overhead by replacing the current flight board state machine with a single active lock that matches current operating scale.
- Objective 3: Make AI-architecture drift fail automatically during commit/finalization rather than depending on memory.
- Objective 4: Bound correction churn and make re-scope escalation explicit when repeated patch cycles signal a broken story contract.
- Objective 5: Collapse review + finalization into one user-facing completion gate while preserving explicit approval.
- Objective 6: Add a named recovery path for merge/finalization failures.
- How this story or pack contributes to the overall objective set: It simplifies the current harness lifecycle while keeping the approval and wiring safety properties that matter.

## User Stories
- As a harness user, I want trivial stories to avoid the full ceremony path so quick fixes do not feel as expensive as architecture work.
- As a collaborator, I want one completion gate instead of separate handoff and finalization rounds so review feels more direct.
- As a maintainer, I want finalization failures and repeated correction loops to route into explicit recovery/escalation instead of improvised behavior.

## Acceptance Criteria
- [ ] AC-1: A story-size classifier runs after lookup and routes trivial stories through a fast-track lane that skips spec-driven delivery, eval-driven development, and flight locking.
- [ ] AC-2: The current flight board/state machine is replaced by a single active lock model while keeping `scripts/flight_slot.sh` as the stable CLI entrypoint.
- [ ] AC-3: AI-architecture wiring checks run automatically from pre-commit for staged AI-architecture changes and from finalization guard for branch diffs touching those files.
- [ ] AC-4: Correction triage includes a persisted loop counter with a circuit breaker at the configured limit and an explicit re-scope signal.
- [ ] AC-5: Story handoff and git finalization become one user-facing completion gate that presents review evidence plus finalization plan together, then executes finalization after approval.
- [ ] AC-6: Finalization includes an explicit failure branch to a documented recovery workflow for guard failures, merge conflicts, or post-push CI issues.

## Edge Cases
- Empty/null inputs: missing story ID should fall back to branch-based identifiers for triage counting.
- Boundary values: third correction loop for the same story should trigger escalation, not another patch cycle.
- Invalid/malformed data: corrupted lock or triage state files should fail with clear rebuild/reset guidance.
- External-service failures: missing GitHub/remote access should route through the recovery workflow instead of being treated as story complete.

## Non-Functional Requirements
- Security: pre-commit AI wiring checks must inspect only local repo files.
- Performance: trivial routing and lock/triage helpers must run fast enough for normal inner-loop use.
- Observability: completion gate should state whether finalization executed, is waiting on approval, or entered recovery.
- Reliability: lock/triage state should be deterministic and human-readable.

## Out of Scope
- Reintroducing a richer parallel execution model.
- Reworking the newly added three-agent TDD pipeline itself.
- Changing production deploy surfaces.

## Done Definition
- Workflows, hooks, guards, and scripts implement all six changes.
- Wiring checks enforce the new contract.
- Memory and SSOT are updated.
- Smoke checks prove the new lock, triage, and finalization recovery flows.
