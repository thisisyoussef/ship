# Design Workflow

Use this workflow when the task is mostly about design systems, page design, or UI iteration.

Canonical sources still come first:

1. `AGENTS.md`
2. `docs/CONTEXT.md`
3. `docs/WORKFLOW_MEMORY.md`
4. `docs/IMPLEMENTATION_STRATEGY.md`
5. `docs/user-stories/README.md`
6. The active story file
7. `docs/guides/agent-design-workflow.md`

## Flow

1. Gather inspiration from Variant, Mobbin, Awwwards, or Cosmos.
2. Pick one canonical canvas:
   - Paper for HTML/CSS-native iteration
   - Pencil for versioned `.pen` design files and design-as-code workflows
3. Connect the local agent:
   - Codex: use its MCP surface and confirm the canvas appears in `/mcp` when applicable
   - Claude Code: use the documented Paper command or Pencil's local MCP path and confirm availability in `/mcp`
4. Record design decisions in `docs/plans/` and the active story.
5. Implement the final direction in the repo through the normal checked-in story flow.
6. Validate, record deployment status, and include explicit `What To Test` steps for visible changes.

Do not treat inspiration tools as the source of truth. The canonical source is the checked-in story plus the selected editable canvas and implemented code.
