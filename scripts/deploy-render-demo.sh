#!/bin/bash
set -euo pipefail

# Ship public demo deployment script
# Deploys a specific git commit to the existing Render "ship-demo" service.
#
# Usage:
#   ./scripts/deploy-render-demo.sh [commit-ish]
#
# Examples:
#   ./scripts/deploy-render-demo.sh             # deploy current HEAD
#   ./scripts/deploy-render-demo.sh master      # deploy local master tip
#   ./scripts/deploy-render-demo.sh 5d4e0bf     # deploy a specific commit

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SERVICE_ID="${RENDER_SHIP_DEMO_SERVICE_ID:-srv-d6q29ms50q8c738ef12g}"
SERVICE_URL="${RENDER_SHIP_DEMO_URL:-https://ship-demo.onrender.com}"
HEALTH_URL="${RENDER_SHIP_DEMO_HEALTH_URL:-${SERVICE_URL}/health}"
TARGET_REF="${1:-HEAD}"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required"
  exit 1
fi

if ! command -v render >/dev/null 2>&1; then
  echo "ERROR: render CLI is required"
  echo "Install with: brew install render"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required"
  exit 1
fi

cd "$PROJECT_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not inside a git repository"
  exit 1
fi

if ! render whoami --output json >/dev/null 2>&1; then
  echo "ERROR: Render CLI is not authenticated."
  echo "Run: render login"
  exit 1
fi

COMMIT_SHA="$(git rev-parse "$TARGET_REF^{commit}")"
SHORT_SHA="$(git rev-parse --short "$COMMIT_SHA")"

echo "=========================================="
echo "Ship - Render Demo Deployment"
echo "=========================================="
echo "Service ID: $SERVICE_ID"
echo "Target commit: $SHORT_SHA"
echo "Service URL: $SERVICE_URL"
echo ""

render deploys create "$SERVICE_ID" \
  --commit "$COMMIT_SHA" \
  --wait \
  --confirm

echo ""
echo "Verifying Render demo health..."
HTTP_STATUS="$(curl -sS -o /tmp/ship-render-demo-health.json -w "%{http_code}" "$HEALTH_URL")"

if [ "$HTTP_STATUS" != "200" ]; then
  echo "ERROR: health check failed with HTTP $HTTP_STATUS"
  echo "Response:"
  cat /tmp/ship-render-demo-health.json
  exit 1
fi

echo "Health check passed:"
cat /tmp/ship-render-demo-health.json
echo ""
echo "Render demo deploy complete for commit $SHORT_SHA"
echo "Open: $SERVICE_URL"
