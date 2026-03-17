# Technical Plan

## Story
- Story ID: FLEETGRAPH-FEEDBACK-ROUND2-PHASE
- Story Title: FleetGraph second live-inspection follow-on pack

## Scope

This pack is intentionally narrow and UI-focused. It addresses the remaining prod-inspection issues on the named FleetGraph week pages without changing FleetGraph runtime intelligence, Ship data access boundaries, or deployment topology.

## Pack Objectives

- fix the remaining page scroll trap on FleetGraph week pages
- prevent accidental click-through from review trigger to Ship mutation
- improve the specific duplicated/weak visual copy called out in the latest inspection
- refresh the live audit path once the fixes ship

## Planned Stories

- `T401` FleetGraph safe review and scroll recovery
- `T402` FleetGraph round-two audit refresh

## Why This Sequence

- `T401` handles the actual shipped bug surface first so the next Railway inspection is trustworthy.
- `T402` updates the inspection path only after the live UI matches the intended behavior.

## Affected Areas

- `web/src/pages/UnifiedDocumentPage.tsx`
- `web/src/components/FleetGraphFindingCard.tsx`
- `web/src/components/FleetGraphFindingsPanel.tsx`
- `web/src/hooks/useFleetGraphFindings.ts`
- FleetGraph UI tests and the Railway audit docs

## Implementation Approach

### 1. Scroll recovery

- Rework the FleetGraph week-page layout so the outer document route owns a usable scroll container instead of trapping the added FleetGraph panels above an unreachable inner editor scroller.
- Preserve the existing document tabs/editor behavior while restoring natural page inspection for the named week pages.

### 2. Safe review/apply interaction

- Keep the current inline review pattern, but separate the review trigger from the actual Ship mutation more clearly.
- Add a guard so the initial click that opens review cannot also trigger `Start week in Ship`.
- Preserve the REST-only apply path through FleetGraph -> Ship REST. No direct Ship DB writes.

### 3. UI text and emphasis cleanup

- Replace the default duplicated action badge label with a shorter action-specific label.
- Strengthen the inline review state with clearer contrast and stronger heading emphasis.
- Keep the main experience human-centered and avoid reintroducing technical labels in the primary surface.

### 4. Audit refresh

- Refresh the Railway inspection guide and the relevant pack checklist once the fixed behavior is deployed.
- Capture any remaining non-blocking follow-ons at the tail only.

## Risks

- The scroll fix could accidentally disturb the existing tabbed page layout if the outer container contract changes too broadly.
- An over-aggressive confirmation guard could make the apply flow feel unresponsive.
- The named review/apply demo week may need reseeding if live state is already advanced during validation.

## Fallbacks

- If a global scroll contract is too risky, scope the change to the week-page route path first and validate that surface before broadening.
- If the inline confirmation still feels too fragile, move the confirm button out of the replaced trigger region instead of relying only on timing protection.

## Testing Strategy

- Component/UI regression tests for:
  - safe review/apply behavior
  - non-duplicated suggested-action language
  - stronger inline review state rendering
- Page/layout regression tests for the FleetGraph week scroll container
- Live Railway inspection against the named demo pages after deploy
