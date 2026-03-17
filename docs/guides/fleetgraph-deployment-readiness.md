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

## Deploy Smoke

After deploying the API surface, run:

```bash
pnpm fleetgraph:deploy:smoke \
  --base-url https://ship-demo.onrender.com \
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

## Render Demo

- Public demo URL: `https://ship-demo.onrender.com/`
- Demo deploy path: `./scripts/deploy-render-demo.sh <commit-ish>`

Render currently covers the public web/API demo surface. AWS remains the canonical production path.
