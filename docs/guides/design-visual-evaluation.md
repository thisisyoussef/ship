# Design Visual Evaluation Guide

Use this guide when a design-heavy story needs screenshot-driven iteration, implementation-fidelity checks, or targeted visual debugging after a canvas or code pass.

## What This Guide Is For

- closing the gap between "roughly right" and "intentionally right"
- comparing the current UI against the active story, design brief, and chosen references
- giving Codex and Claude the same rubric for deciding whether another visual iteration is worthwhile
- making responsiveness an explicit review dimension instead of a late afterthought

## What Stays Canonical

The source of truth is still:

1. the active story
2. the chosen design canvas, when the story uses one
3. the implemented code in the repo

Screenshots, Playwright captures, and critique notes are evidence.
They should inform the next change, not replace the story or canvas as the canonical design source.

## Default Capture Surface

- Use the tracked Playwright MCP server in `.mcp.json` when the UI is browser-based and the story needs visual debugging or fidelity checks.
- Prefer targeted viewport or element screenshots over full-page captures unless overall page flow is the thing being evaluated.
- Save screenshot artifacts in `docs/evidence/screenshots/` only when they materially help the story, proof lane, or final handoff.
- Use a non-browser screenshot path only for surfaces Playwright cannot reach, and keep that setup user-scoped instead of checking it into the repo.

## When To Skip This Loop

- The story is not design-heavy.
- A direct seeded proof lane, runtime check, or API check is enough to validate the change.
- The next action is already obvious from code or tests and a screenshot will not change the decision.

## Default Loop

1. Choose the exact route and state.
   - Use the active story, local route, or named proof lane.
   - Record any seed data, auth, or environment assumptions.
2. Define the rubric before capturing.
   - Pick the three to five rubric dimensions that matter most for this story.
   - Write down the specific visual question you are trying to answer.
3. Capture the current UI.
   - Use the breakpoints that matter for the story instead of capturing every size by default.
   - Keep the capture area stable between iterations.
4. Evaluate and classify.
   - Mark each rubric dimension as `pass`, `attention`, or `fail`.
   - Fix the highest-value issue first.
5. Iterate once.
   - Make the smallest useful change in Paper, Pencil, or repo code.
   - Re-capture the affected surface before widening the pass.
6. Stop deliberately.
   - Stop when no critical failures remain and the remaining differences are preference-level, not clarity, usability, or fidelity problems.

## Visual Rubric

| Dimension | Pass signal | Failure signal | Typical next move |
| --- | --- | --- | --- |
| Hierarchy and focus | The primary task or message is obvious in the first viewport | Everything feels equally loud or the eye lands in the wrong place | Adjust size, weight, spacing, grouping, or contrast |
| Spacing and alignment | Layout rhythm feels consistent and container edges line up cleanly | Sections feel cramped, floaty, or accidentally uneven | Normalize spacing tokens, grid alignment, and container widths |
| Typography and copy fit | Scale, line length, and emphasis are readable and stable | Text wraps awkwardly, scales fight each other, or labels overflow | Adjust type scale, widths, copy breaks, or heading/body balance |
| Color and state clarity | Contrast is strong enough and states read clearly | Actions look washed out or state changes are hard to read | Tighten token use and strengthen state styling |
| Affordance and interaction | Clickable controls look interactive and current state is visible | Buttons, tabs, or inputs feel inert or ambiguous | Strengthen fill, border, hover, focus, or selected-state treatment |
| Responsiveness | The layout holds at the target breakpoints without overflow or clipping | Panels overlap, text gets cut off, or hierarchy collapses on resize | Adjust stack rules, min widths, wrapping, or responsive spacing |
| Fidelity and reuse | The chosen visual direction is visible and tokens/primitives are reused | The implementation drifts from the brief or uses one-off styling | Move the fix into shared tokens, components, or layout primitives |

## Recording Guidance

Record the visual-eval loop in the active story or `docs/plans/`:

- exact route or proof lane used
- breakpoints captured
- rubric dimensions used
- top findings and what changed
- screenshot filenames, if artifacts were saved

In final handoff:

- keep `What To Test` concrete
- mention screenshot evidence only when it materially helps the reviewer
- do not replace normal validation with a screenshot alone

## Codex and Claude Routing

- Codex and other repo-local agents can use `.mcp.json` as the default Playwright MCP contract for browser capture.
- Claude-oriented workflows should use the same rubric and capture loop and keep any local Playwright registration user-scoped.
- Both should use this guide to decide whether another visual iteration is worth the cost before widening the UI change.
