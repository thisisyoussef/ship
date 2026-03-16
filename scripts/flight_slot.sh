#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SHIP_ROOT="${ROOT_DIR}"

python - "$@" <<'PY'
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(os.environ["SHIP_ROOT"])
LOCK_PATH = ROOT / ".ai" / "state" / "flight-lock.json"
LEGACY_PATH = ROOT / ".ai" / "state" / "flight-board.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def default_state() -> dict:
    return {"active_lock": None, "last_release": None, "updated_at": utc_now()}


def write_state(payload: dict) -> None:
    payload["updated_at"] = utc_now()
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCK_PATH.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def migrate_legacy_board() -> dict | None:
    if not LEGACY_PATH.exists():
        return None
    board = json.loads(LEGACY_PATH.read_text(encoding="utf-8"))
    active = [item for item in board.get("active_flights", []) if item.get("status") == "active"]
    if len(active) > 1:
        raise SystemExit(
            "ERROR: legacy flight board has multiple active flights; resolve manually before using the single-lock flow."
        )
    state = default_state()
    if active:
        state["active_lock"] = active[0]
    history = board.get("history", [])
    if history:
        state["last_release"] = history[-1]
    write_state(state)
    return state


def load_state() -> dict:
    if LOCK_PATH.exists():
        return json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    migrated = migrate_legacy_board()
    if migrated is not None:
        return migrated
    state = default_state()
    write_state(state)
    return state


def parse_paths(raw: str) -> list[str]:
    items = [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
    return sorted(set(items))


def command_init() -> int:
    state = load_state()
    print(f"Flight lock ready at {LOCK_PATH}")
    if state["active_lock"]:
        print(f"Active lock: {state['active_lock']['flight_id']}")
    return 0


def command_status(as_json: bool) -> int:
    state = load_state()
    if as_json:
        print(json.dumps(state, indent=2, sort_keys=True))
        return 0
    print("Flight Lock")
    if not state["active_lock"]:
        print("No active flight.")
        return 0
    lock = state["active_lock"]
    print(f"Active flight: {lock['flight_id']}")
    print(f"- owner: {lock['owner']}")
    print(f"- slot: {lock['slot']}")
    print(f"- branch: {lock.get('branch', '')}")
    print(f"- story: {lock.get('story_ref', '')}")
    print(f"- paths: {','.join(lock.get('lock_paths', []))}")
    return 0


def command_mode(mode: str) -> int:
    if mode != "single":
        raise SystemExit("ERROR: parallel mode is retired. Use the single flight lock until real contention returns.")
    print("single lock mode is the only supported mode")
    return 0


def command_claim(args: argparse.Namespace) -> int:
    state = load_state()
    lock = state.get("active_lock")
    if lock is not None:
        raise SystemExit(
            f"ERROR: active flight '{lock['flight_id']}' already holds the single lock. "
            "Release it or finish that story before claiming another."
        )
    state["active_lock"] = {
        "flight_id": args.flight_id.strip(),
        "slot": args.slot.strip(),
        "owner": args.owner.strip(),
        "story_ref": (args.story or "").strip(),
        "branch": (args.branch or "").strip(),
        "notes": (args.notes or "").strip(),
        "lock_paths": parse_paths(args.paths),
        "claimed_at": utc_now(),
        "status": "active",
    }
    write_state(state)
    print(f"Claimed single flight lock for '{args.flight_id}'")
    return 0


def command_release(args: argparse.Namespace) -> int:
    state = load_state()
    lock = state.get("active_lock")
    if lock is None:
        raise SystemExit("ERROR: no active flight lock to release")
    if lock.get("flight_id") != args.flight_id:
        raise SystemExit(
            f"ERROR: active flight lock belongs to '{lock.get('flight_id')}', not '{args.flight_id}'"
        )
    lock["status"] = args.status
    lock["released_at"] = utc_now()
    lock["release_summary"] = (args.summary or "").strip()
    state["last_release"] = lock
    state["active_lock"] = None
    write_state(state)
    print(f"Released single flight lock for '{args.flight_id}' with status '{args.status}'")
    return 0


def command_reset(confirm: bool) -> int:
    if not confirm:
        raise SystemExit("ERROR: reset requires --confirm")
    state = default_state()
    write_state(state)
    print("Flight lock reset")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Single active flight lock for Ship harness work")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("init")

    status_cmd = sub.add_parser("status")
    status_cmd.add_argument("--json", action="store_true")

    mode_cmd = sub.add_parser("mode")
    mode_cmd.add_argument("execution_mode", choices=("single", "parallel"))

    claim_cmd = sub.add_parser("claim")
    claim_cmd.add_argument("--flight-id", required=True)
    claim_cmd.add_argument("--slot", required=True)
    claim_cmd.add_argument("--owner", required=True)
    claim_cmd.add_argument("--paths", required=True)
    claim_cmd.add_argument("--story")
    claim_cmd.add_argument("--branch")
    claim_cmd.add_argument("--notes")

    release_cmd = sub.add_parser("release")
    release_cmd.add_argument("--flight-id", required=True)
    release_cmd.add_argument("--status", required=True, choices=("completed", "blocked", "cancelled"))
    release_cmd.add_argument("--summary")

    reset_cmd = sub.add_parser("reset")
    reset_cmd.add_argument("--confirm", action="store_true")

    return p


def main() -> int:
    args = parser().parse_args()
    if args.command == "init":
        return command_init()
    if args.command == "status":
        return command_status(args.json)
    if args.command == "mode":
        return command_mode(args.execution_mode)
    if args.command == "claim":
        return command_claim(args)
    if args.command == "release":
        return command_release(args)
    if args.command == "reset":
        return command_reset(args.confirm)
    raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
PY
