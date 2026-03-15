#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export LEGACYLENS_ROOT="${ROOT_DIR}"

python - "$@" <<'PY'
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ClaimRequest:
    flight_id: str
    slot: str
    owner: str
    lock_paths: list[str]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def default_board() -> dict[str, Any]:
    now = utc_now()
    return {
        "version": 1,
        "execution_mode": "single",
        "parallel_max_active_flights": 3,
        "slot_limits": {
            "code": 2,
            "docs": 2,
            "infra": 1,
            "deploy": 1,
            "ai_arch": 1,
        },
        "active_flights": [],
        "history": [],
        "created_at": now,
        "updated_at": now,
    }


def resolve_board_path() -> Path:
    override = os.getenv("FLIGHT_BOARD_PATH")
    if override:
        return Path(override)
    root = Path(os.environ["LEGACYLENS_ROOT"])
    return root / ".ai" / "state" / "flight-board.json"


def write_board(path: Path, board: dict[str, Any]) -> None:
    board["updated_at"] = utc_now()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(board, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def load_or_init_board(path: Path) -> dict[str, Any]:
    if not path.exists():
        board = default_board()
        write_board(path, board)
        return board

    raw = path.read_text(encoding="utf-8")
    try:
        board = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"ERROR: Invalid board JSON at {path}: {exc}") from exc

    required_keys = {
        "execution_mode",
        "parallel_max_active_flights",
        "slot_limits",
        "active_flights",
        "history",
    }
    missing = sorted(key for key in required_keys if key not in board)
    if missing:
        raise SystemExit(f"ERROR: Board file missing keys: {', '.join(missing)}")

    return board


def normalize_lock_path(value: str) -> str:
    cleaned = value.strip().replace("\\", "/")
    cleaned = cleaned[2:] if cleaned.startswith("./") else cleaned
    cleaned = cleaned.split("*", 1)[0]
    cleaned = cleaned.rstrip("/")
    if cleaned in {"", "."}:
        return "."
    return cleaned


def parse_lock_paths(raw: str) -> list[str]:
    roots = {normalize_lock_path(item) for item in raw.split(",") if item.strip()}
    if not roots:
        raise SystemExit("ERROR: At least one lock path is required. Use --paths 'src/foo,tests/bar'.")
    return sorted(roots)


def paths_overlap(left: str, right: str) -> bool:
    if left == "." or right == ".":
        return True
    return left == right or left.startswith(right + "/") or right.startswith(left + "/")


def active_flights(board: dict[str, Any]) -> list[dict[str, Any]]:
    return [flight for flight in board.get("active_flights", []) if flight.get("status") == "active"]


def validate_claim(board: dict[str, Any], claim: ClaimRequest) -> list[str]:
    active = active_flights(board)
    issues: list[str] = []

    if any(flight.get("flight_id") == claim.flight_id for flight in active):
        issues.append(f"flight '{claim.flight_id}' already active")

    mode = board.get("execution_mode", "single")
    if mode == "single" and active:
        issues.append("execution_mode=single allows only one active flight")
    elif mode == "parallel":
        max_active = int(board.get("parallel_max_active_flights", 1))
        if len(active) >= max_active:
            issues.append(
                f"parallel max active flights reached ({len(active)}/{max_active})"
            )

    slot_limits = board.get("slot_limits", {})
    if claim.slot not in slot_limits:
        known = ", ".join(sorted(slot_limits))
        issues.append(f"unknown slot '{claim.slot}'. Known slots: {known}")
    else:
        slot_active = sum(1 for flight in active if flight.get("slot") == claim.slot)
        slot_limit = int(slot_limits[claim.slot])
        if slot_active >= slot_limit:
            issues.append(
                f"slot '{claim.slot}' is full ({slot_active}/{slot_limit})"
            )

    for flight in active:
        locked = flight.get("lock_paths", [])
        for requested in claim.lock_paths:
            overlap = next((item for item in locked if paths_overlap(requested, item)), None)
            if overlap is not None:
                issues.append(
                    f"path lock conflict with flight '{flight.get('flight_id')}' ({requested} vs {overlap})"
                )
                break

    return issues


