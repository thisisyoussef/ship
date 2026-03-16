# PRESEARCH

Complete this before writing FleetGraph implementation code.

## Phase 1: Define the Agent

### 1. Agent Responsibility Scoping

- What events in Ship should the agent monitor proactively?
- What constitutes a condition worth surfacing?
- What is the agent allowed to do without human approval?
- What must always require confirmation?
- How does the agent know who is on a project?
- How does the agent know who to notify?
- How does the on-demand mode use context from the current view?

### 2. Use Case Discovery

Minimum: 5 use cases.

For each use case, capture:
- Role
- Trigger
- What the agent detects or produces
- What the human decides
- Why this is a real pain point in Ship

### 3. Trigger Model Decision

- Poll, webhook, or hybrid?
- How frequently does proactive monitoring run?
- What latency is acceptable for each use case?
- What are the cost implications at 100 and 1,000 projects?

## Phase 2: Graph Architecture

### 4. Node Design

- Context nodes
- Fetch nodes
- Reasoning nodes
- Action nodes
- Output nodes
- Conditional edges and branch conditions
- Which fetches run in parallel

### 5. State Management

- What state is carried during a single graph run?
- What state persists between proactive runs?
- How do we avoid redundant Ship API calls?
- What should be cached, and for how long?

### 6. Human-in-the-Loop Design

- Which actions require confirmation?
- What does the confirmation UX look like inside Ship?
- What happens when the user dismisses, snoozes, or ignores the prompt?

### 7. Error and Failure Handling

- What happens if the Ship API is unavailable?
- How does the graph degrade gracefully?
- What recovery and retry paths exist?

## Phase 3: Stack and Deployment

### 8. Deployment Model

- Where does proactive FleetGraph run when no user is present?
- How is it kept alive?
- How does it authenticate with Ship without a user session?

### 9. Performance and Cost

- How does the design satisfy the under-5-minute detection target?
- What is the token budget per run?
- Where are the cost cliffs?

## Evidence Checklist

- [ ] PRD read end to end
- [ ] At least 5 use cases discovered
- [ ] Trigger model defended
- [ ] Human-in-the-loop boundaries defined
- [ ] State model drafted
- [ ] Failure modes listed
- [ ] Deployment/auth model identified
