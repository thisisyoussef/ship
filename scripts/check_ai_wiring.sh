#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "ERROR: Missing '${cmd}'."
    exit 127
  fi
}

run_check() {
  local name="$1"
  shift
  echo
  echo "==> ${name}"
  "$@"
}

require_cmd python3

run_check "Agent contract required files" python3 scripts/verify_agent_contract.py

run_check "AI compatibility workspace" python3 - <<'PY'
from pathlib import Path
import sys

targets = {
    ".ai/README.md": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md", "docs/DEFINITION_OF_DONE.md", ".ai/workflows/", ".ai/state/"],
    ".ai/codex.md": ["AGENTS.md", ".ai/docs/WORKSPACE_INDEX.md", "docs/user-stories/README.md"],
    ".ai/docs/WORKSPACE_INDEX.md": ["AGENTS.md", ".ai/workflows/story-lookup.md", ".ai/workflows/feature-development.md", ".ai/workflows/story-handoff.md", ".ai/workflows/git-finalization.md", ".ai/state/README.md"],
    ".ai/agents/claude.md": ["AGENTS.md", ".ai/docs/WORKSPACE_INDEX.md"],
    ".ai/agents/cursor-agent.md": ["AGENTS.md", ".ai/docs/WORKSPACE_INDEX.md"],
    ".ai/workflows/README.md": [".ai/workflows/story-lookup.md", ".ai/workflows/feature-development.md", ".ai/workflows/spec-driven-delivery.md", ".ai/workflows/parallel-flight.md", ".ai/workflows/user-correction-triage.md", ".ai/workflows/story-handoff.md", ".ai/workflows/git-finalization.md"],
    ".ai/workflows/story-lookup.md": ["AGENTS.md", "docs/user-stories/README.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md"],
    ".ai/workflows/feature-development.md": ["AGENTS.md", "docs/DEFINITION_OF_DONE.md", "docs/plans/", "docs/submissions/"],
    ".ai/workflows/spec-driven-delivery.md": ["docs/plans/", "docs/specs/", "docs/user-stories/TEMPLATE.md", "docs/submissions/"],
    ".ai/workflows/parallel-flight.md": ["scripts/flight_slot.sh", ".ai/state/flight-lock.json", ".ai/state/flight-board.json"],
    ".ai/workflows/user-correction-triage.md": ["scripts/triage_counter.sh", ".ai/state/correction-triage.json", "docs/WORKFLOW_MEMORY.md"],
    ".ai/workflows/story-handoff.md": ["docs/DEFINITION_OF_DONE.md", "What To Test", "deployment status"],
    ".ai/workflows/git-finalization.md": ["AGENTS.md", "scripts/git_finalize_guard.sh", "docs/guides/finalization-recovery.md", "master"],
    ".ai/state/README.md": [".ai/state/correction-triage.json", ".ai/state/flight-lock.json", ".ai/state/flight-board.json", ".ai/state/tdd-handoff/README.md"],
}
errors: list[str] = []

for rel, required_tokens in targets.items():
    text = Path(rel).read_text(encoding="utf-8")
    missing = [token for token in required_tokens if token not in text]
    if missing:
        errors.append(f"{rel}: missing {', '.join(missing)}")

