# GFA Week 4 Notes

## Step-by-step orientation done

1. Verified repository root at `/Users/youss/Development/gauntlet/ship`.
2. Ran `ls -la` in repo root and confirmed:
   - `README.md` present.
   - `api/`, `web/`, `shared/`, `e2e/`, `docs/`, `docker-compose.yml`, `scripts/`.
3. Read `README.md` (setup section confirms:
   - copy env files,
   - install deps,
   - `docker-compose up -d`,
   - `pnpm db:seed`, `pnpm db:migrate`, `pnpm dev`).
4. Copied assignment PDF into a new docs folder already requested:
   - `/Users/youss/Development/gauntlet/ship/docs/gfa-week-4/GFA_Week_4-ShipShape.pdf`
5. Read repo instructions files in scope:
   - `README.md`, `terraform/README.md`, `e2e/AGENTS.md`.
6. Read core architecture docs:
   - `docs/application-architecture.md`
   - `docs/unified-document-model.md`
   - `docs/document-model-conventions.md`
   - `docs/developer-workflow-guide.md`
7. Ran baseline install/build/type-check probes:
   - `pnpm install` (succeeded).
   - `cp api/.env.example api/.env.local`
   - `cp web/.env.example web/.env`
   - `pnpm -C shared build`
   - `pnpm build:web` (succeeded; bundle generated).
   - `pnpm exec tsc` for `web`, `api`, `shared` (succeeded).
   - `pnpm test` (fails after startup due `role "ship" does not exist`, i.e., DB not provisioned by Docker in this environment).

## Environment blockers

- Docker daemon is not reachable in this workspace (`Cannot connect to the Docker daemon`).
- `open -a Docker` command reports not available; so DB-backed runtime baselines that require Postgres cannot be completed end-to-end here.

## Initial numeric baseline (text-scan only)

- `web/src`: `any` count observed `67`.
- `api/src`: `286` (approximate for `any` occurrences).
- `shared/src`: `1`.
- Type assertions (`as`) appear heavily in all packages (web 460, api 1084, shared 5).
- `@ts-ignore/@ts-expect-error`: currently `1` total in `web` (`web/src/components/icons/uswds/Icon.test.tsx`).

## Flow evidence captured

- Frontend bootstrap and route graph: `web/src/main.tsx`.
- API server + WebSocket bootstrap: `api/src/index.ts`.
- API middleware + route registration: `api/src/app.ts`.
- Auth middleware and session/token handling: `api/src/middleware/auth.ts`.
- Issue creation backend path: `web/src/hooks/useIssuesQuery.ts` → `POST /api/issues` → `api/src/routes/issues.ts`.
- Unified document schema and relationships: `api/src/db/schema.sql`.

## Next action plan

- Build the 7 audit category playbook against this repo-specific flow.
- Collect command-level baselines for each category under the same data shape and runtime.
- For each category, create `before` and `after` evidence artifacts before code changes.

