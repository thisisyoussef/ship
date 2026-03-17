# Technical Plan

## Metadata
- Story ID: FLEETGRAPH-FEEDBACK-PHASE
- Story Title: Define the first FleetGraph post-MVP feedback implementation pack
- Author: Codex
- Date: 2026-03-17

## Proposed Design
- Components/modules affected:
  - `web/src/pages/App.tsx`
  - `web/src/pages/Documents.tsx`
  - `web/src/pages/UnifiedDocumentPage.tsx`
  - `web/src/components/UnifiedEditor.tsx`
  - `web/src/components/document-tabs/WeekOverviewTab.tsx`
  - `web/src/components/document-tabs/WeekPlanningTab.tsx`
  - any supporting hooks or queries needed to expose weeks through standard navigation
  - `docs/guides/fleetgraph-demo-inspection.md`
  - `docs/specs/fleetgraph/FLEETGRAPH-MVP-PHASE/user-audit-checklist.md`
- Public interfaces/contracts:
  - the standard left-rail document navigation and `Documents` list surface
  - the `/documents/:id` week page layout for FleetGraph proof lanes
  - the pack-level FleetGraph UI audit checklist
- Data flow summary:
  - The current FleetGraph proof lanes are sprint documents seeded through the normal Ship document model.
  - Those weeks are visible by direct route or popup entry, but standard docs navigation still uses the legacy wiki-only query path.
  - The affected week page also uses nested flex/overflow containers that likely need a stricter `min-h-0` / scroll-container contract to avoid clipping after the FleetGraph panels are rendered.
  - The live snooze/dismiss APIs return success, so the reported user-facing failure appears to be a frontend interaction-trust problem rather than a broken backend route.
  - The primary FleetGraph UI still shows endpoint paths, thread ids, and system-oriented copy that should move behind an optional debug affordance.
  - The feedback pack should first restore reachability, then restore comfortable page interaction, then clean up action-state trust and user-facing copy, then refresh the pack-level QA script.

## Pack Cohesion and Sequencing (for phase packs or multi-story planning)
- Higher-level pack objectives:
  - restore discoverability of the deployed FleetGraph proof lanes
  - restore usability of the affected week page
  - refresh the whole-pack UI audit path after the fixes
- Story ordering rationale:
  - `T201` fixes navigation/discoverability first so the public proof lanes are reachable through normal UI before any deeper QA loop continues.
  - `T202` fixes the scroll/layout trap on the week page so the newly reachable proof lanes are comfortable to inspect and test.
  - `T203` fixes action-state trust, human-facing copy, debug/detail separation, and modest visual polish without turning the pack into a redesign.
  - `T204` refreshes the user audit checklist, demo inspection guide, and any visible proof artifacts after the fixes land so the next feedback cycle starts from current behavior.
- Gaps/overlap check:
  - `T201` owns reachability and list/sidebar discoverability, not page-layout mechanics.
  - `T202` owns scrollability and document-page usability, not list data sourcing.
  - `T203` owns trust/copy/polish on the existing FleetGraph surfaces, not new FleetGraph capabilities.
  - `T204` owns refreshed audit evidence and any non-blocking post-fix QA follow-ons.
- Whole-pack success signal:
  - a reviewer can open the public Railway demo, reach the named FleetGraph weeks through normal navigation, scroll the page normally, and then run one current UI audit checklist for the whole slice.

## Architecture Decisions
- Decision: treat the two live audit findings as a dedicated feedback pack instead of patching them ad hoc into unrelated branches.
- Alternatives considered: fold them into the current harness branch; fix them one at a time without pack-level planning.
- Rationale: they affect prod inspectability of the shipped MVP and should stay visible as a deliberate follow-on sequence.

- Decision: fix discoverability before polishing the page interaction details.
- Alternatives considered: fix the scroll trap first; make a single large “demo UX cleanup” story.
- Rationale: users need a standard path to reach the proof lanes before the page-level UX can be meaningfully re-audited.

- Decision: keep the solution inside existing Ship navigation and document contracts instead of inventing a FleetGraph-only shortcut surface.
- Alternatives considered: add one-off FleetGraph deep links or dedicated demo shortcuts.
- Rationale: the user feedback is about normal product navigation, so the fix should strengthen the real IA rather than work around it.

## Root-Cause Findings
- Discoverability finding:
  - `web/src/pages/App.tsx` left-nav docs mode uses `useDocuments()` from `DocumentsContext`, which is explicitly marked deprecated and wiki-only.
  - `web/src/pages/Documents.tsx` also uses the same wiki-only path.
  - the FleetGraph demo proof lanes are sprint documents seeded through the normal Ship document model, so they do not appear in those wiki-only surfaces.
- Scroll finding:
  - `web/src/pages/UnifiedDocumentPage.tsx` renders FleetGraph panels above sprint tab content inside nested flex containers with `overflow-hidden`.
  - the affected week tabs and editor surfaces rely on inner scroll containers.
  - this is the exact layout family where missing `min-h-0` / explicit shrink contracts commonly produce clipped, non-scrollable views in flex columns.
