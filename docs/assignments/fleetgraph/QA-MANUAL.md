# FleetGraph QA Testing Manual

**Version:** 1.0 | **Date:** 2026-03-21 | **Scope:** Full feature coverage

---

## Quick Start

```
URL:      https://ship-demo-staging.up.railway.app
Email:    dev@ship.local
Password: admin123
```

After login, navigate to any sprint page → look for the **FleetGraph Intelligence** button (bottom-right FAB).

---

## Part 1: Feature Inventory

### 1.1 UI Entry Point

The FleetGraph panel is a floating action button (FAB) with two tabs:

| Tab | Purpose | Badge |
|-----|---------|-------|
| **Findings** | Proactive detection alerts | Count of active findings |
| **Analyze** | AI chat with tool-calling agent | None |

### 1.2 Proactive Finding Types (3 implemented)

| Finding Type | Trigger Condition | Demo Sprint |
|---|---|---|
| `week_start_drift` | Sprint still in PLANNING after start date passed | "Review and Apply" |
| `unassigned_sprint_issues` | 3+ issues with no assignee in active sprint | "Unassigned Issues" |
| `sprint_no_owner` | Sprint with null owner_id | "No Owner" |

### 1.3 Action Types (7 with dynamic dialogs)

| Action | Dialog Type | Fields | Ship Endpoint |
|---|---|---|---|
| `start_week` | confirm | Sprint name display | `POST /api/weeks/:id/start` |
| `approve_week_plan` | confirm | Plan summary display | `POST /api/weeks/:id/approve-plan` |
| `approve_project_plan` | confirm | Project summary | `POST /api/projects/:id/approve-plan` |
| `assign_owner` | single_select | Dropdown of team members | `PATCH /api/documents/:id` |
| `post_comment` | textarea | Comment text | `POST /api/documents/:id/comments` |
| `post_standup` | composite | Summary, blockers, yesterday, today | `POST /api/weeks/:id/standups` |
| `escalate_risk` | textarea | Risk description | `POST /api/documents/:id/comments` |

### 1.4 Analysis Tools (7 read-only)

| Tool | What It Fetches | When the LLM Uses It |
|---|---|---|
| `analysis_context_get` | Current page context (entity type, ID, title) | Always called first |
| `entity_snapshot_get` | Full document with properties, status, dates | "What's the status?" |
| `metric_timeseries_get` | Activity timeline for entity | "What changed recently?" |
| `graph_neighbors_get` | Related entities (issues in sprint, sprints in project) | "What issues are in this sprint?" |
| `compare_entities_get` | Side-by-side comparison of 2+ entities | "Compare this with sprint X" |
| `anomaly_explain_get` | Stale issues, scope changes, missing standups | "Why is there no progress?" |
| `evidence_lookup_get` | Comments, history, iterations | "Show me the evidence" |

---

## Part 2: Test Cases

### TC-01: Login and Navigation

| Step | Action | Expected |
|---|---|---|
| 1 | Navigate to staging URL | Login page with email/password fields |
| 2 | Enter dev@ship.local / admin123 | Fields accept input |
| 3 | Click "Sign in" | Dashboard loads with week view |
| 4 | Click any sprint in sidebar | Sprint page loads with overview tab |

**Pass criteria:** Session cookie set, dashboard renders, navigation works.

---

### TC-02: FleetGraph FAB Opens

| Step | Action | Expected |
|---|---|---|
| 1 | Navigate to "FleetGraph Demo Week - Review and Apply" | Sprint page loads |
| 2 | Click "FleetGraph Intelligence" button (bottom area) | Panel opens with Findings and Analyze tabs |
| 3 | Check Findings tab badge | Shows count ≥ 1 |

**Pass criteria:** FAB button visible, panel opens, tabs render.

---

### TC-03: Proactive Findings Display

| Step | Action | Expected |
|---|---|---|
| 1 | Click "Findings" tab | Finding cards appear |
| 2 | Read first finding card | Title: "Week start drift: FleetGraph Demo Week - Review and Apply" |
| 3 | Check evidence section | Shows start date, status reason, sprint number |
| 4 | Check action buttons | "Review week start", "Dismiss", "Snooze 10s", "Snooze 4h" visible |

**Pass criteria:** Finding card shows title, summary, evidence, and 3+ action buttons.

---

### TC-04: Finding Dismiss

| Step | Action | Expected |
|---|---|---|
| 1 | On Findings tab, click "Dismiss" on a finding | Card disappears |
| 2 | Check badge count | Decrements by 1 |
| 3 | Refresh page, reopen FleetGraph | Finding may reappear (if still active) or stay dismissed |

**Pass criteria:** Dismiss removes card from view immediately.

---

### TC-05: Finding Snooze

| Step | Action | Expected |
|---|---|---|
| 1 | Click "Snooze 10s" on a finding | Card disappears with snooze indicator |
| 2 | Wait 15 seconds | — |
| 3 | Refresh page and check Findings tab | Finding reappears |

