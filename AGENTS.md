# Ship Agent Instructions

`AGENTS.md` is the primary checked-in rulebook for this repository.
If another checked-in instruction file disagrees with this file, follow `AGENTS.md`.

## Read Order

Load context in this order before making non-trivial changes:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. The active story file in `docs/user-stories/`
7. `docs/DEFINITION_OF_DONE.md`
8. `docs/assignments/fleetgraph/README.md`, `docs/assignments/fleetgraph/PRESEARCH.md`, and `docs/assignments/fleetgraph/FLEETGRAPH.md` when the task touches FleetGraph
9. `.claude/CLAUDE.md` as a secondary Ship appendix for commands, architecture notes, and deployment details

## Working Model

- Build by checked-in story, not by chat memory.
- Treat `docs/user-stories/README.md` as the master queue and dependency graph.
- Use the active story file as the execution contract for scope, prep, tests, validation, deploy, and proof.
- Keep `docs/CONTEXT.md` current when live environment truth changes.
- Keep `docs/WORKFLOW_MEMORY.md` current when recurring corrections, decisions, or reusable patterns should persist across stories.
- Keep `docs/IMPLEMENTATION_STRATEGY.md` current when the broad roadmap or phase order changes.
- Use `docs/plans/` for design and implementation thinking.
- Use `docs/submissions/` for assembled review, demo, and submission bundles.

## Story Rules

- Every new implementation story starts on a fresh `codex/` branch.
- Keep one concern per branch.
- Do a preparation pass before edits: inspect the relevant code, contracts, and local docs first.
- Use TDD for behavior changes: red, green, refactor.
- Record validation, deployment status, and checkpoint evidence in the story and checkpoint logs.
- Narrow user corrections should stay narrow; do not quietly expand them into a new plan.
- When a change involves a non-obvious architectural trade-off, pause and check in with the user before committing to the higher-cost path.

## Validation Rules

- Run the story-specific validation commands listed in the active story.
- Run `git diff --check` before handoff.
- If the change touches the agent harness contract, run `bash scripts/check_ai_wiring.sh`.
- If the story changes visible behavior, include a user-facing verification checklist with exact routes and expected results.
- Final user-facing handoffs for visible behavior must include an explicit `What to test` section with the exact route, interaction, and expected visible result. Do not make the user infer the test from a linked doc alone.
- If the story changes visible behavior and the product supports a repeatable proof lane, create or refresh a named seeded verification entry and record its exact title and route in the story, audit checklist, and any relevant inspection guide.
- Do not call a story complete until `docs/DEFINITION_OF_DONE.md` is satisfied.

## Deployment Rules

- Deployment status must always be explicit: `deployed`, `not deployed`, or `blocked`.
- Record the environment, command, and proof path when something is deployed.
- The Railway public demo auto-deploys from `master`. Do not treat a manual post-merge Railway deploy as the default flow when the runtime change is already covered by that auto-deploy path.
- Only run a manual Railway demo deploy when the story explicitly changes deployment plumbing, the auto-deploy path is known broken, or the user asks for a manual refresh.
- For deploy-relevant stories that land on an auto-deployed surface, monitor the post-merge deployment after `master` updates and do not treat the story as truly complete until the deployment is observed green or an exact blocker is recorded.
- If the post-merge deployment fails, treat that failure as part of the same story follow-through: inspect the deploy logs, fix the issue, and merge the remediation until the deployment succeeds or an external blocker is explicit.
- If deployment or finalization fails, use `docs/guides/finalization-recovery.md`.

## Finalization Default

- Once the requested work is complete, default to the full GitHub flow automatically: commit the branch, push it, open a PR, merge it to `master`, sync local `master`, and delete the branch unless the user explicitly asks to pause finalization or use a different merge path.
- If GitHub tooling or auth is unavailable, report the exact blocker instead of stopping at a vague “ready to merge” handoff.

## Maintenance Rule

- When the same correction or review note repeats, update `AGENTS.md` or the nearest story/harness doc so the fix persists.
