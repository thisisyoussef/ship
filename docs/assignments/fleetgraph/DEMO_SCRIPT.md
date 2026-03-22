# FleetGraph Demo Script

**Duration:** 4-5 minutes

---

## Pre-Recording Checklist

- [ ] LangSmith tab open with a recent FleetGraph trace
- [ ] Logged out of Ship so you can show login
- [ ] Active finding ready (the seed creates one automatically)

---

## Script

**[Open browser to ship-demo-production.up.railway.app]**

"FleetGraph is a project intelligence agent built on LangGraph that watches your work and catches problems before they become blockers."

**[Log in as dev@ship.local / admin123]**

"When I log in, I see a floating button in the corner. That's FleetGraph - and it's already found something."

**[Click the FAB to open the popover]**

"When I open it, I see two sections. At the top - active findings. These are issues FleetGraph detected proactively by continuously monitoring my workspace."

**[Point to the finding]**

"Right now it's showing a week-start drift. FleetGraph noticed this week is still marked as planning even though it started yesterday. It caught this automatically."

**[Read/highlight the 'Why this matters' section]**

"It tells me exactly why this matters - the week started March 16th, it's still in planning, and it shows who owns it. This isn't just an alert, it's context I can act on."

**[Point to 'Review and apply']**

"And here's the key - FleetGraph is offering to fix it. But notice what it says: 'You review this first. FleetGraph only acts after you confirm.' That's human-in-the-loop."

**[Click "Review and apply"]**

"When I click Review and Apply, I see exactly what FleetGraph wants to do - start this week. I can cancel if this isn't right, or confirm to let it execute."

**[Click Confirm]**

"Once I approve, FleetGraph applies the change. The finding resolves because the problem is fixed."

**[Click FAB again, scroll to bottom section]**

"The bottom section is on-demand mode. 'Help for this page' lets me ask FleetGraph to analyze whatever I'm looking at right now."

**[Click "Check this page"]**

"When I click Check this page, FleetGraph analyzes this specific document in context - looking at its status, related issues, and anything that might need attention."

**[Wait for analysis]**

"It's thinking through the page, and will surface anything relevant it finds."

**[Switch to LangSmith tab/window - have this pre-opened]**

"Under the hood, every FleetGraph action runs as a LangGraph workflow. Here's what that looks like."

**[Show the LangGraph trace in LangSmith]**

"This is the actual graph that just executed. You can see each node - context gathering, analysis, decision making - and trace exactly how FleetGraph reasoned about the problem."

**[Point out the graph structure]**

"Every run is fully observable. No black box - you can see the path it took and why."

**[Wrap up]**

"That's FleetGraph. Proactive findings that catch drift before it becomes a problem. Human-in-the-loop gates so nothing happens without your approval. On-demand analysis when you need deeper insight. And full LangGraph observability for every decision. An agent that watches, reasons, and acts - but only when you say so."

---

## End

---

## Demo Environment

- **URL:** https://ship-demo-production.up.railway.app
- **Login:** dev@ship.local / admin123
- **Demo Project:** FleetGraph Demo Project
- **Demo Weeks:**
  - FleetGraph Demo Week - Review and Apply
  - FleetGraph Demo Week - Validation Ready
  - FleetGraph Demo Week - Worker Generated
