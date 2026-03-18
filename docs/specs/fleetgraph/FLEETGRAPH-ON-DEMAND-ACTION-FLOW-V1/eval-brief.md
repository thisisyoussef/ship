# Eval Brief

## Story
- Story ID: FLEETGRAPH-ON-DEMAND-ACTION-FLOW-V1
- Story Title: FleetGraph on-demand action flow v1
- Date: 2026-03-18

## Objective
- Ensure the on-demand FleetGraph reasoner only emits executable actions for the explicitly supported v1 action family and abstains for unsupported “helpful next step” suggestions.

## Failure Mode To Catch
- The model proposes a browser-executable or unsupported action such as “encourage engagement” or any endpoint outside the approved FleetGraph allowlist.

## Dataset Sources and Slices
- Existing reason-node unit fixtures in `api/src/services/fleetgraph/graph/nodes/reason.test.ts`
- New curated JSON-style cases for:
  - week-start drift -> `start_week`
  - sprint plan approval -> `approve_week_plan`
  - project plan approval -> `approve_project_plan`
  - stagnation-risk narrative with no valid Ship action surface -> advisory-only
  - generic healthy context -> advisory-only

## Evaluators and Metrics
- Schema validity: parsed response must remain valid JSON with valid action fields.
- Action allowlist accuracy: executable actions must map to one of the three supported action types and their endpoint patterns.
- Abstention accuracy: unsupported scenarios must return no executable action.

## Thresholds and Baseline
- Baseline: current on-demand analysis can emit arbitrary valid-looking endpoints if the path matches the regex-based allowlist.
- Target threshold:
  - 100% of executable actions in the regression set are mapped to supported action types only.
  - 100% of unsupported scenarios emit advisory-only output.
- Unacceptable regression:
  - any newly executable unsupported action
  - any supported scenario losing its executable action draft

## Regression / Continuous Eval Plan
- Keep the new reason-node regression cases in `reason.test.ts`.
- Re-run these cases whenever the on-demand prompt, action typing, or endpoint allowlist changes.
- Treat any new executable action type as a spec change that requires extending the allowlist, API contract, and tests together.