if errors:
    print("ERROR: AI compatibility workspace issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("AI compatibility workspace check passed.")
PY

run_check "Startup routing surfaces" python3 - <<'PY'
from pathlib import Path
import sys

targets = {
    "AGENTS.md": ["docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md", "docs/DEFINITION_OF_DONE.md"],
    "CLAUDE.md": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md"],
    ".clauderc": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md"],
    ".cursorrules": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md"],
    "docs/README.md": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md", "docs/DEFINITION_OF_DONE.md", "docs/submissions/", "docs/guides/agent-design-workflow.md"],
}
errors: list[str] = []

for rel, required_tokens in targets.items():
    text = Path(rel).read_text(encoding="utf-8")
    missing = [token for token in required_tokens if token not in text]
    if missing:
        errors.append(f"{rel}: missing {', '.join(missing)}")

if errors:
    print("ERROR: Startup routing issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Startup routing check passed.")
PY

run_check "Design workflow routing" python3 - <<'PY'
from pathlib import Path
import sys

targets = {
    "AGENTS.md": ["docs/guides/agent-design-workflow.md"],
    ".claude/CLAUDE.md": ["docs/guides/agent-design-workflow.md"],
    ".clauderc": ["docs/guides/agent-design-workflow.md"],
    "docs/README.md": ["docs/guides/agent-design-workflow.md"],
    "docs/guides/developer-workflow-guide.md": ["Agent Design Workflow Guide", "./agent-design-workflow.md"],
    "docs/guides/ship-claude-cli-integration.md": ["Agent Design Workflow Guide", "claude mcp add paper --transport http http://127.0.0.1:29979/mcp --scope user"],
    "docs/user-stories/HOW_TO_CREATE_USER_STORIES.md": ["docs/guides/agent-design-workflow.md"],
    ".ai/README.md": [".ai/workflows/design-workflow.md", "docs/guides/agent-design-workflow.md"],
    ".ai/codex.md": ["docs/guides/agent-design-workflow.md", ".ai/workflows/design-workflow.md"],
    ".ai/agents/claude.md": ["docs/guides/agent-design-workflow.md", ".ai/workflows/design-workflow.md"],
    ".ai/workflows/README.md": [".ai/workflows/design-workflow.md"],
    ".ai/docs/WORKSPACE_INDEX.md": [".ai/workflows/design-workflow.md"],
    ".ai/workflows/design-workflow.md": ["docs/guides/agent-design-workflow.md"],
    "docs/guides/agent-design-workflow.md": ["Paper", "Pencil", "Variant", "Mobbin", "Awwwards", "Cosmos", "Codex", "Claude Code"],
}
errors: list[str] = []

for rel, required_tokens in targets.items():
    text = Path(rel).read_text(encoding="utf-8")
    missing = [token for token in required_tokens if token not in text]
    if missing:
        errors.append(f"{rel}: missing {', '.join(missing)}")

if errors:
    print("ERROR: Design workflow routing issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Design workflow routing check passed.")
PY

run_check "AGENTS primacy and docs control plane" python3 - <<'PY'
from pathlib import Path
import sys

agents = Path("AGENTS.md").read_text(encoding="utf-8")
strategy = Path("docs/IMPLEMENTATION_STRATEGY.md").read_text(encoding="utf-8")
context = Path("docs/CONTEXT.md").read_text(encoding="utf-8")
memory = Path("docs/WORKFLOW_MEMORY.md").read_text(encoding="utf-8")
errors: list[str] = []

for token in ("primary checked-in rulebook", "docs/user-stories/README.md", ".claude/CLAUDE.md"):
    if token not in agents:
        errors.append(f"AGENTS.md missing '{token}'")

for token in ("AGENTS.md", "docs/WORKFLOW_MEMORY.md", "docs/user-stories/README.md", "docs/plans/", "docs/submissions/"):
    if token not in strategy:
        errors.append(f"docs/IMPLEMENTATION_STRATEGY.md missing '{token}'")

for token in ("Last updated:", "Local path:", "Public demo baseline", "AGENTS.md", "docs/WORKFLOW_MEMORY.md"):
    if token not in context:
        errors.append(f"docs/CONTEXT.md missing '{token}'")

for token in ("corrections", "decisions", "patterns", "AGENTS.md"):
    if token not in memory:
        errors.append(f"docs/WORKFLOW_MEMORY.md missing '{token}'")

if errors:
    print("ERROR: Control-plane issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Control-plane check passed.")
PY

run_check "Story control plane" python3 - <<'PY'
from pathlib import Path
import sys

queue = Path("docs/user-stories/README.md").read_text(encoding="utf-8")
template = Path("docs/user-stories/TEMPLATE.md").read_text(encoding="utf-8")
guide = Path("docs/user-stories/HOW_TO_CREATE_USER_STORIES.md").read_text(encoding="utf-8")
done = Path("docs/DEFINITION_OF_DONE.md").read_text(encoding="utf-8")
errors: list[str] = []

for token in ("master queue", "TEMPLATE.md", "HOW_TO_CREATE_USER_STORIES.md", "CHECKPOINT-LOG.md", "phase-1/", "phase-2/", "phase-3/", "phase-x/"):
    if token not in queue:
        errors.append(f"docs/user-stories/README.md missing '{token}'")

for token in ("Preparation Phase", "TDD Plan", "Local Validation", "Deployment Handoff", "How To Verify", "Checkpoint Result"):
    if token not in template:
        errors.append(f"docs/user-stories/TEMPLATE.md missing '{token}'")

for token in ("TEMPLATE.md", "docs/DEFINITION_OF_DONE.md", "Preparation Phase", "checkpoint log"):
    if token not in guide:
        errors.append(f"docs/user-stories/HOW_TO_CREATE_USER_STORIES.md missing '{token}'")

for token in ("Story scope", "Deployment status", "User-facing verification"):
    if token not in done:
        errors.append(f"docs/DEFINITION_OF_DONE.md missing '{token}'")

for rel in (
    "docs/user-stories/phase-1/README.md",
    "docs/user-stories/phase-2/README.md",
    "docs/user-stories/phase-3/README.md",
    "docs/user-stories/phase-x/README.md",
):
    text = Path(rel).read_text(encoding="utf-8")
    if "docs/user-stories/README.md" not in text:
        errors.append(f"{rel} missing docs/user-stories/README.md reference")

if errors:
    print("ERROR: Story control-plane issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Story control-plane check passed.")
PY

run_check "Harness helper scripts" python3 - <<'PY'
from pathlib import Path
import sys

errors: list[str] = []

for rel in ("scripts/flight_slot.sh", "scripts/triage_counter.sh", "scripts/tdd_handoff.sh"):
    text = Path(rel).read_text(encoding="utf-8")
    if "python3 - " not in text:
        errors.append(f"{rel} must invoke python3")
    if "\npython - " in text:
        errors.append(f"{rel} still invokes bare python")

ai_arch = Path("scripts/ai_arch_changed.sh").read_text(encoding="utf-8")
for token in (".ai/README.md", ".ai/workflows/", ".ai/state/README.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/CONTEXT.md", "docs/DEFINITION_OF_DONE.md", "docs/user-stories/", "docs/guides/finalization-recovery.md", "CLAUDE.md"):
    if token not in ai_arch:
        errors.append(f"scripts/ai_arch_changed.sh missing '{token}'")

finalize = Path("scripts/git_finalize_guard.sh").read_text(encoding="utf-8")
for token in ("docs/guides/finalization-recovery.md", "scripts/check_ai_wiring.sh"):
    if token not in finalize:
        errors.append(f"scripts/git_finalize_guard.sh missing '{token}'")

pre_commit = Path(".husky/pre-commit").read_text(encoding="utf-8")
for token in ("scripts/ai_arch_changed.sh", "scripts/check_ai_wiring.sh"):
    if token not in pre_commit:
        errors.append(f".husky/pre-commit missing '{token}'")

if errors:
    print("ERROR: Harness helper issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Harness helper script check passed.")
PY

echo
echo "AI wiring audit passed."
