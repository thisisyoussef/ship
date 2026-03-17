# FleetGraph UI Bugfix Design

**Date:** 2026-03-17
**Scope:** Fix 6 UI/UX bugs from `docs/fleetgraph-bug-audit.md` (bugs 1, 2, 3, 6, 8, 9)
**Out of scope:** Bugs 4 & 5 (graph stubs, fake HITL) — handled by LangGraph agent on `codex/fleetgraph-langgraph-orchestration-pack`
**Branch:** `fix/fleetgraph-ui-bugs` from `master`

---

## Bug 2 (Critical): Wire approval buttons in FleetGraphEntryCard

**File:** `web/src/components/FleetGraphEntryCard.tsx:141-150`

**Change:** Remove hardcoded `disabled`. Add `onClick` handlers that call the FleetGraph findings mutation hooks (`useFleetGraphFindings`). The entry card needs to accept finding context (finding ID) and expose `onApply`, `onDismiss`, `onSnooze` callbacks. Since the entry card currently operates on entry responses (not findings), the approval options should trigger the corresponding `/api/fleetgraph/findings/{id}/apply|dismiss|snooze` endpoints via the existing hook.

**Approach:** Add `useFleetGraphFindings` to the entry card or lift the handlers from the parent (`UnifiedDocumentPage`). The entry card's approval envelope already contains `options` with `id: 'apply' | 'dismiss' | 'snooze'`, so map each option ID to the corresponding mutation.

---

## Bug 8 (Critical): Collapsible FleetGraph cards

**File:** `web/src/pages/UnifiedDocumentPage.tsx:640-667`

**Change:** Wrap the FleetGraph card block in a collapsible container. Add a `useState` toggle (default: expanded). Show a compact header bar when collapsed ("FleetGraph — N findings") with a chevron to expand. When collapsed, the cards take ~40px instead of 300-400px.

**Approach:** Add a `FleetGraphCollapsible` wrapper component or inline the toggle in `UnifiedDocumentPage`. Persist collapse state in `localStorage` so it survives page navigation.

---

## Bug 3 (High): Surface dismiss/snooze errors

**File:** `web/src/components/FleetGraphFindingsPanel.tsx:61-98`

**Change:** Add `console.error` in catch blocks so failures aren't completely silent. The `actionErrorMessage` is already rendered (line 147), but confirm it triggers on auth failures. Add a fallback error message if the mutation rejects with a non-Error value.

---

## Bug 1 (Medium): Plan Week button navigates to self

**File:** `web/src/components/sidebars/WeekSidebar.tsx:302-307`

**Change:** Hide the "Plan Week" button when the user is already on the sprint's document page. Compare `sprint.id` against the current route's document ID (available from `useParams`).

---

## Bug 9 (Medium): Verify Weeks tab on project page

**Investigation:** The sidebar tree shows static tab links, which is by-design for Ship. The fix is to verify the Weeks tab on the project page actually renders the associated weeks from `/api/projects/{id}/weeks`. If the API returns data but the tab doesn't render, fix the tab component. If the API returns empty, check the `document_associations` data.

---

## Bug 6 (Low): Fix misleading "owner" copy

**File:** `api/src/services/fleetgraph/proactive/week-start-drift.ts:106`

**Change:** Replace `'Start this week once the owner confirms the scope is ready.'` with `'Confirm to start this week.'`

---

## Conflict avoidance

Files we will NOT touch:
- `api/src/services/fleetgraph/graph/runtime.ts`
- `api/src/services/fleetgraph/graph/state.ts`
- `api/src/services/fleetgraph/graph/types.ts`

These are the LangGraph agent's domain.
