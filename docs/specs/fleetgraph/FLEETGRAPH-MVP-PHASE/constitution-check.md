# Constitution Check

## Story Context
- Story ID: FLEETGRAPH-MVP-PHASE
- Story Title: Define the FleetGraph MVP execution pack
- Owner: Codex
- Date: 2026-03-16

## Architecture Constraints
- [x] Clean architecture boundaries preserved; this story creates planning/docs artifacts only.
- [x] The pack builds on the shared FleetGraph substrate instead of bypassing provider, tracing, graph, normalization, worker, or entry contracts.
- [x] The proposed story order keeps proactive, on-demand, approval, deployment, and docs evidence on one shared graph path.

## Technology Constraints
- [x] Uses the existing approved stack unless an exception is documented later in an implementation story.
- [x] New dependency ideas remain proposal-level only in this planning pack.
- [x] Provider integrations stay provider-agnostic with OpenAI as the preferred default.

## Quality Constraints
- [x] TDD-first execution remains required for downstream implementation stories.
- [x] Coverage and validation expectations stay explicit in the task breakdown.
- [x] File/function limits are preserved because this story only adds docs/memory artifacts.
- [x] Trace evidence and deploy smoke are part of the MVP completion contract, not optional cleanup.

## Security Constraints
- [x] No hardcoded secrets added.
- [x] Service-auth and secret-bootstrap requirements remain explicit for deploy-relevant stories.
- [x] HITL boundaries remain explicit for consequential Ship actions.
- [x] Public trace sharing remains opt-in and evidence-driven.

## Performance Constraints
- [x] The under-5-minute proactive detection target remains part of the pack objective set.
- [x] The pack keeps rule-gated candidate scoring and dedupe/cooldown behavior in scope for the MVP proactive slice.
- [x] Cost and deployment evidence remain required assignment outputs.

## UI-Specific Constraints (Only if UI scope exists)
- [x] The pack keeps the UI embedded in Ship context; no standalone chatbot surface is introduced.
- [x] Accessibility expectations remain explicit for proactive insight surfaces and approval flows.
- [x] Visual proof and trace evidence are required, but styling breadth is not the objective of this pack.

## Exceptions
- Exception: None.
- Rationale: N/A
- Approval: N/A

## Result
- [x] Constitution check passed
- [ ] Blocking issues identified (list below)

Blocking issues:
- None.
