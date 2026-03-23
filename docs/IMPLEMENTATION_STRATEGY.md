# Overall Implementation Strategy

## Purpose

This document defines the broad execution model for Ship.
The repo is driven by checked-in stories, not by chat memory or ad hoc session notes.

## Control Plane

The checked-in harness is split across a small set of durable documents:

- `AGENTS.md`: primary rulebook
- `docs/CONTEXT.md`: live environment truth
- `docs/WORKFLOW_MEMORY.md`: recurring corrections, durable decisions, and reusable patterns
- `docs/user-stories/README.md`: master queue and dependency graph
- active story files in `docs/user-stories/`: executable task contracts
- `docs/DEFINITION_OF_DONE.md`: completion gate

## Broad Roadmap

### Phase 1: Core Ship Baseline

Lock product and platform work to executable stories, keep architecture/docs truthful, and preserve the production baseline.

### Phase 2: FleetGraph Delivery

Drive the FleetGraph assignment and adjacent product work through story files, proof lanes, and checkpoint logs instead of sidecar workspace notes.

### Phase 3: Reliability and Productization

Close UX, validation, deployment, and evidence gaps after the primary product slice is in place.

### Phase X: Harness and Workflow Evolution

Improve the repo's execution harness itself when repeated friction or drift shows up.

## Execution Model

1. Start from `AGENTS.md`.
2. Check `docs/user-stories/README.md` for the next valid story based on status and dependencies.
3. Create and switch to a fresh `codex/` branch from current `master` for that story before editing the story file or implementation.
4. Treat parallel story branches as normal: keep one concern per branch and record any non-independent sibling-branch dependency or merge order in the story.
5. Open the active story file and use it as the execution contract.
6. Do the preparation phase before implementation.
7. Write or update tests before production changes when behavior changes.
8. Run the story's validation commands.
9. If sibling branches merge first, refresh from latest `master`, resolve conflicts, and rerun the story's validation commands before finalization.
10. Record deployment status, proof, and checkpoint evidence.
11. Finish the default GitHub flow by merging the story branch back to `master` once it is current with the integration base, unless the user explicitly pauses finalization or an exact blocker is recorded.
12. Roll evidence upward into `docs/plans/` or `docs/submissions/` only when packaging or reviewing.

## Planning vs Packaging

- `docs/plans/` holds design notes, technical investigations, and implementation planning.
- `docs/submissions/` holds assembled review, demo, and submission bundles.

## Ship-Specific Notes

- `.claude/CLAUDE.md` remains the secondary appendix for repo commands, architecture, testing, and deployment notes.
- FleetGraph-specific work still uses the checked-in assignment docs under `docs/assignments/fleetgraph/`.
