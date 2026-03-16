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

run_check "TDD pipeline routing references" python3 - <<'PY'
from pathlib import Path
import sys

workflow_targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/workflows/feature-development.md",
    ".ai/workflows/bug-fixing.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".clauderc",
    ".cursorrules",
]
missing_workflow: list[str] = []
for rel in workflow_targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "tdd-pipeline.md" not in text:
        missing_workflow.append(rel)

if missing_workflow:
    print("ERROR: TDD pipeline workflow routing missing from:", file=sys.stderr)
    for rel in missing_workflow:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

required_files = [
    ".ai/workflows/tdd-pipeline.md",
    ".ai/agents/tdd-agent.md",
    ".ai/agents/tdd-spec-interpreter.md",
    ".ai/agents/tdd-implementer.md",
    ".ai/agents/tdd-reviewer.md",
    ".ai/state/tdd-handoff/README.md",
    "scripts/tdd_handoff.sh",
    "scripts/run_targeted_mutation.sh",
]
missing_files = [path for path in required_files if not Path(path).is_file()]
if missing_files:
    print("ERROR: Missing TDD pipeline files:", file=sys.stderr)
    for path in missing_files:
        print(f"- {path}", file=sys.stderr)
    raise SystemExit(1)

print("TDD pipeline routing check passed.")
PY

run_check "TDD pipeline workflow content" python3 - <<'PY'
from pathlib import Path
import sys

tdd_pipeline = Path(".ai/workflows/tdd-pipeline.md").read_text(encoding="utf-8")
required_tokens = (
    "tdd_handoff.sh init",
    "tdd-spec-interpreter.md",
    "tdd-implementer.md",
    "tdd-reviewer.md",
    "--expect red",
    "--expect green",
    "fast-check",
    "run_targeted_mutation.sh",
    "70%",
    "maximum 3 implementation attempts",
    "maximum 2 failed refactor attempts",
)
missing = [token for token in required_tokens if token not in tdd_pipeline]
if missing:
    print("ERROR: TDD pipeline workflow requirements missing:", file=sys.stderr)
    for token in missing:
        print(f"- {token}", file=sys.stderr)
    raise SystemExit(1)

tdd_skill = Path(".ai/skills/tdd-workflow.md").read_text(encoding="utf-8")
skill_tokens = (
    "files on disk as the only handoff boundary",
    "Agent 1 - RED Contract",
    "Agent 2 - GREEN Implementation",
    "Mutation Gate",
    "Agent 3 - Review and Refactor",
)
missing_skill = [token for token in skill_tokens if token not in tdd_skill]
if missing_skill:
    print("ERROR: TDD skill requirements missing:", file=sys.stderr)
    for token in missing_skill:
        print(f"- {token}", file=sys.stderr)
    raise SystemExit(1)

story_handoff = Path(".ai/workflows/story-handoff.md").read_text(encoding="utf-8")
handoff_tokens = (
    "TDD handoff artifact path listed",
    "RED/GREEN checkpoint evidence listed",
    "Property-test and mutation outcomes listed",
)
missing_handoff = [token for token in handoff_tokens if token not in story_handoff]
if missing_handoff:
    print("ERROR: Story handoff TDD audit requirements missing:", file=sys.stderr)
    for token in missing_handoff:
        print(f"- {token}", file=sys.stderr)
    raise SystemExit(1)

print("TDD pipeline workflow content check passed.")
PY

run_check "TDD tooling wiring" python3 - <<'PY'
from pathlib import Path
import json
import sys

package = json.loads(Path("package.json").read_text(encoding="utf-8"))
scripts = package.get("scripts", {})
dev_dependencies = package.get("devDependencies", {})
errors: list[str] = []

if scripts.get("test:mutation:changed") != "./scripts/run_targeted_mutation.sh":
    errors.append("package.json missing test:mutation:changed script")

for dep in (
    "@stryker-mutator/core",
    "@stryker-mutator/typescript-checker",
    "@stryker-mutator/vitest-runner",
    "fast-check",
):
    if dep not in dev_dependencies:
        errors.append(f"package.json missing devDependency {dep}")

for rel in ("api/stryker.config.mjs", "web/stryker.config.mjs"):
    if not Path(rel).is_file():
        errors.append(f"missing {rel}")

if errors:
    print("ERROR: TDD tooling wiring issues detected:", file=sys.stderr)
    for item in errors:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("TDD tooling wiring check passed.")
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
