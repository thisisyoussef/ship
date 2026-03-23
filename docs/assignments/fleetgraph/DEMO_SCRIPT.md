# FleetGraph Final Demo Script

**Duration:** 4-6 minutes

## Goal

Tell one clear story on one sprint:

`Detection -> graph -> decision -> human step -> result`

The video should prove that FleetGraph:

- detects a real proactive problem
- runs through an observable LangGraph path
- proposes a concrete next step
- pauses for human approval before mutating Ship
- stays useful on demand from the current page
- leaves a visible result in Ship after apply

## Hook

Use this as the cold open before you start clicking:

"What if your project tool could catch a slipped sprint on its own, show you the exact graph run that found it, and still refuse to change anything until a human approves it? That is the whole story of this FleetGraph demo."

## Intro

Use this immediately after the hook:

"I’m not going to tour every feature one by one. I’m going to follow one sprint from proactive detection to visible result, and I’ll show the same proof chain the whole way through: what the agent noticed, what path the graph took, what it proposed, where the human stepped in, and what changed in Ship afterward."

## Demo Story Lane

- URL: `https://ship-demo-production.up.railway.app`
- Login: `dev@ship.local` / `admin123`
- Project: `FleetGraph Demo Project`
- Story sprint: `FleetGraph Demo Week - One Story`
- Story finding: `Week start drift: FleetGraph Demo Week - One Story`
- Proactive trace tab: `https://smith.langchain.com/public/d5f1a274-6f81-4c42-b8be-924791429323/r`
- Approval-preview trace tab: `https://smith.langchain.com/public/e969f90a-ef5a-45e5-bded-9d6de7233311/r`

## Pre-Recording Checklist

- [ ] Log out of Ship so the video starts from a clean login.
- [ ] Confirm `FleetGraph Demo Week - One Story` is visible in `Documents`.
- [ ] Confirm the proactive panel on that sprint shows `Week start drift: FleetGraph Demo Week - One Story`.
- [ ] Open both public LangSmith traces in separate tabs before recording.
- [ ] If Railway has not picked up the new story lane yet, wait for the post-merge auto-deploy instead of improvising a different video path.

## Script

### 1. Cold open and frame the story

**[Open on the `FleetGraph Demo Week - One Story` page with the proactive finding already visible]**

"What if your project tool could catch a slipped sprint on its own, show you the exact graph run that found it, and still refuse to change anything until a human approves it? That is the whole story of this FleetGraph demo."

"I’m not going to tour every feature one by one. I’m going to follow one sprint from proactive detection to visible result, and I’ll show the same proof chain the whole way through: what the agent noticed, what path the graph took, what it proposed, where the human stepped in, and what changed in Ship afterward."

### 2. Set up the story

**[Open the public demo and log in]**

"I’m going to show one FleetGraph story from detection to outcome on a single sprint, instead of touring every feature separately."

**[Go to Documents and open `FleetGraph Demo Week - One Story`]**

"This sprint is the seeded final-demo story lane. It starts in a bad state on purpose so we can verify the whole agent loop."

### 3. Show proactive detection

**[Point to the proactive FleetGraph panel]**

"FleetGraph has already detected a real problem here: this week is still in planning even though its start date has already passed."

**[Read the finding title and the Why this matters evidence]**

"What matters is that the agent is not just raising a generic alert. It shows the specific week, the missed start window, and the current ownership context, so I can understand why it surfaced this."

**[Briefly point at quick actions]**

"It also gives lifecycle controls like dismiss and snooze, but the important path for this story is the recommended action."

### 4. Show the human gate before action

**[Click `Review and apply`]**

"Now FleetGraph is proposing a concrete fix: start the week in Ship. But it has not executed anything yet. This is the human-in-the-loop boundary."

**[Pause on the confirmation UI]**

"The agent has done the detection and prepared the action, but Ship still waits for me to confirm or cancel."

### 5. Show the graph and trace for the detection path

**[Switch to the proactive LangSmith trace tab]**

"Here is the graph run behind that proactive finding. This is the proof chain I want the reviewer to see: the trigger, the graph path, the finding that came out, and the proposed action."

**[Point out the proactive path]**

"This run shows the proactive branch selecting a candidate, ranking it, and preparing an approval-required outcome instead of mutating Ship automatically."

**[Return to Ship]**

"So we’ve now seen the detection and the graph path. Next is the human decision."

### 6. Apply the proactive action and show the result

**[Click `Start week in Ship`]**

"I’m approving the action."

**[Wait for the page to refresh]**

"Now the result is visible in Ship itself. The week has been started, and the original finding clears because the condition that triggered it is gone."

### 7. Stay on the same sprint for on-demand mode

**[Switch to the `Review` tab on the same sprint]**

"The important part is that I’m still on the same sprint. FleetGraph now uses the current view as on-demand context instead of starting a disconnected chat."

**[Point to the entry card]**

"This entry card is the on-demand doorway. It is grounded in the current page, the current tab, and the review state for this sprint."

### 8. Show current-page analysis

**[Click `Check this page`]**

"When I ask FleetGraph to check this page, it analyzes the current review tab in context. It can see the document I’m on, the route surface, and the related review state."

**[Wait for the FAB analysis to appear]**

"This is not a generic chatbot answer. It is analysis tied to this exact sprint review."

**[Ask a short follow-up such as `What else should I do here?`]**

"And because it keeps the same thread, I can ask a follow-up without losing that page context."

### 9. Show guided next step on the same page

**[In the FAB, switch to `Guided actions` and click `Preview next step`]**

"Now FleetGraph turns that page context into a guided next step. It previews the next consequential action before it executes anything."

**[Point to `Validate week plan`]**

"In this case, it proposes validating the week plan, and it tells me exactly where I’ll see the result on the current page."

### 10. Show the graph and trace for the approval preview path

**[Switch to the approval-preview LangSmith trace tab]**

"This is the matching approval-preview graph path. Again, the goal is traceability: we can see how the graph reached an approval-required decision from the current page context."

**[Point out that the run pauses instead of auto-applying]**

"The graph pauses for confirmation instead of acting on its own, which is the same safety boundary we saw in proactive mode."

### 11. Apply the guided action and show the final visible result

**[Return to Ship and click `Apply`]**

"I’ll approve this guided step too."

**[Wait for the FAB result and the page refresh]**

"Now FleetGraph shows the action result, and the page itself updates. `Plan Validation` now shows `Validated`, so the reviewer can see the outcome directly in Ship."

### 12. Wrap up

**[Stay on the updated review page]**

"That’s the full story: FleetGraph detected a problem proactively, ran through an observable graph path, proposed a decision, paused for human approval, and then stayed useful on demand from the same sprint page until the visible result was complete."

"The rest of the submission still includes the five use cases, five test cases, and their matching traces. This video is just the clearest single story that proves the system works."

## Backup Note

If the new story lane has not appeared on Railway yet after the merge auto-deploy, do not record around a broken state. Wait for the live demo to refresh, because this script depends on the seeded `FleetGraph Demo Week - One Story` path being present.
