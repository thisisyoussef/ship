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

run_check "Workflow gate routing" python3 - <<'PY'
from pathlib import Path
import sys

root = Path.cwd()
workflows = [
    ".ai/workflows/feature-development.md",
    ".ai/workflows/bug-fixing.md",
    ".ai/workflows/performance-optimization.md",
    ".ai/workflows/security-review.md",
    ".ai/workflows/deployment-setup.md",
]
required = ("agent-preflight", "story-lookup.md", "story-sizing.md", "story-handoff.md", "git-finalization.md")
errors: list[str] = []
for rel in workflows:
    text = (root / rel).read_text(encoding="utf-8")
    missing = [token for token in required if token not in text]
    if missing:
        errors.append(f"{rel}: missing {', '.join(missing)}")

if errors:
    print("ERROR: Workflow routing issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Workflow gate routing check passed.")
PY

run_check "Canonical startup routing" python3 - <<'PY'
from pathlib import Path
import sys

targets = [
    "AGENTS.md",
    ".ai/codex.md",
    ".ai/agents/claude.md",
    ".ai/agents/cursor-agent.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".clauderc",
    ".cursorrules",
]
required = (
    "story-lookup.md",
    "story-sizing.md",
    "user-correction-triage.md",
    "eval-driven-development.md",
    "spec-driven-delivery.md",
    "parallel-flight.md",
    "story-handoff.md",
    "git-finalization.md",
)
errors: list[str] = []
for rel in targets:
    text = Path(rel).read_text(encoding="utf-8")
    missing = [token for token in required if token not in text]
    if missing:
        errors.append(f"{rel}: missing {', '.join(missing)}")

if errors:
    print("ERROR: Startup routing references missing:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Canonical startup routing check passed.")
PY

run_check "Story sizing fast-track wiring" python3 - <<'PY'
from pathlib import Path
import sys

story_sizing = Path(".ai/workflows/story-sizing.md").read_text(encoding="utf-8")
required_story_sizing = (
    "lane: trivial",
    "one file",
    "no API surface or public contract changes",
    "no AI behavior changes",
    "skip `.ai/workflows/spec-driven-delivery.md`",
    "skip `.ai/workflows/eval-driven-development.md`",
    "skip `.ai/workflows/parallel-flight.md`",
)
missing_story = [token for token in required_story_sizing if token not in story_sizing]

lookup = Path(".ai/workflows/story-lookup.md").read_text(encoding="utf-8")
feature = Path(".ai/workflows/feature-development.md").read_text(encoding="utf-8")
bug = Path(".ai/workflows/bug-fixing.md").read_text(encoding="utf-8")

errors: list[str] = []
if missing_story:
    errors.append("story-sizing.md missing " + ", ".join(missing_story))
if "Story sizing recommendation" not in lookup:
    errors.append("story-lookup.md missing story sizing recommendation output")
for rel, text in (("feature-development.md", feature), ("bug-fixing.md", bug)):
    for token in ("lane: trivial", "lane: standard", "story-sizing.md"):
        if token not in text:
            errors.append(f"{rel} missing {token}")

if errors:
    print("ERROR: Story sizing wiring issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Story sizing fast-track wiring check passed.")
PY

run_check "Single flight lock wiring" python3 - <<'PY'
from pathlib import Path
import sys

workflow = Path(".ai/workflows/parallel-flight.md").read_text(encoding="utf-8")
script = Path("scripts/flight_slot.sh").read_text(encoding="utf-8")
errors: list[str] = []

for token in ("single writer lock", "flight-lock.json", "parallel board", "Trivial-lane stories skip"):
    if token not in workflow:
        errors.append(f"parallel-flight.md missing '{token}'")

for token in ("flight-lock.json", "parallel mode is retired", "active_lock"):
    if token not in script:
        errors.append(f"scripts/flight_slot.sh missing '{token}'")

if errors:
    print("ERROR: Single flight lock wiring issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Single flight lock wiring check passed.")
PY

run_check "Automatic AI wiring checks" python3 - <<'PY'
from pathlib import Path
import sys

pre_commit = Path(".husky/pre-commit").read_text(encoding="utf-8")
guard = Path("scripts/git_finalize_guard.sh").read_text(encoding="utf-8")
errors: list[str] = []

for token in ("ai_arch_changed.sh", "check_ai_wiring.sh"):
    if token not in pre_commit:
        errors.append(f".husky/pre-commit missing '{token}'")

for token in ("ai_arch_changed.sh", "check_ai_wiring.sh", "finalization-recovery.md"):
    if token not in guard:
        errors.append(f"scripts/git_finalize_guard.sh missing '{token}'")

if errors:
    print("ERROR: Automatic AI wiring enforcement issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Automatic AI wiring checks passed.")
PY

run_check "Correction triage circuit breaker" python3 - <<'PY'
from pathlib import Path
import sys

workflow = Path(".ai/workflows/user-correction-triage.md").read_text(encoding="utf-8")
script = Path("scripts/triage_counter.sh").read_text(encoding="utf-8")
errors: list[str] = []

for token in ("triage_counter.sh", "triage circuit breaker reached", "this story may need re-scoping", "story sizing"):
    if token not in workflow:
        errors.append(f"user-correction-triage.md missing '{token}'")

for token in ("DEFAULT_LIMIT = 3", "triage count reached", "This story may need re-scoping"):
    if token not in script:
        errors.append(f"scripts/triage_counter.sh missing '{token}'")

if errors:
    print("ERROR: Correction triage circuit breaker issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Correction triage circuit breaker check passed.")
PY

run_check "Combined completion gate wiring" python3 - <<'PY'
from pathlib import Path
import sys

handoff = Path(".ai/workflows/story-handoff.md").read_text(encoding="utf-8")
finalization = Path(".ai/workflows/git-finalization.md").read_text(encoding="utf-8")
errors: list[str] = []

handoff_tokens = (
    "Current Status",
    "Testing Brief",
    "Decision / Design Brief",
    "Visible Proof",
    "Completion Plan",
    "User Audit Checklist (Run This Now)",
    "finalization-recovery.md",
)
for token in handoff_tokens:
    if token not in handoff:
        errors.append(f"story-handoff.md missing '{token}'")

finalization_tokens = (
    "execution-only",
    "story-handoff.md",
    "gh pr merge --merge --delete-branch",
    "finalization-recovery.md",
)
for token in finalization_tokens:
    if token not in finalization:
        errors.append(f"git-finalization.md missing '{token}'")

if errors:
    print("ERROR: Combined completion gate issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Combined completion gate wiring check passed.")
PY

run_check "Recovery workflow wiring" python3 - <<'PY'
from pathlib import Path
import sys

recovery = Path(".ai/workflows/finalization-recovery.md").read_text(encoding="utf-8")
errors: list[str] = []

for token in ("git merge --abort", "git rebase --abort", "story-handoff.md", "git_finalize_guard.sh fails"):
    if token not in recovery:
        errors.append(f"finalization-recovery.md missing '{token}'")

targets = [
    ".ai/workflows/story-handoff.md",
    ".ai/workflows/git-finalization.md",
    "AGENTS.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
]
for rel in targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "finalization-recovery.md" not in text:
        errors.append(f"{rel} missing finalization-recovery.md reference")

if errors:
    print("ERROR: Recovery workflow wiring issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Recovery workflow wiring check passed.")
PY

echo
echo "AI wiring audit passed."