def command_init(path: Path, force: bool) -> int:
    if path.exists() and not force:
        board = load_or_init_board(path)
        print(f"Board already exists at {path}")
        print(f"Mode: {board['execution_mode']}")
        return 0

    board = default_board()
    write_board(path, board)
    print(f"Initialized board at {path}")
    return 0


def command_status(board: dict[str, Any], as_json: bool) -> int:
    if as_json:
        print(json.dumps(board, indent=2, sort_keys=True))
        return 0

    active = active_flights(board)
    print("Flight Board")
    print(f"Mode: {board['execution_mode']}")
    print(f"Parallel max active: {board['parallel_max_active_flights']}")
    print(f"Active flights: {len(active)}")
    print("Slot limits:")
    for slot, limit in sorted(board["slot_limits"].items()):
        in_use = sum(1 for flight in active if flight.get("slot") == slot)
        print(f"- {slot}: {in_use}/{limit}")

    if not active:
        print("No active flights.")
        return 0

    print("Active:")
    for flight in active:
        print(
            f"- {flight['flight_id']} | slot={flight['slot']} | owner={flight['owner']} | "
            f"paths={','.join(flight['lock_paths'])}"
        )
    return 0


def command_mode(path: Path, board: dict[str, Any], mode: str, max_active: int | None) -> int:
    board["execution_mode"] = mode
    if max_active is not None:
        if max_active < 1:
            raise SystemExit("ERROR: --max-active must be >= 1")
        board["parallel_max_active_flights"] = max_active
    write_board(path, board)
    print(
        f"Set execution_mode={board['execution_mode']} parallel_max_active_flights={board['parallel_max_active_flights']}"
    )
    return 0


def build_claim(args: argparse.Namespace) -> ClaimRequest:
    flight_id = args.flight_id.strip()
    slot = args.slot.strip()
    owner = args.owner.strip()
    if not flight_id:
        raise SystemExit("ERROR: --flight-id must be non-empty")
    if not slot:
        raise SystemExit("ERROR: --slot must be non-empty")
    if not owner:
        raise SystemExit("ERROR: --owner must be non-empty")
    return ClaimRequest(
        flight_id=flight_id,
        slot=slot,
        owner=owner,
        lock_paths=parse_lock_paths(args.paths),
    )


def command_can_claim(board: dict[str, Any], claim: ClaimRequest) -> int:
    issues = validate_claim(board, claim)
    if issues:
        print("CANNOT_CLAIM")
        for issue in issues:
            print(f"- {issue}")
        return 2

    print("CAN_CLAIM")
    return 0


def command_claim(path: Path, board: dict[str, Any], args: argparse.Namespace) -> int:
    claim = build_claim(args)
    issues = validate_claim(board, claim)
    if issues:
        print("ERROR: Claim rejected:")
        for issue in issues:
            print(f"- {issue}")
        return 2

    record = {
        "flight_id": claim.flight_id,
        "slot": claim.slot,
        "owner": claim.owner,
        "story_ref": (args.story or "").strip(),
        "branch": (args.branch or "").strip(),
        "notes": (args.notes or "").strip(),
        "status": "active",
        "lock_paths": claim.lock_paths,
        "claimed_at": utc_now(),
    }
    board["active_flights"].append(record)
    write_board(path, board)
    print(f"Claimed flight '{claim.flight_id}' in slot '{claim.slot}'")
    return 0


def command_release(path: Path, board: dict[str, Any], args: argparse.Namespace) -> int:
    active = board.get("active_flights", [])
    idx = next(
        (i for i, flight in enumerate(active) if flight.get("flight_id") == args.flight_id and flight.get("status") == "active"),
        None,
    )
    if idx is None:
        print(f"ERROR: Active flight '{args.flight_id}' not found")
        return 2

    flight = active.pop(idx)
    flight["status"] = args.status
    flight["release_summary"] = (args.summary or "").strip()
    flight["released_at"] = utc_now()
    board.setdefault("history", []).append(flight)
    write_board(path, board)
    print(f"Released flight '{args.flight_id}' with status '{args.status}'")
    return 0


def command_reset(path: Path, board: dict[str, Any], confirm: bool) -> int:
    if not confirm:
        print("ERROR: reset requires --confirm")
        return 2

    defaults = default_board()
    board["active_flights"] = []
    board["history"] = []
    board["execution_mode"] = defaults["execution_mode"]
    board["parallel_max_active_flights"] = defaults["parallel_max_active_flights"]
    board["slot_limits"] = defaults["slot_limits"]
    write_board(path, board)
    print("Flight board reset to defaults")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Flight slot coordinator for single/parallel story execution")
    sub = p.add_subparsers(dest="command", required=True)

    init_cmd = sub.add_parser("init", help="Initialize flight board")
    init_cmd.add_argument("--force", action="store_true", help="Overwrite existing board with defaults")

    status_cmd = sub.add_parser("status", help="Show board status")
    status_cmd.add_argument("--json", action="store_true", help="Print raw JSON")

    mode_cmd = sub.add_parser("mode", help="Set execution mode")
    mode_cmd.add_argument("execution_mode", choices=("single", "parallel"))
    mode_cmd.add_argument("--max-active", type=int, help="Max active flights in parallel mode")

    claim_cmd = sub.add_parser("claim", help="Claim a flight slot")
    claim_cmd.add_argument("--flight-id", required=True)
    claim_cmd.add_argument("--slot", required=True)
    claim_cmd.add_argument("--owner", required=True)
    claim_cmd.add_argument("--paths", required=True, help="Comma-separated lock paths/prefixes")
    claim_cmd.add_argument("--story", help="Optional story reference")
    claim_cmd.add_argument("--branch", help="Optional branch reference")
    claim_cmd.add_argument("--notes", help="Optional note")

    can_claim_cmd = sub.add_parser("can-claim", help="Validate whether a claim would succeed")
    can_claim_cmd.add_argument("--flight-id", required=True)
    can_claim_cmd.add_argument("--slot", required=True)
    can_claim_cmd.add_argument("--owner", required=True)
    can_claim_cmd.add_argument("--paths", required=True, help="Comma-separated lock paths/prefixes")

    release_cmd = sub.add_parser("release", help="Release an active flight")
    release_cmd.add_argument("--flight-id", required=True)
    release_cmd.add_argument(
        "--status",
        default="completed",
        choices=("completed", "cancelled", "blocked"),
    )
    release_cmd.add_argument("--summary", help="Optional release summary")

    reset_cmd = sub.add_parser("reset", help="Reset active flights/history and restore defaults")
    reset_cmd.add_argument("--confirm", action="store_true", help="Confirm reset")

    return p


def main() -> int:
    args = parser().parse_args()
    path = resolve_board_path()

    if args.command == "init":
        return command_init(path, force=args.force)

    board = load_or_init_board(path)

    if args.command == "status":
        return command_status(board, as_json=args.json)
    if args.command == "mode":
        return command_mode(path, board, mode=args.execution_mode, max_active=args.max_active)
    if args.command == "claim":
        return command_claim(path, board, args)
    if args.command == "can-claim":
        return command_can_claim(board, build_claim(args))
    if args.command == "release":
        return command_release(path, board, args)
    if args.command == "reset":
        return command_reset(path, board, confirm=args.confirm)

    raise SystemExit(f"ERROR: Unknown command '{args.command}'")


if __name__ == "__main__":
    raise SystemExit(main())
PY
