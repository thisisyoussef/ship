# Feature Development

Use this workflow to execute an active story from preparation through validation.

## Canonical Sources

- `AGENTS.md`
- `docs/IMPLEMENTATION_STRATEGY.md`
- `docs/user-stories/README.md`
- active story file in `docs/user-stories/`
- `docs/DEFINITION_OF_DONE.md`

## Steps

1. Start from `AGENTS.md` and confirm the active story from `docs/user-stories/README.md`.
2. Do the preparation pass listed in the active story before editing implementation files.
3. Use TDD for behavior changes and keep the change scoped to the active story.
4. Put design thinking in `docs/plans/` and packaged outputs in `docs/submissions/`.
5. Record validation, deployment status, and checkpoint evidence in the story before handoff.
6. Do not call the story complete until `docs/DEFINITION_OF_DONE.md` is satisfied.

## Required Outputs

- updated story file
- updated implementation or docs for the scoped change
- validation evidence
- explicit `What To Test` instructions when visible behavior changed
