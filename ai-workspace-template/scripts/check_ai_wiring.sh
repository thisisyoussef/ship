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

require_cmd python

run_check "Agent contract required files" python scripts/verify_agent_contract.py

run_check "Workflow gates (preflight + lookup + handoff)" python - <<'PY'
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
missing: list[str] = []
for wf in workflows:
    text = (root / wf).read_text(encoding="utf-8")
    has_preflight = "agent-preflight" in text
    has_lookup = "story-lookup.md" in text
    has_handoff = "story-handoff.md" in text
    has_git_finalization = "git-finalization.md" in text
    if not (has_preflight and has_lookup and has_handoff and has_git_finalization):
        missing.append(
            f"{wf}: preflight={has_preflight}, lookup={has_lookup}, handoff={has_handoff}, git_finalization={has_git_finalization}"
        )

if missing:
    print("ERROR: Workflow gate wiring issues detected:", file=sys.stderr)
    for item in missing:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Workflow gate wiring check passed.")
PY

run_check "Spec-driven routing references" python - <<'PY'
from pathlib import Path
import sys

workflow_targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/workflows/feature-development.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".clauderc",
    ".cursorrules",
]
missing_workflow: list[str] = []
for rel in workflow_targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "spec-driven-delivery.md" not in text:
        missing_workflow.append(rel)

if missing_workflow:
    print("ERROR: Spec-driven workflow routing missing from:", file=sys.stderr)
    for rel in missing_workflow:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

skill_targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/workflows/feature-development.md",
    ".ai/docs/WORKSPACE_INDEX.md",
]
missing_skill: list[str] = []
for rel in skill_targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "spec-driven-development.md" not in text:
        missing_skill.append(rel)

if missing_skill:
    print("ERROR: Spec-driven skill references missing from:", file=sys.stderr)
    for rel in missing_skill:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

required_templates = [
    ".ai/templates/spec/README.md",
    ".ai/templates/spec/CONSTITUTION_TEMPLATE.md",
    ".ai/templates/spec/FEATURE_SPEC_TEMPLATE.md",
    ".ai/templates/spec/TECHNICAL_PLAN_TEMPLATE.md",
    ".ai/templates/spec/TASK_BREAKDOWN_TEMPLATE.md",
    ".ai/templates/spec/UI_COMPONENT_SPEC_TEMPLATE.md",
]
missing_templates = [path for path in required_templates if not Path(path).is_file()]
if missing_templates:
    print("ERROR: Missing spec template files:", file=sys.stderr)
    for path in missing_templates:
        print(f"- {path}", file=sys.stderr)
    raise SystemExit(1)

playbook = ".ai/docs/research/spec-driven-tdd-playbook.md"
if not Path(playbook).is_file():
    print(f"ERROR: Missing SDD/TDD playbook: {playbook}", file=sys.stderr)
    raise SystemExit(1)

for rel in (".ai/docs/WORKSPACE_INDEX.md", ".ai/workflows/story-lookup.md"):
    text = Path(rel).read_text(encoding="utf-8")
    if "spec-driven-tdd-playbook.md" not in text:
        print(f"ERROR: SDD/TDD playbook reference missing from {rel}", file=sys.stderr)
        raise SystemExit(1)

design_doc = ".ai/docs/design/DESIGN_PHILOSOPHY_AND_LANGUAGE.md"
if not Path(design_doc).is_file():
    print(f"ERROR: Missing design philosophy doc: {design_doc}", file=sys.stderr)
    raise SystemExit(1)

design_targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/workflows/spec-driven-delivery.md",
    ".ai/workflows/story-lookup.md",
    ".ai/templates/spec/UI_COMPONENT_SPEC_TEMPLATE.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".clauderc",
    ".cursorrules",
]
missing_design_refs: list[str] = []
for rel in design_targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "DESIGN_PHILOSOPHY_AND_LANGUAGE.md" not in text:
        missing_design_refs.append(rel)

if missing_design_refs:
    print("ERROR: Design philosophy references missing from:", file=sys.stderr)
    for rel in missing_design_refs:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

print("Spec-driven routing check passed.")
PY

run_check "Eval-driven routing references" python - <<'PY'
from pathlib import Path
import sys

workflow_targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/workflows/feature-development.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".clauderc",
    ".cursorrules",
]
missing_workflow: list[str] = []
for rel in workflow_targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "eval-driven-development.md" not in text:
        missing_workflow.append(rel)

if missing_workflow:
    print("ERROR: Eval-driven workflow routing missing from:", file=sys.stderr)
    for rel in missing_workflow:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

required_files = [
    ".ai/workflows/eval-driven-development.md",
]
missing_files = [path for path in required_files if not Path(path).is_file()]
if missing_files:
    print("ERROR: Missing eval workflow files:", file=sys.stderr)
    for path in missing_files:
        print(f"- {path}", file=sys.stderr)
    raise SystemExit(1)

story_handoff = Path(".ai/workflows/story-handoff.md").read_text(encoding="utf-8")
required_tokens = (
    "Eval Evidence Audit",
    "Eval brief delivered before implementation",
    "Dataset slices listed (production-like, edge, adversarial)",
)
missing_tokens = [token for token in required_tokens if token not in story_handoff]
if missing_tokens:
    print("ERROR: Story handoff eval audit requirements missing:", file=sys.stderr)
    for token in missing_tokens:
        print(f"- {token}", file=sys.stderr)
    raise SystemExit(1)

print("Eval-driven routing check passed.")
PY

run_check "Frontend design skill routing references" python - <<'PY'
from pathlib import Path
import sys

targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/workflows/spec-driven-delivery.md",
    ".ai/workflows/feature-development.md",
    ".ai/workflows/story-lookup.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".ai/skills/spec-driven-development.md",
    ".ai/templates/spec/UI_COMPONENT_SPEC_TEMPLATE.md",
    ".clauderc",
    ".cursorrules",
]
missing: list[str] = []
for rel in targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "frontend-design.md" not in text:
        missing.append(rel)

if missing:
    print("ERROR: Frontend design skill references missing from:", file=sys.stderr)
    for rel in missing:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

required_files = [
    ".ai/skills/frontend-design.md",
]
missing_files = [path for path in required_files if not Path(path).is_file()]
if missing_files:
    print("ERROR: Missing frontend design skill files:", file=sys.stderr)
    for path in missing_files:
        print(f"- {path}", file=sys.stderr)
    raise SystemExit(1)

print("Frontend design skill routing check passed.")
PY

run_check "UI prompt brief template wiring" python - <<'PY'
from pathlib import Path
import sys

required_files = [
    ".ai/templates/spec/UI_PROMPT_BRIEF_TEMPLATE.md",
]
missing_files = [path for path in required_files if not Path(path).is_file()]
if missing_files:
    print("ERROR: Missing UI prompt brief template files:", file=sys.stderr)
    for path in missing_files:
        print(f"- {path}", file=sys.stderr)
    raise SystemExit(1)

targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/workflows/spec-driven-delivery.md",
    ".ai/workflows/story-lookup.md",
    ".ai/skills/spec-driven-development.md",
    ".ai/skills/frontend-design.md",
    ".ai/templates/spec/README.md",
    ".ai/docs/WORKSPACE_INDEX.md",
]
missing_refs: list[str] = []
for rel in targets:
    text = Path(rel).read_text(encoding="utf-8")
    if "UI_PROMPT_BRIEF_TEMPLATE.md" not in text:
        missing_refs.append(rel)

if missing_refs:
    print("ERROR: UI prompt brief template references missing from:", file=sys.stderr)
    for rel in missing_refs:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

print("UI prompt brief template wiring check passed.")
PY

run_check "Canonical orchestrator references" python - <<'PY'
from pathlib import Path
import sys

root = Path.cwd()
targets = [
    "AGENTS.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".ai/docs/SINGLE_SOURCE_OF_TRUTH.md",
    ".clauderc",
    ".cursorrules",
]
canonical = ".ai/agents/claude.md"
missing: list[str] = []
for rel in targets:
    text = (root / rel).read_text(encoding="utf-8")
    if canonical not in text:
        missing.append(rel)

if missing:
    print("ERROR: Canonical orchestrator reference missing from:", file=sys.stderr)
    for rel in missing:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

print("Canonical orchestrator reference check passed.")
PY

run_check "Story handoff requires lookup evidence audit" python - <<'PY'
from pathlib import Path
import sys

story_handoff = Path(".ai/workflows/story-handoff.md").read_text(encoding="utf-8")
required_tokens = (
    "Lookup Evidence Audit",
    "Lookup brief delivered before implementation",
    "External sources used (links listed)",
)
missing = [token for token in required_tokens if token not in story_handoff]
if missing:
    print("ERROR: Story handoff lookup audit requirements missing:", file=sys.stderr)
    for token in missing:
        print(f"- {token}", file=sys.stderr)
    raise SystemExit(1)

print("Story handoff lookup audit check passed.")
PY

run_check "Parallel flight routing references" python - <<'PY'
from pathlib import Path
import sys

targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/docs/WORKSPACE_INDEX.md",
]
required_tokens = ("parallel-flight.md", "flight_slot.sh")
missing: list[str] = []
for rel in targets:
    text = Path(rel).read_text(encoding="utf-8")
    if not all(token in text for token in required_tokens):
        missing.append(rel)

if missing:
    print("ERROR: Parallel flight references missing from:", file=sys.stderr)
    for rel in missing:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

print("Parallel flight routing check passed.")
PY

run_check "Git finalization routing references" python - <<'PY'
from pathlib import Path
import sys

targets = [
    "AGENTS.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/agents/cursor-agent.md",
    ".ai/docs/WORKSPACE_INDEX.md",
    ".ai/workflows/story-handoff.md",
]
required_tokens = ("git-finalization.md", "git_finalize_guard.sh")
missing: list[str] = []
for rel in targets:
    text = Path(rel).read_text(encoding="utf-8")
    if not all(token in text for token in required_tokens):
        missing.append(rel)

if missing:
    print("ERROR: Git finalization references missing from:", file=sys.stderr)
    for rel in missing:
        print(f"- {rel}", file=sys.stderr)
    raise SystemExit(1)

print("Git finalization routing check passed.")
PY

run_check "Markdown link integrity (.ai + AGENTS/README)" python - <<'PY'
from pathlib import Path
import re
import sys

root = Path.cwd()
files = [*root.joinpath(".ai").rglob("*.md"), root / "AGENTS.md", root / "README.md"]
missing: list[str] = []
for file_path in files:
    text = file_path.read_text(encoding="utf-8")
    for match in re.finditer(r"\]\(([^)]+)\)", text):
        target = match.group(1).strip()
        if not target or "://" in target or target.startswith("#"):
            continue
        target = target.split("#", 1)[0]
        resolved = (file_path.parent / target).resolve()
        if not resolved.exists():
            missing.append(f"{file_path.relative_to(root)} -> {target}")

if missing:
    print("ERROR: Broken markdown links detected:", file=sys.stderr)
    for item in missing:
        print(f"- {item}", file=sys.stderr)
    raise SystemExit(1)

print("Markdown link integrity check passed.")
PY

echo
echo "AI wiring audit passed."
