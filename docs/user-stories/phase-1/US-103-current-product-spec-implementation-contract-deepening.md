# US-103: Current Product Spec Implementation-Contract Deepening

## Status

- State: `in-progress`
- Owner: Codex
- Depends on: `US-102`
- Related branch: `codex/us-103-spec-blueprint-deepening`
- Related commit/PR: `pending`
- Target environment: `not deployed`

## Persona

**Product lead / implementation engineer** wants the current Ship spec pack pushed beyond blueprint level into an implementation-contract handoff.

## User Story

> As a product lead, I want the Ship spec pack to spell out permissions, payloads, lifecycle states, and mutation side effects so an engineer can reproduce the product behavior exactly without spelunking through frontend cache logic, route schemas, or auth middleware.

## Goal

Deepen the current-product spec pack where the previous pass still assumes engineering intuition. This story should add the contracts that are usually hidden in frontend hooks, route validation schemas, auth helpers, and mutation fan-out logic so the resulting pack reads like a build contract rather than a strong summary.

## Scope

In scope:

1. Add a new follow-up story for the deeper current-product spec pass and register it in the checked-in queue.
2. Expand the Ship current-product spec pack with implementation-level coverage for permissions/access, request/response contracts, lifecycle/state machines, and mutation side effects.
3. Update the pack README and related supporting docs so the new contract-level material is the primary path for rebuild engineers.
4. Update checkpoint logs and story metadata so the work is resumable from the repo.

Out of scope:

1. Changing runtime behavior, UI copy, schema, route semantics, or deployment plumbing.
2. Proposing a future-state redesign that differs from the current product implementation.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary workflow, validation, and finalization contract.
2. `docs/CONTEXT.md` — current environment and deployment truth.
3. `docs/WORKFLOW_MEMORY.md` — durable workflow corrections.
4. `docs/IMPLEMENTATION_STRATEGY.md` — repo execution model.
5. `docs/user-stories/README.md` — queue and dependency truth.
6. `docs/user-stories/phase-1/US-102-expanded-current-product-spec-blueprint.md` — prior pack-expansion contract.
7. `docs/DEFINITION_OF_DONE.md` — completion gate.
8. `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/*.md` — current pack baseline and remaining gaps.
9. `docs/core/application-architecture.md`, `docs/core/unified-document-model.md`, `docs/core/document-model-conventions.md`, and `docs/core/week-documentation-philosophy.md` — core product and data-model philosophy.
10. `.claude/CLAUDE.md` — Ship appendix for commands and architecture notes.
11. `web/src/main.tsx`, `web/src/lib/api.ts`, `web/src/lib/queryClient.ts`, `web/src/pages/UnifiedDocumentPage.tsx`, `web/src/pages/App.tsx`, and key query/mutation hooks under `web/src/hooks/` — route, state, request, cache, and invalidation truth.
12. `api/src/app.ts`, `api/src/middleware/auth.ts`, `api/src/middleware/visibility.ts`, `api/src/routes/*.ts`, `api/src/openapi/schemas/*.ts`, `api/src/collaboration/index.ts`, and `api/src/db/schema.sql` — access control, payload validation, endpoint behavior, and collaboration/runtime side effects.

## Preparation Phase

1. Re-read the checked-in workflow docs and the prior Ship spec-pack stories.
2. Compare the existing spec pack against the actual route map, auth model, frontend request helpers, mutation hooks, and backend route schemas.
3. Identify the highest-value contracts that still force engineers into code.
4. Write preparation notes before editing the pack.

### Preparation Notes

Local docs/code reviewed:

1. Repo workflow docs in `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/DEFINITION_OF_DONE.md`, and `.claude/CLAUDE.md`.
2. Prior story contract in `docs/user-stories/phase-1/US-102-expanded-current-product-spec-blueprint.md`.
3. Existing spec-pack entry docs in `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/`.
4. Core architecture docs in `docs/core/`.
5. Frontend route and state/caching surfaces in `web/src/main.tsx`, `web/src/lib/api.ts`, `web/src/pages/App.tsx`, `web/src/pages/UnifiedDocumentPage.tsx`, and TanStack Query hooks/components that drive optimistic updates and invalidation.
6. Backend routing and access-control surfaces in `api/src/app.ts`, `api/src/middleware/auth.ts`, `api/src/middleware/visibility.ts`, route schema registrations, and the collaboration server.

Expected contracts/data shapes:

1. A three-layer access model: public routes, authenticated workspace-member routes, and super-admin-only surfaces, with a separate visibility rule for private versus workspace-visible documents.
2. Request and response envelopes that are partly normalized through `success/data/error` wrappers and partly route-specific for detail records, review payloads, and FleetGraph actions.
3. Frontend state machines encoded in route guards, query loading/error/empty states, optimistic updates, review status flows, invite/session handling, and FleetGraph review/apply interactions.
4. Mutation side effects that fan out through query invalidation, navigation replacement, localStorage/session helpers, WebSocket collaboration events, and document-derived metadata extraction.

Planned failing tests:

1. No runtime red/green cycle is required because this story is documentation-only.
2. Validation will focus on story/spec/checkpoint consistency, spec-file inventory, and repo hygiene.

## UX Script

Happy path:

1. A rebuild engineer opens the Ship spec-pack README and can find access rules, concrete payload contracts, lifecycle states, and mutation side effects without reading code first.
2. The engineer can answer “who can do this,” “what exactly gets sent,” “what state transitions are possible,” and “what must refresh afterward” from the docs alone.
3. The pack now feels like an implementation contract for present-day Ship, including transitional quirks.

Error path:

1. A reader only has the spec pack and no local runtime.
2. The pack still needs to expose route-level and workflow-level edge behavior that normally lives in hooks, middleware, and tests.
3. Transitional behavior and compatibility layers must be called out explicitly instead of hidden behind simplified prose.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

List the tests or validation layers this story will use before implementation.

1. Source audit against frontend route, request, cache, and mutation code plus backend auth, route schema, and service files.
2. Internal consistency checks across the pack README, new supporting docs, story file, queue entry, and checkpoint logs.
3. `git diff --check` and spec/story reference scans before handoff.

## Step-by-step Implementation Plan

1. Register the deeper follow-up story in the phase-1 queue.
2. Add new pack docs that cover permissions/access, payload/response contracts, state machines/lifecycles, and side-effect/invalidation rules.
3. Update the pack README and adjacent docs so the new contract-level material is discoverable from the main entry path.
4. Update story/checkpoint metadata and run documentation validation commands.
5. Finalize through the default GitHub flow unless an exact blocker appears.

## Acceptance Criteria

- [ ] AC-1: The Ship current-product pack includes a dedicated permissions/access reference that distinguishes public, authenticated, workspace-admin, super-admin, and document-visibility behavior.
- [ ] AC-2: The Ship current-product pack includes a dedicated request/response reference that documents the dominant envelopes and key payload families closely enough for frontend and backend rebuild work.
- [ ] AC-3: The Ship current-product pack includes a dedicated state-machine/lifecycle reference covering session, invite/setup, document-detail, review/approval, and FleetGraph lifecycle behavior.
- [ ] AC-4: The Ship current-product pack includes a dedicated mutation side-effects reference that documents query invalidation, optimistic updates, navigation replacement, collaboration fan-out, and other refresh consequences.
- [ ] AC-5: The pack README, queue docs, and checkpoint logs are updated so the deeper implementation-contract layer is discoverable and resumable from the repo.

## Local Validation

Run these before handoff:

```bash
git diff --check
find docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC -maxdepth 1 -type f | sort
rg -n "US-103|permissions-and-access-spec|payload-and-response-reference|state-machine-and-lifecycle-spec|mutation-side-effects-spec" docs/user-stories docs/specs/ship
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the expanded checked-in spec pack.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: open the pack and inspect the new contract-level supporting docs
- Expected result: the pack now answers access, payload, lifecycle, and side-effect questions without code lookup
- Failure signal: an engineer still needs to open middleware, query hooks, or route tests to understand major current-state contracts

## User Checkpoint Test

1. Open the pack README and confirm the new contract-level docs are included in the main reading path.
2. Open the permissions, payload, and lifecycle docs and confirm they answer concrete implementation questions that were previously only implicit in code.
3. Open the side-effects doc and confirm it explains what data or UI surfaces must refresh after major writes.

## What To Test

- Route or URL: `docs/specs/ship/SHIP-CURRENT-PRODUCT-SPEC/README.md`
- Interaction: review the index and sample the new contract-level deep-dive docs linked from it
- Expected visible result: a deeper current-product blueprint that includes access rules, request/response contracts, lifecycle/state machines, and mutation side-effect coverage
- Failure signal: the pack still leaves those implementation questions buried in code

## Checkpoint Result

- Outcome: Pending
- Evidence: Pending
- Residual risk: Pending
