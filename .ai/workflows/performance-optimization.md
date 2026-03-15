# Performance Optimization Workflow

**Purpose**: Improve latency/throughput using measured, reversible changes.

---

## Phase 0: Story Preflight (Mandatory)

### Step 0: Run Preflight Before Baseline Work
- Run `agent-preflight` skill
- Deliver concise preflight brief before changes

### Step 0.3: Coordinate Flight Slot (Mandatory for Implementation Flights)
- Run `.ai/workflows/parallel-flight.md`
- Claim slot via `bash scripts/flight_slot.sh claim ...`
- Keep default `single` mode unless intentionally running parallel chats/agents

### Step 0.5: Run Story Lookup Before Baseline Work
- Run `.ai/workflows/story-lookup.md`
- Gather local + external performance best practices relevant to current path
- Publish concise lookup brief before benchmarking/changes

---

## Phase 1: Baseline

### Step 1: Define Metric and Budget
- Choose target metric (latency p95, throughput, memory).
- Set acceptance threshold aligned with SSOT.
- If optimizing an AI path, also define the quality metric that must not regress.

### Step 2: Capture Baseline
- Measure before changes with representative workloads.
- Record baseline in `.ai/memory/session/decisions-today.md`.

---

## Phase 2: Profile and Hypothesize

### Step 3: Find Bottlenecks
- Profile hotspots in ingestion/retrieval/generation paths.
- Confirm if bottleneck is CPU, network, I/O, or query strategy.

### Step 4: Form Optimization Hypothesis
- Propose one change with expected impact and risk.
- Define rollback trigger and validation method.

---

## Phase 3: Implement Incrementally

### Step 5: Add Performance Guard Test
- Add benchmark/smoke test where stable.
- Ensure test is deterministic enough for CI thresholds.

### Step 6: Apply One Optimization at a Time
Examples:
- async batching for embedding calls
- payload indexes for frequent metadata filters
- reduced rerank candidate window
- caching frequent query artifacts

---

## Phase 4: Validate and Decide

### Step 7: Re-measure and Compare
- Compare post-change metrics to baseline.
- Validate no quality regression (precision/citation correctness).
- For AI paths, use task-specific evals to verify quality did not regress while latency/throughput improved.

### Step 8: Keep or Roll Back
- Keep if gains are material and safe.
- Roll back if gains are marginal or regressions appear.

### Step 9: Finalize Git State (Mandatory)
- Run `.ai/workflows/git-finalization.md`
- Ensure commit + push complete
- Ensure `bash scripts/git_finalize_guard.sh` passes

---

## Exit Criteria
- Metric target achieved or clearly characterized
- No correctness regression
- Changes documented with before/after numbers
- Story handoff checklist delivered with **User Audit Checklist (Run This Now)** and user feedback ingested (`.ai/workflows/story-handoff.md`)
- Claimed flight slot released via `bash scripts/flight_slot.sh release ...`
