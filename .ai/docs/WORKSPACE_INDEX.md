# Ship Workspace Index

This index links the full AI workspace so any agent can navigate it consistently.

## Start Here
1. Repo handbook: `.claude/CLAUDE.md`
2. Root agent entrypoints: `AGENTS.md`, `CLAUDE.md`
3. SSOT: `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
4. FleetGraph assignment brief: `docs/assignments/fleetgraph/README.md`
5. FleetGraph durable reference: `.ai/docs/references/fleetgraph-prd.md`
6. Canonical orchestrator: `.ai/agents/claude.md`
7. Codex mirror: `.ai/codex.md`
8. Cursor entry: `.ai/agents/cursor-agent.md`
9. Claude config: `.clauderc`
10. Skill catalog: `.ai/docs/CODEX_SKILLS.md`
11. Phase gate tracker: `.ai/docs/PHASE_GATES_PRD.md`
12. Mandatory preflight gate: run `agent-preflight` before implementation
13. Mandatory lookup gate: run `.ai/workflows/story-lookup.md` before coding
14. Mandatory eval gate for AI-behavior changes: run `.ai/workflows/eval-driven-development.md` before implementation
15. Mandatory feature SDD gate: run `.ai/workflows/spec-driven-delivery.md` and `.ai/skills/spec-driven-development.md`
16. UI design skill (when UI scope exists): `.ai/skills/frontend-design.md`
17. UI prompt brief template: `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`
18. SDD templates: `.ai/templates/spec/`
19. UI philosophy tiebreaker: `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`
20. SDD/TDD methodology reference: `.ai/docs/research/spec-driven-tdd-playbook.md`
21. Conditional AI architecture audit: run `.ai/workflows/ai-architecture-change.md` only when `.ai` or agent-contract files change
22. Flight coordination gate: run `.ai/workflows/parallel-flight.md` before implementation edits
23. Flight slot script: `scripts/flight_slot.sh`
24. Git finalization gate: run `.ai/workflows/git-finalization.md` before story handoff
25. Git finalization guard: `scripts/git_finalize_guard.sh`
26. Agentic compression guide: `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md`

## Core Directories
- `.ai/agents/`
- `.ai/workflows/`
- `.ai/skills/`
- `.ai/templates/spec/`
- `.ai/memory/`
- `.ai/docs/references/`
- `.ai/docs/research/`

## Verification Script
- `scripts/check_ai_wiring.sh`