**Pass criteria:** Snoozed finding returns after duration expires.

---

### TC-06: Finding Review → Apply Action

| Step | Action | Expected |
|---|---|---|
| 1 | Click "Review week start" on the week_start_drift finding | Confirmation dialog opens |
| 2 | Read dialog content | Shows sprint name, evidence, "Start this sprint?" prompt |
| 3 | Click "Confirm" | Action executes → sprint status changes to ACTIVE |
| 4 | Check sprint page header | Status now shows "Active" instead of "Planning" |

**Pass criteria:** Dialog opens inline, action executes, sprint state changes.

---

### TC-07: Auto-Analyze on Sprint Page

| Step | Action | Expected |
|---|---|---|
| 1 | Navigate to "FleetGraph Demo Week - Active with Issues" | Sprint page loads |
| 2 | Open FleetGraph → click "Analyze" tab | Loading spinner appears |
| 3 | Wait 5-15 seconds for response | Analysis text appears |
| 4 | Check tool chips below response | At least 2 tools called (e.g., entity_snapshot_get, graph_neighbors_get) |
| 5 | Check verification badge | Shows "Grounded" with source count |
| 6 | Check suggested follow-ups | 2-3 clickable chips appear below response |

**Pass criteria:**
- Response mentions sprint by name
- Response includes specific numbers (issue count, owner name)
- No `<tool_call>` tags visible in the text
- No "confidence level" mentioned
- No "Let me check..." narration before tools

---

### TC-08: Auto-Analyze on Project Page

| Step | Action | Expected |
|---|---|---|
| 1 | Navigate to "FleetGraph Demo Project" | Project page loads |
| 2 | Open FleetGraph → Analyze tab | Analysis runs |
| 3 | Check response | Mentions project-level info (target date, child sprints, overall status) |

**Pass criteria:** Response is project-scoped (not sprint-scoped); mentions multiple sprints.

---

### TC-09: Multi-Turn Conversation

| Step | Action | Expected |
|---|---|---|
| 1 | After auto-analyze completes, click a suggested follow-up chip | New message appears in chat |
| 2 | Wait for response | Response builds on prior context |
| 3 | Type custom message: "What issues are stale?" | New request sent |
| 4 | Wait for response | Response references specific issues with dates |

**Pass criteria:** Session ID persists, responses are contextual, no repeated full analysis.

---

### TC-10: Compare Sprints

| Step | Action | Expected |
|---|---|---|
| 1 | On any sprint's Analyze tab, type: "Compare this sprint with the Review and Apply sprint" | Message sent |
| 2 | Wait for response | compare_entities_get tool called |
| 3 | Check tool chips | compare_entities_get appears **exactly once** (not 5x) |
| 4 | Read response | Side-by-side comparison with specific differences |

**Pass criteria:** Tool deduplication works; comparison is meaningful.

---

### TC-11: Action Suggestions in Chat

| Step | Action | Expected |
|---|---|---|
| 1 | After analysis, look for "Suggested Actions" section | Action buttons visible below response |
| 2 | Click an action button (e.g., "Start Sprint") | **ConfirmDialog** opens (NOT inside chat panel) |
| 3 | Read dialog fields | Appropriate for action type (see §1.3) |
| 4 | Click "Confirm" | Action executes, dialog closes |
| 5 | Check chat for post-action message | "I just applied [action]. What's the current status now?" |
| 6 | Wait for follow-up analysis | Agent calls tools to verify the action took effect |

**Pass criteria:**
- Dialog opens as proper modal (not inline in chat)
- Dialog fields match action type
- Post-action message triggers fresh tool calls
- No raw JSON or `<tool_call>` tags in output

---

### TC-12: assign_owner Action (Dynamic Dialog)

| Step | Action | Expected |
|---|---|---|
| 1 | Navigate to "FleetGraph Demo Week - No Owner" sprint | Sprint with no owner |
| 2 | Open FleetGraph → Analyze | Analysis mentions "no owner assigned" |
| 3 | Click "Assign Owner" action suggestion | ConfirmDialog opens with dropdown |
| 4 | Dropdown shows team members | Alice, Bob, David, Emma, Frank, etc. |
| 5 | Select a team member and confirm | Owner assigned via PATCH endpoint |
| 6 | Refresh sprint page | Owner field now populated |

**Pass criteria:** Dropdown populated with real team members; assignment persists.

---

### TC-13: Off-Topic Handling

| Step | Action | Expected |
|---|---|---|
| 1 | On Analyze tab, type: "What's the weather today?" | Message sent |
| 2 | Read response | Polite redirect: "I can help you analyze this sprint..." |
| 3 | Type: "Tell me a joke" | Message sent |
| 4 | Read response | Similar redirect to sprint-relevant questions |

**Pass criteria:** Agent stays on task, never answers off-topic questions.

---

### TC-14: Expandable Tool Chips

| Step | Action | Expected |
|---|---|---|
| 1 | Find tool chip in analysis response (e.g., "entity_snapshot_get (74ms)") | Chip visible |
| 2 | Click chip to expand | Shows tool name, args, result, duration |
| 3 | Click again to collapse | Returns to compact chip |

