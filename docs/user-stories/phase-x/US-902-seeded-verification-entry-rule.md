# US-902: Seeded Verification Entry Rule

## Status

- State: `done`
- Owner: Codex
- Depends on: `US-901`
- Related branch: `codex/fleetgraph-seeded-verification-rule`
- Related commit/PR: pending finalization
- Target environment: `repo-only`

## Persona

**Maintainers and reviewers** want each visible story to leave behind a repeatable proof lane so shipped behavior is easy to inspect without reconstructing state manually.

## User Story

> As a reviewer, I want visible stories to create or refresh a named seeded verification entry when possible so I can inspect the shipped behavior quickly from the product.

## Goal

Make the seeded-proof-lane expectation part of the checked-in workflow instead of an informal preference, and tighten the FleetGraph inspection docs so the currently shipped approval-preview change has an obvious named place to inspect it.

## Scope

In scope:

1. Update the checked-in harness rules to require a named seeded verification entry or proof lane for visible stories when the product supports one.
2. Update the story template and authoring guide so future stories record that proof lane explicitly.
3. Refresh FleetGraph inspection guidance to point at the current approval-preview proof lane.

Out of scope:

1. Building new seed data or proof lanes for stories that are not already visible and inspectable.
2. Changing FleetGraph product behavior.

## Pre-Implementation Audit

Local sources to read before writing code:

1. `AGENTS.md` — primary harness contract
2. `docs/DEFINITION_OF_DONE.md` — completion gate
3. `docs/user-stories/TEMPLATE.md` — executable story shape
4. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md` — story-authoring contract
5. `docs/guides/fleetgraph-demo-inspection.md` — current FleetGraph proof-lane inspection guide
6. `docs/user-stories/phase-2/US-601-current-page-approval-preview.md` — nearby visible FleetGraph story

## Preparation Phase

1. Read the local code and contracts listed above.
2. Confirm where the visible-proof expectation should live permanently.
3. Write preparation notes before implementation.

### Preparation Notes

Local docs/code reviewed:

1. `AGENTS.md`
2. `docs/DEFINITION_OF_DONE.md`
3. `docs/user-stories/README.md`
4. `docs/user-stories/TEMPLATE.md`
5. `docs/user-stories/HOW_TO_CREATE_USER_STORIES.md`
6. `docs/guides/fleetgraph-demo-inspection.md`
7. `docs/user-stories/phase-2/US-601-current-page-approval-preview.md`

Expected contracts/data shapes:

1. The durable rule belongs in `AGENTS.md`, with supporting enforcement in the story template and done checklist.
2. Visible stories should identify a named proof lane or seeded verification entry when the surface supports repeatable seed/bootstrap state.
3. FleetGraph already has a named approval-preview inspection target in the demo guide, so this story should document it more explicitly instead of inventing a new lane.

Planned failing tests:

1. Harness docs are missing a durable seeded-verification-entry rule.
2. The story template does not currently require a named proof lane in `How To Verify`.
3. The FleetGraph demo guide does not explicitly call out the approval-preview proof lane as the current place to inspect the shipped change.

## UX Script

Happy path:

1. A visible story lands.
2. The story file and audit checklist point to a named seeded verification entry.
3. A reviewer opens that proof lane directly and inspects the shipped behavior without extra setup.

Error path:

1. A visible story lands without a named proof lane.
2. Reviewers must hunt for the changed state manually.
3. The story should now fail the documented workflow expectation and be corrected before future handoff.

## Preconditions

- [x] Current harness docs were audited
- [x] A visible FleetGraph proof lane already exists
- [x] Working branch exists

## TDD Plan

1. Update the durable workflow rule surfaces first.
2. Update the story template and authoring guide to force the proof-lane field into future stories.
3. Refresh the current FleetGraph inspection guide so the shipped approval-preview change has an explicit inspection path.

## Step-by-step Implementation Plan

1. Add the seeded-verification-entry rule to `AGENTS.md` and `docs/DEFINITION_OF_DONE.md`.
2. Add the same expectation to the story template and authoring guide.
3. Update the queue and checkpoint docs for this phase-x story.
4. Refresh the FleetGraph demo inspection guide and the related FleetGraph story doc with the exact proof lane for approval preview.
5. Run harness validation and diff checks.

## Acceptance Criteria

- [x] AC-1: `AGENTS.md` requires a named seeded verification entry or proof lane for visible stories when applicable.
- [x] AC-2: Story authors are prompted to record that proof lane in the template and authoring guide.
- [x] AC-3: FleetGraph inspection docs point clearly at the current proof lane for the shipped approval-preview story.

## Local Validation

Run these before handoff:

```bash
bash scripts/check_ai_wiring.sh
git diff --check
```

## Deployment Handoff

1. This is a repo-only workflow story.
2. Deployment status should be `not deployed`.
3. Record validation evidence in the checkpoint log and handoff.

## How To Verify

- Seeded verification entry or proof lane: `FleetGraph Demo Week - Review and Apply`
- Route or URL: `docs/guides/fleetgraph-demo-inspection.md` and the public demo route it names
- Interaction: inspect the workflow docs for the new requirement, then open the named FleetGraph proof lane and click `Preview approval step`
- Expected result: the workflow requires named proof lanes for visible stories, and the FleetGraph guide points directly at the seeded page that showcases the approval-preview behavior
- Failure signal: the harness still allows visible stories without a named verification target, or the FleetGraph guide leaves the approval-preview check ambiguous

## User Checkpoint Test

1. Open `AGENTS.md` and confirm visible stories must create or refresh a named seeded verification entry when applicable.
2. Open `docs/user-stories/TEMPLATE.md` and confirm the proof-lane field is part of `How To Verify`.
3. Open `docs/guides/fleetgraph-demo-inspection.md` and confirm `FleetGraph Demo Week - Review and Apply` is the explicit approval-preview proof lane.

## Checkpoint Result

- Outcome: Done
- Evidence: `bash scripts/check_ai_wiring.sh` passed; `git diff --check` passed; `AGENTS.md`, `docs/DEFINITION_OF_DONE.md`, and the story template/authoring guide now require named proof lanes for visible stories; the FleetGraph demo guide now names `FleetGraph Demo Week - Review and Apply` as the approval-preview proof lane.
- Residual risk: Some older completed stories may not yet backfill a named proof lane in their historical docs and can be updated opportunistically rather than treated as active contract drift.
