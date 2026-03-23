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

run_check "Startup routing surfaces" python3 - <<'PY'
from pathlib import Path
import sys

targets = {
    "AGENTS.md": ["docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md", "docs/DEFINITION_OF_DONE.md"],
    "CLAUDE.md": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md"],
    ".clauderc": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md"],
    ".cursorrules": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md"],
    "docs/README.md": ["AGENTS.md", "docs/CONTEXT.md", "docs/WORKFLOW_MEMORY.md", "docs/IMPLEMENTATION_STRATEGY.md", "docs/user-stories/README.md", "docs/DEFINITION_OF_DONE.md", "docs/submissions/"],
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

run_check "AGENTS primacy and docs control plane" python3 - <<'PY'
from pathlib import Path
import sys

agents = Path("AGENTS.md").read_text(encoding="utf-8")
strategy = Path("docs/IMPLEMENTATION_STRATEGY.md").read_text(encoding="utf-8")
context = Path("docs/CONTEXT.md").read_text(encoding="utf-8")
memory = Path("docs/WORKFLOW_MEMORY.md").read_text(encoding="utf-8")
errors: list[str] = []

for token in ("primary checked-in rulebook", "docs/user-stories/README.md", ".claude/CLAUDE.md", "copy-paste prompt"):
    if token not in agents:
        errors.append(f"AGENTS.md missing '{token}'")

for token in ("AGENTS.md", "docs/WORKFLOW_MEMORY.md", "docs/user-stories/README.md", "docs/plans/", "docs/submissions/", "copy-paste prompt"):
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

for token in ("master queue", "TEMPLATE.md", "HOW_TO_CREATE_USER_STORIES.md", "CHECKPOINT-LOG.md", "phase-1/", "phase-2/", "phase-3/", "phase-x/", "copy-paste prompt"):
    if token not in queue:
        errors.append(f"docs/user-stories/README.md missing '{token}'")

for token in ("Preparation Phase", "TDD Plan", "Local Validation", "Deployment Handoff", "How To Verify", "Checkpoint Result"):
    if token not in template:
        errors.append(f"docs/user-stories/TEMPLATE.md missing '{token}'")

for token in ("TEMPLATE.md", "docs/DEFINITION_OF_DONE.md", "Preparation Phase", "checkpoint log", "copy-paste prompt"):
    if token not in guide:
        errors.append(f"docs/user-stories/HOW_TO_CREATE_USER_STORIES.md missing '{token}'")

for token in ("Story scope", "Deployment status", "User-facing verification", "copy-paste prompt"):
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
for token in ("docs/IMPLEMENTATION_STRATEGY.md", "docs/CONTEXT.md", "docs/DEFINITION_OF_DONE.md", "docs/user-stories/", "docs/guides/finalization-recovery.md", "CLAUDE.md"):
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
