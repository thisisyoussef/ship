# Decisions Today

- Added an eval-driven workflow for AI-behavior changes.
- Wired eval requirements into startup, feature delivery, lookup, and handoff flows.
- Added wiring checks so eval routing is enforced for future template consumers.
- Added a frontend-design skill and threaded it through the UI-specific workflow/spec path.
- Expanded the UI component spec so design intent is captured as executable constraints rather than vague taste.
- Added a reusable UI prompt brief template based on WIRE and WIRE+FRAME for higher-stakes frontend work.
- Removed baked-in stack assumptions so the template chooses its stack during setup instead of inheriting the source project's stack.
- Completed FleetGraph presearch against the real Ship codebase instead of inventing a new data model.
- Decided FleetGraph should stay provider-agnostic even though Ship already has Claude-specific routes and Bedrock integration.
- Decided the FleetGraph MVP should use same-origin chat routes plus a background worker, with hybrid triggering and a REST normalization layer for mixed association shapes.

Record session-level technical decisions.

## Decision Template
- **Decision ID**:
- **Context**:
- **Decision**:
- **Rationale**:
- **Follow-up**:
