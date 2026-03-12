# Bug Fixing Workflow

**Purpose**: Reproduce, isolate, fix, and verify bugs with TDD discipline.

---

## Phase 0: Story Preflight (Mandatory)

### Step 0: Run Preflight Before Reproduction
- Run `agent-preflight` skill
- Deliver concise preflight brief before test/code edits

### Step 0.3: Coordinate Flight Slot (Mandatory for Implementation Flights)
- Run `.ai/workflows/parallel-flight.md`
- Claim slot via `bash scripts/flight_slot.sh claim ...`
- Keep default `single` mode unless intentionally running parallel chats/agents

### Step 0.5: Run Story Lookup Before Reproduction
- Run `.ai/workflows/story-lookup.md`
- Gather local + external bug-domain guidance (framework/provider/runtime docs)
- Publish concise lookup brief before writing reproduction tests

---

## Phase 1: Reproduce

### Step 1: Capture Bug Contract
- Define expected vs actual behavior.
- Capture reproduction inputs and environment.
- Record stack traces and logs in `.ai/memory/session/blockers.md` if needed.
- If the bug affects AI behavior, add the failure example to the eval regression set or planned eval brief.

### Step 2: Write Failing Reproduction Test
- Add a test that fails for the current bug.
- Prefer the lowest level that reproduces reliably (unit > integration > e2e).
- Confirm the test fails for the right reason.

---

## Phase 2: Diagnose

### Step 3: Identify Root Cause
- Trace call flow and state transitions.
- Confirm assumptions with logs/fixtures.
- Avoid speculative fixes without evidence.

### Step 4: Expand Safety Tests
- Add edge-case tests adjacent to reproduction.
- Add regression tests for similar code paths.
- For AI bugs, add regression eval cases covering the original failure mode plus adjacent edge/adversarial variants.

---

## Phase 3: Fix

### Step 5: Minimal Corrective Change
- Implement smallest change that makes reproduction pass.
- Keep interfaces stable unless bug requires contract change.

### Step 6: Refactor If Needed
- Clean up complexity introduced by fix.
- Keep tests green during each small refactor.

---

## Phase 4: Verify

### Step 7: Run Validation Gates
```bash
<project-test-command>
<project-typecheck-command>
<project-lint-command>
<project-coverage-command>
```

### Step 8: Document and Log
- Add a concise bug summary in session decisions.
- Log anti-pattern if bug exposed one.
- Update SSOT status if milestone-impacting.

### Step 9: Finalize Git State (Mandatory)
- Run `.ai/workflows/git-finalization.md`
- Ensure commit + push complete
- Ensure `bash scripts/git_finalize_guard.sh` passes

---

## Exit Criteria
- Reproduction test added and passing
- Related regressions covered
- Quality gates pass
- Documentation updated
- Story handoff checklist delivered with **User Audit Checklist (Run This Now)** and user feedback ingested (`.ai/workflows/story-handoff.md`)
- Claimed flight slot released via `bash scripts/flight_slot.sh release ...`
