# Ship Workspace Index

This index links the full AI workspace so any agent can navigate it consistently.

## Start Here
1. Repo handbook: `.claude/CLAUDE.md`
2. Root agent entrypoints: `AGENTS.md`, `CLAUDE.md`
3. SSOT: `.ai/docs/SINGLE_SOURCE_OF_TRUTH.md`
4. FleetGraph assignment brief: `docs/assignments/fleetgraph/README.md`
5. FleetGraph durable reference: `.ai/docs/references/fleetgraph-prd.md`
6. Canonical orchestrator: `.ai/codex.md`
7. Claude compatibility mirror: `.ai/agents/claude.md`
8. Cursor entry: `.ai/agents/cursor-agent.md`
9. Claude config: `.clauderc`
10. Skill catalog: `.ai/docs/CODEX_SKILLS.md`
11. Phase gate tracker: `.ai/docs/PHASE_GATES_PRD.md`
12. Mandatory preflight gate: run `agent-preflight` before implementation
13. Mandatory lookup gate: run `.ai/workflows/story-lookup.md` before coding
14. Mandatory story sizing gate: run `.ai/workflows/story-sizing.md` after lookup
15. Narrow user correction triage: run `.ai/workflows/user-correction-triage.md` before expanding a small clarification into broader replanning
16. Mandatory eval gate for AI-behavior changes: run `.ai/workflows/eval-driven-development.md` before implementation
17. Mandatory feature SDD gate: run `.ai/workflows/spec-driven-delivery.md` and `.ai/skills/spec-driven-development.md`
18. UI design skill (when UI scope exists): `.ai/skills/frontend-design.md`
19. UI prompt brief template: `.ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md`
20. SDD templates: `.ai/templates/spec/`
21. UI philosophy tiebreaker: `.ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md`
22. SDD/TDD methodology reference: `.ai/docs/research/spec-driven-tdd-playbook.md`
23. TDD execution gate: run `.ai/workflows/tdd-pipeline.md` for behavior-changing stories
24. TDD handoff helper: `scripts/tdd_handoff.sh`
25. TDD stage agents: `.ai/agents/tdd-spec-interpreter.md`, `.ai/agents/tdd-implementer.md`, `.ai/agents/tdd-reviewer.md`
26. Targeted mutation helper: `scripts/run_targeted_mutation.sh`
27. Conditional AI architecture audit: run `.ai/workflows/ai-architecture-change.md` only when `.ai` or agent-contract files change
28. Standard-lane flight lock gate: run `.ai/workflows/parallel-flight.md` before implementation edits
29. Flight lock script: `scripts/flight_slot.sh`
30. Combined completion gate: `.ai/workflows/story-handoff.md`
31. Visible UI critic gate: `.ai/workflows/ui-qa-critic.md`
32. Git finalization gate: run `.ai/workflows/git-finalization.md` after user approval of the completion gate
33. Finalization recovery workflow: `.ai/workflows/finalization-recovery.md`
34. Git finalization guard: `scripts/git_finalize_guard.sh`
35. Agentic compression guide: `.ai/docs/AGENTIC_ENGINEERING_PRINCIPLES.md`

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
