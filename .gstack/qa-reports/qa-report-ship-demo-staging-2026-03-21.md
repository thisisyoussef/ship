# FleetGraph QA Report — Analysis Agent Rebuild

**Target:** https://ship-demo-staging.up.railway.app
**Date:** 2026-03-21 (updated after PR #81 deploy)
**Duration:** ~15 minutes
**Tester:** Automated (Claude Code + gstack browse)
**Tier:** Standard
**Commits tested:** PR #80 (remove old chat), PR #81 (analysis agent rebuild)

---

## Health Score: 85/100

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| Console | 15% | 70 | Two 401 errors during browsing (session timeout mechanism) |
| Links | 10% | 100 | No broken links |
| Visual | 10% | 90 | Panel layout good on desktop, tool chips could be richer |
| Functional | 20% | 95 | Analysis agent works end-to-end, tools grounded, multi-turn works |
| UX | 15% | 80 | No auto-scroll, tool chips not expandable |
| Performance | 10% | 85 | ~10s for initial analysis (LLM + 7 tool calls), ~8s for followups |
| Content | 5% | 95 | Grounded responses with real data, contextually appropriate |
| Accessibility | 15% | 85 | ARIA tree complete, FAB has proper roles |

---

## Critical Bugs Fixed In This Cycle (PRs #74-#81)

| Bug | Severity | Status | Fix |
|-----|----------|--------|-----|
| BUG-001: `gpt-5-mini` model doesn't exist | Critical | FIXED (PR #74) | Changed to `gpt-4o-mini` |
| BUG-002: `max_output_tokens` rejected with tools | Critical | FIXED (PR #75) | Omitted from tool requests |
| BUG-003: Stale sessions show old errors | Medium | FIXED (PR #80-81) | Entire chat orchestrator replaced |
| BUG-004: LLM asks for sprint/project ID | Medium | FIXED (PR #81) | Context adapter sends entity info automatically |
| BUG-005: OpenAI Responses API `tool_calls` format error | Critical | FIXED (PR #81) | Switched to manual `<tool_call>` tag parsing |

---

## Test Results — Analysis Agent (PR #81)

### TC-001: Login & Navigation ✅ PASS
- Login with seeded credentials → redirect to docs
- Accountability banner renders (6 overdue items)
- Sidebar navigation works across all pages

### TC-002: FleetGraph FAB Button ✅ PASS
- Present on sprint pages
- Present on project pages
- Opens panel with Findings + Analyze tabs

### TC-003: Proactive Findings Tab ✅ PASS
- Shows 1 finding: "Week start drift" with severity badge
- Action buttons: Review week start, Dismiss, Snooze (10s, 4h)
- Finding is contextually relevant

### TC-004: Analysis Agent — Auto-Analyze on Mount ✅ PASS
- Clicking Analyze tab auto-triggers analysis
- User message shown: "Analyze this sprint and tell me what's important."
- Loading indicator visible while waiting
- Input disabled during loading
- Response within ~10 seconds

### TC-005: Analysis Agent — Grounded Responses ✅ PASS
- Sprint analysis references: Sprint 14, planning status, confidence 90%, specific issue names
- Project analysis references: 14 open issues, target date April 1 2026, confidence level 4, $50,000 monetary impact
- Tool call chips visible (entity_snapshot_get, graph_neighbors_get, etc.)
- Verification badge shows "Grounded" with source count

### TC-006: Analysis Agent — Context Awareness ✅ PASS (Critical requirement)
- **Agent NEVER asks for sprint/project ID** — fixed from previous QA
- Automatically knows current entity from page context adapter
- Sprint analysis uses sprint-specific language
- Project analysis uses project-specific language
- Different suggested followups per entity type

### TC-007: Analysis Agent — Suggested Followups ✅ PASS
- Sprint followups: "What specific findings will be showcased?", "What tasks for next sprint?", "How does this compare?"
- Project followups: "What are the open issues?", "Project timeline details?", "Team members' roles?"
- Chips are clickable and send as new messages

### TC-008: Analysis Agent — Multi-Turn Conversation ✅ PASS
- Clicked followup chip → new response received
- Typed free-form question → new response received
- Session persists across turns (same session_id)
- Previous messages remain visible in conversation

### TC-009: Analysis Agent — Cross-Entity Support ✅ PASS
- Works on sprint pages (FleetGraph Demo Week - Review and Apply)
- Works on project pages (Ship Core - Core Features)
- Different data fetched per entity type

---

## Remaining Issues

### ISSUE-001: Console 401 errors during browsing
- **Severity:** Medium
- **Category:** Functional
- **Status:** Deferred (session timeout mechanism, not analysis-agent specific)

### ISSUE-002: Analysis panel doesn't auto-scroll to latest message
- **Severity:** Medium
- **Category:** UX
- **Repro:** Multiple turns → panel doesn't scroll to newest response

### ISSUE-003: Tool call chips lack expandable detail
- **Severity:** Low
- **Category:** UX
- **Repro:** Click tool chip → nothing happens (should show args/result)

---

## Architecture Improvements (PR #80 → #81)

| Before (old chat orchestrator) | After (analysis agent) |
|-------------------------------|----------------------|
| Used OpenAI Responses API native tool-calling | Manual `<tool_call>` tag parsing (provider-agnostic) |
| Format incompatibilities caused 400 errors | Works with any LLM provider |
| No context adapter — LLM asked for IDs | Context adapter sends entity info automatically |
| No verification metadata | Every response has `verification.claims_grounded` |
| No suggested followups | Structured followup suggestions |
| No session memory management | Bounded 10-turn memory with summary |
| No intent classification | Rule-based classifier (tool_use / clarify / out_of_scope) |

---

## Verdict

**STATUS: DONE**

The analysis agent rebuild (PR #81) resolves all critical and medium bugs from the previous QA cycle. The system now:
1. Never asks for entity IDs (context adapter)
2. Never hits OpenAI API format errors (manual tool-call parsing)
3. Provides grounded, tool-backed responses with verification metadata
4. Supports multi-turn conversation with bounded memory
5. Offers contextual suggested followups
6. Works across sprint and project pages

**QA found 3 issues, 0 critical, health score 85/100. Ship-ready.**
