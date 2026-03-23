#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required" >&2
  exit 127
fi

export SHIP_ROOT="${ROOT_DIR}"
export SHIP_GIT_COMMON_DIR="$(git rev-parse --git-common-dir)"

python3 - "$@" <<'PY'
from __future__ import annotations

import argparse
import json
import os
import subprocess
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import fcntl


ROOT = Path(os.environ["SHIP_ROOT"])
raw_common_dir = Path(os.environ["SHIP_GIT_COMMON_DIR"])
COMMON_DIR = raw_common_dir if raw_common_dir.is_absolute() else (ROOT / raw_common_dir).resolve()
STATE_PATH = COMMON_DIR / "ship-merge-lock.json"
GUARD_PATH = COMMON_DIR / "ship-merge-lock.json.guard"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def default_state() -> dict:
    return {"active_merge": None, "last_release": None, "updated_at": utc_now()}


def current_branch() -> str:
    branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if branch == "HEAD":
        raise SystemExit("ERROR: detached HEAD is not allowed for merge coordination")
    return branch


def current_worktree() -> str:
    return str(ROOT)


def write_state_unlocked(payload: dict) -> None:
    payload["updated_at"] = utc_now()
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = STATE_PATH.with_suffix(".json.tmp")
    temp_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temp_path.replace(STATE_PATH)


def load_state_unlocked() -> dict:
    if not STATE_PATH.exists():
        state = default_state()
        write_state_unlocked(state)
        return state
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"ERROR: could not parse merge lock state at {STATE_PATH}: {exc}") from exc


@contextmanager
def locked_state():
    GUARD_PATH.parent.mkdir(parents=True, exist_ok=True)
    with GUARD_PATH.open("a+", encoding="utf-8") as guard_file:
        fcntl.flock(guard_file.fileno(), fcntl.LOCK_EX)
        state = load_state_unlocked()
        yield state


def describe_lock(lock: dict) -> str:
    story = lock.get("story_ref") or "n/a"
    worktree = lock.get("worktree") or "n/a"
    return "\n".join(
        [
            f"- branch: {lock.get('branch', 'n/a')}",
            f"- owner: {lock.get('owner', 'n/a')}",
            f"- story: {story}",
            f"- worktree: {worktree}",
            f"- claimed_at: {lock.get('claimed_at', 'n/a')}",
            f"- instructions: {lock.get('instructions', '')}",
        ]
    )


def command_path() -> int:
    print(str(STATE_PATH))
    return 0


def command_status(as_json: bool) -> int:
    with locked_state() as state:
        if as_json:
            payload = {"lock_path": str(STATE_PATH), **state}
            print(json.dumps(payload, indent=2, sort_keys=True))
            return 0

        print("Merge Lock")
        print(f"File: {STATE_PATH}")
        lock = state.get("active_merge")
        if not lock:
            print("No active merge.")
            return 0
        print("Active merge:")
        print(describe_lock(lock))
        return 0


def command_claim(args: argparse.Namespace) -> int:
    branch = (args.branch or current_branch()).strip()
    owner = args.owner.strip()
    instructions = args.instructions.strip()
    story = (args.story or "").strip()
    worktree = (args.worktree or current_worktree()).strip()

    if not instructions:
        raise SystemExit("ERROR: --instructions is required")

    with locked_state() as state:
        lock = state.get("active_merge")
        if lock and lock.get("branch") != branch:
            raise SystemExit(
                "ERROR: merge lock is already held by another branch.\n"
                f"{describe_lock(lock)}\n"
                "Wait for that branch to release the lock, refresh from latest master, rerun validation, and then claim the lock for your branch."
            )

        claimed_at = utc_now()
        if lock and lock.get("branch") == branch:
            claimed_at = lock.get("claimed_at", claimed_at)

        state["active_merge"] = {
            "branch": branch,
            "owner": owner,
            "story_ref": story,
            "worktree": worktree,
            "instructions": instructions,
            "claimed_at": claimed_at,
        }
        write_state_unlocked(state)

    print(f"Merge lock claimed for '{branch}'")
    print(f"File: {STATE_PATH}")
    return 0


def command_release(args: argparse.Namespace) -> int:
    branch = (args.branch or current_branch()).strip()

    with locked_state() as state:
        lock = state.get("active_merge")
        if lock is None:
            raise SystemExit("ERROR: no active merge lock to release")
        if lock.get("branch") != branch:
            raise SystemExit(
                "ERROR: merge lock is held by another branch.\n"
                f"{describe_lock(lock)}"
            )

        released = {
            **lock,
            "status": args.status,
            "release_summary": (args.summary or "").strip(),
            "released_at": utc_now(),
        }
        state["last_release"] = released
        state["active_merge"] = None
        write_state_unlocked(state)

    print(f"Merge lock released for '{branch}' with status '{args.status}'")
    print(f"File: {STATE_PATH}")
    return 0


def command_assert_held(args: argparse.Namespace) -> int:
    branch = (args.branch or current_branch()).strip()

    with locked_state() as state:
        lock = state.get("active_merge")
        if lock is None:
            raise SystemExit(
                "ERROR: no active merge lock is claimed.\n"
                f"Claim it first for '{branch}' before finalization.\n"
                "Example:\n"
                "bash scripts/merge_lock.sh claim --owner Codex --story <story-id> --instructions "
                "\"Wait until this merge lock is released, then refresh from latest master, rerun validation, and only then finalize.\""
            )
        if lock.get("branch") != branch:
            raise SystemExit(
                "ERROR: another branch currently holds the merge lock.\n"
                f"{describe_lock(lock)}\n"
                "Wait for that branch to release the lock, refresh from latest master, rerun validation, and then claim the lock for your branch."
            )

    print(f"Current branch '{branch}' holds the merge lock.")
    print(f"File: {STATE_PATH}")
    return 0


def command_reset(confirm: bool) -> int:
    if not confirm:
        raise SystemExit("ERROR: reset requires --confirm")
    with locked_state() as state:
        state.clear()
        state.update(default_state())
        write_state_unlocked(state)
    print(f"Merge lock reset at {STATE_PATH}")
    return 0


def parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Shared merge coordination lock for Ship story finalization")
    subcommands = parser.add_subparsers(dest="command", required=True)

    subcommands.add_parser("path")

    status_command = subcommands.add_parser("status")
    status_command.add_argument("--json", action="store_true")

    claim_command = subcommands.add_parser("claim")
    claim_command.add_argument("--owner", required=True)
    claim_command.add_argument("--instructions", required=True)
    claim_command.add_argument("--story")
    claim_command.add_argument("--branch")
    claim_command.add_argument("--worktree")

    release_command = subcommands.add_parser("release")
    release_command.add_argument("--branch")
    release_command.add_argument("--status", default="completed", choices=("completed", "blocked", "cancelled"))
    release_command.add_argument("--summary")

    assert_command = subcommands.add_parser("assert-held")
    assert_command.add_argument("--branch")

    reset_command = subcommands.add_parser("reset")
    reset_command.add_argument("--confirm", action="store_true")

    return parser


def main() -> int:
    args = parser().parse_args()
    if args.command == "path":
        return command_path()
    if args.command == "status":
        return command_status(args.json)
    if args.command == "claim":
        return command_claim(args)
    if args.command == "release":
        return command_release(args)
    if args.command == "assert-held":
        return command_assert_held(args)
    if args.command == "reset":
        return command_reset(args.confirm)
    raise SystemExit(f"ERROR: unknown command '{args.command}'")


if __name__ == "__main__":
    raise SystemExit(main())
PY
