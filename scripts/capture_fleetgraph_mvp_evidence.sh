#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

BASE_URL="${FLEETGRAPH_PUBLIC_BASE_URL:-${RAILWAY_PUBLIC_DEMO_URL:-}}"
DEMO_EMAIL="${SHIP_DEMO_EMAIL:-dev@ship.local}"
DEMO_PASSWORD="${SHIP_DEMO_PASSWORD:-admin123}"
LANGSMITH_PROJECT="${LANGSMITH_PROJECT:-ship-fleetgraph}"
OUTPUT_PATH="${FLEETGRAPH_MVP_EVIDENCE_OUTPUT:-${PROJECT_ROOT}/docs/evidence/fleetgraph-mvp-evidence.json}"
SERVICE_TOKEN="${FLEETGRAPH_SERVICE_TOKEN:-}"
REVIEW_TITLE="${FLEETGRAPH_DEMO_EXPECTED_FINDING_TITLE:-Week start drift: FleetGraph Demo Week - Review and Apply}"
WORKER_TITLE="${FLEETGRAPH_DEMO_EXPECTED_WORKER_FINDING_TITLE:-Week start drift: FleetGraph Demo Week - Worker Generated}"

for command in curl jq node python3; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "ERROR: $command is required"
    exit 1
  fi
done

if [[ -z "$BASE_URL" ]]; then
  echo "ERROR: set FLEETGRAPH_PUBLIC_BASE_URL or RAILWAY_PUBLIC_DEMO_URL"
  exit 1
fi

if [[ -z "${LANGSMITH_API_KEY:-${LANGCHAIN_API_KEY:-}}" ]]; then
  echo "ERROR: set LANGSMITH_API_KEY or LANGCHAIN_API_KEY before capturing evidence"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

COOKIE_JAR="$(mktemp)"
CSRF_BODY="$(mktemp)"
LOGIN_BODY="$(mktemp)"
FINDINGS_BODY="$(mktemp)"
DOC_BODY="$(mktemp)"
CONTEXT_BODY="$(mktemp)"
ENTRY_BODY="$(mktemp)"
READY_BODY="$(mktemp)"
ENTRY_PAYLOAD="$(mktemp)"
LANGSMITH_BODY="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$CSRF_BODY" "$LOGIN_BODY" "$FINDINGS_BODY" "$DOC_BODY" "$CONTEXT_BODY" "$ENTRY_BODY" "$READY_BODY" "$ENTRY_PAYLOAD" "$LANGSMITH_BODY"' EXIT

fetch_json() {
  local url="$1"
  local output="$2"
  shift 2
  local status
  status="$(curl -sS -o "$output" -w "%{http_code}" "$@" "$url")"
  if [[ "$status" != "200" ]]; then
    echo "ERROR: request failed for $url with HTTP $status"
    cat "$output"
    exit 1
  fi
}

post_json() {
  local url="$1"
  local body_file="$2"
  local output="$3"
  shift 3
  local status
  status="$(curl -sS -o "$output" -w "%{http_code}" "$@" \
    -H "content-type: application/json" \
    --data @"$body_file" \
    "$url")"
  if [[ "$status" != "200" ]]; then
    echo "ERROR: request failed for $url with HTTP $status"
    cat "$output"
    exit 1
  fi
}

fetch_json "${BASE_URL%/}/api/csrf-token" "$CSRF_BODY" -c "$COOKIE_JAR" -b "$COOKIE_JAR"
CSRF_TOKEN="$(jq -r '.token // empty' "$CSRF_BODY")"
if [[ -z "$CSRF_TOKEN" ]]; then
  echo "ERROR: csrf token missing"
  cat "$CSRF_BODY"
  exit 1
fi

printf '{"email":"%s","password":"%s"}' "$DEMO_EMAIL" "$DEMO_PASSWORD" > "$LOGIN_BODY"
post_json "${BASE_URL%/}/api/auth/login" "$LOGIN_BODY" "$ENTRY_BODY" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H "x-csrf-token: $CSRF_TOKEN"

fetch_json "${BASE_URL%/}/api/fleetgraph/findings" "$FINDINGS_BODY" -c "$COOKIE_JAR" -b "$COOKIE_JAR"

REVIEW_DOC_ID="$(jq -r --arg title "$REVIEW_TITLE" '.findings[] | select(.title == $title) | .documentId' "$FINDINGS_BODY" | head -n 1)"
WORKER_DOC_ID="$(jq -r --arg title "$WORKER_TITLE" '.findings[] | select(.title == $title) | .documentId' "$FINDINGS_BODY" | head -n 1)"
WORKER_TRACE_RUN_ID="$(jq -r --arg title "$WORKER_TITLE" '.findings[] | select(.title == $title) | .traceRunId // empty' "$FINDINGS_BODY" | head -n 1)"
WORKER_TRACE_URL="$(jq -r --arg title "$WORKER_TITLE" '.findings[] | select(.title == $title) | .tracePublicUrl // empty' "$FINDINGS_BODY" | head -n 1)"
if [[ -z "$REVIEW_DOC_ID" ]]; then
  echo "ERROR: review/apply finding not found"
  cat "$FINDINGS_BODY"
  exit 1
