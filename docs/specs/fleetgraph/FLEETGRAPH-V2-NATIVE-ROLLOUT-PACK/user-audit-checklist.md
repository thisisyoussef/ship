# FleetGraph V2 Native Rollout Pack User Audit Checklist

Use this checklist to QA the native FleetGraph V2 rollout on the best available Ship surface.

Preferred surface:
- refreshed Railway public demo after deploy

Fallback surface:
- local Ship app with the current branch running

## Scope Covered

- native `/api/fleetgraph/entry` and `/api/fleetgraph/analyze` responses
- V2 follow-up chat turns on the same thread
- V2 review/apply for confirm actions
- V2 review/apply for typed dialog actions
- truthful action success/failure messaging
- native worker/debug thread continuity

## Audit Steps

1. Open a page that renders the FleetGraph FAB or entry surface.
   Expected:
   - the FleetGraph surface loads without a compatibility-error state
   - the page does not depend on a standalone V2-only debug route to show useful results

2. Trigger FleetGraph analysis for the page.
   Expected:
   - the first assistant result reads naturally
   - findings, if present, render from the same response as the summary
   - any action buttons appear as review actions, not direct browser-side Ship mutations

3. Ask a follow-up question in the same FleetGraph thread.
   Expected:
   - the response stays grounded in the current page context
   - the reply reflects the follow-up question rather than replaying the first answer verbatim
   - the thread remains continuous instead of starting a new session silently

4. Open a confirm-only action review such as `start_week` or plan approval.
   Expected:
   - FleetGraph opens a server-backed review state
   - the dialog shows human-facing copy plus evidence
   - cancel closes cleanly without mutating Ship

5. Open a typed-dialog action review such as assigning an owner or posting a comment.
   Expected:
   - the dialog renders the needed form field(s)
   - the confirm action stays disabled by workflow until the user makes an explicit choice
   - submit goes back through FleetGraph, not directly to the Ship endpoint from the browser

6. Complete one action that succeeds or intentionally provoke one that fails validation/server-side.
   Expected:
   - success copy appears only after confirmed success
   - failures read truthfully and do not claim Ship changed when it did not
   - the review dialog closes or re-prompts according to the returned V2 state

7. Inspect FleetGraph debug thread history if that surface is available.
   Expected:
   - the same thread id shows the initial analysis plus later follow-up/review checkpoints
   - pending interrupts match the current review state
   - no canonical route depends on old V1-shaped debug envelopes

8. If the worker path is available, inspect a proactive finding that maps to the same page or workspace.
   Expected:
   - the worker-produced result uses the same native V2 contract concepts
   - dismiss/snooze/apply lifecycle changes remain consistent with the on-demand path

## Tail Follow-On Slot

If you find a non-blocking UI/copy issue during this audit, append it as a follow-on item after the native rollout pack rather than reopening the rollout contract itself.
