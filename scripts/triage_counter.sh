#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SHIP_ROOT="${ROOT_DIR}"

python - "$@" <<'PY'
from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(os.environ["SHIP_ROOT"])
STATE_PATH = ROOT / ".ai" / "state" / "correction-triage.json"
DEFAULT_LIMIT = 3


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def current_branch() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def story_key(value: str | None) -> str:
    return value.strip() if value else current_branch()


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {"limit": DEFAULT_LIMIT, "stories": {}, "updated_at": utc_now()}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def write_state(payload: dict) -> None:
    payload["updated_at"] = utc_now()
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def record(args: argparse.Namespace) -> int:
    state = load_state()
    limit = args.limit or state.get("limit", DEFAULT_LIMIT)
    state["limit"] = limit
    key = story_key(args.story)
    story = state.setdefault("stories", {}).setdefault(key, {"count": 0})
    story["count"] += 1
    story["last_branch"] = current_branch()
    story["updated_at"] = utc_now()
    write_state(state)
    print(f"triage_count={story['count']} story={key} limit={limit}")
    if story["count"] >= limit:
        raise SystemExit(
            f"ERROR: triage count reached {story['count']} for '{key}'. "
            "This story may need re-scoping instead of another patch loop."
        )
    return 0


def status(args: argparse.Namespace) -> int:
    state = load_state()
    key = story_key(args.story)
    story = state.get("stories", {}).get(key, {"count": 0})
    print(json.dumps({"story": key, "limit": state.get("limit", DEFAULT_LIMIT), **story}, indent=2, sort_keys=True))
    return 0


def clear(args: argparse.Namespace) -> int:
    state = load_state()
    key = story_key(args.story)
    state.get("stories", {}).pop(key, None)
    write_state(state)
    print(f"cleared story={key}")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Persist correction triage loop counts per story")
    sub = p.add_subparsers(dest="command", required=True)

    record_cmd = sub.add_parser("record")
    record_cmd.add_argument("--story")
    record_cmd.add_argument("--limit", type=int)

    status_cmd = sub.add_parser("status")
    status_cmd.add_argument("--story")

    clear_cmd = sub.add_parser("clear")
    clear_cmd.add_argument("--story")

    return p


def main() -> int:
    args = parser().parse_args()
    if args.command == "record":
        return record(args)
    if args.command == "status":
        return status(args)
    if args.command == "clear":
        return clear(args)
    raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
PY
