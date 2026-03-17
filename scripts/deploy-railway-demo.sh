#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

PROJECT_ID="${RAILWAY_PUBLIC_DEMO_PROJECT_ID:-}"
SERVICE_NAME="${RAILWAY_PUBLIC_DEMO_SERVICE:-}"
WORKER_SERVICE_NAME="${RAILWAY_PUBLIC_DEMO_WORKER_SERVICE:-}"
ENVIRONMENT_NAME="${RAILWAY_PUBLIC_DEMO_ENVIRONMENT:-production}"
BASE_URL="${RAILWAY_PUBLIC_DEMO_URL:-}"
DEMO_EMAIL="${SHIP_DEMO_EMAIL:-dev@ship.local}"
DEMO_PASSWORD="${SHIP_DEMO_PASSWORD:-admin123}"
EXPECTED_FINDING_TITLE="${FLEETGRAPH_DEMO_EXPECTED_FINDING_TITLE:-Week start drift: FleetGraph Demo Week - Review and Apply}"
EXPECTED_WORKER_FINDING_TITLE="${FLEETGRAPH_DEMO_EXPECTED_WORKER_FINDING_TITLE:-Week start drift: FleetGraph Demo Week - Worker Generated}"
REQUIRE_FULL_READY="${FLEETGRAPH_DEMO_REQUIRE_FULL_READY:-false}"
WORKER_FINDING_TIMEOUT_SECONDS="${FLEETGRAPH_DEMO_WORKER_FINDING_TIMEOUT_SECONDS:-180}"
TARGET_REF="${1:-HEAD}"

for command in git curl jq pnpm npx; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "ERROR: $command is required"
    exit 1
  fi
done

if [ -z "$PROJECT_ID" ] || [ -z "$SERVICE_NAME" ] || [ -z "$BASE_URL" ]; then
  echo "ERROR: Railway public demo is not fully configured."
  echo "Required env vars:"
  echo "  RAILWAY_PUBLIC_DEMO_PROJECT_ID"
  echo "  RAILWAY_PUBLIC_DEMO_SERVICE"
  echo "  RAILWAY_PUBLIC_DEMO_URL"
  exit 1
fi

cd "$PROJECT_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not inside a git repository"
  exit 1
fi

if ! npx -y @railway/cli whoami >/dev/null 2>&1; then
  echo "ERROR: Railway CLI is not authenticated."
  exit 1
fi

COMMIT_SHA="$(git rev-parse "$TARGET_REF^{commit}")"
SHORT_SHA="$(git rev-parse --short "$COMMIT_SHA")"

deploy_service() {
  local service_name="$1"
  local label="$2"
  local deploy_cmd=(
    npx -y @railway/cli up
    --ci
    --no-gitignore
    --project "$PROJECT_ID"
    --service "$service_name"
    --message "ship demo $label $SHORT_SHA"
  )

  if [ -n "$ENVIRONMENT_NAME" ]; then
    deploy_cmd+=(--environment "$ENVIRONMENT_NAME")
  fi

  echo "Deploying Railway service: $service_name"
  "${deploy_cmd[@]}"
}

finding_present() {
  local title="$1"
  jq -e --arg title "$title" \
    '.findings | map(select(.title == $title)) | length > 0' \
    "$FINDINGS_BODY" >/dev/null
}

refresh_findings() {
  local status
  status="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o "$FINDINGS_BODY" -w "%{http_code}" \
    "$BASE_URL/api/fleetgraph/findings")"
  if [ "$status" != "200" ]; then
    echo "ERROR: FleetGraph findings check failed with HTTP $status"
    cat "$FINDINGS_BODY"
    exit 1
  fi
}

wait_for_worker_finding() {
  local timeout_seconds="$1"
  local waited=0

  while [ "$waited" -lt "$timeout_seconds" ]; do
    refresh_findings
    if finding_present "$EXPECTED_WORKER_FINDING_TITLE"; then
      echo "Worker-generated FleetGraph finding is present."
      return 0
    fi

    sleep 5
    waited=$((waited + 5))
  done

  echo "ERROR: expected worker-generated FleetGraph finding was not present after ${timeout_seconds}s."
  cat "$FINDINGS_BODY"
  exit 1
}

