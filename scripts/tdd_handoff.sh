#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SHIP_ROOT="${ROOT_DIR}"

python3 - "$@" <<'PY'
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__import__("os").environ["SHIP_ROOT"])
BASE = ROOT / ".ai" / "state" / "tdd-handoff"
AGENT2_LIMIT = 3
AGENT3_LIMIT = 2


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def story_dir(story: str) -> Path:
    return BASE / story


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def ensure_story(story: str) -> Path:
    root = story_dir(story)
    if not root.exists():
        raise SystemExit(f"ERROR: Story handoff does not exist: {story}")
    return root


def update_status(root: Path, stage: str, payload: dict[str, Any]) -> None:
    status_path = root / "pipeline-status.json"
    status = read_json(status_path)
    status.setdefault("story_id", root.name)
    status.setdefault("stages", {})
    status["updated_at"] = utc_now()
    status["stages"][stage] = payload
    write_json(status_path, status)


def cmd_init(args: argparse.Namespace) -> int:
    root = story_dir(args.story)
    root.mkdir(parents=True, exist_ok=True)
    for rel in ("agent1-tests", "agent2-impl", "agent2-escalations", "agent3-refactored"):
        (root / rel).mkdir(parents=True, exist_ok=True)

    spec_path = (ROOT / args.spec).resolve()
    spec_text = spec_path.read_text(encoding="utf-8")
    spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest()

    write_json(root / "agent1-meta.json", {
        "created_at": utc_now(),
        "property_test_files": [],
        "spec_hash": spec_hash,
        "spec_path": str(spec_path.relative_to(ROOT)),
        "status": "pending",
        "test_files": [],
    })
    write_json(root / "agent2-results.json", {
        "attempts": 0,
        "last_status": "pending",
        "mutation_rounds": 0,
        "results": [],
    })
    write_json(root / "agent3-quality.json", {
        "attempts": 0,
        "coverage_gaps": [],
        "missing_tests": [],
        "mutation_score": None,
        "status": "pending",
    })
    update_status(root, "agent1", {"status": "pending", "attempts": 0})
    update_status(root, "agent2", {"status": "pending", "attempts": 0, "limit": AGENT2_LIMIT})
    update_status(root, "agent3", {"status": "pending", "attempts": 0, "limit": AGENT3_LIMIT})
    print(f"Initialized TDD handoff for {args.story}")
    return 0


def cmd_mark_agent1(args: argparse.Namespace) -> int:
    root = ensure_story(args.story)
    meta_path = root / "agent1-meta.json"
    meta = read_json(meta_path)
    meta["status"] = args.status
    meta["updated_at"] = utc_now()
    meta["test_files"] = [item for item in args.tests.split(",") if item]
    meta["property_test_files"] = [item for item in args.property_tests.split(",") if item]
    write_json(meta_path, meta)
    update_status(root, "agent1", {"status": args.status, "attempts": 1})
    print(f"Recorded agent1 status '{args.status}'")
    return 0


def cmd_mark_agent2(args: argparse.Namespace) -> int:
    root = ensure_story(args.story)
    if args.attempt > AGENT2_LIMIT:
        raise SystemExit(f"ERROR: Agent 2 attempt limit exceeded ({args.attempt}/{AGENT2_LIMIT}); escalate to user")
    result_path = root / "agent2-results.json"
    payload = read_json(result_path)
    payload["attempts"] = args.attempt
    payload["last_status"] = args.status
    payload.setdefault("results", []).append({
        "attempt": args.attempt,
        "status": args.status,
        "summary": args.summary,
        "updated_at": utc_now(),
    })
    write_json(result_path, payload)
    update_status(root, "agent2", {"status": args.status, "attempts": args.attempt, "limit": AGENT2_LIMIT})
    print(f"Recorded agent2 status '{args.status}' attempt {args.attempt}")
    return 0


