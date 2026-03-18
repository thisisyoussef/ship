# Feature Spec

## Metadata
- Story ID: FLEETGRAPH-ON-DEMAND-ACTION-FLOW-V1
- Story Title: FleetGraph on-demand action flow v1
- Author: Codex
- Date: 2026-03-18
- Related PRD/phase gate: FleetGraph on-demand interaction inside Ship

## Problem Statement
FleetGraph currently exposes two different action systems. Proactive findings already use server-backed review/apply flows, but the on-demand FAB/chat path emits ad hoc `proposedAction` payloads and executes Ship mutations directly from the browser. That split makes action safety inconsistent and prevents flexible, FleetGraph-mediated review flows for on-demand analysis.

## Story Pack Objectives
- Introduce one typed on-demand FleetGraph action draft contract.
- Move on-demand review/apply execution behind FleetGraph API routes instead of direct browser-to-Ship writes.
- Keep unsupported suggestions advisory-only so FleetGraph does not invent executable actions where no safe contract exists.
- How this story contributes to the overall objective set: it narrows the on-demand action surface to a safe, testable first slice without destabilizing proactive findings or the V2 three-lane work.

## User Stories
- As a Ship user reading FleetGraph analysis, I want supported actions to open a clear review step before anything changes in Ship so I can trust what FleetGraph is about to do.
- As a PM, I want FleetGraph to suggest starting or approving the current week/project only when there is a real FleetGraph-backed action path so unsupported recommendations remain advice, not broken buttons.

## Acceptance Criteria
- [ ] AC-1: On-demand FleetGraph findings use a typed action draft union with `actionId`, `actionType`, `targetId`, `targetType`, `endpoint`, `evidence`, `reviewTitle`, `reviewSummary`, and `dialogKind: "confirm"`.
- [ ] AC-2: `POST /api/fleetgraph/thread/:threadId/actions/:actionId/review` returns a server-backed review payload only for supported on-demand actions in the authenticated workspace.
- [ ] AC-3: `POST /api/fleetgraph/thread/:threadId/actions/:actionId/apply` executes supported on-demand actions through FleetGraph using the current request context instead of a browser-direct Ship mutation.
- [ ] AC-4: The on-demand FAB analysis UI opens a controlled confirm dialog for supported actions and does not mutate Ship when the user cancels.
- [ ] AC-5: Unsupported ideas such as “encourage engagement” remain advisory-only and never surface an executable action button.

## Edge Cases
- Empty/null inputs: missing `threadId` or `actionId` should fail cleanly with no mutation.
- Boundary values: repeated apply on the same thread/action should be idempotent or return the existing action outcome.
- Invalid/malformed data: stale actions, workspace mismatches, unsupported action types, and invalid endpoints are rejected.
- External-service failures: Ship REST failures should produce truthful FleetGraph failure feedback and no false success notice.

## Non-Functional Requirements
- Security: workspace/thread ownership must be validated server-side before review/apply.
- Performance: no new proactive work; on-demand only adds review/apply round-trips when the user requests an action.
- Observability: existing FleetGraph thread state should remain inspectable through the debug surface.
- Reliability: apply flow must forward cookie/CSRF context same-origin and keep unsupported actions non-executable.

## UI Requirements
- Required states: idle action button, review dialog open, apply pending, apply success, apply failure.
- Accessibility contract: dialog must expose title/description, close on escape, and preserve a distinct cancel path.
- Design token contract: reuse current FleetGraph FAB and confirm-dialog tokens/classes.
- Visual-regression snapshot states: supported action visible, review dialog open, failed apply message, unsupported advisory-only finding.

## Out of Scope
- Proactive finding action changes.
- Schema-driven free-form dialogs or assignment/comment input forms.
- V2 three-lane runtime migration.
- New proactive/action types beyond `start_week`, `approve_week_plan`, and `approve_project_plan`.

## Done Definition
- Typed on-demand action drafts replace raw direct-execution proposals.
- Review/apply flows are server-backed for the supported confirm-only actions.
- API/runtime/web tests cover supported, stale, invalid, and advisory-only cases.
- The FAB no longer calls Ship mutation routes directly for on-demand actions.
