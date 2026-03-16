#!/usr/bin/env python3
"""Verify required AI workspace contract files exist."""

from __future__ import annotations

from pathlib import Path
import sys


REQUIRED_FILES = [
    "AGENTS.md",
    ".ai/docs/SINGLE_SOURCE_OF_TRUTH.md",
    ".ai/agents/claude.md",
    ".ai/codex.md",
    ".ai/workflows/feature-development.md",
    ".ai/workflows/parallel-flight.md",
    ".ai/workflows/story-sizing.md",
    ".ai/workflows/story-lookup.md",
    ".ai/workflows/eval-driven-development.md",
    ".ai/workflows/story-handoff.md",
    ".ai/workflows/git-finalization.md",
    ".ai/workflows/finalization-recovery.md",
    "scripts/check_ai_wiring.sh",
    "scripts/ai_arch_changed.sh",
    "scripts/triage_counter.sh",
    "scripts/flight_slot.sh",
    "scripts/git_finalize_guard.sh",
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
