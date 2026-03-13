# AI Architecture Change Workflow (Isolated)

**Purpose**: Validate agent-orchestration wiring **only** when making AI-architecture changes.

---

## When To Run

Run this workflow only when the story/task changes any of:
- `.ai/**`
- `AGENTS.md`
- `.clauderc`
- `.cursorrules`
- the project-specific agent-contract or runtime config file selected during setup
- `scripts/check_ai_wiring.sh`

If none of these files are changed, skip this workflow.

---

## Step 1: Confirm Change Scope

Identify whether current changes touch AI-architecture files:

```bash
git diff --name-only
```

If no files from the scope above are present, stop here.

---

## Step 1.5: Claim AI Architecture Flight Slot

Before editing AI-architecture files, claim an `ai_arch` slot:

```bash
bash scripts/flight_slot.sh claim \
  --flight-id flight-ai-<short-id> \
  --slot ai_arch \
  --owner codex \
  --paths ".ai,AGENTS.md,.clauderc,.cursorrules,<project-agent-contract-file>,scripts/check_ai_wiring.sh"
```

Use default `single` mode unless intentionally running parallel flights.

---

## Step 2: Run AI Wiring Audit

Run:

```bash
bash scripts/check_ai_wiring.sh
```

This must pass before merging AI-architecture changes.

---

## Step 3: Address Failures

If the audit fails:
1. Fix missing/incorrect orchestration references and workflow gates.
2. Re-run `bash scripts/check_ai_wiring.sh`.
3. Repeat until clean.

---

## Step 4: Handoff Requirements (AI-Architecture Changes Only)

When this workflow is triggered, add an **AI Architecture Audit** section in handoff:
- changed architecture files,
- `check_ai_wiring.sh` result,
- any contract/workflow updates made.
- flight release status from `bash scripts/flight_slot.sh release ...`.
- git finalization evidence from `.ai/workflows/git-finalization.md` and `bash scripts/git_finalize_guard.sh`.

Do not include this section for non-AI-architecture stories.

---

## Exit Criteria

- AI-architecture change scope confirmed
- `bash scripts/check_ai_wiring.sh` passed
- AI Architecture Audit section included in handoff (only when triggered)
- Claimed `ai_arch` flight slot released
- Git finalization guard passed
