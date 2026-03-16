# Story Handoff Workflow (Combined Completion Gate)

**Purpose**: Deliver one user-facing completion packet that combines verification evidence, manual audit guidance, and the finalization plan so approval and finalization happen in one clean gate.

---

## When To Run

Run this workflow at the end of every story, regardless of story type:
- feature
- bug fix
- performance
- security
- deployment/ops
- AI-architecture changes

---

## Required Completion Gate Shape

Every completion gate must include:
- `Current Status`
- `Testing Brief`
- `Decision / Design Brief`
- `Visible Proof`
- `Completion Plan`
- `User Audit Checklist (Run This Now)`

The completion gate is incomplete if any of these sections are missing.

---

## TDD Evidence Requirements

When `.ai/workflows/tdd-pipeline.md` was used, the completion gate must also include:
- TDD handoff artifact path listed
- RED/GREEN checkpoint evidence listed
- Property-test and mutation outcomes listed

---

## Completion Plan Requirements

The completion gate must include the finalization plan in the same packet as the user audit:
- current branch
- target base branch
- writable remote
- proposed commit message
- expected deploy status: `deployed`, `not deployed`, or `blocked`
- public demo status when deploy-relevant
- whether AI-architecture checks were required
- recovery path: `.ai/workflows/finalization-recovery.md`

Do not make the user go through a second human-facing git checklist after this packet.

---

## User Audit Checklist Requirements

Use this exact section heading:

```markdown
## User Audit Checklist (Run This Now)
```

Checklist rules:
- focus on manual judgment, visible proof, or approval decisions
- do not offload routine terminal verification Codex could run itself
- use commands only when the user truly must run them
- include expected outcome and failure hint for each step
- include `Changed in this story`
- include `Should remain unchanged`
- include `Estimated audit time`

---

## Feedback and Approval Rules

1. Treat this completion gate as the only user-facing approval step before final git actions.
2. If the user gives narrow corrective feedback, run `.ai/workflows/user-correction-triage.md` before broadening the work.
3. If the diff changes materially after feedback, issue a revised completion gate.
4. When the user explicitly approves, move directly into `.ai/workflows/git-finalization.md`.
5. If finalization fails, stop and route to `.ai/workflows/finalization-recovery.md`, then return here with updated status.

---

## Exit Criteria

- Completion evidence summarized clearly
- Finalization plan included in the same packet as the user audit
- User audit focused on manual judgment rather than routine commands
- Explicit user approval awaited before git finalization
