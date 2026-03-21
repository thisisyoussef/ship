# FleetGraph QA Report — 2026-03-21

**Target:** https://ship-demo-staging.up.railway.app
**Tester:** Automated (Claude Code + gstack browse)
**Branch:** `claude/suspicious-dijkstra` (merged to `master` as PR #72)
**Scope:** Full FleetGraph product — proactive findings, chat orchestrator, HITL approval flow

---

## Executive Summary

**Overall Health: 8/10**

FleetGraph's core product surfaces are functional on the staging deployment. The proactive findings pipeline, HITL approval flow, and document-level FAB all work end-to-end. The new chat orchestrator endpoints are reachable and respond correctly, but the LLM integration is not operational on this deployment (missing `OPENAI_API_KEY`), which means the Analyze tab degrades gracefully but cannot demonstrate tool-calling behavior.

---

## Test Results

### 1. Login & Navigation
| Item | Result | Notes |
|------|--------|-------|
| Login with demo credentials | PASS | `dev@ship.local` / `admin123` → redirects to `/docs` |
| Action items banner | PASS | Shows 6 overdue items, including FleetGraph demo weeks |
| Document sidebar | PASS | Both demo weeks visible in tree view |
| Document navigation | PASS | Clicking demo weeks loads correct document pages |

### 2. FleetGraph FAB
| Item | Result | Notes |
|------|--------|-------|
| FAB renders on document pages | PASS | Bottom-right, with lightning bolt icon |
| Badge shows finding count | PASS | Badge "1" on both demo weeks |
| FAB opens panel on click | PASS | Slides open with Findings/Analyze tabs |
| Panel dismisses on re-click | PASS | Toggles cleanly |
| Findings tab is default | PASS | Shows findings list on open |

### 3. Proactive Findings (Findings Tab)
| Item | Result | Notes |
|------|--------|-------|
| Finding card renders | PASS | "Week start drift: FleetGraph Demo Week - Review and Apply" |
| Severity badge visible | PASS | Red "start" badge on finding card |
| Evidence lines render | PASS | Shows "This week has reached its start window..." |
| "Why this matters" section | PASS | Clear explanation of the finding |
| Action buttons render | PASS | "Review week start", "Dismiss", "Snooze 10s", "Snooze 4h" |
| Findings API (`GET /api/fleetgraph/findings`) | PASS | Returns 200 with correct finding data |
| Worker-generated finding (second week) | PASS | Same pattern, separate finding on different document |

### 4. HITL Approval Flow
| Item | Result | Notes |
|------|--------|-------|
| "Review week start" opens dialog | PASS | Shows confirmation with evidence and "Start week" button |
| Cancel button works | PASS | Returns to finding card |
| "Start week" executes action | PASS | `POST /api/fleetgraph/findings/:id/apply` returns 200 |
| Week status changes to Active | PASS | Properties panel updates from "Planning" to "Active" |
| Finding disappears after action | PASS | Findings list returns empty `[]` |
| Success message renders | PASS | "The week is now active in Ship" with green indicator |
| Accountability count decreases | PASS | Dropped from 6 to 5 overdue items after action |
| New tabs appear (Issues, Review, Standups) | PASS | Active week shows full tab set |

### 5. Chat Orchestrator (Analyze Tab)
| Item | Result | Notes |
|------|--------|-------|
| Analyze tab renders | PASS | Shows document context header and chat input |
| `/api/fleetgraph/chat/start` endpoint | PASS | Returns 200 (373B response) |
| Chat input field functional | PASS | Accepts typed text, Send button enables |
| `/api/fleetgraph/chat/:threadId/message` | PASS | Returns 200 (483B response) |
| LLM tool-calling response | FAIL | "I encountered an error communicating with the AI model" |
| Error is handled gracefully | PASS | Error shown as prose in chat, no crash, no console errors |

**Root cause of chat failure:** The staging deployment does not have `OPENAI_API_KEY` configured. The chat orchestrator correctly catches the LLM error and returns it as a user-facing message. This is an infrastructure configuration issue, not a code bug.

### 6. Error Handling & Console
| Item | Result | Notes |
|------|--------|-------|
| JS console errors | PASS | Only 1 error: initial 401 from production URL (before redirect to staging) |
| No runtime exceptions | PASS | No uncaught errors during any interaction |
| Network request failures | PASS | All staging API calls return 200 |
| FleetGraph readiness endpoint | PASS | Returns 403 without service token (correct behavior) |
| Health endpoint | PASS | Returns `{"status":"ok"}` |

### 7. Responsive Layout
| Item | Result | Notes |
|------|--------|-------|
| Mobile (375x812) | WARN | FAB panel overlaps document content; finding card text is clipped |
| Tablet (768x1024) | PASS | FAB panel renders alongside content, finding card readable |
| Desktop (1280x720) | PASS | Full 4-panel layout with FAB panel |

---

## What Went Well

1. **Proactive findings pipeline is solid.** The seeded findings render correctly with severity badges, evidence lines, and actionable buttons. The worker-generated finding on the second demo week demonstrates that the proactive sweep is working end-to-end.

2. **HITL approval flow is complete.** The full cycle — finding card → review dialog → confirm action → Ship REST execution → UI state update — works flawlessly. The week status changes from Planning to Active, the finding disappears, and the accountability count decreases.

3. **Error handling is graceful.** When the LLM is unavailable (missing API key), the chat orchestrator catches the error and returns a clear user-facing message. No crashes, no console errors, no broken UI state.

4. **New chat endpoints are wired correctly.** Both `/chat/start` and `/chat/:threadId/message` return 200 responses. The frontend correctly routes to these new endpoints (the feature flag flip is working). Thread IDs are generated with the correct format (`fleetgraph:chat:{workspaceId}:{documentId}`).

5. **FAB component is well-integrated.** It appears on every document page, shows a badge count, toggles a panel with tabs, and scopes findings to the current document's context (via document IDs in the query).

6. **Side effect visibility.** After starting a week, the UI immediately reflects the change: new tabs appear (Issues, Review, Standups), the status dropdown updates, and the global accountability count decreases.

---

## What Could Be Improved

### Critical (blocks production use)

1. **`OPENAI_API_KEY` not configured on staging.** The chat orchestrator cannot demonstrate its core value (LLM-driven tool-calling analysis) without this. This is the single highest-priority item for the next deployment.

### Important (should fix before GA)

2. **Mobile layout overflow.** On mobile viewports (375px), the FleetGraph panel overlaps the document content and finding card text gets clipped. The panel should either go full-screen on mobile or use a bottom sheet pattern.

3. **Chat orchestrator initial analysis UX.** When switching to the Analyze tab, the chat just shows an empty state with the input field. A loading spinner or auto-trigger of the initial analysis would make the experience feel more intentional. Currently the user sees a blank chat and has to figure out they need to type something.

4. **No OpenAPI schemas for `/chat/*` routes.** The new chat endpoints are not registered in the Swagger docs. They work, but they're invisible to API consumers and the MCP auto-generation pipeline.

5. **Findings persistence after HITL.** After applying "Start week", navigating away and coming back shows no finding (correct — it was resolved). But there's no history of resolved findings. A "recently resolved" section or audit trail would help PMs see what FleetGraph detected and fixed.

### Nice to Have (future improvements)

6. **Chat session persistence.** If the user navigates away mid-chat and returns, the session exists in memory but the conversation isn't restored in the UI. The frontend clears `conversation` state on component remount. Consider restoring from the session's message history.

7. **Snooze confirmation.** The "Snooze 10s" and "Snooze 4h" buttons have no feedback — they execute and the finding disappears with no confirmation message about when it will resurface.

8. **Multi-finding support.** Currently each demo week has exactly one finding. The UI should be tested with 3-5 concurrent findings to verify scroll behavior, priority ordering, and batch actions.

9. **Trace link visibility.** LangSmith trace URLs are generated but not surfaced in the UI. A "View trace" link on finding cards or chat responses would be valuable for debugging and transparency.

10. **Worker Generated vs Review and Apply — naming.** Both demo weeks have identical finding types (week_start_drift) with similar content. Different finding types (e.g., missing standup, deadline risk) would make the demo more compelling.

---

## Network Evidence

| Endpoint | Method | Status | Size | Latency |
|----------|--------|--------|------|---------|
| `/api/fleetgraph/findings?documentIds=...` | GET | 200 | 1,757B | 136ms |
| `/api/fleetgraph/findings/:id/apply` | POST | 200 | 2,126B | 313ms |
| `/api/fleetgraph/chat/start` | POST | 200 | 373B | 190ms |
| `/api/fleetgraph/chat/:threadId/message` | POST | 200 | 483B | 288ms |
| `/api/fleetgraph/ready` | GET | 403 | — | — |
| `/health` | GET | 200 | 17B | — |

All FleetGraph endpoints respond within 350ms. No 500 errors observed.

---

## Recommendations for Next Deployment

1. Set `OPENAI_API_KEY` on the Railway staging environment to enable the chat orchestrator
2. Optionally set `LANGSMITH_API_KEY` and `LANGSMITH_TRACING=true` for trace visibility
3. Re-seed the demo data (`pnpm db:seed`) to reset the "Review and Apply" week back to Planning status for demo purposes
4. Add OpenAPI schemas for the 5 new `/chat/*` routes
5. Test the chat orchestrator with a real LLM to verify tool-calling, multi-turn, and action proposal flows
