# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-POLISH-PHASE
- Story Title: Define the remaining FleetGraph UI polish pack
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `web/src/components/FleetGraphFindingsPanel.tsx`
  - `web/src/components/FleetGraphFindingCard.tsx`
  - `web/src/components/FleetGraphEntryCard.tsx`
  - `web/src/components/FleetGraphDebugDisclosure.tsx`
  - new supporting debug-surface component if added
  - supporting presentation helpers under `web/src/lib/`
  - focused UI tests under `web/src/components/`
  - `docs/guides/fleetgraph-demo-inspection.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/user-audit-checklist.md`
- Public interfaces/contracts:
  - the proactive FleetGraph card
  - the entry/approval-preview FleetGraph card
  - the optional debug/details affordance
  - the live Railway demo inspection path
- Data flow summary:
  - current findings and entry results already provide enough data for copy, hierarchy, and debug-surface polish
  - dismiss and snooze now work on the live Railway demo and should be protected by regression checks rather than treated as the main bug
  - approval-preview copy and worker-summary presentation can be improved entirely in the frontend presentation layer
  - a small persistent debug console can be composed from the already-fetched entry/finding metadata without adding a new backend route

## Pack Cohesion and Sequencing (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - finish human-centered copy cleanup on the visible FleetGraph UI
  - provide a better QA/debug surface without re-polluting the primary UI
  - add modest visual hierarchy and calm to the cards
  - end with a refreshed live QA pass
- Story ordering rationale:
  - `T301` rewrites the remaining awkward approval-preview and summary copy first so the most obvious language issues disappear early.
  - `T302` adds a small persistent debug console or similar secondary diagnostic surface so QA can inspect details without reintroducing them into the main cards.
  - `T303` applies modest visual hierarchy polish after the copy and debug structure are settled.
  - `T304` refreshes the live audit path, screenshots, and regression notes after the polished UI ships.
- Gaps/overlap check:
  - `T301` owns human-language changes and summary presentation, not debug-surface architecture.
  - `T302` owns the optional debug surface, not the main-card visual polish.
  - `T303` owns modest visual hierarchy and calm, not new product capability or navigation changes.
  - `T304` owns live QA evidence and refreshed inspection materials.
- Whole-pack success signal:
  - the live Railway demo shows clearer approval-preview and summary copy, an easy optional debug surface, calmer visual hierarchy, and one accurate end-to-end audit path.

## Architecture Decisions
- Decision: treat dismiss/snooze as regression checks, not the core defect, because both now succeed on the live Railway demo.
- Alternatives considered: keep mutation trust as the first story anyway; delay polish until another user audit.
- Rationale: the next pack should stay honest to current live behavior and focus on the remaining real rough edges.

- Decision: keep the debug surface inside the page as a clearly secondary affordance instead of moving technical data back into the main cards.
- Alternatives considered: keep only collapsible inline disclosures; expose a separate debugging page.
- Rationale: the user explicitly wants a more inspectable QA/debug surface, but the primary UI still needs to stay calm and human-centered.

- Decision: keep the visual work modest and localized to the FleetGraph cards.
- Alternatives considered: full redesign of the week page or FleetGraph surfaces.
- Rationale: the user asked for “not too much work” and the current issues are mostly about copy, hierarchy, and inspection ergonomics.

## Root-Cause Findings
- Approval-preview copy finding:
  - `web/src/components/FleetGraphEntryCard.tsx` still renders `FleetGraph Demo Week - Review and Apply with 3 breadcrumb level(s).` in the primary approval-preview summary, which reads like implementation detail rather than product language.
- Worker-summary finding:
  - `web/src/components/FleetGraphFindingsPanel.tsx` currently renders generated summary strings that are accurate but verbose and system-shaped on the worker-generated finding.
- Debug-surface finding:
  - the current `Debug details` disclosure is better than the old default exposure, but it still requires per-card drilling and does not satisfy the user’s request for a persistent debugging surface during QA.
- Visual-hierarchy finding:
  - the main cards are calmer than before, but the evidence lists and section rhythm still feel flatter and more bullet-heavy than the rest of Ship’s interface.

## Data Model / API Contracts
- Request shape:
  - preserve existing same-origin FleetGraph routes and response contracts
- Response shape:
  - no new backend response contract is required unless a tiny frontend-only presentational adapter needs a derived field
- Storage/index changes:
  - none expected; this pack should remain frontend- and docs-heavy

## Dependency Plan
- Existing dependencies used:
  - React
  - TanStack Query
  - current Ship component primitives and Tailwind styles
- New dependencies proposed (if any):
  - none
- Risk and mitigation:
  - Risk: the debug surface becomes noisy or distracting.
    - Mitigation: keep it collapsible/minimizable, anchored consistently, and clearly secondary.
  - Risk: copy rewrites accidentally hide useful signal meaning.
    - Mitigation: keep meaning stable and protect it with focused component tests.
  - Risk: visual polish drifts into redesign work.
    - Mitigation: bound the work to spacing, grouping, typography emphasis, and calmer evidence presentation only.
  - Risk: live regression behavior drifts while polish ships.
    - Mitigation: keep dismiss/snooze/apply as recurring live QA checks through the pack.

## Test Strategy
- Unit tests:
  - summary/detail presenters for approval-preview and worker findings
  - debug-surface behavior and visibility rules
- Integration tests:
  - finding card + entry card render the new copy and keep debug data secondary
  - dismiss/snooze feedback remains truthful as a regression guard
- E2E or smoke tests:
  - live Railway inspection for review/apply, approval-preview, and worker-generated lanes after each merged story
  - screenshot refresh at the end of the pack
- Edge-case coverage mapping:
  - long titles or missing debug fields
  - empty debug data with a present card
  - visible mutation controls plus optional debug surface together

## UI Implementation Plan (if applicable)
- Behavior logic modules:
  - presenter helpers for more natural summary/detail strings
  - debug-surface aggregation for entry and proactive metadata
  - card-level copy/hierarchy tuning
- Component structure:
  - keep proactive and entry cards as the primary units
  - add one small secondary debug surface anchored consistently on the page if it improves QA
  - preserve the current progressive disclosure model for users who ignore diagnostics entirely
- Accessibility implementation plan:
  - keyboard reachable debug toggle
  - clear headings, labels, and button text
  - maintain stable focus when opening or closing the debug surface
- Visual regression capture plan:
  - polished approval-preview state
  - polished worker-generated card
  - debug surface open
  - final QA screenshots on the live demo

## Rollout and Risk Mitigation
- Rollback strategy:
  - keep copy, debug surface, and visual polish separable across stories
- Feature flags/toggles:
  - none required unless the debug surface needs a lightweight visibility preference
- Observability checks:
  - live Railway verification after each merged runtime story
  - refreshed screenshots and final audit checklist in `T304`

## Validation Commands
```bash
pnpm --filter @ship/web exec vitest run src/components/FleetGraphFindingsPanel.test.tsx src/components/FleetGraphEntryCard.test.tsx
pnpm --filter @ship/web type-check
pnpm --filter @ship/web build
```
