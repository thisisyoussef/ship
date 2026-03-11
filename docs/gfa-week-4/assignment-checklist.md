ShipShape Assignment Playbook

Use this as the single source of truth while we work. Keep notes in each section.

## 1) Pre-flight
- Confirm you are in the repo root: `cd /Users/youss/Development/gauntlet/ship`
- Confirm prerequisites: Node 20+, pnpm, Docker
- Confirm assignment brief exists: `ls -la docs/gfa-week-4`
- Start a notes file: `docs/gfa-week-4/notes.md` (can be created when you want)

## 2) Orientation (first 4 hours)
- `pnpm install`
- `cp api/.env.example api/.env.local`
- `cp web/.env.example web/.env`
- `docker-compose up -d`
- `pnpm db:seed`
- `pnpm db:migrate`
- `pnpm dev` and verify app at http://localhost:5173
- Read all files in `docs/` and summarize architecture decisions
- Read `shared/` and map type usage in both `web` and `api`
- Create a diagram of package flow: web -> api -> shared -> db

Checkpoint: capture command outputs and any run failures in notes.

## 3) Audit Category #1: Type Safety
Commands to run:
- `rg --line-number --glob '!**/dist/**' --glob '!**/node_modules/**' "\bany\b" web api shared`
- `rg --line-number --glob '!**/dist/**' --glob '!**/node_modules/**' "\bas\b|\!\"|@ts-ignore|@ts-expect-error" web api shared`
- `cat web/tsconfig.json api/tsconfig.json shared/tsconfig.json`
- `pnpm -C web tsc --noEmit` (and same for api if needed)

Deliverable in notes: counts by package and top 5 violation-dense files.

## 4) Audit Category #2: Bundle Size
Commands to run:
- `pnpm -C web build`
- Capture output size from `web/dist` and `du -sh web/dist/*`
- Add a bundle analyzer once command baseline is captured (later in process)

## 5) Audit Category #3: API Response Time
Commands to run:
- Seed data at required scale (`pnpm db:seed`)
- Start API: `pnpm dev:api`
- Identify top endpoints in browser network panel during main flows
- Run one load tool for baseline (autocannon/k6/hey). Record P50/P95/P99 at 10/25/50 concurrency

## 6) Audit Category #4: DB Query Efficiency
Commands to run:
- Enable Postgres query logging in local compose or DB settings
- Execute 5 flows from UI and count query count
- Use `EXPLAIN ANALYZE` on slow endpoints

## 7) Audit Category #5: Test Coverage
Commands to run:
- `pnpm test` (full)
- Run full suite 3 times; note flakiness
- Identify critical flows missing coverage

## 8) Audit Category #6: Error and Edge Cases
- Open app and monitor console for errors
- Simulate network disconnect/reconnect while editing
- Submit malformed input cases
- Capture recovery behavior and failures

## 9) Audit Category #7: Accessibility
- Run Lighthouse per major page
- Run axe/pa11y scan
- Record keyboard navigation and ARIA gaps

## 10) Synthesis and Improvement Planning
- Pick 3 high-impact findings per your baseline across categories
- For each category, define measurable before/after target and exact command/repro steps
- Implement one category at a time, keep commits separate

## 11) Reporting
- `docs/gfa-week-4/audit-report.md`
- `docs/gfa-week-4/implementation-log.md`
- `docs/gfa-week-4/discoveries.md`
- `docs/gfa-week-4/ai-cost-log.md`