def cmd_mark_agent3(args: argparse.Namespace) -> int:
    root = ensure_story(args.story)
    if args.attempt > AGENT3_LIMIT:
        raise SystemExit(f"ERROR: Agent 3 attempt limit exceeded ({args.attempt}/{AGENT3_LIMIT}); escalate to user")
    quality_path = root / "agent3-quality.json"
    payload = read_json(quality_path)
    payload["attempts"] = args.attempt
    payload["status"] = args.status
    payload["mutation_score"] = args.mutation_score
    payload["summary"] = args.summary
    payload["updated_at"] = utc_now()
    write_json(quality_path, payload)
    update_status(root, "agent3", {"status": args.status, "attempts": args.attempt, "limit": AGENT3_LIMIT})
    print(f"Recorded agent3 status '{args.status}' attempt {args.attempt}")
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    root = ensure_story(args.story)
    command = list(args.exec_command)
    if command[:1] == ["--"]:
        command = command[1:]
    if not command:
        raise SystemExit("ERROR: Provide a command after '--'")

    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    log_path = root / f"last-{args.stage}-check.log"
    log_path.write_text(
        f"$ {' '.join(command)}\nexit={result.returncode}\n\nSTDOUT\n{result.stdout}\n\nSTDERR\n{result.stderr}\n",
        encoding="utf-8",
    )

    passed = (args.expect == "red" and result.returncode != 0) or (args.expect == "green" and result.returncode == 0)
    status = "passed" if passed else "failed"
    update_status(root, f"{args.stage}-check", {
        "command": command,
        "expect": args.expect,
        "log": str(log_path.relative_to(ROOT)),
        "status": status,
    })

    if not passed:
        if args.expect == "red":
            raise SystemExit("ERROR: Expected RED but the command passed; escalate because the tests are trivially green or the feature already exists")
        raise SystemExit("ERROR: Expected GREEN but the command failed; continue only after fixing or escalating")

    print(f"{args.stage} {args.expect} check passed")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    root = ensure_story(args.story)
    payload = read_json(root / "pipeline-status.json")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Manage file-based TDD handoff state")
    sub = p.add_subparsers(dest="subcommand", required=True)

    init_cmd = sub.add_parser("init")
    init_cmd.add_argument("--story", required=True)
    init_cmd.add_argument("--spec", required=True)

    a1_cmd = sub.add_parser("mark-agent1")
    a1_cmd.add_argument("--story", required=True)
    a1_cmd.add_argument("--status", required=True)
    a1_cmd.add_argument("--tests", default="")
    a1_cmd.add_argument("--property-tests", default="")

    a2_cmd = sub.add_parser("mark-agent2")
    a2_cmd.add_argument("--story", required=True)
    a2_cmd.add_argument("--status", required=True)
    a2_cmd.add_argument("--attempt", type=int, required=True)
    a2_cmd.add_argument("--summary", default="")

    a3_cmd = sub.add_parser("mark-agent3")
    a3_cmd.add_argument("--story", required=True)
    a3_cmd.add_argument("--status", required=True)
    a3_cmd.add_argument("--attempt", type=int, required=True)
    a3_cmd.add_argument("--mutation-score", type=float)
    a3_cmd.add_argument("--summary", default="")

    check_cmd = sub.add_parser("check")
    check_cmd.add_argument("--story", required=True)
    check_cmd.add_argument("--stage", required=True, choices=("agent1", "agent2", "agent3"))
    check_cmd.add_argument("--expect", required=True, choices=("red", "green"))
    check_cmd.add_argument("exec_command", nargs=argparse.REMAINDER)

    status_cmd = sub.add_parser("status")
    status_cmd.add_argument("--story", required=True)
    return p


def main() -> int:
    args = parser().parse_args()
    if args.subcommand == "init":
        return cmd_init(args)
    if args.subcommand == "mark-agent1":
        return cmd_mark_agent1(args)
    if args.subcommand == "mark-agent2":
        return cmd_mark_agent2(args)
    if args.subcommand == "mark-agent3":
        return cmd_mark_agent3(args)
    if args.subcommand == "check":
        return cmd_check(args)
    if args.subcommand == "status":
        return cmd_status(args)
    raise SystemExit(f"ERROR: Unknown command '{args.subcommand}'")


if __name__ == "__main__":
    raise SystemExit(main())
PY
