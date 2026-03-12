# AI Workspace Template

This template extracts the reusable AI-agent operating system from a live project.

## What You Get
- Cross-agent orchestration (`AGENTS.md`, `.ai/agents/`, `.ai/codex.md`)
- Mandatory workflow gates (`.ai/workflows/`)
- Reusable skills and spec templates (`.ai/skills/`, `.ai/templates/spec/`)
- Memory bank scaffolding (`.ai/memory/`)
- Guard scripts for flight slots, AI wiring, and git finalization (`scripts/`)

## Quick Start
1. Copy this folder into a new repository root.
2. Rename placeholders:
   - `{{PROJECT_NAME}}`
   - `{{project_slug}}`
3. Choose the project stack during setup based on product needs; record the chosen language, framework, package manager, validation commands, deployment targets, and directory layout.
4. Update `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md` with your project baseline and chosen stack.
5. Add project-specific references under `.ai/docs/references/`.
6. Replace or remove any example specialist agents/research notes that do not fit the chosen project.
5. Run:
   - `bash scripts/check_ai_wiring.sh`
   - `bash scripts/flight_slot.sh init`

## Notes
- This template intentionally resets live project state and story history.
- Keep the workflow gates intact; customize stack decisions, task routing, deployment targets, and specialist agents during setup.
