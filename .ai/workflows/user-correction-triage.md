# User Correction Triage

Use this workflow to detect repeated patch loops and force a re-scope before the same mistake compounds.

## Canonical Sources

- `scripts/triage_counter.sh`
- `.ai/state/correction-triage.json`
- `docs/WORKFLOW_MEMORY.md`

## Rules

- Record repeated corrections with `scripts/triage_counter.sh`.
- Persist counts in `.ai/state/correction-triage.json`.
- If the limit is reached, stop looping and re-scope the story instead of adding another blind patch.
- Promote durable lessons into `docs/WORKFLOW_MEMORY.md` or `AGENTS.md` when the same correction keeps repeating.

## Typical Commands

```bash
scripts/triage_counter.sh status --story <story-id>
scripts/triage_counter.sh record --story <story-id>
scripts/triage_counter.sh clear --story <story-id>
```