- Interaction-trust finding:
  - the live Railway dismiss and snooze APIs return `200`, which means the backend mutation path is working for the demo finding ids.
  - `web/src/components/FleetGraphFindingsPanel.tsx` currently sets success copy immediately on click before the mutation resolves, so the UI can present success and failure signals inconsistently.
  - `web/src/hooks/useFleetGraphFindings.ts` only surfaces generic mutation errors and does not expose a resolved success payload back into the component-level copy model.
- Human-copy/debug finding:
  - `web/src/components/FleetGraphFindingsPanel.tsx` and `web/src/components/FleetGraphEntryCard.tsx` currently expose endpoint paths, thread ids, “same-origin” phrasing, and route-centered language in the primary user surface.
  - those details are useful for debugging, but they should be demoted into an optional diagnostic surface rather than the main content hierarchy.

## Data Model / API Contracts
- Request shape:
  - preserve current REST-backed document and week queries
  - no new FleetGraph-specific data path should be required just to reach the demo week pages
- Response shape:
  - navigation surfaces should continue using existing Ship document/week response shapes
  - page layout fixes should not alter FleetGraph findings or entry payload contracts
- Storage/index changes:
  - none expected for this pack unless a minimal UI-supporting index or cached projection is truly necessary

## Dependency Plan
- Existing dependencies used:
  - React Router
  - TanStack Query
  - existing Ship docs/weeks hooks and page layout components
- New dependencies proposed (if any):
  - none
- Risk and mitigation:
  - Risk: widening the docs sidebar could accidentally blur wiki vs non-wiki document intent.
    - Mitigation: prefer a precise, named discoverability rule for week documents instead of an unbounded “show everything” change.
  - Risk: changing the page layout could fix one tab while breaking another.
    - Mitigation: test the seeded review/apply lane and the worker-generated lane explicitly, and keep the fix at the shared container level where possible.
  - Risk: copy cleanup could remove useful debugging detail for development and demos.
    - Mitigation: move technical data to a small optional debug/details affordance instead of deleting it outright.
  - Risk: visual polish work could expand into a redesign.
    - Mitigation: keep `T203` explicitly bounded to hierarchy, copy clarity, bullet/evidence presentation, and trust-building action framing.
  - Risk: the next audit still depends on hidden or stale instructions.
    - Mitigation: reserve `T204` to refresh the pack-level audit docs immediately after the runtime fixes land.

## Test Strategy
- Unit tests:
  - navigation/list derivation logic for the surfaced FleetGraph week rows
  - layout/container regression tests where practical for the affected page wrappers
  - action-state copy logic so success copy is only shown after confirmed mutation success
- Integration tests:
  - document navigation reaches the named FleetGraph week pages from standard UI paths
  - week page renders proactive + entry surfaces without clipping the main content area
  - dismiss/snooze UI state reflects the actual mutation outcome instead of optimistic local copy
- E2E or smoke tests:
  - live-demo UI inspection steps for the seeded review/apply week
  - live-demo UI inspection steps for the worker-generated week
  - live-demo validation that primary UI copy no longer exposes endpoint paths by default
- Edge-case coverage mapping:
  - no FleetGraph demo week present
  - long title in the navigation row
  - small viewport height with both FleetGraph panels visible

## UI Implementation Plan (if applicable)
- Behavior logic modules:
  - docs/sidebar/list discoverability for the named FleetGraph week documents
  - shared scroll-container contract for the affected document page
  - action-state feedback grounded in real mutation results
  - optional debug/details affordance for technical data
- Component structure:
  - update the standard docs/navigation surfaces instead of adding a special FleetGraph launcher
  - fix the shared layout wrapper first, then only patch tab-level containers if needed
  - keep debug or trace details behind a small secondary overlay, drawer, or disclosure rather than the main panel copy
- Accessibility implementation plan:
  - preserve keyboard navigation in left-nav/document lists
  - ensure the corrected scroll container remains the obvious focus/scroll target
  - keep any debug/details affordance keyboard reachable but clearly secondary
- Visual regression capture plan:
  - reachable FleetGraph week in navigation
  - scrollable FleetGraph week page with proactive and entry panels visible
  - improved review/apply state and calmer evidence presentation

## Rollout and Risk Mitigation
- Rollback strategy:
  - keep navigation and layout fixes separable so either can be reverted independently if one causes regressions
- Feature flags/toggles:
  - none expected; these should be direct usability fixes to the shipped MVP path
- Observability checks:
  - verify the fixes on the public Railway demo
  - refresh the pack-level UI audit checklist and screenshotable proof once the fixes ship
  - keep technical execution detail available for debugging without dominating the primary user-facing content

## Validation Commands
```bash
pnpm --filter @ship/web type-check
pnpm --filter @ship/web build
pnpm --filter @ship/web exec vitest run
```
