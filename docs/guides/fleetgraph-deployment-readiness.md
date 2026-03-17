# FleetGraph Deployment Readiness

Use this guide when enabling FleetGraph on a deployed Ship environment.

## Required Runtime Surfaces

- API route readiness: `GET /api/fleetgraph/ready`
- On-demand entry route: `POST /api/fleetgraph/entry`
- Worker command: `pnpm --filter @ship/api fleetgraph:worker`
- Trace evidence: a shared LangSmith trace URL captured from the deployed environment

## Required Environment Contract

These settings must be available to both the API and the worker in production:

- `APP_BASE_URL`
- `FLEETGRAPH_SERVICE_TOKEN`
- `LANGSMITH_API_KEY`
- `LANGSMITH_TRACING=true`
- `FLEETGRAPH_ENTRY_ENABLED=true`
- `FLEETGRAPH_WORKER_ENABLED=true`
- OpenAI default path:
  - `OPENAI_API_KEY`
  - optional `FLEETGRAPH_OPENAI_MODEL`
- Alternate provider path:
  - `FLEETGRAPH_LLM_PROVIDER`
  - provider-specific credentials/config

Ship's production loader reads these from `/ship/{env}/...` SSM parameters when they are not set explicitly in the runtime environment.

## Non-AWS Hosts

- AWS-hosted Ship environments may rely on SSM-backed fallback loading for FleetGraph and LangSmith settings.
- Non-AWS hosts such as the Railway public demo should prefer explicit runtime environment variables for FleetGraph, LangSmith, and provider credentials.
- Optional FleetGraph/LangSmith SSM lookups should not crash a non-AWS host when AWS credentials are unavailable; the runtime should continue with explicit environment variables and let readiness report any still-missing required settings.

## Deploy Smoke

After deploying the API surface, run:

```bash
pnpm fleetgraph:deploy:smoke \
  --base-url "$RAILWAY_PUBLIC_DEMO_URL" \
  --service-token "$FLEETGRAPH_SERVICE_TOKEN" \
  --trace-url "https://smith.langchain.com/public/..."
```

The smoke command requires:

- a `200` response from `/api/fleetgraph/ready`
- both API and worker readiness surfaces to report `ready: true`
- an explicit trace URL so deploy proof includes observability evidence, not just route reachability

## Auth Notes

- The readiness route is not session-authenticated.
- It requires `X-FleetGraph-Service-Token` or `Authorization: Bearer <token>`.
- Treat `FLEETGRAPH_SERVICE_TOKEN` as a shared service secret for deployment smoke and future worker-to-API service calls.

## Railway Public Demo

- Public demo URL: `RAILWAY_PUBLIC_DEMO_URL`
- Demo deploy path: `./scripts/deploy-railway-demo.sh <commit-ish>`
- Required local deploy vars:
  - `RAILWAY_PUBLIC_DEMO_PROJECT_ID`
  - `RAILWAY_PUBLIC_DEMO_SERVICE`
  - `RAILWAY_PUBLIC_DEMO_URL`

Railway now covers the public web/API demo surface. AWS remains the canonical production path.

For the named UI proof target and demo-user flow, use `docs/guides/fleetgraph-demo-inspection.md`.

## Current Public-Demo Baseline

- The public demo should expose `GET /api/fleetgraph/ready` once a FleetGraph-ready build is live.
- The deploy proof lane should also allow demo login plus `GET /api/fleetgraph/findings` returning the seeded FleetGraph demo finding instead of a 500 or empty stale state.
