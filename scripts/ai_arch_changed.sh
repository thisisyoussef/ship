#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

usage() {
  echo "Usage: $0 --staged | --branch-base [base-ref] | --range <revspec>" >&2
  exit 2
}

# AI-architecture changes include:
# - AGENTS.md and CLAUDE.md entrypoints
# - docs/CONTEXT.md
# - docs/IMPLEMENTATION_STRATEGY.md
# - docs/DEFINITION_OF_DONE.md
# - docs/user-stories/
# - docs/guides/finalization-recovery.md
# - supporting harness scripts and IDE mirrors

match_ai_arch() {
  grep -E '^(AGENTS\.md|CLAUDE\.md|\.clauderc|\.cursorrules|\.claude/CLAUDE\.md|docs/(README\.md|CONTEXT\.md|IMPLEMENTATION_STRATEGY\.md|DEFINITION_OF_DONE\.md|guides/finalization-recovery\.md|submissions/.*|user-stories/.*)|\.husky/pre-commit|scripts/(check_ai_wiring|flight_slot|git_finalize_guard|ai_arch_changed|triage_counter|tdd_handoff)\.sh|scripts/verify_agent_contract\.py)$' || true
}

if [[ $# -lt 1 ]]; then
  usage
fi

case "$1" in
  --staged)
    files="$(git diff --cached --name-only --diff-filter=ACMR | match_ai_arch)"
    ;;
  --branch-base)
    base_ref="${2:-origin/master}"
    if ! git rev-parse --verify --quiet "${base_ref}" >/dev/null; then
      base_ref="master"
    fi
    merge_base="$(git merge-base HEAD "${base_ref}")"
    files="$(git diff --name-only "${merge_base}...HEAD" | match_ai_arch)"
    ;;
  --range)
    [[ $# -ge 2 ]] || usage
    files="$(git diff --name-only "$2" | match_ai_arch)"
    ;;
  *)
    usage
    ;;
esac

if [[ -n "${files}" ]]; then
  printf '%s\n' "${files}"
  exit 0
fi

exit 1
