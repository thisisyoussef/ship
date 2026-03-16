# Constitution Check

## Story
- Story ID: AI-HARNESS-LIFECYCLE-SIMPLIFICATION
- Story Title: Simplify harness lifecycle, finalization, and recovery paths
- Date: 2026-03-16

## Architecture Boundaries
- Keep filenames stable where possible: reuse `.ai/workflows/parallel-flight.md`, `scripts/flight_slot.sh`, `.ai/workflows/story-handoff.md`, and `.ai/workflows/git-finalization.md`.
- Preserve Codex as the canonical orchestrator and keep Claude/Cursor as compatibility mirrors.
- Keep the user approval gate intact even while collapsing handoff + finalization into one user-facing completion gate.

## Quality Gates
- `bash scripts/check_ai_wiring.sh` must pass.
- New automation around AI-architecture changes must run in `.husky/pre-commit` and in `scripts/git_finalize_guard.sh` when branch diffs touch AI-architecture files.
- New helper or state files must stay simple and inspectable.

## Security Constraints
- No secrets or tokens added to workflow/state files.
- Lock files and triage state must stay local-repo metadata only.

## Performance / Complexity Constraints
- Prefer the smallest mechanism that solves today’s problem.
- Replace the flight board state machine with a single-writer lock rather than introducing a new coordination service.

## Exceptions
- None.
