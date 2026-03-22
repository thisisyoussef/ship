# Definition of Done Checklist

Use this checklist for every implementation story.
All items should be complete before the story is marked `done`.

## Core Completion

- [ ] Story scope is complete.
- [ ] Story status is updated in the story file and the relevant checkpoint log.
- [ ] The master queue in `docs/user-stories/README.md` reflects the latest status.
- [ ] Branch, commit SHA, and review reference are recorded where the story expects them.

## Engineering Validation

- [ ] Preparation notes were completed before implementation.
- [ ] Tests required by the story were written or updated.
- [ ] Story-specific validation commands passed, or an explicit blocker/exception is recorded.
- [ ] `git diff --check` passed.
- [ ] `bash scripts/check_ai_wiring.sh` passed when the harness contract changed.

## Deployment and Runtime Truth

- [ ] Deployment status is explicit: `deployed`, `not deployed`, or `blocked`.
- [ ] Environment and command evidence are recorded when a deploy happened.
- [ ] User-facing verification steps and expected results are recorded.
- [ ] Actual observed verification result is recorded.

## Handoff

- [ ] Residual risks or follow-ups are documented.
- [ ] The user-facing audit checklist is concrete enough to run without code context.
- [ ] If finalization or deployment failed, the recovery path is recorded.
