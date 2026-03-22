#!/usr/bin/env python3
"""Verify required agent-harness contract files exist."""

from __future__ import annotations

from pathlib import Path
import sys


REQUIRED_FILES = [
    "AGENTS.md",
    "CLAUDE.md",
    ".claude/CLAUDE.md",
    ".clauderc",
    ".cursorrules",
    "docs/README.md",
    "docs/CONTEXT.md",
    "docs/IMPLEMENTATION_STRATEGY.md",
    "docs/DEFINITION_OF_DONE.md",
    "docs/guides/finalization-recovery.md",
    "docs/submissions/README.md",
    "docs/user-stories/README.md",
    "docs/user-stories/TEMPLATE.md",
    "docs/user-stories/HOW_TO_CREATE_USER_STORIES.md",
    "docs/user-stories/CHECKPOINT-LOG.md",
    "docs/user-stories/phase-1/README.md",
    "docs/user-stories/phase-1/CHECKPOINT-LOG.md",
    "docs/user-stories/phase-2/README.md",
    "docs/user-stories/phase-2/CHECKPOINT-LOG.md",
    "docs/user-stories/phase-3/README.md",
    "docs/user-stories/phase-3/CHECKPOINT-LOG.md",
    "docs/user-stories/phase-x/README.md",
    "docs/user-stories/phase-x/CHECKPOINT-LOG.md",
    "scripts/ai_arch_changed.sh",
    "scripts/triage_counter.sh",
    "scripts/check_ai_wiring.sh",
    "scripts/flight_slot.sh",
    "scripts/tdd_handoff.sh",
    "scripts/run_targeted_mutation.sh",
    "scripts/git_finalize_guard.sh",
    ".ai/state/tdd-handoff/README.md",
]


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    missing = [path for path in REQUIRED_FILES if not (root / path).is_file()]
    if missing:
        print("ERROR: Missing required contract files:", file=sys.stderr)
        for path in missing:
            print(f"- {path}", file=sys.stderr)
        return 1

    print("Agent contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
