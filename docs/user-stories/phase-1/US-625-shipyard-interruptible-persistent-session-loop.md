# US-625: Shipyard Interruptible Persistent Session Loop

## Status

- State: `done`
- Owner: Codex
- Depends on: —
- Related branch: `codex/us-625-shipyard-persistent-loop`
- Related commit/PR: `4a5124c` / [PR #207](https://github.com/thisisyoussef/ship/pull/207)
- Target environment: `not deployed`

## Persona

**Implementation engineer / reviewer** wants the Shipyard presearch to preserve interruptible same-session execution so the runtime contract does not regress into restart-only behavior.

## User Story

> As an implementation engineer, I want the Shipyard presearch to state that an active agent session can be interrupted and fed new instructions without restarting so the eventual runtime is built around one durable thread instead of disposable one-shot runs.

## Goal

Check the dropped runtime requirement back into the Shipyard assignment pack. The current presearch already promises a persistent loop and queued follow-up handling, but it still leaves out the crucial operator behavior: when a new instruction arrives while the agent is actively working, the runtime should queue it, interrupt at a safe checkpoint, and integrate it into the same session thread instead of forcing a fresh restart or discarding in-flight context.

## Scope

In scope:

1. Register a checked-in story for the Shipyard interruptible-session requirement.
2. Add the Shipyard presearch source materials to the repo-owned assignment pack.
3. Update the presearch narrative so active-run interruption, same-session instruction injection, and safe-checkpoint handling are explicit.
4. Update the submission render script and generated assets so the visuals match the written requirement.
5. Record validation and checkpoint metadata so the correction is resumable from the repo.

Out of scope:

1. Building the Shipyard runtime itself.
2. Changing FleetGraph or Ship runtime behavior.
3. Expanding the Shipyard pack into a broader implementation plan beyond this requirement restore.

## Pre-Implementation Audit

Local sources to read before editing:

1. `AGENTS.md` — primary workflow and validation contract.
2. `docs/CONTEXT.md` — current repo/runtime truth.
3. `docs/WORKFLOW_MEMORY.md` — durable workflow corrections.
4. `docs/IMPLEMENTATION_STRATEGY.md` — repo execution model.
5. `docs/user-stories/README.md` — master queue and story indexing rules.
6. `docs/DEFINITION_OF_DONE.md` — completion gate.
7. `docs/user-stories/phase-1/US-103-current-product-spec-implementation-contract-deepening.md` — closest docs-only story exemplar.
8. `docs/assignments/shipyard/PRESEARCH.md` — Shipyard source document to correct.
9. `docs/assignments/shipyard/render_submission_pdf.py` — generated submission asset source.
10. `.claude/CLAUDE.md` — command and architecture appendix.

## Preparation Phase

1. Read the harness docs and the closest docs-only story exemplar.
2. Inspect the imported Shipyard presearch source and its render script.
3. Identify where the draft already promises persistence and where it still fails to specify active-run interruption.
4. Write preparation notes before editing.

### Preparation Notes

Local docs/code reviewed:

1. Repo workflow docs in `AGENTS.md`, `docs/CONTEXT.md`, `docs/WORKFLOW_MEMORY.md`, `docs/IMPLEMENTATION_STRATEGY.md`, `docs/user-stories/README.md`, `docs/DEFINITION_OF_DONE.md`, and `.claude/CLAUDE.md`.
2. The closest docs-only story exemplar in `docs/user-stories/phase-1/US-103-current-product-spec-implementation-contract-deepening.md`.
3. The Shipyard draft source in `docs/assignments/shipyard/PRESEARCH.md` and the submission renderer in `docs/assignments/shipyard/render_submission_pdf.py`.

Observed gap:

1. The draft already says Shipyard uses a persistent session queue and accepts follow-up instructions without restarting.
2. The draft does not yet say what happens when those instructions arrive while the agent is already in-flight.
3. The missing contract is therefore cooperative interruption plus same-thread queue draining at safe checkpoints, not a generic persistence reminder.

Planned output:

1. A checked-in Shipyard assignment pack with the requirement preserved in source form.
2. Updated prose and diagrams that state new instructions can interrupt active work without discarding the current session.
3. Queue/checkpoint metadata so the correction is discoverable from the repo.

Planned failing tests:

1. No runtime red/green loop is required because this story is documentation-only.
2. Validation will focus on generated artifact refresh, story/spec references, and repo hygiene.

## UX Script

Happy path:

1. A reader opens the Shipyard presearch and sees that the loop is persistent and interruptible, not just persistent.
2. The reader can tell how new instructions are handled when the agent is idle versus already working.
3. The submission diagrams reinforce the same runtime behavior instead of implying a simple FIFO queue only.

Error path:

1. The presearch still sounds like the agent only accepts follow-ups after a run completes.
2. The prose promises interruptibility but the diagrams still show a passive queue with no same-thread integration behavior.
3. A future implementation engineer still has to infer whether active work can be interrupted safely.

## Preconditions

- [x] Fresh story branch is checked out from current `master` before edits begin
- [x] Services/accounts exist
- [x] Secrets/config are present
- [x] Dependencies are healthy

## TDD Plan

Validation layers for this story:

1. Source audit against the Shipyard presearch markdown and render script.
2. Regenerate the Shipyard submission assets from source.
3. Run reference scans plus `git diff --check`.

## Step-by-step Implementation Plan

1. Register the new story in the phase-1 queue.
2. Check the Shipyard assignment source files into the clean branch.
3. Update the Shipyard presearch to require active-run interruption plus same-session instruction injection.
4. Update the render script so the diagrams and generated output reflect the same contract.
5. Regenerate the Shipyard submission assets, update checkpoint metadata, and validate the doc pack.

## Acceptance Criteria

- [x] AC-1: The Shipyard presearch explicitly states that the agent runs in a persistent loop and can accept new instructions without restarting.
- [x] AC-2: The presearch explicitly states what happens when a new instruction arrives during active work: it is queued, picked up at a safe checkpoint, and integrated into the same session/thread.
- [x] AC-3: The presearch makes clear that interruption is cooperative and should not hard-kill side-effecting work mid-step.
- [x] AC-4: The generated Shipyard submission visuals reinforce the same interruptible-session behavior.
- [x] AC-5: Story/queue/checkpoint metadata is updated so the correction is discoverable from the repo.

## Local Validation

Run these before handoff:

```bash
python3 docs/assignments/shipyard/render_submission_pdf.py
git diff --check
find docs/assignments/shipyard -maxdepth 3 -type f | sort
rg -n "interrupt|same session|queued instruction|safe checkpoint|interruptible" docs/user-stories docs/assignments/shipyard
```

## Deployment Handoff

1. Record deployment status.
2. Record environment and command evidence if deployed.
3. This story is documentation-only and does not require deployment.
4. Runtime proof path is repo inspection of the updated Shipyard source doc plus regenerated submission assets.

## How To Verify

- Prefer the lightest reliable proof path first: repo inspection plus the listed local validation commands.
- Only require an agent-run browser walkthrough when the story truly needs visual debugging or the user explicitly asks for it.
- Seeded verification entry or proof lane: not applicable
- Route or URL: `docs/assignments/shipyard/PRESEARCH.md`
- Interaction: inspect the persistent-loop section and the generated diagrams/assets
- Expected result: the pack now says active work can be interrupted cooperatively and new instructions are merged into the same session
- Failure signal: the pack still reads like a restart-only or post-completion follow-up model

## User Checkpoint Test

1. Open `docs/assignments/shipyard/PRESEARCH.md` and review the final recommendation plus persistent-loop section.
2. Confirm the doc now explains how a new instruction is handled while the agent is already working.
3. Inspect the regenerated architecture diagram and confirm the session queue/inbox reflects interruptible same-session work.

## What To Test

- Route or URL: `docs/assignments/shipyard/PRESEARCH.md`
- Interaction: review the persistent-loop and tracing sections, then inspect `docs/assignments/shipyard/output/assets/architecture_flow.png`
- Expected visible result: the Shipyard pack explicitly preserves interruptible same-session execution and queued follow-up integration
- Failure signal: the prose or visuals still imply the agent must finish or restart before it can accept new instructions

## Checkpoint Result

- Outcome: Passed
- Evidence: `PYTHONPATH=/tmp/shipyard_render_deps python3 docs/assignments/shipyard/render_submission_pdf.py` passed after installing `pillow` and `reportlab` into `/tmp/shipyard_render_deps`; `git diff --check` passed; `find docs/assignments/shipyard -maxdepth 3 -type f | sort` passed; `rg -n "interrupt|same session|queued instruction|safe checkpoint|interruptible" docs/user-stories docs/assignments/shipyard` passed.
- Residual risk: This story preserves the runtime contract in the checked-in Shipyard docs and generated submission assets, but the Shipyard runtime itself still needs to be implemented against that requirement in a future story.
