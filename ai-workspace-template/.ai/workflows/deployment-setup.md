# Deployment Setup Workflow

**Purpose**: Configure deployment for the chosen stack and hosting providers without assuming a default platform.

---

## Phase 0: Setup and Research (Mandatory)

### Step 0: Run Preflight
- Run `agent-preflight`
- Deliver concise preflight brief before deployment changes

### Step 0.3: Coordinate Flight Slot
- Run `.ai/workflows/parallel-flight.md`
- Claim a `deploy` or `infra` slot before edits

### Step 0.5: Run Story Lookup
- Run `.ai/workflows/story-lookup.md`
- Gather provider-specific guidance for the selected hosting/runtime platforms
- Publish lookup brief before changes

---

## Phase 1: Choose the Deployment Shape

### Step 1: Record Deployment Decisions
- Production environments needed
- Preview environments needed
- Single service vs multi-service topology
- Build and start commands
- Health-check path or readiness mechanism
- Rollback strategy

### Step 2: Record Provider Choices
- Backend/runtime host
- Frontend/static host (if applicable)
- Data/service providers
- Secrets/config management mechanism

Do not assume a hosting provider before setup has selected one.

---

## Phase 2: Configure the Chosen Providers

### Step 3: Create Provider Config
Add the minimum config required by the selected providers:
- build settings
- start command
- health checks
- environment variables
- preview/production routing

### Step 4: Configure Secrets
- Environment variables only
- No secrets committed to the repo
- `.env.example` kept current when applicable

### Step 5: Configure Git-Based Deploy Flow
- Choose a single production deployment path
- Prefer Git-linked auto-deploy where the provider supports it
- Document any emergency-only manual deploy commands separately

---

## Phase 3: Validate the Deployment Path

### Step 6: Verify Required Checks Before Release
Run the project-specific validation commands defined during setup.

### Step 7: Verify Runtime Health
- Health or readiness endpoint
- Critical path smoke test
- Logs/metrics/traces visible
- Rollback path documented and tested if practical

---

## Phase 4: Handoff

### Step 8: Document the Final Deployment Contract
- Chosen providers
- Environments
- Required secrets
- Health-check method
- Rollback method
- Production vs preview behavior

### Step 9: Finalize
- Run `.ai/workflows/story-handoff.md`
- Run `.ai/workflows/git-finalization.md`
- Release the claimed flight slot

---

## Exit Criteria

- Deployment target(s) chosen and documented
- Config and secrets management are in place
- Validation and health checks pass
- Rollback path is documented
- Handoff includes the runtime/deployment audit