fi
if [[ -z "$WORKER_TRACE_URL" ]]; then
  WORKER_TRACE_URL="$(
    cd "${PROJECT_ROOT}/api"
    FLEETGRAPH_CAPTURE_RUN_ID="$WORKER_TRACE_RUN_ID" \
    FLEETGRAPH_CAPTURE_DOCUMENT_ID="$WORKER_DOC_ID" \
    LANGSMITH_PROJECT="$LANGSMITH_PROJECT" \
    node - <<'NODE'
const { Client } = require('langsmith');

async function main() {
  const runId = process.env.FLEETGRAPH_CAPTURE_RUN_ID;
  const documentId = process.env.FLEETGRAPH_CAPTURE_DOCUMENT_ID;
  const projectName = process.env.LANGSMITH_PROJECT;
  if (!documentId) {
    throw new Error('FLEETGRAPH_CAPTURE_DOCUMENT_ID is required');
  }
  if (!projectName) {
    throw new Error('LANGSMITH_PROJECT is required');
  }

  if (!runId) {
    process.stderr.write('No worker trace run id provided; falling back to recent run discovery.\n');
  }

  const client = new Client({
    apiKey: process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY,
    apiUrl: process.env.LANGSMITH_ENDPOINT || process.env.LANGCHAIN_ENDPOINT,
    webUrl: process.env.LANGSMITH_WEB_URL,
    workspaceId: process.env.LANGSMITH_WORKSPACE_ID,
  });

  const shareRun = async (targetRunId) => {
    const existing = await client.readRunSharedLink(targetRunId).catch(() => null);
    return existing || client.shareRun(targetRunId);
  };

  if (runId) {
    const directUrl = await shareRun(runId).catch(() => null);
    if (directUrl) {
      process.stdout.write(directUrl);
      return;
    }
  }

  let discovered = null;
  for await (const run of client.listRuns({
    projectName,
    limit: 50,
  })) {
    const runDocumentId = run.outputs?.documentId ?? run.extra?.metadata?.document_id;
    const trigger = run.extra?.metadata?.trigger;
    const mode = run.extra?.metadata?.mode;
    if (
      runDocumentId === documentId
      && trigger === 'scheduled-sweep'
      && mode === 'proactive'
      && (run.name === 'fleetgraph.runtime' || run.name === 'fleetgraph.llm.generate')
    ) {
      discovered = run;
      break;
    }
  }

  if (!discovered) {
    throw new Error('No recent proactive worker trace found for the expected document');
  }

  const discoveredUrl = await shareRun(discovered.id);
  process.stdout.write(discoveredUrl);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
NODE
  )"
fi
if [[ -z "$WORKER_TRACE_URL" ]]; then
  echo "ERROR: worker-generated finding is missing a public trace URL"
  cat "$FINDINGS_BODY"
  exit 1
fi

fetch_json "${BASE_URL%/}/api/documents/${REVIEW_DOC_ID}" "$DOC_BODY" -c "$COOKIE_JAR" -b "$COOKIE_JAR"
fetch_json "${BASE_URL%/}/api/documents/${REVIEW_DOC_ID}/context" "$CONTEXT_BODY" -c "$COOKIE_JAR" -b "$COOKIE_JAR"

CAPTURED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

jq -n \
  --argjson context "$(cat "$CONTEXT_BODY")" \
  --arg documentId "$REVIEW_DOC_ID" \
  --arg documentType "$(jq -r '.document_type' "$DOC_BODY")" \
  --arg workspaceId "$(jq -r '.workspace_id' "$DOC_BODY")" \
  '{
    context: $context,
    draft: {
      requestedAction: {
        endpoint: {
          method: "POST",
          path: ("/api/weeks/" + $documentId + "/approve-plan")
        },
        evidence: [
          "Week plan approval changes persistent sprint approval state.",
          "FleetGraph is operating from the current week context."
        ],
        rationale: "Week approval is a consequential Ship write.",
        summary: "Approve the current week plan.",
        targetId: $documentId,
        targetType: "sprint",
        title: "Approve week plan",
        type: "approve_week_plan"
      }
    },
    route: {
      activeTab: "details",
      nestedPath: [],
      surface: "document-page"
    },
    trigger: {
      actorId: "evidence-capture",
      documentId: $documentId,
      documentType: $documentType,
      mode: "on_demand",
      trigger: "document-context",
      workspaceId: $workspaceId
    }
  }' > "$ENTRY_PAYLOAD"

