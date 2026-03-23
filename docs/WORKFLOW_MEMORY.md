# Workflow Memory

Use this file as durable working memory for recurring corrections, decisions, and patterns that future stories should keep in mind.

## How To Use It

1. Read this after `docs/CONTEXT.md` and before planning or implementation.
2. Add a note when the user makes a recurring correction, when a workflow decision should persist, or when a pattern proves useful across stories.
3. If a note becomes a hard rule, promote it into `AGENTS.md` or the nearest stronger contract as well.

## Durable Workflow Decisions

- Automatic finalization is the default.
  Source: `US-901`, follow-on user direction
  Meaning: once requested work is complete, finish the GitHub flow automatically unless the user explicitly asks to pause or use a different merge path.
- Story branch lifecycle is mandatory.
  Source: post-`US-905` user correction
  Meaning: before editing a story file or implementation, switch to a fresh `codex/` branch from current `master` for that story; when the story is complete, use the default finalization flow to merge it back to `master` unless the user explicitly pauses or an exact blocker is recorded.
- Parallel branch-based work is expected.
  Source: post-`US-907` user correction
  Meaning: assume multiple agents may be working at the same time; each concern should start on its own fresh branch from current `master` instead of reusing a sibling branch, including harness/workflow updates.
- Re-sync before merge when sibling branches land first.
  Source: post-`US-907` user correction
  Meaning: if another branch merges while your story is still in flight, refresh from latest `master`, resolve conflicts, rerun the story validation, and only then finalize.
- Parallel-lane availability must be surfaced explicitly.
  Source: post-`US-908` user correction
  Meaning: when the user asks to continue, choose the next story, or create a story, explicitly say whether another checked-in story is unblocked for parallel work right now instead of leaving that inference implicit.
- Active story ownership must be visible in the checked-in queue.
  Source: post-`US-909` follow-up
  Meaning: when a story is actually being worked on, mark it `in-progress` in the story file, root queue, and phase queue, and include the active owner, branch, and worktree path when one exists.
- Queue truth must be reconciled before new branching or next-story guidance.
  Source: post-`US-617`/`US-615` queue drift correction
  Meaning: before choosing the next story, recommending a parallel lane, or creating a new branch, compare `master`'s queue against `git worktree list` and `git branch -vv`. If they disagree, land a queue correction on `master` first or record the exact blocker.
- Copy-paste prompts for parallel agents stay in chat.
  Source: post-`US-908` user correction
  Meaning: when a parallel lane exists, include a ready-to-send prompt inline in the chat response for the other agent; do not create a prompt file unless the user explicitly asks.
- Railway demo deploys should follow the real platform path.
  Source: post-`US-602` correction
  Meaning: when the demo already auto-deploys from `master`, do not add a manual Railway deploy attempt to the default closeout flow unless the story is about deployment itself or the user explicitly asks for a manual refresh.
- Post-merge deploy observation is part of deploy-relevant story completion.
  Source: post-`US-602` deployment follow-up
  Meaning: after merging deploy-relevant work to `master`, use the live auto-deployed surface as the source of truth. A failing GitHub deploy action is not a blocker by itself when the Railway demo is already syncing and showing the merged change.
- Check in on non-obvious architectural trade-offs.
  Source: FleetGraph follow-on after `US-601`
  Meaning: if there is a materially higher-cost or broader path, pause and confirm before taking it.
- Keep one concern per branch.
  Source: `AGENTS.md` plus recent workflow cleanup
  Meaning: separate harness/workflow changes from product-feature changes unless they are truly the same story, even when other agents already have branches in flight.
- Visible stories should leave behind a repeatable proof lane when the product supports one.
  Source: `US-902`
  Meaning: create or refresh a named seeded verification entry and record it in the story, audit checklist, and relevant guide.

## Recurring Corrections

- Final handoff must say exactly what to test.
  Source: post-`US-602` correction
  Apply this by including a short `What to test` section with the exact route, interaction, and expected result instead of only pointing at a guide or proof lane.
- Agent-side browser verification is not the default closeout path.
  Source: post-`US-610` correction
  Apply this by preferring seeded proof lanes, authenticated runtime or API checks, deploy monitoring, and explicit user test steps before reaching for Playwright or a manual browser walkthrough.
- Approval-preview copy should explain why the action matters to the user, not backend mechanics.
  Source: post-`US-601` correction
  Apply this by preferring language like “the team can move forward with this week” over language like “changes persistent sprint approval state.”
- Notes, tests, and evidence helpers should be updated together when visible copy changes.
  Source: post-`US-601` correction
  Apply this by checking UI payload builders, regression tests, inspection guides, and any capture scripts in the same pass.
- Visible FleetGraph proof should use surfaced Ship state, not hidden internal state.
  Source: post-`US-603` review-tab pivot
  Apply this by preferring actions whose success is immediately visible on the current page, such as review-tab `Plan Validation`, instead of asking users to infer success from state that is absent or inconsistently rendered.
- Repeatable proof lanes need resettable seeded state, not one-time happy-path data.
  Source: post-`US-604` validation retest follow-up
  Apply this by giving demo verification flows a dedicated seeded document whose visible state is reset on bootstrap, instead of reusing a lane that can be consumed during prior testing.

## Reusable Product Patterns

- FleetGraph current-page approval-preview proof lane:
  Use `FleetGraph Demo Week - Review and Apply` on the Railway demo for fast inspection of the entry-card approval-preview surface.
- FleetGraph preview-to-apply convergence:
  When an entry-card preview already exists, prefer resuming the existing FleetGraph thread through a small entry action service before widening the general finding/action persistence model.
- FleetGraph approval preview must read live page state:
  Do not surface a consequential approval action from page type alone. Check the current approval state first so already-approved pages do not re-offer the same step.
- FleetGraph story order:
  Finish the already-real on-demand surfaces before paying the shared proactive widening cost.
- Page-local FleetGraph state must stay above loading and error returns:
  When adding hooks to `UnifiedDocumentPage`, keep them before any early return branches so the document page does not crash between loading and loaded renders.

## Update Triggers

Add or refresh a note here when:

- a correction repeats more than once
- a decision changes how future stories should be executed
- a product proof lane becomes the standard inspection target
- a useful implementation pattern keeps coming up across stories
