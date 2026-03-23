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
- Treat `docs/user-stories/README.md` on `master` as the joining source of truth for parallel story ownership and execution order.
- Use the active story file as the execution contract for scope, prep, tests, validation, deploy, and proof.
- Treat `master` as the shared integration trunk. Parallel story branches may be active at the same time; do not assume exclusive ownership of the repo.
- Keep `docs/CONTEXT.md` current when live environment truth changes.
- Keep `docs/WORKFLOW_MEMORY.md` current when recurring corrections, decisions, or reusable patterns should persist across stories.
- Keep `docs/IMPLEMENTATION_STRATEGY.md` current when the broad roadmap or phase order changes.
- Use `docs/plans/` for design and implementation thinking.
- Use `docs/submissions/` for assembled review, demo, and submission bundles.

## Queue-Truth Preflight

Before you choose a next story, recommend a parallel lane, or start new story work:

1. Compare `master`'s checked-in queue with the actual local git state.
2. Use `git worktree list` and `git branch -vv` as the default queue-truth check.
3. Reconcile the `Active Work` section in `docs/user-stories/README.md` plus the relevant phase README with what is actually in flight before claiming a story is free or blocked.
4. If the queue is stale, land a docs-only queue correction on `master` first or record the exact blocker before continuing.

## Story Rules

- Run the queue-truth preflight before branching for a new story or telling the user what is available next.
- Every new user story starts by checking out a fresh `codex/` branch from current `master` before editing the story file or implementation.
- Parallel branch-based work by multiple agents is expected. Keep one concern per branch and do not piggyback a new concern on another in-flight branch unless the user explicitly asks for stacked work.
- When parallel work starts or changes status, update the checked-in queue files and make sure that visibility lands on `master` promptly. Do not leave active-work ownership stranded only on the in-flight feature branch.
- Record any sibling-branch dependency or required merge order in the active story when the work is not independent.
- When the user asks to continue, choose the next story, or create a new story, explicitly say whether another checked-in story can run in parallel right now.
- If a parallel lane exists, name the recommended story ID and provide a ready-to-send copy-paste prompt inline in chat for the other agent. Do not create a prompt file unless the user explicitly asks for one.
- If no additional queued story is unblocked for parallel work, say so plainly and name the blocking dependency or merge order reason.
- Do a preparation pass before edits: inspect the relevant code, contracts, and local docs first.
- Use TDD for behavior changes: red, green, refactor.
- Record validation, deployment status, and checkpoint evidence in the story and checkpoint logs.
- Narrow user corrections should stay narrow; do not quietly expand them into a new plan.
- When a change involves a non-obvious architectural trade-off, pause and check in with the user before committing to the higher-cost path.

## Validation Rules

- Run the story-specific validation commands listed in the active story.
- If another branch lands on `master` while the story is in flight, refresh from latest `master` and rerun the story-specific validation commands before finalization.
- Run `git diff --check` before handoff.
- If the change touches the agent harness contract, run `bash scripts/check_ai_wiring.sh`.
- If the story changes visible behavior, include a user-facing verification checklist with exact routes and expected results.
- Final user-facing handoffs for visible behavior must include an explicit `What to test` section with the exact route, interaction, and expected visible result. Do not make the user infer the test from a linked doc alone.
- If the story changes visible behavior and the product supports a repeatable proof lane, create or refresh a named seeded verification entry and record its exact title and route in the story, audit checklist, and any relevant inspection guide.
- Do not make agent-run browser walkthroughs or Playwright checks the default completion gate for visible stories. Prefer local validation, seeded proof lanes, deploy monitoring, and authenticated runtime or API checks first.
- Use browser automation only when the user explicitly asks for it or when the story specifically needs visual debugging that lighter proof paths cannot cover.
- Do not call a story complete until `docs/DEFINITION_OF_DONE.md` is satisfied.

## Deployment Rules

- Deployment status must always be explicit: `deployed`, `not deployed`, or `blocked`.
- Record the environment, command, and proof path when something is deployed.
- The Railway public demo auto-deploys from `master`. Do not treat a manual post-merge Railway deploy as the default flow when the runtime change is already covered by that auto-deploy path.
- Only run a manual Railway demo deploy when the story explicitly changes deployment plumbing, the auto-deploy path is known broken, or the user asks for a manual refresh.
- For deploy-relevant stories that land on an auto-deployed surface, treat the live deployed surface as the source of truth after `master` updates.
- Do not treat a failing GitHub Actions deploy job as a blocker by itself when the Railway demo is already syncing and the live surface reflects the merged change.
- If the live auto-deployed surface does not pick up the merged change, treat that as part of the same story follow-through: inspect the real deploy path, fix the issue, and merge the remediation until the live surface updates or an external blocker is explicit.
- If deployment or finalization fails, use `docs/guides/finalization-recovery.md`.

## Finalization Default

- Once the requested work is complete, default to the full GitHub flow automatically: commit the branch, push it, open a PR, merge it to `master`, sync local `master`, and delete the branch unless the user explicitly asks to pause finalization or use a different merge path.
- Merge each story branch independently. Do not batch unrelated agent branches together or reuse a sibling branch just because it already exists.
- Before finalization, inspect the shared merge lock with `bash scripts/merge_lock.sh status`. The single source of truth is the merge lock file in the repo's git common dir, as described in `docs/guides/merge-coordination.md`.
- If another branch holds the merge lock, wait, then refresh from latest `master`, rerun validation, and only then claim the merge lock for the current branch.
- Claim the merge lock for the current branch with explicit wait instructions before opening or merging the PR, and release it after finalization or record the exact blocker if it stays held.
- Before opening or merging the PR, ensure the branch is current with `master`; if sibling branches landed first, rebase or merge `master`, resolve conflicts, rerun validation, then continue the default GitHub flow.
- Treat merge-to-`master` as the default end of the story branch lifecycle; if that merge does not happen, record the exact blocker instead of silently leaving the story branch open.
- If another in-flight branch must land first, keep this branch open only long enough to record the exact dependency, refresh from the new `master`, and complete the merge flow afterward.
- If GitHub tooling or auth is unavailable, report the exact blocker instead of stopping at a vague “ready to merge” handoff.

## Maintenance Rule

- When the same correction or review note repeats, update `AGENTS.md` or the nearest story/harness doc so the fix persists.
- Story ownership visibility is mandatory. As soon as a checked-in story is actively being worked on, update the story file, `docs/user-stories/README.md`, and the relevant phase README to show `in-progress` plus the current owner, branch, and worktree path when applicable. Do the same when a story becomes blocked, handed off, or done.
- If the active-work visibility change is needed before the implementation story itself is ready to merge, land that queue update on `master` as a small workflow/docs correction so other agents can join from the real shared source of truth.