**Pass criteria:** Expand/collapse works; data readable; no layout breaks.

---

### TC-15: Console Error Check

| Step | Action | Expected |
|---|---|---|
| 1 | Open browser DevTools → Console tab | Console visible |
| 2 | Perform full test run (TC-02 through TC-14) | Watch for errors |
| 3 | Note any red error messages | — |

**Pass criteria:**
- Zero unexpected JavaScript errors
- One expected 401 on session validation is acceptable
- No "Unknown action" errors
- No "OpenAI" API errors visible to user

---

### TC-16: Empty Input Handling

| Step | Action | Expected |
|---|---|---|
| 1 | On Analyze tab, click Send with empty input | Button should be disabled |
| 2 | Type spaces only, click Send | No request sent (or polite "please enter a message") |

**Pass criteria:** Empty/whitespace messages don't trigger API calls.

---

### TC-17: Rapid Click Handling

| Step | Action | Expected |
|---|---|---|
| 1 | Click "Analyze" tab rapidly (5x in 1 second) | Only one analysis request fires |
| 2 | Click an action suggestion button twice quickly | Only one dialog opens |
| 3 | Click Send button rapidly | Only one message sent |

**Pass criteria:** No duplicate requests, no duplicate dialogs, no race conditions.

---

## Part 3: Demo Data Verification

Navigate to the sidebar and verify these documents exist:

### Expected Sprints

| Sprint Title | Status | Owner | Issues |
|---|---|---|---|
| FleetGraph Demo Week - Review and Apply | Planning | dev@ship.local | 0 |
| FleetGraph Demo Week - Worker Generated | Planning | dev@ship.local | 0 |
| FleetGraph Demo Week - Active with Issues | Active | dev@ship.local | 8 |
| FleetGraph Demo Week - Unassigned Issues | Planning | dev@ship.local | 4 (no assignee) |
| FleetGraph Demo Week - No Owner | Planning | (none) | 3 |
| FleetGraph Demo Week - Plan Needs Approval | Planning | dev@ship.local | 2 |

### Expected Issues (Active with Issues Sprint)

| Title | State | Assignee | Priority |
|---|---|---|---|
| Implement tool-calling analysis agent | done | Alice Chen | high |
| Build 7 read-only analysis tools | done | Bob Martinez | high |
| Add HITL action suggestion flow | in_progress | David Kim | high |
| Create dynamic confirmation dialogs | in_progress | Emma Rodriguez | medium |
| Add proactive finding detection | in_progress | Frank Thompson | high |
| Write E2E tests for analysis flow | todo | Alice Chen | medium |
| Performance optimize tool execution | todo | Bob Martinez | low |
| Add streaming responses | backlog | David Kim | low |

### Expected Comments (Active Sprint)

- "Great progress on the tool-calling architecture..." (Alice)
- "The HITL flow needs attention..." (David)
- "Noting a risk: streaming responses may require..." (Bob)

---

## Part 4: Grading Rubric

### For Assignment Evaluation

| Category | Weight | What to Check |
|---|---|---|
| **Proactive Findings** | 20% | Findings appear, dismiss/snooze work, actions execute |
| **Analysis Agent** | 30% | Auto-analyze works, tools called, responses grounded, no hallucination |
| **HITL Actions** | 20% | All 7 action types have dialogs, execute correctly, state changes |
| **Multi-Turn Chat** | 15% | Session persistence, contextual responses, follow-up chips |
| **Polish & Edge Cases** | 15% | No console errors, off-topic handling, no leaked tags, mobile layout |

### Scoring

| Score | Description |
|---|---|
| **10/10** | All TCs pass, demo data complete, no console errors, actions all work |
| **8-9/10** | 1-2 minor issues (tool chip cosmetic, slow response, minor layout) |
| **6-7/10** | Core flows work but 1-2 actions fail or findings missing |
| **4-5/10** | Analysis works but no HITL, or HITL works but analysis broken |
| **< 4/10** | Major features non-functional |

---

## Part 5: Login Credentials

| Email | Password | Role |
|---|---|---|
| dev@ship.local | admin123 | Super Admin (primary test user) |
| alice.chen@ship.local | admin123 | Engineer |
| bob.martinez@ship.local | admin123 | Engineer |
| carol.williams@ship.local | admin123 | PM |
| david.kim@ship.local | admin123 | Engineer |
| emma.rodriguez@ship.local | admin123 | Designer |
| frank.thompson@ship.local | admin123 | Engineer |

---

## Part 6: URLs

| Environment | URL |
|---|---|
| **Staging** | https://ship-demo-staging.up.railway.app |
| **Health** | https://ship-demo-staging.up.railway.app/health |
| **Demo Sprint** | /documents/69b32b28-45c6-4417-a6ab-d7c467705e62 |
| **Demo Project** | Navigate via sidebar → "FleetGraph Demo Project" |
