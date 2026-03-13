# Security Review Workflow

**Purpose**: Perform repeatable security review before release and after sensitive changes.

---

## Phase 0: Story Preflight (Mandatory)

### Step 0: Run Preflight Before Security Review
- Run `agent-preflight` skill
- Deliver concise preflight brief before review/fixes

### Step 0.3: Coordinate Flight Slot (Mandatory for Implementation Flights)
- Run `.ai/workflows/parallel-flight.md`
- Claim slot via `bash scripts/flight_slot.sh claim ...`
- Keep default `single` mode unless intentionally running parallel chats/agents

### Step 0.5: Run Story Lookup Before Security Review
- Run `.ai/workflows/story-lookup.md`
- Gather local + external security best practices (framework/provider/deployment docs)
- Publish concise lookup brief before audit/fixes

---

## Phase 1: Scope

### Step 1: Identify Attack Surface
- External inputs (API/CLI/files)
- Secrets and credentials handling
- Data stores and external provider calls
- Deployment/runtime configuration

### Step 2: Classify Data Sensitivity
- Code artifacts
- Query payloads
- Logs/traces
- Any user-linked metadata

---

## Phase 2: Review

### Step 3: Run Automated Checks
```bash
<project-security-command>
<project-dependency-audit-command>
```

### Step 4: Manual Checklist Pass
- Input validation present and bounded
- Error paths sanitized
- No secret leakage in logs/errors
- File/path handling safe
- Retries/timeouts/circuit-breaking configured for external calls

---

## Phase 3: Abuse Testing

### Step 5: Negative Tests
- Oversized payloads
- Malformed requests
- Path traversal attempts
- Rate-limit and timeout handling
- For AI surfaces, include jailbreak/conflicting-instruction/adversarial formatting cases

### Step 6: Dependency and Config Review
- Env-only secret loading
- Least privilege credentials
- Deployment env parity verified

---

## Phase 4: Remediation

### Step 7: Fix Findings by Severity
- Critical/High before release
- Medium with tracked debt if justified
- Low documented with rationale

### Step 8: Document Outcome
- Add review summary to `.ai/memory/session/decisions-today.md`
- Log durable decisions in `.ai/memory/project/architecture.md`
- Update SSOT if release status changes

### Step 9: Finalize Git State (Mandatory)
- Run `.ai/workflows/git-finalization.md`
- Ensure commit + push complete
- Ensure `bash scripts/git_finalize_guard.sh` passes

---

## Exit Criteria
- No unresolved critical/high issues
- Security checklist complete
- Evidence recorded for auditability
- Story handoff checklist delivered with **User Audit Checklist (Run This Now)** and user feedback ingested (`.ai/workflows/story-handoff.md`)
- Claimed flight slot released via `bash scripts/flight_slot.sh release ...`
