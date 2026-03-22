# Live Context Snapshot

Last updated: 2026-03-22

## Repo

- Repository: `thisisyoussef/ship`
- Local path: `/Users/youss/Development/gauntlet/ship`
- Primary branch baseline: `master`

## Stack

- Frontend: React + Vite in `web/`
- Backend: Express + WebSocket collaboration server in `api/`
- Shared contracts: TypeScript package in `shared/`
- Database: PostgreSQL

## Deployment Surfaces

- Canonical production baseline: API on AWS Elastic Beanstalk, frontend on S3/CloudFront, AWS-backed config/secrets
- Public demo baseline as of March 22, 2026: Railway, with demo updates flowing automatically from merged `master` changes
- Legacy demo script still present: `scripts/deploy-render-demo.sh`

## Current Working Truth

- FleetGraph remains the most active product track in the repo.
- FleetGraph assignment source docs live under `docs/assignments/fleetgraph/`.
- The repo now uses `AGENTS.md` plus `docs/` as the primary harness, not the old `.ai` workspace docs.

## Operational Appendix

- Use `.claude/CLAUDE.md` for the current Ship command and architecture appendix.
- Use `docs/WORKFLOW_MEMORY.md` for recurring corrections, durable workflow decisions, and reusable implementation patterns.
- Use `docs/user-stories/README.md` to determine the next valid implementation story.

## Open Maintenance Items

- Backfill additional story files into `docs/user-stories/` as active packs are ported.
- Retire stale references to the previous `.ai` workspace model in active docs when found.
