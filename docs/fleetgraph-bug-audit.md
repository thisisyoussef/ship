# FleetGraph Bug Audit

Compiled from manual walkthrough on 2026-03-17.

---

## BUG 1: "Plan Week" button does nothing

**Where:** `web/src/components/sidebars/WeekSidebar.tsx:302-307`

**What happens:** Button calls `navigate(`/documents/${sprint.id}`)` — but you're already on that page. React Router treats same-route navigation as a no-op.

**Root cause:** The button always navigates to the document page for the current sprint. When you're already viewing that sprint, clicking it does nothing visible.

**Fix needed:** Either (a) change the button's behavior so it opens the week editor/planning view (a different route or tab), or (b) hide the button when already on the sprint's document page, or (c) make it trigger an action like changing sprint status to "planning" instead of navigating.

---

## BUG 2: Approval option buttons are hardcoded `disabled` with no onClick

**Where:** `web/src/components/FleetGraphEntryCard.tsx:141-150`

```tsx
<button
  className={optionClassName}
  disabled          // <-- hardcoded disabled
  key={option.id}
  type="button"     // <-- no onClick handler
>
  {option.label}
</button>
```

**What happens:** The Apply, Dismiss, Snooze options rendered inside the "Needs your approval" section of the FleetGraph Entry card are permanently disabled and have no click handler. They are visual placeholders that cannot do anything.

**Root cause:** The entry card was built as a read-only preview of the approval flow. Nobody wired the option buttons to actual mutations.

**Fix needed:** Add `onClick` handlers that call the corresponding API endpoints (`/api/fleetgraph/findings/{id}/apply`, `/dismiss`, `/snooze`) — same pattern as `FleetGraphFindingsPanel.tsx` which already has working `handleDismiss`, `handleSnooze`, and `handleApply` functions. Remove the `disabled` prop or make it conditional on `isMutating`.

---

## BUG 3: Dismiss and Snooze buttons on the Finding card — silent failure

**Where:** `web/src/components/FleetGraphFindingsPanel.tsx:61-98` → `web/src/hooks/useFleetGraphFindings.ts:34-74`

**What happens:** Clicking Dismiss or Snooze appears to do nothing. No error message, no UI update.

**Likely root causes (check in this order):**

1. **Session timeout (most likely):** Ship uses 15-minute inactivity timeout. If the session expired, `authMiddleware` returns 401. The hook's `catch` block (lines 76-78, 96-98) does nothing — it says "the hook surfaces the friendly error message" but the error is only set on the *mutation* object. Check whether `actionErrorMessage` is actually being rendered when auth fails (it is rendered at line 147, but the 401 response may not throw — `apiPost` returns the response, it doesn't throw on non-ok).

2. **`apiPost` doesn't throw on non-ok responses:** Looking at `useFleetGraphFindings.ts:34-46`, `dismissFleetGraphFinding` manually checks `response.ok` and throws. This part is correct. But if the session cookie is missing/expired, the request might redirect to a login page (HTML response) rather than returning 401 JSON, which would cause `response.json()` to fail silently.

3. **Finding status already resolved:** The screenshot shows "STARTED IN SHIP" on the finding, meaning `actionExecution` exists. The dismiss/snooze SQL doesn't check current status — it updates any row matching `id + workspace_id`. So this shouldn't be the blocker, but if the finding was already `dismissed` in a prior click, re-dismissing it would succeed silently (same status, query returns the row, UI refetches and re-renders the same state).

**Fix needed:** Add better error surfacing. The catch blocks should at minimum log or set explicit error state. Also, verify auth session is alive before attempting mutations.

---

## BUG 4: Graph nodes are stubs — no real LangGraph execution

**Where:** `api/src/services/fleetgraph/graph/runtime.ts:75-99`

**What happens:** Every graph node is a stub that returns only a `path` string:
- `resolve_trigger_context` → `{ path: 'resolve_trigger_context', routeSurface: ... }`
- `reason_and_deliver` → `{ path: 'reason_and_deliver' }`
- `approval_interrupt` → `{ path: 'approval_interrupt' }`
- `fallback` → `{ path: 'fallback' }`

**Root cause:** The graph was scaffolded with routing logic but the nodes never got real implementations. The actual work (fetching Ship data, running LLM reasoning, persisting findings) happens in separate services that are **not called by the graph**.

**Fix needed:** Each node needs to call the corresponding service:
- `resolve_trigger_context` → call Ship REST API to fetch project/sprint context
- `reason_and_deliver` → call LLM (via `llm/factory.ts`) to analyze context and produce findings
- `approval_interrupt` → use LangGraph's `interrupt()` to pause for human confirmation, then resume
- `fallback` → log error state and produce a graceful fallback finding

---

## BUG 5: Human-in-the-loop gate is fake

**Where:** `api/src/services/fleetgraph/graph/runtime.ts:94-96`

```ts
.addNode('approval_interrupt', () => ({
  path: 'approval_interrupt',
}))
```

**What happens:** The PRD requires a human-in-the-loop confirmation gate. The node exists in the graph but doesn't call LangGraph's `interrupt()`. It just returns a path label and exits to `END`. There is no actual pause-and-resume mechanism.

**Root cause:** The HITL gate was implemented as a REST API pattern (the `/apply` endpoint) instead of as a LangGraph interrupt. The graph doesn't pause — the web UI makes a separate API call to `POST /findings/{id}/apply`, which calls the Ship REST API directly. This works functionally but violates the LangGraph pattern and means the graph has no record of the approval decision.

**Fix needed:** The `approval_interrupt` node should call `interrupt()` to pause the graph. A separate resume endpoint should continue the graph after user confirmation. The finding action service can stay as the executor, but it should be invoked *by the resumed graph node*, not by a standalone REST handler.

