# Story Lookup

Use this workflow to find the next valid execution contract.

## Canonical Sources

- `AGENTS.md`
- `docs/CONTEXT.md`
- `docs/WORKFLOW_MEMORY.md`
- `docs/IMPLEMENTATION_STRATEGY.md`
- `docs/user-stories/README.md`

## Steps

1. Read `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, and `docs/IMPLEMENTATION_STRATEGY.md`.
2. Use `docs/user-stories/README.md` as the master queue and dependency graph.
3. Open the active story file in `docs/user-stories/` before implementation.
4. If the user asked for work that is not yet represented, create a checked-in story before editing implementation files.

## Output

- active story file path
- dependency rationale from `docs/user-stories/README.md`
- validation commands and proof path from the active story file
