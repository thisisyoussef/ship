# AI Workspace

Use this directory as the organized compatibility workspace for tools and contributors that expect AI workflow material under `.ai/`.

`AGENTS.md` plus `docs/` remain the canonical control plane. This directory mirrors the live harness so the workflow is easier to browse without reviving the old `.ai`-first model.

## Canonical Control Plane

Read these first:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. `docs/DEFINITION_OF_DONE.md`

## Layout

- `.ai/docs/WORKSPACE_INDEX.md`: map of the compatibility workspace and where each item points in the canonical docs
- `.ai/workflows/`: short workflow briefs for common harness flows
- `.ai/agents/`: compatibility entrypoints for agent-specific tools
- `.ai/state/`: persisted runtime state used by the harness helpers

For design-heavy work, use `.ai/workflows/design-workflow.md` as the compatibility brief and `docs/guides/agent-design-workflow.md` as the canonical source.

## Rules

- Mirror the canonical workflow; do not override `AGENTS.md` or `docs/`.
- Keep workflow docs human-readable and state files machine-friendly.
- When the harness changes, update this directory and run `bash scripts/check_ai_wiring.sh`.
