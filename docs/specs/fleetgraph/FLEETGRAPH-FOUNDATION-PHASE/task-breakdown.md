# Task Breakdown

## Story
- Story ID: FLEETGRAPH-FOUNDATION-PHASE
- Story Title: FleetGraph foundation-phase story pack

## Execution Notes
- Keep tasks small and verifiable.
- Start with reconnaissance and contracts before behavior.
- Do not implement proactive or on-demand FleetGraph features until the substrate tasks below are complete.

## Tasks

| Task ID | Description | Dependency | Parallelizable | Validation |
|---|---|---|---|---|
| T001 | Recon the whole `/Users/youss/Development/gauntlet` directory for reusable LangGraph, LangSmith, provider-adapter, worker, and deployment patterns; capture what to reuse and what to avoid. | must-have | no | Written reconnaissance note with explicit keep/avoid decisions |
| T002 | Define the provider-agnostic `LLMAdapter` contract and OpenAI-first runtime config, while documenting fallback compatibility with other providers. | blocked-by:T001 | yes | Unit tests for adapter selection, config validation, and provider switching |
| T003 | Bootstrap LangSmith tracing, trace metadata taxonomy, and shared trace-link workflow before any graph behavior is added. | blocked-by:T001 | yes | Smoke run emits traces with expected metadata and shareable links |
| T004 | Stand up the LangGraph runtime skeleton, shared state schema, conditional branch taxonomy, and checkpoint boundaries for proactive and on-demand modes. | blocked-by:T002,T003 | no | Unit and integration tests prove branching/state transitions without real feature logic |
| T005 | Build the Ship REST normalization layer and trigger/context envelopes so graph nodes operate on one internal model instead of raw mixed-shape payloads. | blocked-by:T004 | yes | Fixture-based tests cover canonical + legacy relationship combinations |
| T006 | Add the proactive worker substrate: enqueue hooks, scheduled sweep, dedupe ledger, and checkpoint-aware execution loop. | blocked-by:T004,T005 | no | Integration tests cover enqueue, sweep cadence, dedupe, and retry behavior |
| T007 | Define and implement the same-origin embedded FleetGraph entry contract plus the human-in-the-loop approval envelope for consequential actions. | blocked-by:T004,T005 | yes | API/UI smoke tests cover contextual entry and approval-required pause behavior |
| T008 | Lock deployment, secrets, and public-access readiness for API routes, worker runtime, tracing, and service-auth configuration. | blocked-by:T006,T007 | no | Deployed smoke path and trace evidence checklist pass together |

## TDD Mapping

For each task, list associated tests first:

- T001 tests:
  - [ ] No code tests; produce a reconnaissance artifact with concrete reuse/avoid calls
- T002 tests:
  - [ ] test_selects_openai_as_default_provider
  - [ ] test_rejects_missing_provider_credentials
  - [ ] test_can_swap_to_non_default_provider_without_graph_changes
- T003 tests:
  - [ ] test_trace_metadata_includes_workspace_trigger_and_branch
  - [ ] test_trace_links_can_be_shared_for_quiet_and_non_quiet_runs
- T004 tests:
  - [ ] test_graph_state_schema_rejects_missing_required_fields
  - [ ] test_quiet_branch_and_problem_branch_have_distinct_paths
- T005 tests:
  - [ ] test_normalizes_document_associations_and_legacy_project_fields
  - [ ] test_context_envelope_preserves_route_surface_information
- T006 tests:
  - [ ] test_dirty_context_enqueue_is_idempotent
  - [ ] test_scheduled_sweep_respects_dedupe_and_retry_rules
- T007 tests:
  - [ ] test_embedded_entry_receives_ship_context
  - [ ] test_consequential_actions_require_hitl_pause
- T008 tests:
  - [ ] test_worker_and_api_share_required_env_contract
  - [ ] test_deployment_checklist_requires_trace_and_public_access_evidence

## Completion Criteria
- [ ] All must-have tasks complete
- [ ] Acceptance criteria mapped to completed tasks
- [ ] Tests added and passing for each implemented task
- [ ] Deferred tasks documented with rationale
