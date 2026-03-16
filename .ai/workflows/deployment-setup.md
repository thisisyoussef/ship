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

### Step 0.6: Confirm the Real Provider Baseline
- Verify the active deployment contract from repo docs and scripts instead of guessing from neighboring repos or historical artifacts.
- For Ship today, the canonical deployment baseline is:
  - API/runtime: AWS Elastic Beanstalk
  - Frontend/static: S3 + CloudFront
  - Infra/config/secrets: AWS-native scripts, SSM, and related services
- Treat Render, Vercel, or Railway references as non-canonical unless the live repo docs and scripts are updated to say otherwise.
- Treat legacy/manual demo URLs as non-canonical unless they are backed by current repo-owned config, scripts, or workflows.

### Step 0.7: Verify Deployment Access Early
- Before promising a deploy, verify the required provider access is available from the current machine/session.
- For Ship's default deploy path, confirm AWS credentials and required tooling first.
- If access is missing, do not imply the change was deployed. Record the exact blocker and continue with deploy-readiness work only.

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

### Step 7.5: Record Deployment Execution Status
- Explicitly capture one of:
  - `deployed` with environment and command evidence,
  - `not deployed` with rationale,
  - `blocked` with the missing credential/access/prerequisite.
- Do not leave deployment state implied.

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
- Deployment execution status is explicit
