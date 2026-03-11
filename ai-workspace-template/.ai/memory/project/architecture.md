# Architecture Decisions (ADR Log)

Record durable architecture decisions.

## Template
- **ADR-ID**:
- **Date**:
- **Context**:
- **Decision**:
- **Alternatives Considered**:
- **Consequences**:

## Seeded Decisions
- **ADR-ID**: ADR-0001
- **Date**: YYYY-MM-DD
- **Context**: AI behavior changes are nondeterministic and are poorly protected by traditional unit and integration checks alone.
- **Decision**: Require eval-driven planning for changes to prompts, routing, retrieval, tools, graders, and other model-facing behavior.
- **Alternatives Considered**: Ad hoc manual review only; generic benchmark scores without task-specific evals.
- **Consequences**: AI stories must define objectives, datasets, metrics, and regression plans before implementation, increasing rigor and reducing vibe-based releases.

- **ADR-ID**: ADR-0002
- **Date**: YYYY-MM-DD
- **Context**: Generated frontend code trends toward statistically average UI when design intent is expressed only in vague adjectives.
- **Decision**: For UI scope, require a frontend-design skill that translates aesthetic goals into concrete typography, layout, color, depth, and motion constraints.
- **Alternatives Considered**: Rely on generic "make it look good" prompting; rely only on high-level design philosophy text.
- **Consequences**: UI prompts/specs become more explicit and reusable, improving output quality while keeping the stronger design guidance isolated to UI stories.

- **ADR-ID**: ADR-0003
- **Date**: YYYY-MM-DD
- **Context**: Strong UI output often depends on prompt structure, not just extra style adjectives.
- **Decision**: Add a reusable UI prompt brief template based on WIRE and WIRE+FRAME so teams can capture role, context, constraints, output shape, and iteration logic before implementation.
- **Alternatives Considered**: Keep all prompt structure implicit in free-form story notes; rely only on the frontend-design skill text.
- **Consequences**: Important UI work gains a reusable briefing artifact and clearer handoff structure, while simple UI work can still use the lighter WIRE form.

- **ADR-ID**: ADR-0004
- **Date**: YYYY-MM-DD
- **Context**: The source workspace leaked Python/RAG/provider-specific assumptions into the generic template contract.
- **Decision**: Keep the template stack-agnostic by default and require the chosen language, framework, providers, directory layout, validation commands, and deployment targets to be selected during setup.
- **Alternatives Considered**: Ship a pre-selected default stack and ask users to edit around it later.
- **Consequences**: The base template stays reusable across projects, but setup must explicitly record stack decisions before implementation begins.
