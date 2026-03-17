# Constitution Check

## Metadata
- Story ID: UI-HUMAN-CENTERED-GUARDRAILS
- Story Title: Add human-centered UI workflow guardrails and pack-level QA artifacts
- Author: Codex
- Date: 2026-03-17

## Architecture Boundaries
- Keep this story within the AI harness, workflow docs, audit docs, and guard scripts.
- Do not patch FleetGraph product runtime code on this branch.
- Preserve the existing combined completion gate and merge-commit default behavior.

## Quality Gates
- Keep the workflow addition minimal and additive only where it removes repeated UI-review friction.
- Preserve the current story-level UI inspection behavior.
- Use neutral, evidence-based wording for the new critic flow.

## Security Constraints
- No secrets or credentials may be embedded in audit artifacts.
- The pack-level audit checklist may reference the public demo login only because it already exists as a checked-in demo credential surface.

## Performance Constraints
- No new runtime dependencies.
- No new mandatory heavy checks for backend-only stories.

## Deployment Constraints
- Deployment impact for this story should remain `none`.
- Public demo URLs may be referenced for QA, but no deploy behavior should change on this branch.

## Exception Log
- None.
