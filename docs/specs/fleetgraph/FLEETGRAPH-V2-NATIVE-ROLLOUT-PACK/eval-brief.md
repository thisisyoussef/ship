# Eval Brief

## Story
- Story ID: FLEETGRAPH-V2-NATIVE-ROLLOUT-PACK
- Story Title: FleetGraph V2 native rollout pack
- Date: 2026-03-19

## Objective
- Ensure native V2 FleetGraph responses remain schema-valid, question-aware on follow-up turns, and action-safe when moving the canonical API, worker, and web surfaces off V1 wrappers.

## Failure Modes To Catch
- V2 canonical routes silently reintroduce V1-shaped mapping or fallback.
- Follow-up turns ignore the user question or lose prior thread context.
- Review/apply accepts invalid dialog submissions or executes unsupported writes.

## Dataset Sources and Slices
- Existing V1/V2 runtime and route fixtures in:
  - `api/src/routes/fleetgraph.test.ts`
  - `api/src/services/fleetgraph/graph/nodes/reason.test.ts`
  - `api/src/services/fleetgraph/actions/on-demand-service.test.ts`
- New curated regression slices for:
  - initial on-demand advisory
  - initial on-demand action-required
  - follow-up question on existing thread
  - quiet healthy context
  - invalid dialog submission
  - repeated apply on an already-completed review thread

## Evaluators and Metrics
- Schema validity: canonical route payloads match the native V2 schema.
- Question-awareness: follow-up answer changes based on `userQuestion` plus saved thread context.
- Action safety: only registry-defined action/dialog flows can reach apply.
- Duplicate-safety: repeated approve/apply attempts do not issue a second Ship write.

## Thresholds and Baseline
- Baseline:
  - V2 first-turn routes work but still map back into V1 shapes.
  - follow-up turns still run on V1 and ignore the V2 question-aware path.
- Target threshold:
  - 100% of covered canonical route responses match the native V2 schema.
  - 100% of follow-up regression cases include user-question-aware output on the same thread.
  - 100% of invalid dialog submissions fail before Ship execution.
  - 100% of repeat-apply regression cases avoid duplicate execution.
- Unacceptable regression:
  - any reintroduced V1 fallback path on canonical routes
  - any follow-up case that drops question context
  - any invalid submission that reaches a Ship write

## Regression / Continuous Eval Plan
- Keep the new route/runtime/action regression cases in focused FleetGraph tests.
- Re-run these cases whenever V2 prompt/context assembly, review/apply schemas, or worker persistence wiring changes.
- Treat any new action/dialog type as a spec change that must update the registry, V2 contract, web renderer, and regression cases together.
