#!/bin/bash
set -euo pipefail

BASE_URL="${FLEETGRAPH_PUBLIC_BASE_URL:-${APP_BASE_URL:-}}"
SERVICE_TOKEN="${FLEETGRAPH_SERVICE_TOKEN:-}"
TRACE_URL="${FLEETGRAPH_TRACE_URL:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --service-token)
      SERVICE_TOKEN="$2"
      shift 2
      ;;
    --trace-url)
      TRACE_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 --base-url <url> --service-token <token> --trace-url <url>"
      exit 1
      ;;
  esac
done

if [[ -z "$BASE_URL" || -z "$SERVICE_TOKEN" || -z "$TRACE_URL" ]]; then
  echo "Usage: $0 --base-url <url> --service-token <token> --trace-url <url>"
  echo "Required values may also be provided via APP_BASE_URL/FLEETGRAPH_PUBLIC_BASE_URL,"
  echo "FLEETGRAPH_SERVICE_TOKEN, and FLEETGRAPH_TRACE_URL."
  exit 1
fi

READY_URL="${BASE_URL%/}/api/fleetgraph/ready"
RESPONSE_FILE="/tmp/fleetgraph-ready.json"

HTTP_STATUS="$(curl -sS -o "$RESPONSE_FILE" -w "%{http_code}" \
  -H "X-FleetGraph-Service-Token: $SERVICE_TOKEN" \
  "$READY_URL")"

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "ERROR: FleetGraph readiness check failed with HTTP $HTTP_STATUS"
  cat "$RESPONSE_FILE"
  exit 1
fi

node - "$RESPONSE_FILE" "$READY_URL" "$TRACE_URL" <<'NODE'
const fs = require('fs')
const [responsePath, readyUrl, traceUrl] = process.argv.slice(2)
const payload = JSON.parse(fs.readFileSync(responsePath, 'utf8'))

if (!payload.api?.ready || !payload.worker?.ready) {
  console.error('ERROR: FleetGraph surfaces are not fully ready')
  console.error(JSON.stringify(payload, null, 2))
  process.exit(1)
}

if (!traceUrl) {
  console.error('ERROR: trace evidence URL is required')
  process.exit(1)
}

console.log('FleetGraph deploy smoke passed')
console.log(`Ready URL: ${readyUrl}`)
console.log(`Trace URL: ${traceUrl}`)
NODE
