# User Correction Triage Workflow

**Purpose**: Handle narrow user corrections proportionally instead of turning every clarification into a new story, ADR, or broad replanning cycle.

---

## When To Run

Run this workflow when the user gives a targeted correction or clarification such as:
- ignore one stale bullet or requirement,
- rename or reword one item,
- prefer a different provider or tool without changing the broader architecture,
- point at one mistaken assumption,
- ask for a small directional correction to the current work.

Do not use this workflow when the user is actually changing product scope, architecture, or acceptance criteria in a material way.

---

## Step 1: Restate the Correction

Capture the correction in one or two sentences:
- what the user corrected,
- what should now be treated as out of scope or preferred,
- what remains unchanged.

If the correction is ambiguous, ask one narrow clarifying question.

---

## Step 2: Classify Blast Radius

Choose one level before editing:

- `L1: Local correction`
  - Affects wording, one stale assumption, one provider mention, one output format, one path, or one doc surface.
- `L2: Current-story contract correction`
  - Affects multiple files in the current story, but does not require a new architecture direction or implementation phase.
- `L3: Real scope or architecture change`
  - Changes acceptance criteria, runtime shape, deployment model, security boundary, or other material design choices.

---

## Step 3: Apply the Smallest Valid Response

### If `L1`
- patch only the directly affected files,
- do not create a new story pack,
- do not add a new ADR,
- do not broaden the task with unrelated cleanup.

### If `L2`
- patch the directly affected files and current story artifacts,
- keep the diff bounded to the current story,
- only create additional spec or memory artifacts if the existing contract would otherwise become misleading.

### If `L3`
- stop and re-route through the normal story gates:
  - preflight,
  - lookup,
  - spec-driven delivery,
  - eval-driven development when applicable.

---

## Step 4: State Why You Did Not Escalate

In handoff or the next update, say:
- which blast-radius level you classified,
- which files were updated,
- why broader replanning was not needed.

If you did escalate, say exactly what made it a real scope or architecture change.

---

## Exit Criteria

- The correction was restated clearly
- Blast radius was classified before editing
- Only the minimum affected surfaces were changed for `L1` and `L2`
- Full story replanning was used only for `L3`
