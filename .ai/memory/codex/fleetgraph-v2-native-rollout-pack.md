# FleetGraph V2 Native Rollout Pack

- Branch: `codex/fleetgraph-v2-native-rollout`
- Date: 2026-03-19
- Goal: finish the native FleetGraph V2 rollout by removing canonical V1-shaped wrappers/adapters across the API, worker, HITL flow, and web client.

## Landed

- Cut canonical FleetGraph routes over to native V2 responses in `api/src/routes/fleetgraph.ts`.
- Moved follow-up turns onto the V2 runtime with thread-backed conversation state and question-aware reasoning.
- Moved on-demand review/apply to structured V2 resume input and shared registry-backed action drafts/dialogs.
- Removed the worker V1 adapter so the worker now speaks native V2 input/state directly.
- Wired proactive finding persistence and action-outcome persistence through the existing finding/action stores via `api/src/services/fleetgraph/actions/runtime-v2-store.ts`.
- Updated the FleetGraph FAB analysis UI/hooks to consume native V2 response contracts and typed dialog submissions.
- Refreshed `api/src/openapi/schemas/fleetgraph.ts` so OpenAPI now describes the native `/entry`, `/analyze`, `/thread/:threadId/turn`, thread review/apply, and `/v2/*` routes.

## Validation

- `pnpm --filter web exec vitest run src/components/FleetGraphFab/AnalysisSection.test.tsx`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`

## Known Verification Block

- The focused API Vitest runs for FleetGraph route/service files could not execute in this workspace because `api/src/test/setup.ts` requires a local Postgres role `ship`, and that role is not available here.

## Follow-On Guardrail

- Do not reintroduce V1-shaped mapping on canonical FleetGraph surfaces. If a legacy helper still exists, keep it off the main route/worker/web path and remove it instead of extending it.
