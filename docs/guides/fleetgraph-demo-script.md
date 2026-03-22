# FleetGraph Demo Script (3–5 minutes)

> **Style:** Narrate what you're doing as you do it. "Now I'm opening…", "As you can see…", "Behind the scenes, what happened is…"

---

## Setup Before Recording

- Open Ship at `https://ship-demo-production.up.railway.app` (or localhost)
- Log in as `dev@ship.local` / `admin123`
- Navigate to the **Ship Core** program → **FleetGraph Demo Project**
- Find **"FleetGraph Demo Week - Review and Apply"** in the weeks list
- Close the FleetGraph FAB if it's open

---

## Part 1: Introduction (30 seconds)

> "This is FleetGraph — a project intelligence agent built into Ship. It monitors your project data in the background and surfaces findings when something needs attention. It has two modes: a **proactive Findings tab** that detects issues automatically, and an **Analysis tab** where you can ask questions and get contextual advice. Let me show you both."

---

## Part 1.5: What Changed Since Last Demo (30 seconds)

> "Since the last demo, we made several significant architectural changes. First, we **completed the V2 pipeline rollout** — the proactive engine now runs nine independent detectors instead of three, covering everything from missing owners to deadline risk to approval gaps. Each detector scores findings on four dimensions — urgency, impact, actionability, and confidence — and FleetGraph surfaces all qualifying findings at once, not just the most urgent one."
>
> "Second, we **rebuilt the analysis chat as a separate analysis agent** with typed tool calls, grounded verification, and a completely new suggestion system. Analysis suggestions are now advisory-only — they inform but never execute. The LLM can suggest anything: Ship actions, process improvements, scope concerns, team health observations. Real mutations only happen through the Findings tab, behind a human gate with pre-validation."
>
> "Third, we **fixed a class of bugs** where the old frontend was manually building API requests with wrong field names — like nesting `owner_id` inside `properties` instead of at the top level, or sending string content where TipTap JSON was expected. All action handlers now go through the correct API paths, and the backend has pre-execution guards that re-check state before any mutation."

---

## Part 2: Proactive Findings — Three at Once (90 seconds)

**Click into "FleetGraph Demo Week - Review and Apply"**

> "I'm opening this demo week. Notice the FleetGraph button in the bottom-right corner — it already has a red badge showing **3**. That means FleetGraph detected three separate issues with this sprint before I even opened it."

**Click the FleetGraph FAB**

> "Now I'm opening FleetGraph. The Findings tab shows three cards simultaneously. Behind the scenes, the proactive pipeline ran a workspace sweep, checked this sprint's state against its detectors, and found three problems:"

**Point to each finding card as you narrate**

> "First — **'Week start drift.'** This sprint's start date has already passed, but it's still marked as planning. The recommended action is to start the week."
>
> "Second — **'No owner.'** Nobody is assigned as accountable for this sprint. FleetGraph suggests assigning an owner."
>
> "Third — **'Plan needs approval.'** The plan is waiting for review. The suggested action is to approve it."

> "Each of these was detected by a different detector in the scoring pipeline. FleetGraph runs all nine detectors, scores each finding on urgency, impact, actionability, and confidence, then surfaces everything above the threshold. That's why you see all three at once — not just the most urgent one."

---

## Part 3: Applying an Action (60 seconds)

**Click "Review and apply" on the "Week start drift" finding**

> "Now I'm going to apply the first action. I click 'Review and apply,' and FleetGraph shows me exactly what will happen — it'll send a POST request to start this week. I can see the evidence it used to make this recommendation."

**Click "Apply"**

> "I click Apply, and behind the scenes FleetGraph first runs a pre-validation check — it re-fetches the sprint's current state to make sure the action is still valid. If someone else had already started this week, it would catch that and show me a clear message instead of a cryptic API error. But the week is still in planning, so it goes through."

> "As you can see, the finding disappears — it's been resolved. FleetGraph retired it from the active findings list."

---

## Part 4: Dismiss and Snooze (30 seconds)

**On the remaining findings, demonstrate dismiss and snooze**

> "For the remaining findings, I can dismiss one if it's not relevant right now — dismiss permanently hides it from the Findings tab. Or I can snooze it — snooze hides it temporarily and brings it back after the timer expires. These are lightweight lifecycle actions that don't change anything in Ship."

---

## Part 5: Analysis Tab — Open-Ended Advice (60 seconds)

**Click the "Analyze" tab**

> "Now let me switch to the Analysis tab. This is the conversational side of FleetGraph. When I open it, it automatically analyzes the current document using Ship's REST APIs — it fetches the sprint details, its issues, standups, and related context."

**Wait for the initial analysis to load**

> "As you can see, the analysis agent pulled data using tool calls — you can see the tool chips showing which APIs it called and how long each took. The response is grounded in real data — notice the 'Grounded' badge, meaning every claim traces back to actual Ship state."

**Point to the suggestion cards**

> "Below the analysis, you'll see suggestion cards. These aren't limited to Ship actions — the agent can suggest anything: process improvements, team health observations, scope concerns. For example, it might suggest assigning an owner or approving the plan. These are advisory — they help you think, not execute. Real mutations only happen through the Findings tab."

**Type a follow-up question**

> "I can also ask follow-up questions. Let me type 'What should I prioritize first?' — the agent keeps the conversation context and gives a targeted answer based on the current sprint's data."

---

## Part 6: Wrap-Up (20 seconds)

> "That's FleetGraph. Two surfaces — Findings for proactive detection with executable actions behind a human gate, and Analysis for open-ended conversational advice. The proactive pipeline runs in the background on every workspace sweep, scoring candidates across nine detector types. The analysis agent can suggest anything — from Ship actions to team health advice. Everything is grounded in real data, and no mutation happens without explicit human confirmation."

---

## Timing Guide

| Section | Duration |
|---------|----------|
| Introduction | 0:30 |
| What changed since last demo | 0:30 |
| Three findings at once | 1:30 |
| Applying an action | 1:00 |
| Dismiss and snooze | 0:30 |
| Analysis tab | 1:00 |
| Wrap-up | 0:20 |
| **Total** | **~5:20** |

> To hit 3 minutes: skip Part 1.5 and shorten Part 5 (skip the follow-up question).
> To hit 5 minutes: shorten Part 1.5 to one sentence ("We expanded from 3 to 9 detectors and rebuilt the analysis agent").

---

## Recovery Tips

- **If a finding was already applied:** Re-run `pnpm db:seed` to reset demo data. The seed re-creates all three findings on the demo week.
- **If no findings appear:** The server re-seeds findings on every boot. Restart the server or re-run `pnpm db:seed`.
- **If analysis is slow:** The first call takes longer (cold LLM). Subsequent follow-ups are faster.
- **If the FAB badge shows 0:** Navigate away and back — the badge refreshes on document change.
