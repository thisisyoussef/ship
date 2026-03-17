# FleetGraph T008 Deployment Readiness

## Summary

- Added `api/src/services/fleetgraph/deployment/` as the shared deploy/env contract for FleetGraph API and worker surfaces.
- Added `GET /api/fleetgraph/ready` with `X-FleetGraph-Service-Token` / bearer-token auth for service-level readiness checks.
- Added `scripts/fleetgraph_deploy_smoke.sh` and `docs/guides/fleetgraph-deployment-readiness.md` so deploy proof includes both reachability and trace evidence.
- Updated production SSM loading so optional FleetGraph, LangSmith, and OpenAI settings can be shared by the API process and the worker CLI.

## Validation

- `pnpm --filter @ship/api exec vitest run --config vitest.fleetgraph.config.ts`
- `pnpm --filter @ship/api type-check`
- `pnpm --filter @ship/api build`
- `bash -n scripts/fleetgraph_deploy_smoke.sh`

## Deployment Notes

- AWS access is currently blocked on this machine because `aws sts get-caller-identity` cannot find credentials.
- Render CLI access is available, but no deploy has been run yet for this story.
