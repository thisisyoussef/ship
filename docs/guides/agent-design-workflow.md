# Agent Design Workflow Guide

Use this guide when the task is primarily design-system work, page design, UI exploration, or visual iteration.

The goal is to keep design work agent-friendly without losing the repo's checked-in story model.
The checked-in story plus the chosen canvas stay canonical; screenshots and visual captures are feedback artifacts, not a replacement source of truth.

## Three Layers

| Layer | Role | Primary tools | How to use it here |
| --- | --- | --- | --- |
| Inspiration | Train taste, collect references, compare patterns | Variant, Mobbin, Awwwards, Cosmos | Gather references, write down what to borrow, and save the distilled brief in `docs/plans/` before implementation. |
| Canvas | Give the agent an editable design surface | Paper, Pencil | Pick one canonical canvas for the story. Use it for layout, tokens, and iteration before or alongside repo implementation. |
| Build and sync | Move from design into the product | Codex, Claude Code, Ship repo | Implement the selected direction in the active story, update tokens/components with code, then validate with the normal harness gates. |

## Cross-Cutting Visual Evaluation Loop

Use the visual-evaluation loop when screenshot-driven critique will materially improve the result.
It wraps the canvas and build phases instead of replacing them.

| Loop | Role | Primary tools | How to use it here |
| --- | --- | --- | --- |
| Visual evaluation | Capture the current UI, compare it to the brief, and decide the next smallest improvement | Playwright MCP in `.mcp.json`, screenshot artifacts, active story notes | Use it only when the story needs visual debugging or fidelity checks. Follow [Design Visual Evaluation Guide](./design-visual-evaluation.md), record the route and rubric, then iterate in Paper, Pencil, or repo code. |

## Default Phase Sequence

### Phase 1: Brief and taste calibration

1. Start from the active story and write a short design brief in `docs/plans/` if the story is large enough to need one.
2. Pull references from Variant, Mobbin, Awwwards, and Cosmos.
3. Record what to borrow:
   - visual direction
   - layout density
   - typography rhythm
   - interaction ideas
   - patterns to avoid

Do not treat inspiration sites as the source of truth. They are inputs only.

### Phase 2: Pick the canonical canvas

Choose one editable surface per story:

- Use Paper when you want the design source to stay close to real HTML and CSS.
- Use Pencil when you want a versioned `.pen` file in the repo workspace and stronger design-as-code behavior.

If both are used, pick one canonical canvas and treat the other as an exploration surface only.

### Phase 3: Wire the agent

#### Codex

- Paper:
  1. Open Paper Desktop and the target file.
  2. In Codex, go to `Settings > MCP Servers`.
  3. Add a custom Streamable HTTP server named `paper` at `http://127.0.0.1:29979/mcp`.
- Pencil:
  1. Start Pencil and open the target `.pen` file.
  2. Open Codex and run `/mcp`.
  3. Confirm Pencil appears before relying on it in prompts.
  4. Pencil currently warns that first-use Codex config changes can be noisy, so back up local Codex config before first use.

#### Claude Code

- Paper:
  1. Open Paper Desktop and the target file.
  2. Run:

     ```bash
     claude mcp add paper --transport http http://127.0.0.1:29979/mcp --scope user
     ```

  3. Run `/mcp` in Claude Code and confirm `paper` is available.
- Pencil:
  1. Authenticate Claude Code with `claude`.
  2. Start Pencil and open the target `.pen` file.
  3. Verify Pencil appears in the assistant's MCP/tool list before prompting against it.

Keep MCP setup user-scoped. Do not check machine-local MCP secrets or local desktop config into the repo.

### Phase 4: Design in the canvas

Default prompts should be concrete and structure-aware:

- "Create a system page shell using our existing spacing and heading scale."
- "Turn this mood-board direction into a design-system sticker sheet with tokens and component states."
- "Generate a landing-page hero that matches the selected references but keeps our existing product structure."

For design-system work:

1. Define or import tokens in the canvas.
2. Name reusable components clearly.
3. Prefer frames, containers, and flex-style layout primitives that translate cleanly back to code.

### Phase 5: Capture and evaluate visually

1. Start from the exact route, state, or named proof lane that matters for the story.
2. If the story needs browser-based visual debugging, use the tracked Playwright MCP server in `.mcp.json`.
3. Define the target breakpoints and short rubric by following [Design Visual Evaluation Guide](./design-visual-evaluation.md).
4. Capture targeted screenshots, score them, and make the smallest useful change in the canvas or code.
5. Repeat until the critical rubric failures are gone.

### Phase 6: Sync design and code

Once a direction is chosen:

1. Record the winning references and canvas choice in the active story or `docs/plans/`.
2. Implement the UI in the repo through the normal story path.
3. Update code tokens, component primitives, and supporting docs in the same story when the visual language changes.
4. If Pencil is the source of truth, keep the `.pen` file in the repo workspace when practical.
5. If Paper is the source of truth, keep the implemented HTML/CSS or exported reference artifacts attached to the story or plan notes.
6. If screenshots materially explain the accepted direction, save them under `docs/evidence/screenshots/` or record the exact capture path in the story notes.

### Phase 7: Proof and handoff

Visible design work still follows the repo's normal proof rules:

1. Run the story validation commands.
2. Prefer seeded proof lanes, runtime checks, and explicit `What To Test` steps over default browser automation. Use the visual-evaluation loop only when the story needs visual debugging or the user asks for it.
3. Record deployment status as `deployed`, `not deployed`, or `blocked`.

## Tool Roles

### Paper

- Best for HTML/CSS-native page design, layout iteration, design-token exploration, and direct agent editing.
- Strongest fit when you want the canvas to feel close to implementation code.

### Pencil

- Best for versioned design-as-code work, reusable components, token syncing, design-system maintenance, and parallel design exploration.
- Strongest fit when the design file itself should live in the repo as a durable artifact.

### Playwright MCP

- Use for browser-based screenshot capture, DOM inspection, breakpoint checks, and targeted visual debugging.
- Treat it as an iteration aid around the chosen canvas and implemented code, not as the design source of truth or the default handoff gate.

### Variant

- Use for rapid taste calibration and alternative directions.
- Bring the chosen direction back into `docs/plans/` and a real canvas before implementation.

### Mobbin

- Use for real-world flow, interaction, and pattern references.
- Treat its Figma export path as optional inspiration support, not as the canonical Ship workflow.

### Awwwards

- Use for interaction craft, brand feel, motion references, and web-art direction.
- Do not mistake gallery inspiration for implementation-ready structure.

### Cosmos

- Use for clustering references and exploring adjacent visual ideas.
- Save only the distilled takeaways into repo notes so the story remains resumable from local context.

## Repo Conventions For Design-Heavy Stories

- Keep the checked-in story as the execution contract.
- Use `docs/plans/` for design briefs, reference notes, and design decisions.
- Keep one concern per branch.
- If a design change also changes tokens, component primitives, or proof docs, update those together.
- Do not add tracked machine-local config for Paper or Pencil unless the story is explicitly about shared environment setup.

## Fast Defaults

- New marketing or landing surface: start with Paper.
- Design system or token sync work: start with Pencil.
- Visual refresh with unclear direction: start with Variant, Mobbin, Awwwards, or Cosmos, then move into Paper or Pencil.
- Implementation polish with fidelity risk: do the first canvas or code pass, then run [Design Visual Evaluation Guide](./design-visual-evaluation.md) with the tracked Playwright MCP before closing the loop.
- Existing feature polish in code: gather references quickly, then implement directly in the repo and use the canvas only if the design needs iteration.
