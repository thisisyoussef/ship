# Anti-Patterns

Capture failures so they are not repeated.

## Anti-Pattern Template
- **Problem**:
- **Example**:
- **Why it failed**:
- **Prevention rule**:

## Seeded Anti-Patterns
- **Problem**: Vibe-based AI verification
- **Example**: Shipping prompt, routing, or retrieval changes because a few manual spot checks "looked good."
- **Why it failed**: Nondeterministic failures, edge-case regressions, and judge bias go unnoticed until production.
- **Prevention rule**: Use task-specific evals with representative slices, explicit thresholds, and human calibration when automated grading is involved.

- **Problem**: Vague frontend taste prompting
- **Example**: Asking the agent to make the UI "clean", "modern", or "pretty" without naming typography, composition, or color constraints.
- **Why it failed**: The model collapses toward generic, crowded, statistically average web output.
- **Prevention rule**: For UI scope, define one strong visual direction and translate it into concrete type, whitespace, layout, color, depth, and motion rules.

- **Problem**: One-line UI prompting for strategic design work
- **Example**: "Design a landing page" with no role, context, constraints, output structure, or revision loop.
- **Why it failed**: The model fills in missing context with defaults, causing generic output and extra rework.
- **Prevention rule**: Use WIRE for most UI tasks and extend to WIRE+FRAME when the work is strategic, reusable, or multi-step.

- **Problem**: Inheriting the source project stack into the template
- **Example**: Shipping a generic workspace with Python/RAG/provider-specific commands, paths, and specialist agents baked into the default contract.
- **Why it failed**: New projects begin with the wrong assumptions and have to undo template bias before real work starts.
- **Prevention rule**: Keep the template stack-neutral and force stack selection during setup.

- **Problem**: Assuming canonical associations are the only live relationship source
- **Example**: Building cross-project or workload features that only read `document_associations` and ignore active legacy reads of `properties.project_id` and `assignee_ids`.
- **Why it failed**: Ship still has runtime paths that depend on the legacy fields, so features silently miss assignments, project context, or approval targets.
- **Prevention rule**: Normalize both canonical and legacy relationship signals at the FleetGraph boundary before reasoning.

- **Problem**: Treating `/events` as a durable agent trigger bus
- **Example**: Designing proactive FleetGraph around subscribing to the existing WebSocket events layer as if it were a replayable queue.
- **Why it failed**: The current realtime layer is browser-facing delivery plumbing with no persistence, no replay, and no worker-consumable event contract.
- **Prevention rule**: Use route-level enqueue hooks plus scheduled sweeps for triggering, and reserve `/events` for delivery only.
