# Story Handoff Workflow (Mandatory)

**Purpose**: After every completed story, deliver a user-run verification checklist (not just internal audit notes), capture feedback, and incorporate changes before proceeding.

---

## When To Run

Run this workflow at the end of **every** story, regardless of story type:
- feature
- bug fix
- performance
- security
- deployment/ops

---

## Handoff Checklist Template

Use this checklist in your handoff message:

1. **Story Metadata**
- [ ] Story ID and title
- [ ] Status (`Complete`, `Partially Complete`, `Blocked`)
- [ ] Scope completed vs deferred

2. **Acceptance Criteria Audit**
- [ ] AC-1 with explicit pass/fail evidence
- [ ] AC-2 with explicit pass/fail evidence
- [ ] AC-3+ with explicit pass/fail evidence
- [ ] Edge cases covered (list)

3. **Lookup Evidence Audit**
- [ ] Lookup brief delivered before implementation
- [ ] Local sources used (paths listed)
- [ ] External sources used (links listed)
- [ ] Best-practice takeaways mapped to implementation/tests

4. **Code and Tests Audit**
- [ ] Files changed (with paths)
- [ ] New/updated tests and what they prove
- [ ] Validation commands run and outcomes
- [ ] Coverage and quality-gate status

5. **Eval Evidence Audit (Required for AI Stories)**
- [ ] Eval brief delivered before implementation
- [ ] Objective and decision boundary recorded
- [ ] Dataset slices listed (production-like, edge, adversarial)
- [ ] Metrics/evaluator types listed
- [ ] Baseline vs current comparison recorded
- [ ] Human-calibration or reviewer check documented when automated judging is used

6. **Security and Reliability Audit**
- [ ] Secret handling validated
- [ ] Error handling/logging safety validated
- [ ] Notable risks or residual concerns

7. **Deployment/Runtime Audit**
- [ ] Local runtime verification
- [ ] Production verification (if applicable)
- [ ] Observability/logging checks (if applicable)

8. **Documentation and Memory Audit**
- [ ] Story file updated
- [ ] Smoke-test record updated
- [ ] SSOT updated
- [ ] Memory bank updates completed

9. **User Audit Checklist (Required)**
- [ ] List exactly what the user should test manually (3-7 steps)
- [ ] Provide copy/paste commands and URLs
- [ ] Provide explicit expected result for each step
- [ ] Provide "if this fails, check" hint for each step
- [ ] State what changed vs what should remain unchanged
- [ ] Include estimated verification time
- [ ] For UI stories: include visual-state checks (default/loading/error/interactive states) and accessibility spot checks
- [ ] For UI stories: include design-language conformance checks (principles applied + precedent updates)

10. **Feedback Intake (Required)**
- [ ] Ask user for feedback explicitly
- [ ] Capture feedback items as actionable bullets
- [ ] For narrow corrective feedback, run `.ai/workflows/user-correction-triage.md` before reopening broad planning or spec work
- [ ] Apply requested changes or document tradeoffs
- [ ] Re-issue updated checklist if changes are made

11. **AI Architecture Audit (Conditional)**
- [ ] Run only when AI-architecture files changed
- [ ] Follow `.ai/workflows/ai-architecture-change.md`
- [ ] Include `check_ai_wiring.sh` outcome in handoff only for those changes

12. **Flight Slot Audit (Required When Claimed)**
- [ ] If a flight slot was claimed, release it at handoff using `bash scripts/flight_slot.sh release ...`
- [ ] Include final flight status (`completed`, `blocked`, `cancelled`)

13. **Git Finalization Audit (Required)**
- [ ] Follow `.ai/workflows/git-finalization.md`
- [ ] Commit hash recorded in handoff
- [ ] Push confirmation recorded in handoff
- [ ] Remote sync status recorded in handoff
- [ ] PR URL and PR status recorded in handoff
- [ ] Merge status recorded in handoff
- [ ] Branch cleanup status recorded in handoff
- [ ] `bash scripts/git_finalize_guard.sh` passed

---

## Required User Audit Pack Format

Every handoff must include this section verbatim structure:

```markdown
## User Audit Checklist (Run This Now)

1. [Goal of check]
Command/URL:
Expected:
If this fails:

2. [Goal of check]
Command/URL:
Expected:
If this fails:

3. [Goal of check]
Command/URL:
Expected:
If this fails:

Changed in this story:
- [...]

Should remain unchanged:
- [...]

Estimated audit time: [X minutes]
```

Handoff is incomplete if this user audit section is missing.

---

## Feedback Loop Rules

1. Do not silently move to the next story after completion.
2. Always invite audit feedback at the end of handoff.
3. Treat user verification as a release gate for the story: no next story until user says proceed.
4. If user provides feedback:
   - acknowledge each item,
   - run `.ai/workflows/user-correction-triage.md` first when the feedback is a narrow correction or clarification,
   - implement changes,
   - return a revised checklist reflecting outcomes.
5. If user says to proceed, start the next story by first running `agent-preflight`, then repeat this workflow.
