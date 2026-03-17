# Feature Spec

## Story
- Story ID: FLEETGRAPH-FEEDBACK-ROUND2-PHASE
- Story Title: FleetGraph second live-inspection follow-on pack

## Problem

The first FleetGraph polish pack made the proactive surface calmer and more discoverable, but the next live inspection still exposed a few product-facing defects on the named demo week page:

- the document page still traps page-level scrolling after the FleetGraph panels are inserted above the week content
- the review/apply flow can effectively confirm too quickly because the confirmation action replaces the trigger in the same area
- the suggested-action block still contains redundant phrasing
- the inline review state needs stronger, more readable emphasis

These are now the highest-priority FleetGraph UI issues because they directly affect trust and inspectability on the public demo.

## Objectives

- Restore comfortable scrolling on the named FleetGraph demo week pages.
- Make `Review and apply` safe and inspectable before any Ship mutation occurs.
- Remove the duplicated/awkward action language and strengthen the inline review state.
- Refresh the live audit path after the fixes land.

## User-Facing Outcomes

- A reviewer can scroll the FleetGraph demo week page naturally without the page feeling clipped.
- Clicking `Review and apply` shows a readable review state without accidentally starting the week.
- The suggested-action section reads clearly and does not repeat itself.
- The next UI audit checklist matches the fixed live Railway behavior.

## Acceptance Criteria

- [ ] AC-1: The named FleetGraph week pages scroll naturally on the public Railway demo with the proactive and entry panels mounted.
- [ ] AC-2: `Review and apply` never causes an immediate Ship mutation from the same click gesture; the user must complete a distinct confirmation step.
- [ ] AC-3: The suggested-action section no longer duplicates `Suggested next step` as both a section label and the default badge text.
- [ ] AC-4: The inline review state uses clearer emphasis and stronger readable text on the shipped FleetGraph surface.
- [ ] AC-5: The refreshed live inspection guide and pack-level checklist match the fixed behavior.

## Edge Cases

- The page should still scroll correctly when there are no proactive findings.
- The safe-confirmation guard must not block a deliberate follow-up click after the review state is visible.
- The layout fix must preserve the existing tabbed document behavior on non-FleetGraph document pages.
- If the week is already active, the finding can still render an already-applied result without exposing the unsafe review state.

## Out of Scope

- New FleetGraph intelligence or data-source changes
- Redesigning the FleetGraph cards from scratch
- Expanding the number of demo proof lanes
- Changing the REST-only Ship product data boundary

## Design Mapping

- Calm Over Clever: keep the fix modest and stable instead of introducing a new heavy interaction pattern.
- Honest Interfaces: the confirmation step must be truthful and require a separate intentional user action.
- Typography as Architecture: fix hierarchy with stronger emphasis and less repeated phrasing before adding more chrome.
- Earned Complexity: keep debug detail secondary and do not reintroduce technical copy into the primary surface.