---

## BUG 6: Confusing UX copy — "owner confirms the scope"

**Where:** `api/src/services/fleetgraph/proactive/week-start-drift.ts:106`

```ts
summary: 'Start this week once the owner confirms the scope is ready.',
```

**What happens:** The message implies only the week "owner" can confirm, but there's no owner-gating logic anywhere. Any authenticated user who can see the finding can fire the start-week action.

**Fix needed:** Change the copy to something like `"Confirm to start this week."` — or add actual owner authorization if that's the intended behavior.

---

## BUG 7: No authorization check on apply action

**Where:** `api/src/services/fleetgraph/actions/service.ts:143-170`

**What happens:** `applyStartWeekFinding` checks that the finding exists and is `active`, and that it has a `start_week` action — but never checks whether the requesting user has permission to start the week. It forwards the user's session cookie to the Ship REST call, so *Ship's own auth* on `/api/weeks/{id}/start` may gate it, but FleetGraph itself doesn't validate.

**Fix needed:** Either (a) explicitly document that Ship's REST endpoint handles authorization (cookie forwarding), or (b) add a pre-flight permission check in FleetGraph before attempting the action.

---

## BUG 8: FleetGraph cards block page scroll — content cut off

**Where:** `web/src/pages/UnifiedDocumentPage.tsx:640-667` (the `fleetGraphCard` block) and lines 675-712 (tabbed layout)

**What happens:** The FleetGraph Proactive panel + Entry card are rendered at the TOP of the page, above the tab bar and content area. On a project or sprint page, these cards can take up 300-400px+ of vertical space. The outer container (`div.flex.h-full.overflow-y-auto`, line 677) scrolls as one unit, but the FleetGraph cards push actual content (issues list, editor) below the fold. Users report "this is the deepest the screen scrolls" — meaning the content area is truncated.

**Root cause:** The layout is:
```
[FleetGraph Findings Panel]   ← fixed at top, ~200px
[FleetGraph Entry Card]       ← fixed at top, ~150px
[Tab Bar]                     ← pushes down
[Content (flex-1, min-h-0)]   ← gets whatever space is left
```

The content div has `min-h-0 flex-1` which means it shrinks to fit remaining space. If the viewport is small or the FleetGraph cards are tall, the content area can be very short. Everything scrolls together so you can scroll past the cards, but if the content itself has its own scroll container (like an issue list), you end up with nested scroll traps.

**Fix needed:** Either (a) make FleetGraph cards collapsible/dismissable so they don't dominate the viewport, (b) move them into a sidebar or drawer instead of inline at the top, or (c) put only the content area in the scroll container and make the FleetGraph cards a sticky/fixed header with a max-height and its own overflow.

---

## BUG 9: FleetGraph demo weeks don't appear under FleetGraph project in sidebar

**Where:** Demo fixture creates weeks at `api/src/services/fleetgraph/demo/fixture.ts:125-177`, but the project sidebar tree doesn't show them.

**What happens:** The FleetGraph Demo Project page (screenshot 2) shows "Weeks" as a tab navigation link, but:
- The sidebar tree under the project shows "Details", "Weeks", "Issues", "Retro" as navigation links — these are NOT the actual weeks data, just tab routes.
- The weeks created by the demo fixture (`FleetGraph Demo Week`, `FleetGraph Demo Week – Worker Generated`) are associated via `document_associations` (relationship_type = 'project'), and the API query at `api/src/routes/projects.ts:1530-1556` should find them.
- But the project sidebar in the left panel doesn't render a list of actual week documents under the project — it only shows tab navigation links.

**Likely root causes:**
1. **Sidebar tree doesn't fetch project children:** The left sidebar renders the project node with static sub-items (Details, Weeks, Issues, Retro) rather than dynamically loading associated weeks from `/api/projects/{id}/weeks`.
2. **Weeks are listed at the workspace level instead:** In screenshot 1, weeks (Week 11-17) appear directly under the workspace root, not nested under the FleetGraph project. This is the global weeks list, not project-scoped.

**Fix needed:** The sidebar tree should dynamically load weeks associated with each project and render them as child nodes, OR the "Weeks" nav link should clearly navigate to the Weeks tab where the actual week list is visible.

---

## BUG 10: Approval buttons in Entry card (Apply/Dismiss/Snooze) — confirmed dead on second screen

**Where:** Same as BUG 2 — `web/src/components/FleetGraphEntryCard.tsx:141-150`

**What happens:** Screenshot 2 confirms the Entry card's "Approve week plan" section shows Apply, Dismiss, Snooze buttons that are all `disabled` with no click handlers. This was observed after clicking "Preview approval step" on the entry card. The buttons render but are completely non-functional.

**Note:** This is the same root cause as BUG 2 but confirmed on a different page/context. The entry card approval UX is universally broken, not page-specific.

---

## Summary: Priority Order for Fixes

| # | Bug | Severity | Effort |
|---|-----|----------|--------|
| 2 | Approval buttons hardcoded disabled | **Critical** — entire approval UX is dead | Low |
| 8 | FleetGraph cards block scroll/content | **Critical** — page content cut off | Medium |
| 3 | Dismiss/Snooze silent failure | **High** — core HITL actions broken | Medium |
| 4 | Graph nodes are stubs | **High** — core architecture gap | High |
| 5 | HITL gate is fake | **High** — PRD requirement unmet | High |
| 9 | Demo weeks missing from project sidebar | **Medium** — FleetGraph demo incomplete | Medium |
| 1 | Plan Week navigates to self | **Medium** — confusing but not blocking | Low |
| 6 | Misleading "owner" copy | **Low** — cosmetic | Trivial |
| 7 | No FleetGraph-level auth on apply | **Low** — mitigated by cookie forwarding | Medium |