echo "=========================================="
echo "Ship - Railway Demo Deployment"
echo "=========================================="
echo "Project: $PROJECT_ID"
echo "API Service: $SERVICE_NAME"
if [ -n "$WORKER_SERVICE_NAME" ]; then
  echo "Worker Service: $WORKER_SERVICE_NAME"
fi
echo "Target commit: $SHORT_SHA"
echo "Base URL: $BASE_URL"
echo ""

echo "Building Ship artifacts for Railway upload..."
pnpm build

deploy_service "$SERVICE_NAME" "api"
if [ -n "$WORKER_SERVICE_NAME" ]; then
  deploy_service "$WORKER_SERVICE_NAME" "worker"
fi

COOKIE_JAR="$(mktemp)"
HEALTH_BODY="$(mktemp)"
CSRF_BODY="$(mktemp)"
LOGIN_BODY="$(mktemp)"
FINDINGS_BODY="$(mktemp)"
READY_BODY="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$HEALTH_BODY" "$CSRF_BODY" "$LOGIN_BODY" "$FINDINGS_BODY" "$READY_BODY"' EXIT

echo ""
echo "Verifying Railway demo health..."
HEALTH_STATUS="$(curl -sS -o "$HEALTH_BODY" -w "%{http_code}" "$BASE_URL/health")"
if [ "$HEALTH_STATUS" != "200" ]; then
  echo "ERROR: health check failed with HTTP $HEALTH_STATUS"
  cat "$HEALTH_BODY"
  exit 1
fi

CSRF_STATUS="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o "$CSRF_BODY" -w "%{http_code}" "$BASE_URL/api/csrf-token")"
if [ "$CSRF_STATUS" != "200" ]; then
  echo "ERROR: csrf token request failed with HTTP $CSRF_STATUS"
  cat "$CSRF_BODY"
  exit 1
fi

CSRF_TOKEN="$(jq -r '.token // empty' "$CSRF_BODY")"
if [ -z "$CSRF_TOKEN" ]; then
  echo "ERROR: csrf token response did not include a token"
  cat "$CSRF_BODY"
  exit 1
fi

LOGIN_STATUS="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o "$LOGIN_BODY" -w "%{http_code}" \
  -H "content-type: application/json" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" \
  "$BASE_URL/api/auth/login")"
if [ "$LOGIN_STATUS" != "200" ]; then
  echo "ERROR: demo login failed with HTTP $LOGIN_STATUS"
  cat "$LOGIN_BODY"
  exit 1
fi

refresh_findings

if ! finding_present "$EXPECTED_FINDING_TITLE"; then
  echo "ERROR: expected FleetGraph demo finding was not present."
  cat "$FINDINGS_BODY"
  exit 1
fi

if [ -n "${FLEETGRAPH_SERVICE_TOKEN:-}" ]; then
  EXPECT_FULL_READY="$REQUIRE_FULL_READY"
  if [ -n "$WORKER_SERVICE_NAME" ]; then
    EXPECT_FULL_READY="true"
  fi

  READY_STATUS="$(curl -sS -o "$READY_BODY" -w "%{http_code}" \
    -H "x-fleetgraph-service-token: $FLEETGRAPH_SERVICE_TOKEN" \
    "$BASE_URL/api/fleetgraph/ready")"
  if [ "$READY_STATUS" = "200" ]; then
    echo "FleetGraph readiness check passed."
  elif [ "$READY_STATUS" = "503" ] && [ "$EXPECT_FULL_READY" != "true" ]; then
    if jq -e '.api.ready == true' "$READY_BODY" >/dev/null; then
      echo "FleetGraph readiness is partial: API surface is ready, worker surface is not yet enabled."
    else
      echo "ERROR: FleetGraph readiness check failed with HTTP $READY_STATUS"
      cat "$READY_BODY"
      exit 1
    fi
  else
    echo "ERROR: FleetGraph readiness check failed with HTTP $READY_STATUS"
    cat "$READY_BODY"
    exit 1
  fi
else
  echo "Skipping FleetGraph readiness check because FLEETGRAPH_SERVICE_TOKEN is not set locally."
fi

if [ -n "$WORKER_SERVICE_NAME" ]; then
  wait_for_worker_finding "$WORKER_FINDING_TIMEOUT_SECONDS"
fi

echo "Health check passed:"
cat "$HEALTH_BODY"
echo ""
echo "FleetGraph demo proof lane is live at $BASE_URL"
