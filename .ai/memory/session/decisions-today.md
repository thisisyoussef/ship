# Decisions Today

- Added an eval-driven workflow for AI-behavior changes.
- Wired eval requirements into startup, feature delivery, lookup, and handoff flows.
- Added wiring checks so eval routing is enforced for future template consumers.
- Added a frontend-design skill and threaded it through the UI-specific workflow/spec path.
- Expanded the UI component spec so design intent is captured as executable constraints rather than vague taste.
- Added a reusable UI prompt brief template based on WIRE and WIRE+FRAME for higher-stakes frontend work.
- Removed baked-in stack assumptions so the template chooses its stack during setup instead of inheriting the source project's stack.
- Decided the repo docs should be organized by reader intent and lifecycle instead of leaving active references, evidence, and archive material mixed together.
- Moved FleetGraph working docs into `docs/assignments/fleetgraph/` so the assignment pack is self-contained.
- Completed FleetGraph presearch against the real Ship codebase instead of inventing a new data model.
- Decided FleetGraph should stay provider-agnostic even though Ship already has Claude-specific routes and Bedrock integration.
- Decided the FleetGraph MVP should use same-origin chat routes plus a background worker, with hybrid triggering and a REST normalization layer for mixed association shapes.
- Decided narrow user corrections need their own explicit workflow route instead of being treated like full story reshaping by default.
- Added a user-correction triage workflow that classifies blast radius before editing and limits low-blast-radius changes to the minimum affected surfaces.
- Decided git finalization must detect archived or read-only upstream repos and fall back to the writable remote for PR and merge tracking.
- Decided the source PDF's Claude-only bullet is superseded by the live repo contract: OpenAI is preferred, but the runtime must remain provider-agnostic.
- Decided the next FleetGraph phase should be a foundation-first story pack covering gauntlet-wide reconnaissance, tracing, graph runtime, worker substrate, deployment, and HITL entry contracts before feature implementation.
- Decided the phase-1-3 FleetGraph submission brief should be promoted into the docs surface as an approach reference so future agents use it instead of leaving it buried under `output/`.
- Completed FleetGraph foundation story `T001` by scanning the broader `gauntlet/` workspace and writing a keep/avoid reconnaissance note for LangGraph, LangSmith, provider routing, worker substrate, and deployment-contract reuse.
- Decided FleetGraph should borrow neighboring repos at the contract level only: Ghostfolio for graph/observability shape, LegacyLens for tracing/OpenAI adapter contracts, Collab Board for provider wrapping, and Ship audit app for durable queue-claim semantics.
- Implemented FleetGraph foundation story `T002` with a dedicated provider-agnostic `LLMAdapter` factory under `api/src/services/fleetgraph/llm/`.
- Decided FleetGraph should default to OpenAI Responses and keep Bedrock Anthropic behind the same adapter contract for compatibility only.
- Added a DB-free Vitest config for FleetGraph pure unit modules so substrate tests can run without the API integration database harness.
- Decided every new story must start with remote sync plus a fresh `codex/` branch instead of continuing on the previous story's branch.
- Decided every story must review impact against Ship's real AWS deployment contract and either update deploy surfaces or explicitly record `deployment impact: none`.
- Decided story packs and phase packs must define higher-level objectives first and write the full story set in one pass before implementation begins.
- Decided deploy-relevant stories must record explicit deployment execution status as `deployed`, `not deployed`, or `blocked`.
- Decided remembered or legacy demo URLs do not count as canonical deployment targets unless the current repo config/scripts/workflows own them.
- Decided Ship should keep AWS as the canonical production path while formalizing Render `ship-demo` as the sanctioned public demo path.
- Added a checked-in `scripts/deploy-render-demo.sh` workflow so deploy-relevant stories can refresh the public demo with repo-owned commands instead of provider-side tribal knowledge.

Record session-level technical decisions.

## Decision Template
- **Decision ID**:
- **Context**:
- **Decision**:
- **Rationale**:
- **Follow-up**:
