#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

BASE_REF="HEAD~1"
if [[ "${1:-}" == "--base" ]]; then
  BASE_REF="${2:?missing base ref}"
  shift 2
fi

CHANGED_FILES=()
while IFS= read -r file; do
  [[ -n "${file}" ]] && CHANGED_FILES+=("${file}")
done < <(git diff --name-only "${BASE_REF}"...HEAD | grep -E '^(api|web|shared)/.*\.(ts|tsx)$' || true)
if [[ "${#CHANGED_FILES[@]}" -eq 0 ]]; then
  echo "No API/Web/Shared TypeScript files changed; skipping targeted mutation run."
  exit 0
fi

api_files=()
web_files=()
shared_files=()
for file in "${CHANGED_FILES[@]}"; do
  case "${file}" in
    api/*) api_files+=("${file#api/}") ;;
    web/*) web_files+=("${file#web/}") ;;
    shared/*) shared_files+=("../${file}") ;;
  esac
done

run_package() {
  local package_dir="$1"
  local config_file="$2"
  shift 2
  local files=("$@")
  if [[ "${#files[@]}" -eq 0 ]]; then
    return 0
  fi

  local mutate_csv
  mutate_csv="$(IFS=,; echo "${files[*]}")"
  echo "Running targeted mutation test for ${package_dir}: ${mutate_csv}"
  (
    cd "${package_dir}"
    pnpm exec stryker run "${config_file}" --mutate "${mutate_csv}"
  )
}

run_package "api" "stryker.config.mjs" "${api_files[@]}" "${shared_files[@]}"
run_package "web" "stryker.config.mjs" "${web_files[@]}" "${shared_files[@]}"
