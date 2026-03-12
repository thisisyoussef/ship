# {{PROJECT_NAME}} Workspace Index

This index links the full AI workspace so any agent can navigate it consistently.

## Start Here
1. SSOT: `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
2. Canonical orchestrator: `.ai/agents/claude.md`
3. Agent-specific entry:
   - Codex: `.ai/codex.md`
   - Cursor: `.ai/agents/cursor-agent.md`
   - Claude config: `.clauderc`
4. Skill catalog: `.ai/docs/CODEX_SKILLS.md`
5. Phase gate tracker: `.ai/docs/PHASE_GATES_PRD.md`
6. Mandatory preflight gate: run `agent-preflight` before implementation
7. Mandatory lookup gate: run `.ai/workflows/story-lookup.md` (local + external docs) before coding
8. Mandatory eval gate for AI-behavior changes: run `.ai/workflows/eval-driven-development.md` before implementation
9. Mandatory feature SDD gate: run `.ai/workflows/spec-driven-delivery.md` and `.ai/skills/spec-driven-development.md`
10. UI design skill (when UI scope exists): `.ai/skills/frontend-design.md`
11. UI prompt brief template: `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`
12. SDD templates: `.ai/templates/spec/`
13. UI philosophy tiebreaker: `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`
14. SDD/TDD methodology reference: `.ai/docs/research/spec-driven-tdd-playbook.md`
15. Conditional AI architecture audit: run `.ai/workflows/ai-architecture-change.md` only when `.ai`/orchestration files change
16. Flight coordination gate: run `.ai/workflows/parallel-flight.md` before implementation edits
17. Flight slot script: `scripts/flight_slot.sh`
18. Git finalization gate: run `.ai/workflows/git-finalization.md` before story handoff
19. Git finalization guard: `scripts/git_finalize_guard.sh`
20. Agentic compression guide: `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md`

## Core Directories
- `.ai/agents/`
- `.ai/workflows/`
- `.ai/skills/`
- `.ai/templates/spec/`
- `.ai/memory/`
- `.ai/docs/references/`

## Verification Script
- `scripts/check_ai_wiring.sh`
