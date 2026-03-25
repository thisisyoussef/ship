# FleetGraph Spec

## Purpose

FleetGraph is Ship’s embedded project-intelligence layer. It reasons over real Ship data to surface proactive findings, provide contextual on-demand analysis, and guide users through reviewed/apply flows for consequential actions.

## Product Position

FleetGraph is not a separate chatbot page. It is integrated into:

1. the document page
2. the left-rail workspace findings queue
3. the same workspace/document graph used by the rest of Ship

## Operating Modes

### Proactive mode

Proactive mode scans workspace state and creates findings when something warrants attention.

Current proactive surfaces:

1. workspace findings queue at `/fleetgraph`
2. document-scoped findings surfaces inside `/documents/:id/*`

### On-demand mode

On-demand mode starts from the user’s current Ship context, usually a document page.

Current on-demand surfaces:

1. analysis-only FAB on document pages
2. document-context findings/guided actions
3. follow-up conversation turns tied to a stable thread ID

### Architecture rule

Both proactive and on-demand modes use the same graph/runtime concepts. The trigger changes, not the overall intelligence system.

## User-Facing FleetGraph Surfaces

### 1. Workspace findings queue

Route: `/fleetgraph`

Required behavior:

1. List active proactive findings across the current workspace.
2. Allow the user to open the source document for a finding.
3. Allow dismiss, snooze, review, and apply actions from the queue.
4. Show owner or assignee options when the proposed action requires a selection.

### 2. Document-context findings panel

Route context: `/documents/:id/*`

Required behavior:

1. Show proactive findings relevant to the current document.
2. Reuse the same finding-card/action model as the global queue.
3. Preserve navigation from a finding back into the current document context.

### 3. Guided actions overlay

Route context: `/documents/:id/*`

Required behavior:

1. Auto-surface guided next steps in a floating overlay when FleetGraph has a consequential recommendation for the current page.
2. Keep the guided action UI separate from the analysis-only FAB.
3. Support multiple guided candidates and isolate their review/apply threads.

### 4. Analysis FAB and follow-up conversation

Route context: `/documents/:id/*`

Required behavior:

1. Allow on-demand analysis of the current document context.
2. Return analysis text, analysis findings, optional pending action, and thread metadata.
3. Support follow-up turns through `/thread/:threadId/turn`.

## Current Finding Types

Current proactive finding types persisted in the schema:

| Finding type | Current product meaning | Typical reviewed/apply behavior |
| --- | --- | --- |
| `sprint_no_owner` | A week document is missing an owner | reviewer chooses an owner, then applies the change |
| `unassigned_sprint_issues` | Week-scoped issues are missing assignment | reviewer selects assignee(s) and applies assignment guidance |
| `week_start_drift` | A week/start workflow is out of sync | reviewer confirms a “start week” style action |

## Current Finding Lifecycle

### Finding states

1. `active`
2. `dismissed`
3. `resolved`
4. `snoozed`

### Queue/job states

1. `queued`
2. `running`
3. `completed`
4. `failed`

### Dedupe outcomes

1. `quiet`
2. `advisory`
3. `approval_required`
4. `fallback`
5. `failed`

## Review And Apply Contract

FleetGraph’s consequential actions are not silent mutations. The current product requires a human-review step before apply.

Current review/apply rules:

1. `POST /api/fleetgraph/findings/:id/review` prepares a review payload and can accept `ownerId` or `assigneeId`.
2. `POST /api/fleetgraph/findings/:id/apply` executes the reviewed action.
3. `POST /api/fleetgraph/entry/apply` executes reviewed actions originating from document-context entry flows.
4. Review payloads provide summary, evidence, labels, and thread context for the confirmation step.

## Runtime And Storage Model

### Runtime substrate

FleetGraph runtime behavior is organized around:

1. graph runtime
2. entry service
3. finding store
4. action service
5. proactive worker/sweep runtime
6. LLM factory/adapters
7. tracing and deployment-readiness helpers

### Storage substrate

Dedicated FleetGraph tables currently include:

1. `fleetgraph_queue_jobs`
2. `fleetgraph_dedupe_ledger`
3. `fleetgraph_sweep_schedules`
4. `fleetgraph_proactive_findings`
5. `fleetgraph_finding_action_runs`

These persist:

1. queued work
2. dedupe/cooldown/checkpoint state
3. workspace sweep schedule
4. user-visible proactive findings
5. action execution outcomes

## API Contract

| Endpoint | Purpose |
| --- | --- |
| `GET /api/fleetgraph/ready` | Environment readiness for API/worker surfaces, guarded by service token |
| `POST /api/fleetgraph/entry` | Create document-context entry result |
| `POST /api/fleetgraph/entry/apply` | Apply reviewed document-context action |
| `GET /api/fleetgraph/findings` | List active findings, optionally document-filtered |
| `GET /api/fleetgraph/debug/threads` | Inspect checkpoint history and pending interrupts |
| `POST /api/fleetgraph/findings/:id/dismiss` | Dismiss finding |
| `POST /api/fleetgraph/findings/:id/review` | Prepare finding action review |
| `POST /api/fleetgraph/findings/:id/snooze` | Snooze finding |
| `POST /api/fleetgraph/findings/:id/apply` | Apply finding action |
| `POST /api/fleetgraph/analyze` | On-demand document analysis |
| `POST /api/fleetgraph/thread/:threadId/turn` | Continue on-demand conversation |

## Authorization And Environment Rules

1. Normal user-facing FleetGraph routes require authenticated Ship context.
2. `GET /ready` additionally requires a FleetGraph service token.
3. FleetGraph surfaces can be environment-gated through deployment/readiness checks.

## Tracing And Provider Model

According to the checked-in assignment/docs surface, FleetGraph must preserve:

1. provider-agnostic design behind an adapter boundary
2. OpenAI as the preferred default provider in this repo
3. LangSmith tracing from day one
4. a shared graph architecture for proactive and on-demand flows

## Document-Context Contract

On-demand page analysis currently expects:

1. `documentId`
2. `documentType`
3. optional `documentTitle`
4. current workspace context derived from auth/session
5. a stable `threadId` built from workspace plus document context

The current response shape includes:

1. `analysisFindings`
2. `analysisText`
3. `outcome`
4. `path`
5. `pendingAction`
6. `threadId`
7. optional `turnCount` for follow-up turns

## Current Product Constraints

1. FleetGraph must use Ship REST data rather than bypassing the product data layer.
2. Human-in-the-loop approval remains mandatory for consequential actions.
3. The current UI is context-embedded, not a standalone chatbot page.
4. The current product now includes both polished user-facing surfaces and explicit debug/readiness surfaces.

## Rebuild Priorities

1. Rebuild the runtime and storage substrate first.
2. Rebuild the findings queue and reusable finding-card/action model second.
3. Rebuild document-context analysis and guided overlays third.
4. Rebuild review/apply and follow-up conversation behavior last, once thread continuity is stable.
