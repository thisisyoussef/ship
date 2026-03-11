# Parallel Flight Workflow (Flexible Single/Parallel Execution)

**Purpose**: Coordinate one or more concurrent agent flights while preserving the existing preflight -> lookup -> TDD -> handoff process.

---

## Default Behavior (No Process Break)

- Default mode is `single`.
- In `single` mode, this workflow behaves like lightweight tracking for the same one-story-at-a-time behavior already in place.
- Switch to `parallel` mode only when you intentionally run multiple chats/agents at once.

---

## When To Run

Run this before implementation work starts for a flight:
- story implementation,
- architecture/doc flights,
- deployment/ops flights.

You can skip only for quick read-only exploration.

---

## Step 1: Initialize or Inspect Board

```bash
bash scripts/flight_slot.sh init
bash scripts/flight_slot.sh status
```

Board file:
- `.ai/state/flight-board.json`

---

## Step 2: Select Execution Mode

### Single flight (default)

```bash
bash scripts/flight_slot.sh mode single
```

### Parallel flights

```bash
bash scripts/flight_slot.sh mode parallel --max-active 3
```

Use parallel mode only when a coordinator is intentionally running multiple independent flights.

---

## Step 3: Claim a Flight Slot

Claim before editing files:

```bash
bash scripts/flight_slot.sh claim \
  --flight-id flight-us-p1-002 \
  --slot code \
  --owner codex \
  --paths "<project-source-path>,<project-test-path>" \
  --story US-P1-002 \
  --branch codex/flight-us-p1-002
```

### Slot guidance
- `code`: feature/bug code changes
- `docs`: docs-only changes
- `infra`: config/deployment infrastructure changes
- `deploy`: release/deploy flight
- `ai_arch`: `.ai`/orchestration contract changes

### Path-lock guidance
- Use stable path prefixes (not broad wildcards).
- Keep lock scope as small as possible.
- If claim fails, either:
  - wait for conflicting flight to release,
  - narrow your lock paths,
  - or move to a non-conflicting flight.

---

## Step 4: Run Normal Workflow (Unchanged)

After claim succeeds, run existing process as usual:
1. `agent-preflight`
2. `.ai/workflows/story-lookup.md`
3. task workflow (`feature`, `bug`, `performance`, `security`, `deployment`)
4. `.ai/workflows/story-handoff.md`

No existing quality/security/deployment gates are removed by this workflow.
Git finalization is still mandatory via `.ai/workflows/git-finalization.md`.

---

## Step 5: Release Flight at Handoff

When the flight is complete (or paused/cancelled), release the slot:

```bash
bash scripts/flight_slot.sh release \
  --flight-id flight-us-p1-002 \
  --status completed \
  --summary "US-P1-002 handoff delivered"
```

Status choices:
- `completed`
- `blocked`
- `cancelled`

---

## Step 6: Optional Reset (Coordinator Use)

```bash
bash scripts/flight_slot.sh reset --confirm
```

Use reset only when intentionally clearing all active/history state.

---

## Exit Criteria

- Flight claimed before edits
- Standard story workflow completed
- Handoff delivered
- Flight released with final status
