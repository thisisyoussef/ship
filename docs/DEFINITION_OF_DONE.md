# Definition of Done Checklist

Use this checklist for every implementation story.
All items should be complete before the story is marked `done`.

## Core Completion

- [ ] Story scope is complete.
- [ ] Story status is updated in the story file and the relevant checkpoint log.
- [ ] The master queue in `docs/user-stories/README.md` reflects the latest status.
- [ ] If the story ran in parallel, queue-truth visibility on `master` was reconciled when work started, not only at final merge time.
- [ ] Branch, commit SHA, and review reference are recorded where the story expects them.
- [ ] Any sibling-branch dependency or merge order was recorded when parallel work existed.

## Engineering Validation

- [ ] Preparation notes were completed before implementation.
- [ ] Tests required by the story were written or updated.
- [ ] Story-specific validation commands passed, or an explicit blocker/exception is recorded.
- [ ] If sibling branches landed first, the branch was refreshed from latest `master` and story validation was rerun before merge.
- [ ] If finalization ran, the shared merge lock was claimed by this branch before merge and released afterward, or the exact blocker was recorded.
- [ ] `git diff --check` passed.
- [ ] `bash scripts/check_ai_wiring.sh` passed when the harness contract changed.

## Deployment and Runtime Truth

- [ ] Deployment status is explicit: `deployed`, `not deployed`, or `blocked`.
- [ ] Environment and command evidence are recorded when a deploy happened.
- [ ] For deploy-relevant stories on auto-deployed surfaces, the live deployed surface was checked or an exact blocker was recorded.
- [ ] User-facing verification steps and expected results are recorded.
- [ ] A named seeded verification entry or proof lane is recorded for visible stories when the product supports one.
- [ ] Actual observed runtime proof is recorded, using the lightest reliable path available.
- [ ] Agent-run browser verification is only required when the story explicitly needs visual debugging or the user asks for it.

## Handoff

- [ ] Residual risks or follow-ups are documented.
- [ ] The user-facing audit checklist is concrete enough to run without code context.
- [ ] The final user-facing handoff includes an explicit `What to test` section when behavior changed visibly.
- [ ] If next-step guidance was given, it explicitly states whether another checked-in story can run in parallel now; when one exists, it includes a copy-paste prompt inline in chat instead of writing a file.
- [ ] Merge lock blockers or wait instructions were recorded when they affected finalization.
- [ ] If finalization or deployment failed, the recovery path is recorded.
