# Technical Plan

## Approach

1. Refactor the existing FleetGraph runtime to expose a reusable compiled graph seam.
2. Add a Studio-only export module that injects a preview-safe checkpointer and lazy env-backed adapters.
3. Add `langgraph.json` and repo-owned scripts for local Studio boot and example payload printing.
4. Document the difference between preview-safe memory mode and explicit Postgres inspection mode.

## Risks

- Studio preview can fail if graph import eagerly requires local runtime env.
- Default Postgres checkpoint setup can break preview on machines without a ready local DB.

## Mitigations

- Use stub adapters that only fail when a real node actually runs.
- Default the Studio export to `MemorySaver`.
- Make persistent inspection an explicit opt-in flag.
