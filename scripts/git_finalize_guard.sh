#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${LEGACYLENS_ROOT_OVERRIDE:-}" ]]; then
  ROOT_DIR="${LEGACYLENS_ROOT_OVERRIDE}"
else
  ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi
cd "${ROOT_DIR}"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

if ! command -v git >/dev/null 2>&1; then
  fail "git is required"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "not a git repository: ${ROOT_DIR}"
fi

branch_name="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${branch_name}" == "HEAD" ]]; then
  fail "detached HEAD is not allowed for story finalization"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  fail "working tree is not clean; commit/stash/discard local changes first"
fi

if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  fail "no upstream tracking branch configured for '${branch_name}'"
fi

ahead_count="$(git rev-list --count @{u}..HEAD)"
behind_count="$(git rev-list --count HEAD..@{u})"

if [[ "${ahead_count}" != "0" ]]; then
  fail "${ahead_count} local commit(s) not pushed to upstream"
fi

if [[ "${behind_count}" != "0" ]]; then
  fail "branch is behind upstream by ${behind_count} commit(s); re-sync required"
fi

commit_sha="$(git rev-parse --short HEAD)"
upstream_ref="$(git rev-parse --abbrev-ref --symbolic-full-name @{u})"

echo "Git finalization guard passed."
echo "- branch: ${branch_name}"
echo "- commit: ${commit_sha}"
echo "- upstream: ${upstream_ref}"