post_json "${BASE_URL%/}/api/fleetgraph/entry" "$ENTRY_PAYLOAD" "$ENTRY_BODY" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H "x-csrf-token: $CSRF_TOKEN"

if [[ "$(jq -r '.run.outcome' "$ENTRY_BODY")" != "approval_required" ]]; then
  echo "ERROR: approval-preview flow did not produce approval_required"
  cat "$ENTRY_BODY"
  exit 1
fi

(
  cd "${PROJECT_ROOT}/api"
  FLEETGRAPH_CAPTURE_AFTER="$CAPTURED_AT" \
  FLEETGRAPH_CAPTURE_ENTRY_DOCUMENT_ID="$REVIEW_DOC_ID" \
  LANGSMITH_PROJECT="$LANGSMITH_PROJECT" \
  node - <<'NODE' > "$LANGSMITH_BODY"
const { Client } = require('langsmith');

async function main() {
  const after = process.env.FLEETGRAPH_CAPTURE_AFTER;
  const documentId = process.env.FLEETGRAPH_CAPTURE_ENTRY_DOCUMENT_ID;
  const projectName = process.env.LANGSMITH_PROJECT;
  if (!documentId) {
    throw new Error('FLEETGRAPH_CAPTURE_ENTRY_DOCUMENT_ID is required');
  }
  if (!projectName) {
    throw new Error('LANGSMITH_PROJECT is required');
  }

  const client = new Client({
    apiKey: process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY,
    apiUrl: process.env.LANGSMITH_ENDPOINT || process.env.LANGCHAIN_ENDPOINT,
    webUrl: process.env.LANGSMITH_WEB_URL,
    workspaceId: process.env.LANGSMITH_WORKSPACE_ID,
  });

  let target;
  for (let attempt = 0; attempt < 15 && !target; attempt += 1) {
    for await (const run of client.listRuns({
      projectName,
      filter: 'eq(name, "fleetgraph.runtime")',
      limit: 20,
    })) {
      if (run.start_time > after) {
        target = run;
        break;
      }
    }
    if (!target) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (!target) {
    for await (const run of client.listRuns({
      projectName,
      filter: 'eq(name, "fleetgraph.runtime")',
      limit: 50,
    })) {
      if (
        run.outputs?.documentId === documentId
        && run.outputs?.mode === 'on_demand'
        && run.outputs?.outcome === 'approval_required'
      ) {
        target = run;
        break;
      }
    }
  }

  if (!target) {
    throw new Error('No approval-preview fleetgraph.runtime trace found for the expected document');
  }

  const existing = await client.readRunSharedLink(target.id);
  const url = existing || await client.shareRun(target.id);
  process.stdout.write(JSON.stringify({
    runId: target.id,
    sharedUrl: url,
    startTime: target.start_time,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
NODE
)

READY_STATUS="not_checked"
if [[ -n "$SERVICE_TOKEN" ]]; then
  READY_STATUS="$(curl -sS -o "$READY_BODY" -w "%{http_code}" \
    -H "x-fleetgraph-service-token: $SERVICE_TOKEN" \
    "${BASE_URL%/}/api/fleetgraph/ready")"
fi

jq -n \
  --arg capturedAt "$CAPTURED_AT" \
  --arg baseUrl "$BASE_URL" \
  --arg reviewTitle "$REVIEW_TITLE" \
  --arg reviewDocumentId "$REVIEW_DOC_ID" \
  --arg workerTitle "$WORKER_TITLE" \
  --arg workerDocumentId "$WORKER_DOC_ID" \
  --arg workerTraceRunId "$WORKER_TRACE_RUN_ID" \
  --arg workerTraceUrl "$WORKER_TRACE_URL" \
  --arg approvalTraceUrl "$(jq -r '.sharedUrl' "$LANGSMITH_BODY")" \
  --arg approvalTraceRunId "$(jq -r '.runId' "$LANGSMITH_BODY")" \
  --arg readyStatus "$READY_STATUS" \
  '{
    capturedAt: $capturedAt,
    publicDemoUrl: $baseUrl,
    readiness: {
      httpStatus: $readyStatus
    },
    inspectionTargets: {
      reviewAndApply: {
        documentId: $reviewDocumentId,
        findingTitle: $reviewTitle
      },
      workerGenerated: {
        documentId: $workerDocumentId,
        findingTitle: $workerTitle
      }
    },
    traces: {
      proactiveWorker: {
        title: $workerTitle,
        runId: $workerTraceRunId,
        publicUrl: $workerTraceUrl
      },
      approvalPreview: {
        runId: $approvalTraceRunId,
        publicUrl: $approvalTraceUrl
      }
    }
  }' > "$OUTPUT_PATH"

echo "FleetGraph MVP evidence written to $OUTPUT_PATH"
cat "$OUTPUT_PATH"
