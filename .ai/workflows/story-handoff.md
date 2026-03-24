# Story Handoff

Use this workflow to close a story with concrete proof instead of a vague summary.

## Canonical Sources

- `docs/DEFINITION_OF_DONE.md`
- active story file in `docs/user-stories/`
- `docs/guides/finalization-recovery.md`

## Requirements

- satisfy `docs/DEFINITION_OF_DONE.md`
- record local validation results in the active story file
- make deployment status explicit as `deployed`, `not deployed`, or `blocked`
- include an explicit `What To Test` section for visible changes
- prefer seeded proof lanes, runtime checks, or doc inspection before browser automation

## Handoff Output

1. story status and checkpoint evidence are updated
2. deployment status is recorded
3. user-facing verification steps are concrete
4. any blocker points to `docs/guides/finalization-recovery.md`
