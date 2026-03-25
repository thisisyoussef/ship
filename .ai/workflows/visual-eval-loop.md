# Visual Eval Loop

Use this brief when a design-heavy story needs screenshot-driven iteration after a canvas pass or an implementation pass.

## Canonical Sources

1. active story file
2. `docs/guides/agent-design-workflow.md`
3. `docs/guides/design-visual-evaluation.md`
4. `.mcp.json`

## Flow

1. Choose the exact route, state, or proof lane to inspect.
2. Use the Playwright MCP contract from `.mcp.json` for browser capture when visual debugging is warranted.
3. Pick the three to five rubric dimensions that matter most:
   - hierarchy and focus
   - spacing and alignment
   - typography and copy fit
   - color and state clarity
   - responsiveness
   - fidelity and reuse
4. Capture targeted screenshots at the relevant breakpoints.
5. Mark each dimension as `pass`, `attention`, or `fail`, then make the smallest useful change.
6. Re-capture until the critical failures are gone.
7. Record the route, breakpoints, findings, and any saved screenshot filenames in the active story or `docs/plans/`.

## Guardrails

- Screenshots are evidence, not the source of truth.
- Do not make Playwright the default closeout gate for visible stories.
- Save screenshot artifacts under `docs/evidence/screenshots/` only when they materially help the story or handoff.
